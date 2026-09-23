// ==========================================================================
// SAMATA SAINIK DAL (SSD) - HIERARCHICAL MEMBERSHIP & APPROVAL ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore, saveEmbeddedStore } from '../db/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireRole, enforceJurisdiction, canAccessRecord } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Helper to generate Application ID: SSD-2026-XXXXXX
function generateApplicationId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SSD-2026-${rand}`;
}

// Helper to generate Sainik ID: SSD-[STATE_CODE]-2026-XXXXXX
const STATE_CODE_MAP = {
  'maharashtra': 'MH',
  'delhi': 'DL',
  'delhi ncr': 'DL',
  'delhi (nct)': 'DL',
  'uttar pradesh': 'UP',
  'madhya pradesh': 'MP',
  'bihar': 'BR',
  'karnataka': 'KA',
  'rajasthan': 'RJ',
  'punjab': 'PB',
  'gujarat': 'GJ',
  'telangana': 'TG',
  'andhra pradesh': 'AP',
  'tamil nadu': 'TN',
  'west bengal': 'WB',
  'haryana': 'HR',
  'chhattisgarh': 'CG',
  'jharkhand': 'JH',
  'odisha': 'OD',
  'kerala': 'KL',
  'assam': 'AS'
};

function generateSainikId(stateInput = 'IND') {
  const num = Math.floor(1000 + Math.random() * 9000);
  const normalized = (stateInput || '').toLowerCase().trim();
  const stateCode = STATE_CODE_MAP[normalized] || STATE_CODE_MAP[normalized.replace('state_', '')] || (stateInput.length === 2 ? stateInput.toUpperCase() : 'MH');
  return `SSD-${stateCode}-2026-${num}`;
}

// Helper to find an application record by ID, sainik_id, email, or mobile
function findApplicationRecord(id) {
  if (!id) return null;
  const clean = String(id).trim();
  let app = embeddedStore.membership_applications.get(clean);
  if (app) return app;
  const upper = clean.toUpperCase();
  for (const a of embeddedStore.membership_applications.values()) {
    if (a.id === clean || (a.id && a.id.toUpperCase() === upper)) return a;
    if (a.sainik_id && (a.sainik_id === clean || a.sainik_id.toUpperCase() === upper)) return a;
  }
  return null;
}

// Helper to find application record or synthesize from member record if already commissioned
function findApplicationOrMemberRecord(id) {
  const app = findApplicationRecord(id);
  if (app) return { record: app, isMember: false, appId: app.id };

  if (!id) return null;
  const clean = String(id).trim();
  const upper = clean.toUpperCase();

  let member = embeddedStore.members.get(clean);
  if (!member) {
    for (const m of embeddedStore.members.values()) {
      if (m.id === clean || (m.id && m.id.toUpperCase() === upper)) { member = m; break; }
      if (m.sainik_id && (m.sainik_id === clean || m.sainik_id.toUpperCase() === upper)) { member = m; break; }
      if (m.application_id && (m.application_id === clean || m.application_id.toUpperCase() === upper)) { member = m; break; }
    }
  }

  if (member) {
    const syntheticApp = {
      id: member.application_id || member.id || member.sainik_id,
      sainik_id: member.sainik_id,
      full_name: member.full_name,
      dob: member.dob || null,
      gender: member.gender || 'Unspecified',
      mobile: member.mobile || member.phone || '',
      email: member.email || '',
      address: member.address || '',
      state_name: member.state_name || 'Maharashtra',
      district_name: member.district_name || 'Nagpur',
      wing_name: member.wing_name || 'Central Cadet Corps',
      status: member.status || 'FINAL_APPROVED',
      batch_no: member.batch_no || 'BATCH-2026/Q3',
      photo_url: member.photo_url || null,
      created_at: member.created_at || member.approved_at || new Date().toISOString(),
      assessment_data: member.assessment_data || { score: 6, total: 6, percentage: 100 }
    };
    return { record: syntheticApp, isMember: true, rawMember: member, appId: syntheticApp.id };
  }

  return null;
}


// 1. PUBLIC MEMBERSHIP APPLICATION SUBMISSION
router.post('/apply', upload.single('photo'), async (req, res) => {
  try {
    const {
      fullName, dob, gender, mobile, email, address,
      stateId, stateName, regionId, regionName, districtId, districtName,
      talukaId, talukaName, villageCity, education, occupation,
      bloodGroup, wingId, wingName, specialSkills, solemnPledge
    } = req.body;

    if (!fullName || !mobile || !email || !stateName || !districtName || !wingName) {
      return res.status(400).json({
        success: false,
        error: 'Missing mandatory fields: Full Name, Mobile, Email, State, District, and Wing are required.'
      });
    }

    const appId = generateApplicationId();
    let photoUrl = req.file ? `/uploads/photos/${req.file.filename}` : null;
    
    // If photo is provided as Base64 in body (fallback from frontend camera/canvas)
    if (!photoUrl && req.body.photoBase64) {
      photoUrl = req.body.photoBase64;
    }

    // Assign Default Workflow and First Step (District Executive)
    const workflowId = 'wf_national_standard';
    const firstStepId = 'step_1_district';

    const newApp = {
      id: appId,
      full_name: fullName.trim(),
      dob: dob || null,
      gender: gender || 'Unspecified',
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      address: address ? address.trim() : '',
      state_id: stateId || 'state_mh',
      state_name: stateName.trim(),
      region_id: regionId || null,
      region_name: regionName || '',
      district_id: districtId || null,
      district_name: districtName.trim(),
      taluka_id: talukaId || null,
      taluka_name: talukaName || '',
      village_city: villageCity || districtName.trim(),
      education: education || 'N/A',
      occupation: occupation || 'General Citizen',
      blood_group: bloodGroup || 'N/A',
      wing_id: wingId || 'wing_cadet',
      wing_name: wingName || 'Central Cadet Corps (Sainik Wing)',
      photo_url: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: specialSkills || '',
      solemn_pledge_accepted: solemnPledge === 'true' || solemnPledge === true,
      status: 'SUBMITTED',
      workflow_id: workflowId,
      current_step_id: firstStepId,
      current_step_order: 1,
      assigned_role: 'district_official',
      correction_remarks: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    embeddedStore.membership_applications.set(appId, newApp);

    // Record First Approval Action
    const actionId = 'act_' + appId + '_init';
    const initialAction = {
      id: actionId,
      application_id: appId,
      step_id: firstStepId,
      official_id: null,
      official_name: 'Applicant Self-Registration',
      official_role: 'Applicant',
      jurisdiction_summary: `${newApp.district_name}, ${newApp.state_name}`,
      action: 'SUBMIT',
      previous_status: null,
      new_status: 'SUBMITTED',
      remarks: 'Application submitted successfully via the official online enlistment portal.',
      created_at: new Date().toISOString()
    };
    embeddedStore.approval_actions.set(actionId, initialAction);

    // Record System Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: null,
      user_name: newApp.full_name,
      user_role: 'Applicant',
      action: 'APPLICATION_SUBMITTED',
      entity_type: 'MEMBERSHIP_APPLICATION',
      entity_id: appId,
      jurisdiction_summary: `${newApp.district_name}, ${newApp.state_name}`,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.status(201).json({
      success: true,
      message: 'Sainik enlistment application submitted successfully.',
      applicationId: appId,
      applicantName: newApp.full_name,
      assignedDistrict: newApp.district_name,
      status: newApp.status
    });

  } catch (err) {
    console.error('Application Submit Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error submitting application.' });
  }
});

// 2. PUBLIC APPLICATION STATUS TRACKER
router.get('/status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const cleanId = (applicationId || '').trim().toUpperCase();

    const found = findApplicationOrMemberRecord(cleanId);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Application ID not found. Please verify your reference number.' });
    }
    const app = found.record;

    // Get History of actions
    const allActions = Array.from(embeddedStore.approval_actions.values())
      .filter(a => a.application_id === app.id || a.application_id === cleanId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Sanitized public timeline (no private officer contact numbers)
    const timeline = allActions.map(a => ({
      step: a.official_role,
      action: a.action,
      status: a.new_status,
      remarks: a.remarks,
      timestamp: a.created_at
    }));

    return res.json({
      success: true,
      applicationId: app.id,
      applicantName: app.full_name,
      wing: app.wing_name,
      state: app.state_name,
      district: app.district_name,
      currentStatus: app.status,
      currentStage: app.assigned_role || 'central_admin',
      correctionRemarks: app.status === 'CORRECTION_REQUIRED' ? app.correction_remarks : null,
      submittedAt: app.created_at,
      timeline: timeline
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. OFFICER APPROVAL QUEUE (JURISDICTION ENFORCED)
router.get('/applications', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    const { status, wing, search } = req.query;
    let apps = Array.from(embeddedStore.membership_applications.values());

    // Apply Jurisdiction Filter
    if (req.jurisdictionFilter) {
      const jf = req.jurisdictionFilter;
      apps = apps.filter(app => {
        if (jf.state_id && app.state_id !== jf.state_id) return false;
        if (jf.region_id && app.region_id !== jf.region_id) return false;
        if (jf.district_id && app.district_id !== jf.district_id) return false;
        if (jf.chapter_id && app.chapter_id !== jf.chapter_id) return false;
        return true;
      });
    }

    // Optional Query Filters
    if (status && status !== 'ALL') {
      apps = apps.filter(a => a.status === status);
    }
    if (wing && wing !== 'ALL') {
      apps = apps.filter(a => a.wing_name === wing || a.wing_id === wing);
    }
    if (search) {
      const s = search.toLowerCase();
      apps = apps.filter(a =>
        a.id.toLowerCase().includes(s) ||
        a.full_name.toLowerCase().includes(s) ||
        a.mobile.includes(s) ||
        a.district_name.toLowerCase().includes(s)
      );
    }

    // Sort newest first
    apps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      count: apps.length,
      applications: apps
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET SINGLE APPLICATION WITH FULL DETAILS & AUDIT ACTIONS
router.get('/applications/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const found = findApplicationOrMemberRecord(id);

    if (!found) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    const app = found.record;

    // Verify Officer Jurisdiction Access
    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Application ${id} belongs outside your assigned jurisdiction.`
      });
    }

    // Fetch Approval Action History
    const actions = Array.from(embeddedStore.approval_actions.values())
      .filter(a => a.application_id === app.id || a.application_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return res.json({
      success: true,
      application: app,
      approvalHistory: actions
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DECISION: MARK UNDER REVIEW
router.post('/applications/:id/review', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, assessmentData } = req.body;
    const app = findApplicationRecord(id);

    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!canAccessRecord(req.user, app)) return res.status(403).json({ success: false, error: 'Access Denied by jurisdiction.' });

    const prevStatus = app.status;
    app.status = 'UNDER_REVIEW';
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'UNDER_REVIEW',
      previous_status: prevStatus,
      new_status: 'UNDER_REVIEW',
      remarks: remarks || 'Officer has commenced credential and background verification.',
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: 'Application status set to UNDER_REVIEW.', application: app });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DECISION: RECOMMEND (Advance to next approval hierarchy step)
router.post('/applications/:id/recommend', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, assessmentData } = req.body;
    const app = findApplicationRecord(id);

    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!canAccessRecord(req.user, app)) return res.status(403).json({ success: false, error: 'Access Denied by jurisdiction.' });

    const prevStatus = app.status;
    const currentOrder = app.current_step_order || 1;
    let nextStepOrder = currentOrder + 1;
    let nextRole = 'state_official';

    if (currentOrder === 1) { // District -> Regional/State
      nextRole = app.region_id ? 'regional_official' : 'state_official';
    } else if (currentOrder === 2) { // Regional -> State
      nextRole = 'state_official';
    } else if (currentOrder >= 3) { // State -> Central
      nextRole = 'central_admin';
    }

    app.status = 'RECOMMENDED';
    app.current_step_order = nextStepOrder;
    app.assigned_role = nextRole;
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'RECOMMEND',
      previous_status: prevStatus,
      new_status: 'RECOMMENDED',
      remarks: remarks || `Recommended for promotion to ${nextRole} review.`,
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({
      success: true,
      message: `Application recommended successfully and escalated to ${nextRole}.`,
      application: app
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. DECISION: REQUEST CORRECTION
router.post('/applications/:id/correction', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks, assessmentData } = req.body;
    const reasonText = reason || remarks;

    if (!reasonText) {
      return res.status(400).json({ success: false, error: 'A specific reason for requesting correction is required.' });
    }

    const app = findApplicationRecord(id);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!canAccessRecord(req.user, app)) return res.status(403).json({ success: false, error: 'Access Denied by jurisdiction.' });

    const prevStatus = app.status;
    app.status = 'CORRECTION_REQUIRED';
    app.correction_remarks = reasonText;
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'REQUEST_CORRECTION',
      previous_status: prevStatus,
      new_status: 'CORRECTION_REQUIRED',
      remarks: reasonText,
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({
      success: true,
      message: 'Correction request dispatched to applicant.',
      application: app
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. APPLICANT RESUBMISSION AFTER CORRECTION
router.post('/applications/:id/resubmit', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, specialSkills } = req.body;

    const app = findApplicationRecord(id);
    if (!app) return res.status(404).json({ success: false, error: 'Application reference not found.' });

    if (app.status !== 'CORRECTION_REQUIRED') {
      return res.status(400).json({ success: false, error: 'Application is not currently awaiting corrections.' });
    }

    if (fullName) app.full_name = fullName.trim();
    if (phone) app.mobile = phone.trim();
    if (address) app.address = address.trim();
    if (specialSkills) app.special_skills = specialSkills.trim();
    if (req.file) {
      app.photo_url = `/uploads/photos/${req.file.filename}`;
    }

    const prevStatus = app.status;
    app.status = 'UNDER_REVIEW';
    app.correction_remarks = null;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: null,
      official_name: 'Applicant Correction Resubmission',
      official_role: 'Applicant',
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'RESUBMIT',
      previous_status: prevStatus,
      new_status: 'UNDER_REVIEW',
      remarks: 'Applicant has updated requested details/photograph and resubmitted for verification.',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({
      success: true,
      message: 'Corrections submitted successfully. Application returned to review queue.',
      application: app
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. DECISION: REJECT
router.post('/applications/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks, assessmentData } = req.body;
    const reasonText = reason || remarks;

    if (!reasonText) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }

    const app = findApplicationRecord(id);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!canAccessRecord(req.user, app)) return res.status(403).json({ success: false, error: 'Access Denied by jurisdiction.' });

    const prevStatus = app.status;
    app.status = 'REJECTED';
    app.rejection_reason = reasonText;
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'REJECT',
      previous_status: prevStatus,
      new_status: 'REJECTED',
      remarks: reasonText,
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: 'Application marked as REJECTED.', application: app });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. DECISION: ESCALATE (to next superior authority)
router.post('/applications/:id/escalate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, assessmentData } = req.body;
    const app = findApplicationRecord(id);

    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (!canAccessRecord(req.user, app)) return res.status(403).json({ success: false, error: 'Access Denied by jurisdiction.' });

    const prevStatus = app.status;
    app.status = 'ESCALATED';
    app.assigned_role = 'central_admin'; // Escalate to Central Command
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id,
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'ESCALATE',
      previous_status: prevStatus,
      new_status: 'ESCALATED',
      remarks: remarks || 'Escalated to National Executive Command for special review.',
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: 'Application escalated to Central Command.', application: app });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. DECISION: FINAL APPROVAL & DIGITAL SAINIK ID COMMISSION (Central, Super Admin & Enlistment Approver)
router.post('/applications/:id/approve', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, batchNo, remarks, assessmentData } = req.body;
    let app = findApplicationRecord(id);

    if (!app) {
      const memFound = findApplicationOrMemberRecord(id);
      if (memFound && memFound.isMember) {
        return res.json({
          success: true,
          message: `Cadet already officially commissioned! Sainik ID: ${memFound.rawMember.sainik_id}`,
          sainikId: memFound.rawMember.sainik_id,
          member: memFound.rawMember
        });
      }
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    // Generate Unique Sainik ID: SSD-MH-2026-XXXXXX
    const sainikId = generateSainikId(app.state_name || app.state_id || 'MH');
    const memberId = 'mem_' + Date.now();
    const qrToken = 'qr_' + sainikId.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 6);

    const prevStatus = app.status;
    app.status = 'FINAL_APPROVED';
    app.sainik_id = sainikId;
    if (assessmentData) app.assessment_data = assessmentData;
    app.updated_at = new Date().toISOString();
    embeddedStore.membership_applications.set(app.id, app);

    // Create Active Member Record
    const newMember = {
      id: memberId,
      sainik_id: sainikId,
      application_id: app.id,
      full_name: app.full_name,
      email: app.email,
      mobile: app.mobile,
      dob: app.dob,
      gender: app.gender,
      blood_group: app.blood_group,
      photo_url: app.photo_url,
      state_name: app.state_name,
      region_name: app.region_name,
      district_name: app.district_name,
      taluka_name: app.taluka_name,
      chapter_name: `${app.district_name} Central Unit`,
      wing_name: app.wing_name,
      designation: designation || 'Cadet Sainik',
      batch_no: batchNo || 'BATCH-2026/Q3',
      status: 'ACTIVE',
      qr_token: qrToken,
      assessment_data: assessmentData || null,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    embeddedStore.members.set(memberId, newMember);

    // Record Final Approval Action
    const actionId = 'act_' + app.id + '_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: 'step_4_central',
      official_id: req.user.id,
      official_name: req.user.fullName,
      official_role: req.user.role_id,
      jurisdiction_summary: 'Central Executive Command',
      action: 'FINAL_APPROVE',
      previous_status: prevStatus,
      new_status: 'FINAL_APPROVED',
      remarks: remarks || `Officially commissioned and active Sainik ID [${sainikId}] issued.`,
      assessment_data: assessmentData || null,
      created_at: new Date().toISOString()
    });

    // Record System Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.fullName,
      user_role: req.user.role_id,
      action: 'SAINIK_FINAL_APPROVAL',
      entity_type: 'MEMBER',
      entity_id: memberId,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.json({
      success: true,
      message: `Cadet enlistment officially approved. Sainik ID ${sainikId} created.`,
      sainikId: sainikId,
      member: newMember
    });

  } catch (err) {
    console.error('Final Approval Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
