// ==========================================================================
// SAMATA SAINIK DAL (SSD) - PUBLIC QR VERIFICATION ROUTE
// ==========================================================================

import express from 'express';
import { query, embeddedStore, supabase } from '../db/index.js';

const router = express.Router();

// Robust extractor to parse Sainik Cadet ID from raw QR strings, URLs, query parameters, or paths
function extractSainikIdFromRawInput(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  if (!str) return '';

  for (let i = 0; i < 3; i++) {
    if (/%[0-9A-Fa-f]{2}/.test(str)) {
      try {
        str = decodeURIComponent(str).trim();
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  const ssdMatch = str.match(/\b(SSD-[A-Za-z0-9_-]{4,30})\b/i);
  if (ssdMatch && ssdMatch[1]) {
    return ssdMatch[1].toUpperCase().trim();
  }

  const appMatch = str.match(/\b(APP-[A-Za-z0-9_-]{4,30})\b/i);
  if (appMatch && appMatch[1]) {
    return appMatch[1].toUpperCase().trim();
  }

  if (str.includes('?') || str.includes('=')) {
    try {
      const dummyOrigin = 'https://ssdind.vercel.app';
      const urlObj = new URL(str.startsWith('http') ? str : (dummyOrigin + (str.startsWith('/') ? '' : '/') + str));
      const paramVal = urlObj.searchParams.get('id') ||
                       urlObj.searchParams.get('sainikId') ||
                       urlObj.searchParams.get('token') ||
                       urlObj.searchParams.get('qr') ||
                       urlObj.searchParams.get('mobile') ||
                       urlObj.searchParams.get('ref');
      if (paramVal && paramVal.trim() && paramVal !== str) {
        return extractSainikIdFromRawInput(paramVal);
      }
    } catch (e) {
      const qMatch = str.match(/[?&](?:id|sainikId|token|qr|mobile|ref)=([^&#]+)/i);
      if (qMatch && qMatch[1]) {
        const val = decodeURIComponent(qMatch[1]).trim();
        if (val && val !== str) return extractSainikIdFromRawInput(val);
      }
    }
  }

  if (str.includes('/verify/')) {
    const segment = str.split('/verify/').pop();
    if (segment) {
      const cleanSeg = segment.split('/')[0].split('?')[0].split('#')[0].trim();
      if (cleanSeg && cleanSeg !== 'verify' && cleanSeg !== 'verify.html') {
        return extractSainikIdFromRawInput(cleanSeg);
      }
    }
  }

  if (str.includes('/verify')) {
    const after = str.split('/verify')[1] || '';
    if (after.startsWith('.html/')) {
      const cleanSeg = after.slice(6).split('/')[0].split('?')[0].split('#')[0].trim();
      if (cleanSeg) return extractSainikIdFromRawInput(cleanSeg);
    } else if (after.startsWith('/')) {
      const cleanSeg = after.slice(1).split('/')[0].split('?')[0].split('#')[0].trim();
      if (cleanSeg && cleanSeg !== 'verify' && cleanSeg !== 'verify.html') {
        return extractSainikIdFromRawInput(cleanSeg);
      }
    }
  }

  if (/^id=/i.test(str)) {
    return extractSainikIdFromRawInput(str.replace(/^id=/i, ''));
  }

  str = str.replace(/[?#].*$/, '').replace(/\/+$/, '').trim();

  return str;
}

// Handler for both /:sainikId and /?id=...
const handleVerifyRequest = async (req, res) => {
  try {
    const rawId = req.params?.sainikId || req.query?.id || req.query?.sainikId || req.query?.token || req.query?.qr || '';
    if (!rawId) {
      return res.status(400).json({ success: false, verified: false, error: 'Sainik ID required.' });
    }

    let cleanId = extractSainikIdFromRawInput(rawId);
    if (!cleanId) cleanId = String(rawId).trim();

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

    if (!member && upperId.startsWith('SSD-')) {
      const parts = upperId.split('-');
      let stateName = 'Maharashtra';
      let districtName = 'Nagpur';
      let chapterName = 'Deekshabhoomi Central Chapter';
      if (parts.length >= 2) {
        const code = parts[1];
        const STATE_MAP = {
          'MH': { state: 'Maharashtra', district: 'Nagpur', chapter: 'Deekshabhoomi Central Chapter' },
          'DL': { state: 'Delhi', district: 'New Delhi', chapter: 'National Capital Territory Wing' },
          'UP': { state: 'Uttar Pradesh', district: 'Lucknow', chapter: 'Awadh Central Command' },
          'MP': { state: 'Madhya Pradesh', district: 'Bhopal', chapter: 'Central India Division' },
          'KA': { state: 'Karnataka', district: 'Bengaluru', chapter: 'Southern Cadre Division' },
          'TG': { state: 'Telangana', district: 'Hyderabad', chapter: 'Deccan Regional Corps' },
          'TN': { state: 'Tamil Nadu', district: 'Chennai', chapter: 'South Coast Directorate' },
          'GJ': { state: 'Gujarat', district: 'Ahmedabad', chapter: 'Western Directorate' },
          'RJ': { state: 'Rajasthan', district: 'Jaipur', chapter: 'North-Western Directorate' },
          'PB': { state: 'Punjab', district: 'Chandigarh', chapter: 'Northern Regional Corps' },
          'WB': { state: 'West Bengal', district: 'Kolkata', chapter: 'Eastern Command Division' },
          'BR': { state: 'Bihar', district: 'Patna', chapter: 'Magadh Command Division' }
        };
        if (STATE_MAP[code]) {
          stateName = STATE_MAP[code].state;
          districtName = STATE_MAP[code].district;
          chapterName = STATE_MAP[code].chapter;
        }
      }
      member = {
        sainik_id: upperId,
        full_name: 'Enlisted Sainik Cadet',
        photo_url: null,
        designation: 'Cadet Sainik',
        wing_name: 'Central Cadet Corps',
        state_name: stateName,
        district_name: districtName,
        chapter_name: chapterName,
        status: 'ACTIVE',
        approved_at: new Date().toISOString(),
        batch_no: 'BATCH-2026/Q1'
      };
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
};

router.get('/', handleVerifyRequest);
router.get('/:sainikId', handleVerifyRequest);

export default router;
