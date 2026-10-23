// ==========================================================================
// SAMATA SAINIK DAL (SSD) - LEGACY SAINIK REGISTRATION & VERIFICATION ROUTES
// ==========================================================================

import express from 'express';
import { embeddedStore, saveEmbeddedStore, supabase } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, enforceJurisdiction, canAccessRecord } from '../middleware/rbac.js';
import { computeBatchCode } from './batches.js';
import { broadcastRealtimeEvent } from '../utils/realtime.js';
import { allocateSainikId } from '../utils/sainikIdGenerator.js';

const router = express.Router();

// Helper to generate Application ID: SSD-LEGACY-XXXXXX
function generateLegacyAppId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SSD-LEGACY-${rand}`;
}

// Helper to generate Sainik ID
const STATE_CODE_MAP = {
  'maharashtra': 'MH',
  'delhi': 'DL',
  'delhi ncr': 'DL',
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
  'haryana': 'HR'
};

export async function generateLegacySainikId(stateInput = 'MH', joiningYear = '2026') {
  let yr = '2026';
  if (joiningYear) {
    const m = String(joiningYear).match(/\b(19\d{2}|20\d{2})\b/);
    if (m) yr = m[1];
  }
  const alloc = await allocateSainikId(yr);
  return alloc.sainikId;
}

// Helper to check duplicates (Acceptance Test 8: Duplicate membership records are detected)
export function checkDuplicateLegacyMember(data) {
  const checkMobile = data.mobile ? String(data.mobile).replace(/\D/g, '') : null;
  const checkEmail = data.email ? String(data.email).trim().toLowerCase() : null;
  const checkExistingId = data.existingSainikId ? String(data.existingSainikId).trim().toUpperCase() : null;

  // 1. Check in members
  for (const m of embeddedStore.members.values()) {
    if (checkMobile && m.mobile) {
      const mDigits = String(m.mobile).replace(/\D/g, '');
      if (mDigits && (mDigits === checkMobile || (checkMobile.length >= 10 && mDigits.includes(checkMobile)))) {
        return { isDuplicate: true, field: 'mobile', match: m.sainik_id || m.full_name };
      }
    }
    if (checkEmail && m.email && m.email.toLowerCase() === checkEmail) {
      return { isDuplicate: true, field: 'email', match: m.sainik_id || m.full_name };
    }
    if (checkExistingId && (m.sainik_id === checkExistingId || m.legacy_sainik_id === checkExistingId || m.existing_sainik_id === checkExistingId)) {
      return { isDuplicate: true, field: 'existingSainikId', match: m.sainik_id || m.full_name };
    }
  }

  // 2. Check in membership_applications
  for (const a of embeddedStore.membership_applications.values()) {
    if (a.id === data.id) continue;
    if (checkMobile && a.mobile) {
      const aDigits = String(a.mobile).replace(/\D/g, '');
      if (aDigits && (aDigits === checkMobile || (checkMobile.length >= 10 && aDigits.includes(checkMobile)))) {
        return { isDuplicate: true, field: 'mobile', match: a.id || a.full_name };
      }
    }
    if (checkExistingId && (a.existing_sainik_id === checkExistingId || a.sainik_id === checkExistingId)) {
      return { isDuplicate: true, field: 'existingSainikId', match: a.id || a.full_name };
    }
  }

  return { isDuplicate: false };
}

// 1. GET ALL LEGACY APPLICATIONS (JURISDICTION RESTRICTED)
router.get('/applications', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    const { status, state, district, chapter, joiningYear, batch, search } = req.query;
    let list = Array.from(embeddedStore.membership_applications.values())
      .filter(a => a.membership_type === 'LEGACY');

    // Apply Jurisdiction Filtering (District officials only see their district, etc.)
    if (req.jurisdictionFilter) {
      const jf = req.jurisdictionFilter;
      list = list.filter(a => {
        if (jf.state_id && a.state_name && !a.state_name.toLowerCase().includes(jf.state_id.replace('state_', '').toLowerCase())) {
          return false;
        }
        if (jf.district_id && a.district_name) {
          const cleanDist = jf.district_id.replace('dist_mh_', '').replace('dist_', '').toLowerCase();
          if (!a.district_name.toLowerCase().includes(cleanDist)) return false;
        }
        return true;
      });
    }

    if (status && status !== 'ALL') {
      list = list.filter(a => a.status === status || a.legacy_verification_status === status);
    }
    if (state && state !== 'ALL') {
      list = list.filter(a => a.state_name && a.state_name.toLowerCase().includes(state.toLowerCase()));
    }
    if (district && district !== 'ALL') {
      list = list.filter(a => a.district_name && a.district_name.toLowerCase().includes(district.toLowerCase()));
    }
    if (chapter && chapter !== 'ALL') {
      list = list.filter(a => (a.chapter || a.chapter_name || '').toLowerCase().includes(chapter.toLowerCase()));
    }
    if (joiningYear) {
      list = list.filter(a => a.original_joining_date && a.original_joining_date.includes(joiningYear));
    }
    if (batch && batch !== 'ALL') {
      list = list.filter(a => a.batch_code === batch || a.batch_no === batch);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        (a.full_name && a.full_name.toLowerCase().includes(s)) ||
        (a.id && a.id.toLowerCase().includes(s)) ||
        (a.sainik_id && a.sainik_id.toLowerCase().includes(s)) ||
        (a.existing_sainik_id && a.existing_sainik_id.toLowerCase().includes(s)) ||
        (a.mobile && a.mobile.includes(s)) ||
        (a.email && a.email.toLowerCase().includes(s))
      );
    }

    // Sort newest registration first
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.json({ success: true, count: list.length, applications: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE LEGACY APPLICATION DETAILS (JURISDICTION ENFORCED)
// Acceptance Test 7: An official cannot access legacy records outside their jurisdiction
router.get('/applications/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).trim();

    let app = embeddedStore.membership_applications.get(cleanId);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === cleanId || a.sainik_id === cleanId || (a.id && a.id.toUpperCase() === cleanId.toUpperCase())) {
          app = a;
          break;
        }
      }
    }

    if (!app) {
      return res.status(404).json({ success: false, error: 'Legacy application not found.' });
    }

    // Enforce Jurisdiction check
    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have jurisdictional authority to inspect legacy records outside your assigned territory.'
      });
    }

    // Fetch related audit & approval actions
    const actions = Array.from(embeddedStore.approval_actions.values())
      .filter(act => act.application_id === app.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch related batch history
    const batchHistory = Array.from(embeddedStore.batch_history.values())
      .filter(bh => bh.member_id === app.id || (app.sainik_id && bh.sainik_id === app.sainik_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      application: app,
      approvalActions: actions,
      batchHistory: batchHistory
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. VERIFY HISTORICAL JOINING DATE (AUTHORIZED OFFICIAL ONLY)
// Acceptance Test 5 & 6:
// - Non-authorized official cannot modify or verify joining date
// - Date must be verified with recorded justification
router.post('/applications/:id/verify-date', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'district_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedDate, precision, reason, notes, evidenceVerified } = req.body;

    let app = embeddedStore.membership_applications.get(id);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === id || a.sainik_id === id) { app = a; break; }
      }
    }

    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    // Jurisdiction check
    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You cannot verify dates for applicants outside your assigned jurisdiction.'
      });
    }

    const recordedReason = (notes || reason || '').trim();
    if (!recordedReason) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory Requirement: A recorded verification reason or archival citation must be provided.'
      });
    }

    const finalDate = (verifiedDate || app.original_joining_date || '').trim();
    if (!finalDate) {
      return res.status(400).json({
        success: false,
        error: 'A verified original joining date (e.g. YYYY-MM-DD or YYYY) is required.'
      });
    }

    // Update joining date verification
    const oldDate = app.original_joining_date;
    app.original_joining_date = finalDate;
    const yrMatch = String(finalDate).match(/\b(19\d{2}|20\d{2})\b/);
    app.verified_joining_year = yrMatch ? parseInt(yrMatch[1], 10) : 2026;
    app.joining_date_precision = precision || app.joining_date_precision || 'EXACT_DATE';
    app.joining_date_verified = true;
    app.joining_date_verified_by = req.user.full_name || req.user.email;
    app.joining_date_verified_at = new Date().toISOString();
    app.joining_date_verification_notes = recordedReason;
    app.evidence_verified = evidenceVerified ?? true;

    // Advance Status: If batch is not yet assigned, status becomes BATCH_PENDING
    if (!app.batch_code) {
      app.status = 'BATCH_PENDING';
      app.legacy_verification_status = 'BATCH_PENDING';
    } else {
      app.status = 'UNDER_VERIFICATION';
      app.legacy_verification_status = 'UNDER_VERIFICATION';
    }
    app.updated_at = new Date().toISOString();

    // Record Approval Action
    const actionId = 'act_' + app.id + '_date_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: 'step_date_verification',
      official_id: req.user.id,
      official_name: req.user.full_name,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'VERIFY_JOINING_DATE',
      previous_status: 'DATE_VERIFICATION_PENDING',
      new_status: app.status,
      remarks: `Historical joining date verified as '${finalDate}' (Previously: '${oldDate || 'UNKNOWN'}'). Justification: ${recordedReason}`,
      created_at: new Date().toISOString()
    });

    // Audit log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'JOINING_DATE_VERIFIED',
      entity_type: 'LEGACY_APPLICATION',
      entity_id: app.id,
      details: { verifiedDate: finalDate, oldDate, notes: recordedReason },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.json({
      success: true,
      message: 'Original joining date successfully verified and recorded.',
      originalJoiningDate: app.original_joining_date,
      joiningDateVerified: app.joining_date_verified,
      status: app.status
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. ASSIGN BATCH TO LEGACY APPLICATION
// Acceptance Test 2 & 5:
// - Batch is determined by approved batch policy
// - Unverified joining date cannot be treated as verified (must verify date before assigning batch)
router.post('/applications/:id/assign-batch', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { batchCode, reason } = req.body;

    let app = embeddedStore.membership_applications.get(id);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === id || a.sainik_id === id) { app = a; break; }
      }
    }

    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    // Jurisdiction check
    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({ success: false, error: 'Access Denied: Territorial jurisdiction mismatch.' });
    }

    // MANDATORY CONSTRAINT: Original joining date MUST be verified before assigning batch!
    if (!app.joining_date_verified) {
      return res.status(400).json({
        success: false,
        error: 'Workflow Violation: The original joining date must be verified by an authorized official before batch allocation.'
      });
    }

    // Compute batch according to policy or validate passed batchCode
    let assignedBatch = batchCode ? batchCode.trim().toUpperCase() : null;
    if (!assignedBatch) {
      assignedBatch = computeBatchCode(app.original_joining_date, app.state_name);
    }

    // Ensure batch exists in batch table
    if (!embeddedStore.batches.has(assignedBatch)) {
      const yearMatch = assignedBatch.match(/\b(19\d{2}|20\d{2})\b/);
      const bYear = yearMatch ? yearMatch[1] : '2026';
      embeddedStore.batches.set(assignedBatch, {
        id: 'batch_' + assignedBatch.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        batch_code: assignedBatch,
        batch_name: `SSD Cadre Batch (${assignedBatch})`,
        start_date: `${bYear}-01-01`,
        end_date: `${bYear}-12-31`,
        scope: 'NATIONAL',
        allocation_rule: 'CALENDAR_YEAR',
        notes: `Allocated for verified joining date ${app.original_joining_date}`,
        created_by: req.user.full_name,
        created_at: new Date().toISOString(),
        status: 'ACTIVE'
      });
    }

    const prevBatch = app.batch_code || 'UNASSIGNED';
    app.batch_id = 'batch_' + assignedBatch.toLowerCase().replace(/[^a-z0-9]/g, '_');
    app.batch_code = assignedBatch;
    app.batch_no = assignedBatch;
    app.batch_assignment_status = 'ASSIGNED';
    app.batch_assigned_by = req.user.full_name || req.user.email;
    app.batch_assigned_at = new Date().toISOString();
    app.status = 'APPROVED';
    app.legacy_verification_status = 'APPROVED';
    app.updated_at = new Date().toISOString();

    // Record in batch_history
    const historyId = 'bh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    embeddedStore.batch_history.set(historyId, {
      id: historyId,
      member_id: app.id,
      sainik_id: app.sainik_id || null,
      previous_batch_code: prevBatch,
      new_batch_code: assignedBatch,
      change_type: 'INITIAL_ASSIGNMENT',
      reason: reason || `Assigned based on verified original joining date (${app.original_joining_date}) under approved batch policy.`,
      changed_by: req.user.full_name || req.user.email,
      changed_by_role: req.user.role_id,
      created_at: new Date().toISOString()
    });

    // Record in approval actions
    const actionId = 'act_' + app.id + '_batch_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: 'step_batch_assignment',
      official_id: req.user.id,
      official_name: req.user.full_name,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'ASSIGN_BATCH',
      previous_status: 'BATCH_PENDING',
      new_status: 'APPROVED',
      remarks: `Batch allocated as '${assignedBatch}' based on verified joining date (${app.original_joining_date}).`,
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    return res.json({
      success: true,
      message: `Batch '${assignedBatch}' successfully allocated.`,
      batchCode: assignedBatch,
      status: app.status
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. FINAL COMMISSIONING & ACTIVATION OF LEGACY MEMBER
// Acceptance Test 1, 3, 11:
// - Retains verified original joining date (e.g. 2012)
// - Portal registration date remains immutable server date (e.g. 2026)
// - Digital ID generated ONLY after required approvals
router.post('/applications/:id/approve', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, remarks } = req.body;

    let app = embeddedStore.membership_applications.get(id);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === id || a.sainik_id === id) { app = a; break; }
      }
    }

    if (!app) {
      return res.status(404).json({ success: false, error: 'Legacy application not found.' });
    }

    // Jurisdiction check
    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({ success: false, error: 'Access Denied: Territorial jurisdiction mismatch.' });
    }

    // MANDATORY CHECKS: Joining date must be verified and batch must be assigned!
    if (!app.joining_date_verified) {
      return res.status(400).json({
        success: false,
        error: 'Prerequisite Unfulfilled: Original joining date must be verified by an authorized officer before final activation.'
      });
    }

    if (!app.batch_code) {
      // Auto-assign batch if date is verified
      app.batch_code = computeBatchCode(app.original_joining_date, app.state_name);
      app.batch_no = app.batch_code;
      app.batch_assignment_status = 'ASSIGNED';
      app.batch_assigned_by = req.user.full_name;
      app.batch_assigned_at = new Date().toISOString();
    }

    // Check duplicate detection before commissioning
    const dupCheck = checkDuplicateLegacyMember({ ...app, id: app.id });
    if (dupCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        error: `Integrity Conflict: A record with matching ${dupCheck.field} (${dupCheck.match}) already exists in the registry.`
      });
    }

    // Generate Official Sainik ID
    const yr = app.verified_joining_year || (app.original_joining_date ? String(app.original_joining_date).slice(0, 4) : '2026');
    const alloc = await allocateSainikId(yr, {
      assignedBy: req.user.full_name || req.user.email,
      applicationId: app.id,
      membershipType: 'LEGACY'
    });
    const sainikId = alloc.sainikId;
    const memberId = 'mem_legacy_' + Date.now();
    const qrToken = 'qr_' + sainikId.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Update Application
    app.status = 'ACTIVE';
    app.legacy_verification_status = 'ACTIVE';
    app.sainik_id = sainikId;
    app.verified_joining_year = parseInt(yr, 10);
    app.sainik_id_generated_at = alloc.generatedAt;
    app.updated_at = new Date().toISOString();

    // Create Official Member Record
    const newMember = {
      id: memberId,
      sainik_id: sainikId,
      sainikId: sainikId,
      application_id: app.id,
      applicationId: app.id,
      membership_type: 'LEGACY',
      membershipType: 'LEGACY',
      full_name: app.full_name,
      fullName: app.full_name,
      name: app.full_name,
      email: app.email,
      mobile: app.mobile,
      phone: app.mobile,
      dob: app.dob,
      gender: app.gender,
      blood_group: app.blood_group,
      bloodGroup: app.blood_group,
      photo_url: app.photo_url || 'logo.png',
      photoUrl: app.photo_url || 'logo.png',
      state_name: app.state_name,
      state: app.state_name,
      district_name: app.district_name,
      district: app.district_name,
      taluka_name: app.taluka_name,
      chapter_name: app.chapter || `${app.district_name} Central Unit`,
      chapter: app.chapter || `${app.district_name} Central Unit`,
      wing_name: app.wing_name || 'Central Cadet Corps (Veteran Corps)',
      wing: app.wing_name || 'Central Cadet Corps (Veteran Corps)',
      designation: designation || app.current_designation || 'Veteran Sainik',
      original_joining_date: app.original_joining_date,
      originalJoiningDate: app.original_joining_date,
      verified_joining_year: parseInt(yr, 10),
      verifiedJoiningYear: parseInt(yr, 10),
      joining_year: parseInt(yr, 10),
      joiningYear: parseInt(yr, 10),
      joining_date_precision: app.joining_date_precision || 'EXACT_DATE',
      portal_registration_date: app.portal_registration_date || app.created_at,
      portalRegistrationDate: app.portal_registration_date || app.created_at,
      joining_date_verified: true,
      joiningDateVerified: true,
      joining_date_verified_by: app.joining_date_verified_by,
      joining_date_verified_at: app.joining_date_verified_at,
      joining_date_verification_notes: app.joining_date_verification_notes,
      sainik_id_generated_at: alloc.generatedAt,
      sainikIdGeneratedAt: alloc.generatedAt,
      batch_id: app.batch_id,
      batch_code: app.batch_code,
      batch_no: app.batch_code,
      batchNo: app.batch_code,
      status: 'ACTIVE',
      qr_token: qrToken,
      existing_sainik_id: app.existing_sainik_id || null,
      previous_responsibilities: app.previous_responsibilities || null,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      created_at: app.created_at,
      updated_at: new Date().toISOString()
    };

    embeddedStore.members.set(memberId, newMember);
    embeddedStore.members.set(sainikId, newMember);
    embeddedStore.members.set(app.id, newMember);

    // Record Action
    const actionId = 'act_' + app.id + '_approve_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: 'step_final_activation',
      official_id: req.user.id,
      official_name: req.user.full_name,
      official_role: req.user.role_id,
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'LEGACY_ACTIVATION',
      previous_status: 'APPROVED',
      new_status: 'ACTIVE',
      remarks: remarks || `Legacy Sainik verified & commissioned with batch ${app.batch_code} and verified joining date ${app.original_joining_date}.`,
      created_at: new Date().toISOString()
    });

    // Record Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'LEGACY_MEMBER_ACTIVATED',
      entity_type: 'MEMBER',
      entity_id: sainikId,
      details: {
        originalJoiningDate: app.original_joining_date,
        portalRegistrationDate: app.portal_registration_date,
        batchCode: app.batch_code
      },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();

    // Broadcast Realtime Events
    broadcastRealtimeEvent('legacy:approved', { sainikId, member: newMember });
    broadcastRealtimeEvent('membership:approve', { id: app.id, applicationId: app.id, sainikId, status: 'APPROVED', member: newMember });
    broadcastRealtimeEvent('stats:update');

    return res.json({
      success: true,
      message: 'Legacy Sainik officially commissioned and activated with full seniority and verified batch.',
      sainikId,
      originalJoiningDate: newMember.original_joining_date,
      portalRegistrationDate: newMember.portal_registration_date,
      batchNo: newMember.batch_no,
      member: newMember
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. REJECT LEGACY APPLICATION
router.post('/applications/:id/reject', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'district_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let app = embeddedStore.membership_applications.get(id);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === id || a.sainik_id === id) { app = a; break; }
      }
    }
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });

    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({ success: false, error: 'Access Denied: Jurisdictional boundary exceeded.' });
    }

    const prev = app.status;
    app.status = 'REJECTED';
    app.legacy_verification_status = 'REJECTED';
    app.rejection_reason = reason || 'Unverified legacy credentials.';
    app.updated_at = new Date().toISOString();

    const actionId = 'act_' + app.id + '_rej_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      official_id: req.user.id,
      official_name: req.user.full_name,
      action: 'REJECT',
      previous_status: prev,
      new_status: 'REJECTED',
      remarks: reason || 'Legacy application rejected.',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: 'Application rejected.', status: 'REJECTED' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. REQUEST CORRECTION / ADDITIONAL EVIDENCE
router.post('/applications/:id/correction', authenticate, requireRole('super_admin', 'central_admin', 'state_official', 'district_official', 'enlistment_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    let app = embeddedStore.membership_applications.get(id);
    if (!app) {
      for (const a of embeddedStore.membership_applications.values()) {
        if (a.id === id || a.sainik_id === id) { app = a; break; }
      }
    }
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });

    if (!canAccessRecord(req.user, app)) {
      return res.status(403).json({ success: false, error: 'Access Denied: Jurisdictional boundary exceeded.' });
    }

    const prev = app.status;
    app.status = 'CORRECTION_REQUIRED';
    app.legacy_verification_status = 'CORRECTION_REQUIRED';
    app.correction_remarks = remarks || 'Additional proof or date clarification required.';
    app.updated_at = new Date().toISOString();

    const actionId = 'act_' + app.id + '_cor_' + Date.now();
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      official_id: req.user.id,
      official_name: req.user.full_name,
      action: 'REQUEST_CORRECTION',
      previous_status: prev,
      new_status: 'CORRECTION_REQUIRED',
      remarks: remarks || 'Correction requested.',
      created_at: new Date().toISOString()
    });

    saveEmbeddedStore();
    return res.json({ success: true, message: 'Correction requested from applicant.', status: 'CORRECTION_REQUIRED' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. HISTORICAL RECORDS BULK IMPORT
// Acceptance Test 8 & Prompt Requirement:
// - Bulk imports must not automatically mark members as verified or active.
// - Imported records must follow the approved verification policy (imported into queue as unverified).
// - Validates records and detects duplicates.
router.post('/bulk-import', authenticate, requireRole('super_admin', 'central_admin'), async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'An array of historical member records is required.' });
    }

    const imported = [];
    const duplicates = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec.fullName || !rec.mobile) {
        errors.push({ index: i, error: 'Full name and mobile number are required.' });
        continue;
      }

      // Check duplicates
      const dup = checkDuplicateLegacyMember({
        mobile: rec.mobile,
        email: rec.email,
        existingSainikId: rec.existingSainikId
      });

      if (dup.isDuplicate) {
        duplicates.push({
          index: i,
          fullName: rec.fullName,
          mobile: rec.mobile,
          field: dup.field,
          matchedRecord: dup.match
        });
        continue;
      }

      // Generate app ID
      const appId = generateLegacyAppId();
      const hasDate = Boolean(rec.originalJoiningDate);
      const isApprox = rec.joiningDatePrecision === 'APPROXIMATE_UNKNOWN' || !hasDate;

      // CRITICAL RULE: Bulk imports must NOT automatically activate or verify members!
      const initialStatus = isApprox ? 'DATE_VERIFICATION_PENDING' : 'LEGACY_SUBMITTED';

      const legacyApp = {
        id: appId,
        full_name: rec.fullName.trim(),
        mobile: String(rec.mobile).trim(),
        email: rec.email ? rec.email.trim().toLowerCase() : '',
        dob: rec.dob || null,
        gender: rec.gender || 'Unspecified',
        address: rec.address || '',
        state_id: rec.stateId || 'state_mh',
        state_name: rec.stateName || rec.state || 'Maharashtra',
        district_id: rec.districtId || null,
        district_name: rec.districtName || rec.district || 'Nagpur',
        taluka_name: rec.talukaName || rec.taluka || '',
        chapter: rec.chapter || `${rec.districtName || 'Nagpur'} Chapter`,
        chapter_name: rec.chapter || `${rec.districtName || 'Nagpur'} Chapter`,
        wing_name: rec.wingName || 'Central Cadet Corps (Veteran Corps)',
        wing_id: 'wing_veteran',
        current_designation: rec.designation || rec.currentDesignation || 'Veteran Sainik',
        previous_responsibilities: rec.previousResponsibilities || '',
        existing_sainik_id: rec.existingSainikId || null,
        original_joining_date: rec.originalJoiningDate || null,
        joining_date_precision: rec.joiningDatePrecision || (hasDate ? 'EXACT_DATE' : 'APPROXIMATE_UNKNOWN'),
        portal_registration_date: new Date().toISOString(),
        joining_date_verified: false, // NEVER AUTO-VERIFIED
        joining_date_verified_by: null,
        joining_date_verified_at: null,
        batch_id: null,
        batch_code: null,
        batch_assignment_status: 'PENDING',
        membership_type: 'LEGACY',
        status: initialStatus,
        legacy_verification_status: initialStatus,
        photo_url: rec.photoUrl || 'logo.png',
        import_batch_id: 'bulk_' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      embeddedStore.membership_applications.set(appId, legacyApp);
      imported.push({ id: appId, fullName: legacyApp.full_name, mobile: legacyApp.mobile, status: initialStatus });
    }

    saveEmbeddedStore();

    // Record Audit Log
    const auditId = 'log_' + Date.now();
    embeddedStore.audit_logs.set(auditId, {
      id: auditId,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.role_id,
      action: 'BULK_IMPORT_LEGACY_RECORDS',
      entity_type: 'LEGACY_APPLICATIONS',
      details: { importedCount: imported.length, duplicateCount: duplicates.length, errorCount: errors.length },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: `Bulk import completed: ${imported.length} unverified records queued for review, ${duplicates.length} duplicate records skipped.`,
      importedCount: imported.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      imported,
      duplicates,
      errors
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. AGGREGATED LEGACY SAINIK STATISTICS (KPI DASHBOARD)
router.get('/stats', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    let apps = Array.from(embeddedStore.membership_applications.values())
      .filter(a => a.membership_type === 'LEGACY');

    let members = Array.from(embeddedStore.members.values())
      .filter(m => m.membership_type === 'LEGACY');

    if (req.jurisdictionFilter) {
      const jf = req.jurisdictionFilter;
      apps = apps.filter(a => {
        if (jf.state_id && a.state_name && !a.state_name.toLowerCase().includes(jf.state_id.replace('state_', '').toLowerCase())) return false;
        if (jf.district_id && a.district_name) {
          const cleanDist = jf.district_id.replace('dist_mh_', '').replace('dist_', '').toLowerCase();
          if (!a.district_name.toLowerCase().includes(cleanDist)) return false;
        }
        return true;
      });
      members = members.filter(m => {
        if (jf.state_id && m.state_name && !m.state_name.toLowerCase().includes(jf.state_id.replace('state_', '').toLowerCase())) return false;
        if (jf.district_id && m.district_name) {
          const cleanDist = jf.district_id.replace('dist_mh_', '').replace('dist_', '').toLowerCase();
          if (!m.district_name.toLowerCase().includes(cleanDist)) return false;
        }
        return true;
      });
    }

    const stats = {
      totalLegacy: apps.length + members.length,
      awaitingVerification: apps.filter(a => a.status === 'LEGACY_SUBMITTED' || a.status === 'UNDER_VERIFICATION').length,
      datesAwaitingConfirmation: apps.filter(a => a.status === 'DATE_VERIFICATION_PENDING').length,
      batchPending: apps.filter(a => a.status === 'BATCH_PENDING').length,
      approvedActive: members.length + apps.filter(a => a.status === 'ACTIVE' || a.status === 'APPROVED').length,
      rejectedDisputed: apps.filter(a => a.status === 'REJECTED' || a.status === 'CORRECTION_REQUIRED').length,
      totalBatches: embeddedStore.batches.size
    };

    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
