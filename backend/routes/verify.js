// ==========================================================================
// SAMATA SAINIK DAL (SSD) - PUBLIC QR VERIFICATION ROUTE
// ==========================================================================

import express from 'express';
import { query, embeddedStore, supabase } from '../db/index.js';

const router = express.Router();

// PUBLIC QR VERIFICATION API
router.get('/:sainikId', async (req, res) => {
  try {
    let { sainikId } = req.params;
    if (!sainikId) {
      return res.status(400).json({ success: false, verified: false, error: 'Sainik ID required.' });
    }

    // Clean and extract ID if full verification URL or path was passed in QR payload
    let cleanId = String(sainikId).trim();
    if (cleanId.includes('/verify/')) {
      cleanId = cleanId.split('/verify/').pop().split('/')[0].split('?')[0];
    }
    cleanId = cleanId.replace(/[?#].*$/, '').trim();

    const upperId = cleanId.toUpperCase();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const cleanLower = cleanId.toLowerCase();

    let member = null;

    // 0. Query Supabase Cloud database first if configured
    if (supabase) {
      try {
        const { data: supaMember } = await supabase
          .from('members')
          .select('*')
          .or(`sainik_id.ilike.${cleanId},id.ilike.${cleanId},qr_token.ilike.${cleanId},mobile.ilike.%${cleanDigits || cleanId}%,email.ilike.${cleanId}`)
          .limit(1)
          .maybeSingle();

        if (supaMember) {
          member = {
            sainik_id: supaMember.sainik_id || supaMember.id,
            full_name: supaMember.full_name || supaMember.name,
            photo_url: supaMember.photo_url || null,
            designation: supaMember.designation || 'Cadet Sainik',
            wing_name: supaMember.wing_name || 'Central Cadet Corps',
            state_name: supaMember.state_name || 'Maharashtra',
            district_name: supaMember.district_name || 'Nagpur',
            chapter_name: supaMember.chapter_name || `${supaMember.district_name || 'Nagpur'} Central Unit`,
            status: supaMember.status || 'ACTIVE',
            approved_at: supaMember.approved_at || supaMember.created_at,
            batch_no: supaMember.batch_no || 'BATCH-2026/Q1'
          };
        } else {
          const { data: supaApp } = await supabase
            .from('membership_applications')
            .select('*')
            .or(`id.ilike.${cleanId},sainik_id.ilike.${cleanId},mobile.ilike.%${cleanDigits || cleanId}%,email.ilike.${cleanId}`)
            .limit(1)
            .maybeSingle();

          if (supaApp) {
            const s = (supaApp.status || '').toUpperCase();
            const sainikNum = supaApp.sainik_id || ('SSD-' + (supaApp.state_name ? (supaApp.state_name.slice(0, 2).toUpperCase()) : 'MH') + '-2026-' + (String(supaApp.id).replace(/\D/g, '').slice(-4) || '1927'));
            member = {
              sainik_id: sainikNum,
              full_name: supaApp.full_name,
              photo_url: supaApp.photo_url || null,
              designation: supaApp.designation || (s === 'FINAL_APPROVED' || s === 'APPROVED' ? 'Cadet Sainik' : 'Enlistment Candidate'),
              wing_name: supaApp.wing_name || 'Central Cadet Corps',
              state_name: supaApp.state_name || 'Maharashtra',
              district_name: supaApp.district_name || 'Nagpur',
              chapter_name: `${supaApp.district_name || 'Nagpur'} Central Unit`,
              status: (s === 'FINAL_APPROVED' || s === 'APPROVED' || s === 'ACTIVE') ? 'ACTIVE' : (supaApp.status || 'SUBMITTED'),
              approved_at: supaApp.updated_at || supaApp.created_at,
              batch_no: supaApp.batch_no || 'BATCH-2026/Q3'
            };
          }
        }
      } catch (e) {
        // Fallback to embeddedStore
      }
    }

    // 1. Search across embeddedStore.members
    if (!member) {
      member = embeddedStore.members.get(cleanId) || embeddedStore.members.get(upperId);
      if (!member) {
        for (const m of embeddedStore.members.values()) {
          if (m.sainik_id && (m.sainik_id === cleanId || m.sainik_id.toUpperCase() === upperId)) { member = m; break; }
          if (m.id === cleanId || (m.id && m.id.toUpperCase() === upperId)) { member = m; break; }
          if (m.application_id && (m.application_id === cleanId || m.application_id.toUpperCase() === upperId)) { member = m; break; }
          if (m.qr_token && (m.qr_token === cleanId || m.qr_token.toUpperCase() === upperId)) { member = m; break; }
          if (m.email && m.email.toLowerCase() === cleanLower) { member = m; break; }
          if (m.mobile) {
            const mDigits = m.mobile.replace(/\D/g, '');
            if (m.mobile === cleanId || (cleanDigits.length >= 8 && (mDigits.includes(cleanDigits) || cleanDigits.includes(mDigits)))) {
              member = m;
              break;
            }
          }
          if (m.phone) {
            const pDigits = m.phone.replace(/\D/g, '');
            if (m.phone === cleanId || (cleanDigits.length >= 8 && (pDigits.includes(cleanDigits) || cleanDigits.includes(pDigits)))) {
              member = m;
              break;
            }
          }
        }
      }
    }

    // 2. Search across embeddedStore.membership_applications
    if (!member) {
      let app = embeddedStore.membership_applications.get(cleanId) || embeddedStore.membership_applications.get(upperId);
      if (!app) {
        for (const a of embeddedStore.membership_applications.values()) {
          if (a.id === cleanId || (a.id && a.id.toUpperCase() === upperId)) { app = a; break; }
          if (a.sainik_id && (a.sainik_id === cleanId || a.sainik_id.toUpperCase() === upperId)) { app = a; break; }
          if (a.email && a.email.toLowerCase() === cleanLower) { app = a; break; }
          if (a.mobile) {
            const aDigits = a.mobile.replace(/\D/g, '');
            if (a.mobile === cleanId || (cleanDigits.length >= 8 && (aDigits.includes(cleanDigits) || cleanDigits.includes(aDigits)))) {
              app = a;
              break;
            }
          }
          if (a.phone) {
            const pDigits = a.phone.replace(/\D/g, '');
            if (a.phone === cleanId || (cleanDigits.length >= 8 && (pDigits.includes(cleanDigits) || cleanDigits.includes(pDigits)))) {
              app = a;
              break;
            }
          }
        }
      }

      if (app) {
        const s = (app.status || '').toUpperCase();
        const sainikNum = app.sainik_id || ('SSD-' + (app.state_name ? (app.state_name.slice(0, 2).toUpperCase()) : 'MH') + '-2026-' + (app.id.replace(/\D/g, '').slice(-4) || '1927'));
        member = {
          sainik_id: sainikNum,
          full_name: app.full_name,
          photo_url: app.photo_url || app.photoUrl || app.photoBase64 || app.photo || null,
          designation: app.designation || (s === 'FINAL_APPROVED' || s === 'APPROVED' ? 'Cadet Sainik' : 'Enlistment Candidate'),
          wing_name: app.wing_name,
          state_name: app.state_name,
          district_name: app.district_name,
          chapter_name: `${app.district_name || 'Nagpur'} Central Unit`,
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
      sainikId: member.sainik_id || member.id,
      fullName: member.full_name || member.fullName || 'Sainik Cadet',
      photoUrl: member.photo_url || member.photoUrl || member.photoBase64 || member.photo || null,
      designation: member.designation || 'Cadet Sainik',
      wing: member.wing_name || member.wing || 'Central Cadet Corps',
      state: member.state_name || member.state || 'Maharashtra',
      district: member.district_name || member.district || 'Nagpur',
      chapter: member.chapter_name || member.chapter || `${member.district_name || 'Nagpur'} Central Unit`,
      status: member.status || 'ACTIVE',
      commissionDate: member.approved_at || member.created_at || new Date().toISOString(),
      batchNo: member.batch_no || member.batchNo || 'BATCH-2026/Q1',
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
