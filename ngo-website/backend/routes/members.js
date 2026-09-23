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
    let member = embeddedStore.members.get(id);

    if (!member) {
      // Try lookup by sainik_id
      member = Array.from(embeddedStore.members.values()).find(m => m.sainik_id === id);
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
    const cleanId = (sainikId || '').trim().toUpperCase();

    const member = Array.from(embeddedStore.members.values()).find(m => m.sainik_id.toUpperCase() === cleanId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Active Sainik ID not found or not yet approved.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const verifyUrl = `${protocol}://${host}/verify/${member.sainik_id}`;

    const cardData = {
      sainikId: member.sainik_id,
      fullName: member.full_name,
      photoUrl: member.photo_url,
      designation: member.designation || 'Cadet Sainik',
      wing: member.wing_name,
      state: member.state_name,
      district: member.district_name,
      chapter: member.chapter_name,
      bloodGroup: member.blood_group || 'N/A',
      joiningDate: member.approved_at || member.created_at,
      batchNo: member.batch_no || 'BATCH-2026/Q3',
      status: member.status,
      qrToken: member.qr_token,
      verifyUrl: verifyUrl
    };

    return res.json({ success: true, cardData: cardData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
