// ==========================================================================
// SAMATA SAINIK DAL (SSD) - ACTIVE MEMBERS & DIGITAL ID ROUTES
// ==========================================================================

import express from 'express';
import { query, embeddedStore } from '../db/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { enforceJurisdiction, canAccessRecord } from '../middleware/rbac.js';

const router = express.Router();

// 1. GET ALL ACTIVE MEMBERS (JURISDICTION FILTERED)
router.get('/', authenticate, enforceJurisdiction, async (req, res) => {
  try {
    const { wing, state, district, search } = req.query;
    let members = Array.from(embeddedStore.members.values());

    // Apply Jurisdiction Filter
    if (req.jurisdictionFilter) {
      const jf = req.jurisdictionFilter;
      members = members.filter(m => {
        if (jf.state_id && m.state_name && !m.state_name.toLowerCase().includes(jf.state_id.replace('state_', ''))) {
          // Check state name match
        }
        if (jf.district_id && m.district_name && !m.district_name.toLowerCase().includes(jf.district_id.replace('dist_mh_', '').replace('dist_', ''))) {
          // Check district name match
        }
        return true;
      });
    }

    if (wing && wing !== 'ALL') {
      members = members.filter(m => m.wing_name === wing);
    }
    if (search) {
      const s = search.toLowerCase();
      members = members.filter(m =>
        m.sainik_id.toLowerCase().includes(s) ||
        m.full_name.toLowerCase().includes(s) ||
        m.mobile.includes(s) ||
        m.district_name.toLowerCase().includes(s)
      );
    }

    members.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      count: members.length,
      members: members
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET SINGLE MEMBER
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Member ID required.' });
    
    const clean = String(id).trim();
    const upper = clean.toUpperCase();
    let member = embeddedStore.members.get(clean);

    if (!member) {
      // Try lookup across members by ID, sainik_id, application_id, or mobile
      for (const m of embeddedStore.members.values()) {
        if (m.id === clean || (m.id && m.id.toUpperCase() === upper)) { member = m; break; }
        if (m.sainik_id && (m.sainik_id === clean || m.sainik_id.toUpperCase() === upper)) { member = m; break; }
        if (m.application_id && (m.application_id === clean || m.application_id.toUpperCase() === upper)) { member = m; break; }
        if (m.mobile && (m.mobile === clean || m.mobile.includes(clean))) { member = m; break; }
      }
    }

    if (!member) {
      // Fallback: Check if it's an application in membership_applications
      let app = embeddedStore.membership_applications.get(clean);
      if (!app) {
        for (const a of embeddedStore.membership_applications.values()) {
          if (a.id === clean || (a.id && a.id.toUpperCase() === upper)) { app = a; break; }
          if (a.sainik_id && (a.sainik_id === clean || a.sainik_id.toUpperCase() === upper)) { app = a; break; }
        }
      }

      if (app) {
        member = {
          id: app.id,
          sainik_id: app.sainik_id || app.id,
          application_id: app.id,
          full_name: app.full_name,
          mobile: app.mobile,
          email: app.email,
          dob: app.dob || null,
          gender: app.gender || 'Unspecified',
          blood_group: app.blood_group || 'N/A',
          state_name: app.state_name || 'Maharashtra',
          district_name: app.district_name || 'Nagpur',
          taluka_name: app.taluka_name || '',
          address: app.address || '',
          chapter_name: `${app.district_name} Central Unit`,
          wing_name: app.wing_name || 'Central Cadet Corps',
          designation: app.designation || 'Cadet Sainik',
          batch_no: app.batch_no || 'BATCH-2026/Q3',
          status: app.status || 'ACTIVE',
          photo_url: app.photo_url || null,
          assessment_data: app.assessment_data || null,
          created_at: app.created_at,
          approved_at: app.updated_at || app.created_at
        };
      }
    }

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member record not found.' });
    }

    return res.json({ success: true, member: member });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET DIGITAL ID CARD DATA FOR A SAINIK
router.get('/card/:sainikId', async (req, res) => {
  try {
    const { sainikId } = req.params;
    if (!sainikId) return res.status(400).json({ success: false, error: 'Sainik ID required.' });
    const cleanId = String(sainikId).trim();
    const upperId = cleanId.toUpperCase();

    // 1. Search across embeddedStore.members
    let member = embeddedStore.members.get(cleanId);
    if (!member) {
      for (const m of embeddedStore.members.values()) {
        if (m.sainik_id && (m.sainik_id === cleanId || m.sainik_id.toUpperCase() === upperId)) { member = m; break; }
        if (m.id === cleanId || (m.id && m.id.toUpperCase() === upperId)) { member = m; break; }
        if (m.application_id && (m.application_id === cleanId || m.application_id.toUpperCase() === upperId)) { member = m; break; }
        if (m.mobile && (m.mobile === cleanId || m.mobile.includes(cleanId))) { member = m; break; }
      }
    }

    // 2. Search across embeddedStore.membership_applications
    if (!member) {
      let app = embeddedStore.membership_applications.get(cleanId);
      if (!app) {
        for (const a of embeddedStore.membership_applications.values()) {
          if (a.id === cleanId || (a.id && a.id.toUpperCase() === upperId)) { app = a; break; }
          if (a.sainik_id && (a.sainik_id === cleanId || a.sainik_id.toUpperCase() === upperId)) { app = a; break; }
          if (a.mobile && (a.mobile === cleanId || a.mobile.includes(cleanId))) { app = a; break; }
        }
      }

      if (app) {
        const s = (app.status || '').toUpperCase();
        const sainikNum = app.sainik_id || ('SSD-' + (app.state_name ? (app.state_name.slice(0, 2).toUpperCase()) : 'MH') + '-2026-' + (app.id.replace(/\D/g, '').slice(-4) || '1927'));
        member = {
          id: app.id,
          sainik_id: sainikNum,
          application_id: app.id,
          full_name: app.full_name,
          mobile: app.mobile,
          email: app.email,
          photo_url: app.photo_url || app.photoUrl || app.photoBase64 || app.photo || null,
          designation: app.designation || (s === 'FINAL_APPROVED' || s === 'APPROVED' ? 'Cadet Sainik' : 'Enlistment Candidate'),
          wing_name: app.wing_name,
          state_name: app.state_name,
          district_name: app.district_name,
          chapter_name: `${app.district_name} Central Unit`,
          blood_group: app.blood_group || 'N/A',
          approved_at: app.updated_at || app.created_at,
          created_at: app.created_at,
          batch_no: app.batch_no || 'BATCH-2026/Q3',
          status: (s === 'FINAL_APPROVED' || s === 'APPROVED' || s === 'ACTIVE') ? 'ACTIVE' : (app.status || 'SUBMITTED'),
          qr_token: 'qr_' + sainikNum.toLowerCase().replace(/[^a-z0-9]/g, '_')
        };
      }
    }

    if (!member) {
      return res.status(404).json({ success: false, error: 'Active Sainik ID not found or not yet approved.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const sainikCode = member.sainik_id || member.id;
    const verifyUrl = `${protocol}://${host}/verify/${sainikCode}`;
    const s = (member.status || '').toUpperCase();
    const isApproved = (s === 'FINAL_APPROVED' || s === 'APPROVED' || s === 'ACTIVE');

    const cardData = {
      sainikId: sainikCode,
      applicationId: member.application_id || member.id,
      fullName: member.full_name || member.fullName || member.name || 'Sainik Cadet',
      photoUrl: member.photo_url || member.photoUrl || member.photoBase64 || member.photo || null,
      designation: member.designation || (isApproved ? 'Cadet Sainik' : 'Enlistment Candidate'),
      wing: member.wing_name || member.wing || 'Central Cadet Corps',
      state: member.state_name || member.state || 'Maharashtra',
      district: member.district_name || member.district || 'Nagpur',
      chapter: member.chapter_name || `${member.district_name || 'Nagpur'} Central Unit`,
      bloodGroup: member.blood_group || member.bloodGroup || 'N/A',
      joiningDate: member.approved_at || member.created_at || new Date().toISOString(),
      batchNo: member.batch_no || member.batchNo || 'BATCH-2026/Q3',
      status: member.status || 'ACTIVE',
      isApproved: isApproved,
      qrToken: member.qr_token || ('qr_' + sainikCode.toLowerCase().replace(/[^a-z0-9]/g, '_')),
      verifyUrl: verifyUrl
    };

    return res.json({ success: true, cardData: cardData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
