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
    const cleanId = (sainikId || '').trim().toUpperCase();

    const member = Array.from(embeddedStore.members.values()).find(
      m => m.sainik_id.toUpperCase() === cleanId || (m.qr_token && m.qr_token === sainikId)
    );

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
      photoUrl: member.photo_url,
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
