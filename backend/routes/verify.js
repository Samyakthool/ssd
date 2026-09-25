// ==========================================================================
// SAMATA SAINIK DAL (SSD) - PUBLIC QR VERIFICATION ROUTE
// ==========================================================================

import express from 'express';
import { query, embeddedStore } from '../db/index.js';

const router = express.Router();

// PUBLIC QR VERIFICATION API
router.get('/:sainikId', async (req, res) => {
  try {
    const { sainikId } = req.params;
    if (!sainikId) {
      return res.status(400).json({ success: false, verified: false, error: 'Sainik ID required.' });
    }
    const cleanId = String(sainikId).trim();
    const upperId = cleanId.toUpperCase();

    let member = embeddedStore.members.get(cleanId);
    if (!member) {
      for (const m of embeddedStore.members.values()) {
        if (m.sainik_id && (m.sainik_id === cleanId || m.sainik_id.toUpperCase() === upperId)) { member = m; break; }
        if (m.id === cleanId || (m.id && m.id.toUpperCase() === upperId)) { member = m; break; }
        if (m.application_id && (m.application_id === cleanId || m.application_id.toUpperCase() === upperId)) { member = m; break; }
        if (m.qr_token && m.qr_token === cleanId) { member = m; break; }
      }
    }

    if (!member) {
      let app = embeddedStore.membership_applications.get(cleanId);
      if (!app) {
        for (const a of embeddedStore.membership_applications.values()) {
          if (a.id === cleanId || (a.id && a.id.toUpperCase() === upperId)) { app = a; break; }
          if (a.sainik_id && (a.sainik_id === cleanId || a.sainik_id.toUpperCase() === upperId)) { app = a; break; }
        }
      }

      if (app) {
        const s = (app.status || '').toUpperCase();
        member = {
          sainik_id: app.sainik_id || app.id,
          full_name: app.full_name,
          photo_url: app.photo_url || app.photoUrl || app.photoBase64 || app.photo || null,
          designation: app.designation || (s === 'FINAL_APPROVED' || s === 'APPROVED' ? 'Cadet Sainik' : 'Enlistment Candidate'),
          wing_name: app.wing_name,
          state_name: app.state_name,
          district_name: app.district_name,
          chapter_name: `${app.district_name} Central Unit`,
          status: (s === 'FINAL_APPROVED' || s === 'APPROVED' || s === 'ACTIVE') ? 'ACTIVE' : (app.status || 'SUBMITTED'),
          approved_at: app.updated_at || app.created_at,
          batch_no: app.batch_no || 'BATCH-2026/Q3'
        };
      }
    }

    if (!member) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Invalid or Unregistered Sainik ID. No active credentials found on the Central Command registry.'
      });
    }

    // STRICT SANITIZATION: Never expose address, phone, email, or private data
    const publicVerificationData = {
      verified: true,
      sainikId: member.sainik_id,
      fullName: member.full_name,
      photoUrl: member.photo_url || member.photoUrl || member.photoBase64 || member.photo || null,
      designation: member.designation,
      wing: member.wing_name,
      state: member.state_name,
      district: member.district_name,
      chapter: member.chapter_name,
      status: member.status,
      commissionDate: member.approved_at || member.created_at,
      batchNo: member.batch_no,
      authority: 'National Executive Directorate, Central Command HQ Nagpur'
    };

    return res.json({
      success: true,
      verification: publicVerificationData
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: 'Verification service error: ' + err.message });
  }
});

export default router;
