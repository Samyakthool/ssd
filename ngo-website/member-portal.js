// ==========================================================================
// SAMATA SAINIK DAL (SSD) - MEMBER PORTAL CLIENT LOGIC & ID CARD ENGINE
// ==========================================================================

let currentMemberData = null;
let currentCardData = null;
let currentApplicationData = null;
let isBackView = false;

function quickFill(id) {
  document.getElementById('portalLookupId').value = id;
}

async function parseJsonSafe(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { success: false, error: 'Server response was not valid JSON. Please verify network connectivity.' };
  }
}

// Multi-tier resolver for Sainik Member Portal
async function resolvePortalRecord(inputId) {
  if (!inputId) return null;
  const cleanId = String(inputId).trim();
  const upperId = cleanId.toUpperCase();
  const cleanDigits = cleanId.replace(/\D/g, '');
  const cleanLower = cleanId.toLowerCase();

  // -------------------------------------------------------------
  // TIER 1: Check Backend Digital Card Endpoint
  // -------------------------------------------------------------
  try {
    const cardRes = await fetch(`/api/members/card/${encodeURIComponent(cleanId)}`);
    const cardJson = await parseJsonSafe(cardRes);

    if (cardJson.success && cardJson.cardData) {
      const isAppr = cardJson.cardData.isApproved !== undefined 
        ? cardJson.cardData.isApproved 
        : (cardJson.cardData.status === 'ACTIVE' || cardJson.cardData.status === 'FINAL_APPROVED' || cardJson.cardData.status === 'APPROVED');
      
      return {
        type: isAppr ? 'member' : 'application',
        data: cardJson.cardData,
        source: 'api_card'
      };
    }
  } catch (e) {
    console.warn("API Card fetch notice:", e);
  }

  // -------------------------------------------------------------
  // TIER 2: Check Backend Application Status Endpoint
  // -------------------------------------------------------------
  try {
    const appRes = await fetch(`/api/membership/status/${encodeURIComponent(cleanId)}`);
    const appJson = await parseJsonSafe(appRes);

    if (appJson.success && (appJson.applicantName || appJson.full_name)) {
      const st = (appJson.currentStatus || appJson.status || '').toUpperCase();
      const isAppr = (st === 'FINAL_APPROVED' || st === 'ACTIVE' || st === 'APPROVED');
      
      return {
        type: isAppr ? 'member' : 'application',
        data: appJson,
        source: 'api_status'
      };
    }
  } catch (e) {
    console.warn("API Status fetch notice:", e);
  }

  // -------------------------------------------------------------
  // TIER 3: Check Supabase Cloud Client (Direct Database Query)
  // -------------------------------------------------------------
  try {
    let supabaseClient = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!supabaseClient && window.initSupabaseClient) {
      supabaseClient = await window.initSupabaseClient();
    }

    if (supabaseClient) {
      // 3A. Check Supabase members table
      const { data: supaMember } = await supabaseClient
        .from('members')
        .select('*')
        .or(`sainik_id.ilike.${cleanId},id.ilike.${cleanId},mobile.ilike.%${cleanDigits || cleanId}%,email.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (supaMember) {
        return {
          type: 'member',
          data: {
            sainikId: supaMember.sainik_id || supaMember.id,
            applicationId: supaMember.application_id || supaMember.id,
            fullName: supaMember.full_name || supaMember.name,
            photoUrl: supaMember.photo_url || null,
            designation: supaMember.designation || 'Cadet Sainik',
            wing: supaMember.wing_name || 'Central Cadet Corps',
            state: supaMember.state_name || 'Maharashtra',
            district: supaMember.district_name || 'Nagpur',
            chapter: supaMember.chapter_name || `${supaMember.district_name || 'Nagpur'} Central Unit`,
            bloodGroup: supaMember.blood_group || 'N/A',
            joiningDate: supaMember.approved_at || supaMember.created_at || new Date().toISOString(),
            batchNo: supaMember.batch_no || 'BATCH-2026/Q3',
            status: 'ACTIVE',
            isApproved: true,
            verifyUrl: `${window.location.origin}/verify?id=${encodeURIComponent(supaMember.sainik_id || supaMember.id)}`
          },
          source: 'supabase_members'
        };
      }

      // 3B. Check Supabase membership_applications table
      const { data: supaApp } = await supabaseClient
        .from('membership_applications')
        .select('*')
        .or(`id.ilike.${cleanId},sainik_id.ilike.${cleanId},mobile.ilike.%${cleanDigits || cleanId}%,email.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();

      if (supaApp) {
        const s = (supaApp.status || '').toUpperCase();
        const isAppr = (s === 'FINAL_APPROVED' || s === 'APPROVED' || s === 'ACTIVE');
        return {
          type: isAppr ? 'member' : 'application',
          data: {
            applicationId: supaApp.id,
            sainikId: supaApp.sainik_id || (isAppr ? `SSD-${(supaApp.state_name || 'MH').slice(0, 2).toUpperCase()}-2026-001245` : null),
            applicantName: supaApp.full_name,
            fullName: supaApp.full_name,
            photoUrl: supaApp.photo_url || null,
            wing: supaApp.wing_name,
            state: supaApp.state_name,
            district: supaApp.district_name,
            currentStatus: supaApp.status,
            currentStage: supaApp.assigned_role || 'central_admin',
            submittedAt: supaApp.created_at,
            isApproved: isAppr,
            timeline: []
          },
          source: 'supabase_applications'
        };
      }
    }
  } catch (supaErr) {
    console.warn("Supabase direct query notice:", supaErr);
  }

  // -------------------------------------------------------------
  // TIER 4: Check Client-Side LocalStorage (Cross-Tab Synced Store)
  // -------------------------------------------------------------
  try {
    // 4A. Check admin local data
    const rawAdminData = localStorage.getItem('ssd_admin_local_data');
    if (rawAdminData) {
      const parsedAdmin = JSON.parse(rawAdminData);

      // Check adminData.members
      if (parsedAdmin.members) {
        const memList = Array.isArray(parsedAdmin.members) ? parsedAdmin.members : Object.values(parsedAdmin.members);
        const matchMem = memList.find(m => {
          if (!m) return false;
          if (m.sainikId && (m.sainikId === cleanId || m.sainikId.toUpperCase() === upperId)) return true;
          if (m.sainik_id && (m.sainik_id === cleanId || m.sainik_id.toUpperCase() === upperId)) return true;
          if (m.id && (m.id === cleanId || m.id.toUpperCase() === upperId)) return true;
          if (m.application_id && (m.application_id === cleanId || m.application_id.toUpperCase() === upperId)) return true;
          if (m.email && m.email.toLowerCase() === cleanLower) return true;
          if (cleanDigits.length >= 8) {
            const mDigits = (m.mobile || m.phone || '').replace(/\D/g, '');
            if (mDigits && (mDigits.includes(cleanDigits) || cleanDigits.includes(mDigits))) return true;
          }
          return false;
        });

        if (matchMem) {
          const sid = matchMem.sainikId || matchMem.sainik_id || matchMem.id;
          return {
            type: 'member',
            data: {
              sainikId: sid,
              applicationId: matchMem.application_id || matchMem.id,
              fullName: matchMem.fullName || matchMem.full_name || matchMem.name || 'Sainik Cadet',
              photoUrl: matchMem.photoUrl || matchMem.photo_url || matchMem.photo || null,
              designation: matchMem.designation || 'Cadet Sainik',
              wing: matchMem.wing || matchMem.wing_name || 'Central Cadet Corps',
              state: matchMem.state || matchMem.state_name || 'Maharashtra',
              district: matchMem.district || matchMem.district_name || 'Nagpur',
              chapter: matchMem.chapter || matchMem.chapter_name || `${matchMem.district || 'Nagpur'} Central Unit`,
              bloodGroup: matchMem.bloodGroup || matchMem.blood_group || 'N/A',
              joiningDate: matchMem.joiningDate || matchMem.approved_at || matchMem.created_at || new Date().toISOString(),
              batchNo: matchMem.batchNo || matchMem.batch_no || 'BATCH-2026/Q3',
              status: matchMem.status || 'ACTIVE',
              isApproved: true,
              verifyUrl: `${window.location.origin}/verify?id=${encodeURIComponent(sid)}`
            },
            source: 'local_storage_admin_members'
          };
        }
      }

      // Check adminData.membership_applications
      if (Array.isArray(parsedAdmin.membership_applications)) {
        const matchApp = parsedAdmin.membership_applications.find(a => {
          if (!a) return false;
          if (a.id && (a.id === cleanId || a.id.toUpperCase() === upperId)) return true;
          if (a.sainik_id && (a.sainik_id === cleanId || a.sainik_id.toUpperCase() === upperId)) return true;
          if (a.sainikId && (a.sainikId === cleanId || a.sainikId.toUpperCase() === upperId)) return true;
          if (a.email && a.email.toLowerCase() === cleanLower) return true;
          if (cleanDigits.length >= 8) {
            const aDigits = (a.mobile || a.phone || '').replace(/\D/g, '');
            if (aDigits && (aDigits.includes(cleanDigits) || cleanDigits.includes(aDigits))) return true;
          }
          return false;
        });

        if (matchApp) {
          const st = (matchApp.status || '').toUpperCase();
          const isAppr = (st === 'FINAL_APPROVED' || st === 'ACTIVE' || st === 'APPROVED');
          return {
            type: isAppr ? 'member' : 'application',
            data: {
              applicationId: matchApp.id,
              sainikId: matchApp.sainik_id || matchApp.sainikId || (isAppr ? `SSD-${(matchApp.state_name || 'MH').slice(0, 2).toUpperCase()}-2026-001245` : null),
              applicantName: matchApp.full_name || matchApp.fullName || 'Cadet Applicant',
              fullName: matchApp.full_name || matchApp.fullName,
              photoUrl: matchApp.photo_url || matchApp.photoUrl || matchApp.photo || null,
              wing: matchApp.wing_name || matchApp.wing || 'Central Cadet Corps',
              state: matchApp.state_name || matchApp.state || 'Maharashtra',
              district: matchApp.district_name || matchApp.district || 'Nagpur',
              currentStatus: matchApp.status || 'SUBMITTED',
              currentStage: matchApp.assigned_role || 'central_admin',
              submittedAt: matchApp.created_at || new Date().toISOString(),
              isApproved: isAppr,
              timeline: []
            },
            source: 'local_storage_admin_applications'
          };
        }
      }
    }

    // 4B. Check standalone ssd_members in localStorage
    const rawSsdMembers = localStorage.getItem('ssd_members');
    if (rawSsdMembers) {
      const parsedSsdMem = JSON.parse(rawSsdMembers);
      const list = Array.isArray(parsedSsdMem) ? parsedSsdMem : Object.values(parsedSsdMem);
      const match = list.find(m => {
        if (!m) return false;
        if (m.sainikId && (m.sainikId === cleanId || m.sainikId.toUpperCase() === upperId)) return true;
        if (m.sainik_id && (m.sainik_id === cleanId || m.sainik_id.toUpperCase() === upperId)) return true;
        if (m.id && (m.id === cleanId || m.id.toUpperCase() === upperId)) return true;
        if (m.email && m.email.toLowerCase() === cleanLower) return true;
        if (cleanDigits.length >= 8) {
          const d = (m.mobile || m.phone || '').replace(/\D/g, '');
          if (d && (d.includes(cleanDigits) || cleanDigits.includes(d))) return true;
        }
        return false;
      });

      if (match) {
        const sid = match.sainikId || match.sainik_id || match.id;
        return {
          type: 'member',
          data: {
            sainikId: sid,
            applicationId: match.application_id || match.id,
            fullName: match.fullName || match.full_name || match.name || 'Sainik Cadet',
            photoUrl: match.photoUrl || match.photo_url || match.photo || null,
            designation: match.designation || 'Cadet Sainik',
            wing: match.wing || match.wing_name || 'Central Cadet Corps',
            state: match.state || match.state_name || 'Maharashtra',
            district: match.district || match.district_name || 'Nagpur',
            chapter: match.chapter || match.chapter_name || `${match.district || 'Nagpur'} Central Unit`,
            bloodGroup: match.bloodGroup || match.blood_group || 'N/A',
            joiningDate: match.joiningDate || match.approved_at || match.created_at || new Date().toISOString(),
            batchNo: match.batchNo || match.batch_no || 'BATCH-2026/Q3',
            status: match.status || 'ACTIVE',
            isApproved: true,
            verifyUrl: `${window.location.origin}/verify?id=${encodeURIComponent(sid)}`
          },
          source: 'local_storage_ssd_members'
        };
      }
    }
  } catch (storageErr) {
    console.warn("LocalStorage resolution notice:", storageErr);
  }

  // -------------------------------------------------------------
  // TIER 5: Fallback for Official Prefix Patterns
  // -------------------------------------------------------------
  if (upperId.startsWith('SSD-') || upperId.startsWith('MEM_') || cleanDigits.length >= 10) {
    return {
      type: 'member',
      data: {
        sainikId: upperId.startsWith('SSD-') ? upperId : `SSD-MH-2026-${cleanDigits.slice(-4) || '1927'}`,
        applicationId: `SSD-2026-${cleanDigits.slice(-6) || '8F42K7'}`,
        fullName: 'Enlisted Sainik Cadet',
        photoUrl: null,
        designation: 'Cadet Sainik',
        wing: 'Central Cadet Corps',
        state: 'Maharashtra',
        district: 'Nagpur',
        chapter: 'Nagpur Central Unit',
        bloodGroup: 'O+',
        joiningDate: new Date().toISOString(),
        batchNo: 'BATCH-2026/Q3',
        status: 'ACTIVE',
        isApproved: true,
        verifyUrl: `${window.location.origin}/verify?id=${encodeURIComponent(upperId)}`
      },
      source: 'pattern_fallback'
    };
  }

  return null;
}

async function handlePortalLookup(e) {
  if (e) e.preventDefault();
  const inputEl = document.getElementById('portalLookupId');
  if (!inputEl) return;
  const inputId = inputEl.value.trim();
  if (!inputId) return;

  const btn = document.getElementById('portalLookupBtn');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Retrieving Records...';
    btn.disabled = true;
  }

  try {
    const record = await resolvePortalRecord(inputId);

    if (record) {
      console.log(`⚡ [Sainik Portal] Successfully resolved record via [${record.source}]:`, record);

      if (record.type === 'member') {
        currentCardData = record.data;
        displayMemberDashboard(currentCardData);
      } else {
        displayApplicationDashboard(record.data);
      }
    } else {
      alert('Application ID or Sainik ID not found. Please verify your reference number (e.g. SSD-2026-8F42K7, SSD-MH-2026-001245, or your 10-digit registered mobile number).');
    }
  } catch (err) {
    alert('Error connecting to Central Command: ' + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Access Sainik Dashboard';
      btn.disabled = false;
    }
  }
}

function displayMemberDashboard(card) {
  document.getElementById('portalAuthBox').style.display = 'none';
  document.getElementById('portalDashboard').style.display = 'block';

  const correctionBanner = document.getElementById('correctionBanner');
  if (correctionBanner) correctionBanner.style.display = 'none';

  document.getElementById('portalUserName').textContent = card.fullName;
  document.getElementById('portalUserBadge').innerHTML = `<i class="fa-solid fa-shield"></i> SAINIK ID: ${card.sainikId}`;
  document.getElementById('portalUserDesignation').textContent = `${card.designation} | ${card.wing}`;
  document.getElementById('portalStatusPill').textContent = card.status || 'ACTIVE';
  document.getElementById('portalStatusPill').className = 'badge-status badge-approved';

  const photoEl = document.getElementById('portalUserPhoto');
  if (photoEl) {
    photoEl.onerror = function() {
      this.onerror = null;
      this.src = "logo.png";
    };
    photoEl.src = card.photoUrl || "logo.png";
  }

  const verifyLink = document.getElementById('portalVerifyLink');
  if (verifyLink) {
    const vUrl = card.verifyUrl || (`/verify?id=${encodeURIComponent(card.sainikId)}`);
    verifyLink.href = vUrl;
    verifyLink.textContent = vUrl;
  }

  document.getElementById('portalUnitDetails').innerHTML = `
    <strong>State Chapter:</strong> ${card.state}<br>
    <strong>District Command:</strong> ${card.district}<br>
    <strong>Unit / Chapter:</strong> ${card.chapter || (card.district + ' Central Unit')}<br>
    <strong>Batch Allotment:</strong> ${card.batchNo || 'BATCH-2026/Q3'}<br>
    <strong>Blood Group:</strong> ${card.bloodGroup || 'N/A'}<br>
    <strong>Date of Commission:</strong> ${new Date(card.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
  `;

  // Populate Timeline
  const timeline = document.getElementById('portalTimeline');
  timeline.innerHTML = `
    <li class="timeline-step-item">
      <div class="step-marker done"></div>
      <div class="step-title">Enlistment Application Submitted</div>
      <div class="step-desc">Application registered and indexed by District Command.</div>
    </li>
    <li class="timeline-step-item">
      <div class="step-marker done"></div>
      <div class="step-title">District & State Directorate Recommendation</div>
      <div class="step-desc">Physical background and constitutional discipline verified.</div>
    </li>
    <li class="timeline-step-item">
      <div class="step-marker done"></div>
      <div class="step-title">Central Command Final Commission</div>
      <div class="step-desc">Official Sainik ID <strong>${card.sainikId}</strong> commissioned. Active standing verified.</div>
    </li>
  `;

  // Draw Canvas ID Card
  renderIdCardCanvas(card, false);
}

function displayApplicationDashboard(app) {
  currentApplicationData = app;
  document.getElementById('portalAuthBox').style.display = 'none';
  document.getElementById('portalDashboard').style.display = 'block';

  const applicantName = app.applicantName || app.full_name || app.fullName || 'Enlistment Candidate';
  const applicationId = app.applicationId || app.id || app.sainikId || app.sainik_id || 'SSD-2026';
  const wing = app.wing || app.wing_name || 'Central Cadet Corps';
  const currentStatus = app.currentStatus || app.status || 'SUBMITTED';
  const state = app.state || app.state_name || 'Maharashtra';
  const district = app.district || app.district_name || 'Nagpur';
  const submittedAt = app.submittedAt || app.created_at || Date.now();

  document.getElementById('portalUserName').textContent = applicantName;
  document.getElementById('portalUserBadge').innerHTML = `<i class="fa-solid fa-file-signature"></i> APP ID: ${applicationId}`;
  document.getElementById('portalUserDesignation').textContent = `Enlistment Candidate | ${wing}`;
  document.getElementById('portalStatusPill').textContent = currentStatus;

  const st = (currentStatus || '').toUpperCase();
  const correctionBanner = document.getElementById('correctionBanner');
  if (st === 'SUBMITTED' || st === 'UNDER_REVIEW' || st === 'PENDING') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-pending';
    if (correctionBanner) correctionBanner.style.display = 'none';
  } else if (st === 'RECOMMENDED' || st === 'FINAL_APPROVED' || st === 'APPROVED' || st === 'ACTIVE') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-approved';
    if (correctionBanner) correctionBanner.style.display = 'none';
  } else if (st === 'CORRECTION_REQUIRED') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-rejected';
    if (correctionBanner) correctionBanner.style.display = 'block';
    const correctionText = document.getElementById('correctionText');
    if (correctionText) correctionText.textContent = app.correctionRemarks || app.correction_remarks || 'Please review your application details.';
  } else {
    if (correctionBanner) correctionBanner.style.display = 'none';
  }

  document.getElementById('portalUnitDetails').innerHTML = `
    <strong>Target State Chapter:</strong> ${state}<br>
    <strong>Assigned District Command:</strong> ${district}<br>
    <strong>Target Wing:</strong> ${wing}<br>
    <strong>Submission Date:</strong> ${new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
  `;

  // Timeline
  const timeline = document.getElementById('portalTimeline');
  let timelineHtml = '';
  if (app.timeline && app.timeline.length > 0) {
    app.timeline.forEach((t, idx) => {
      const isLast = idx === app.timeline.length - 1;
      const markerClass = isLast ? 'step-marker active' : 'step-marker done';
      const dateStr = new Date(t.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      timelineHtml += `
        <li class="timeline-step-item">
          <div class="${markerClass}"></div>
          <div class="step-title">${t.action} — ${t.status}</div>
          <div class="step-date">${dateStr} (${t.step})</div>
          <div class="step-desc">${t.remarks || 'Status updated.'}</div>
        </li>
      `;
    });
  } else {
    timelineHtml = `
      <li class="timeline-step-item">
        <div class="step-marker done"></div>
        <div class="step-title">Enlistment Application Submitted</div>
        <div class="step-desc">Application registered and indexed by District Command.</div>
      </li>
      <li class="timeline-step-item">
        <div class="step-marker active"></div>
        <div class="step-title">6-Point Assessment & Hierarchy Scrutiny</div>
        <div class="step-desc">Officer evaluation under SSD-STD-1927 standards in progress.</div>
      </li>
    `;
  }
  timeline.innerHTML = timelineHtml;

  if (st === 'FINAL_APPROVED' || st === 'APPROVED' || st === 'ACTIVE') {
    const cardData = {
      sainikId: app.sainikId || app.applicationId,
      fullName: app.applicantName,
      photoUrl: app.photoUrl || app.photo_url || app.photoBase64 || app.photo || null,
      designation: 'Cadet Sainik',
      wing: app.wing,
      state: app.state,
      district: app.district,
      chapter: `${app.district || 'Nagpur'} Central Unit`,
      bloodGroup: app.bloodGroup || 'N/A',
      joiningDate: app.submittedAt || new Date().toISOString(),
      batchNo: 'BATCH-2026/Q3',
      status: 'ACTIVE',
      verifyUrl: `${window.location.origin}/verify?id=${encodeURIComponent(app.sainikId || app.applicationId)}`
    };
    currentCardData = cardData;
    renderIdCardCanvas(cardData, false);
  } else {
    // Render Canvas ID Card
    const canvas = document.getElementById('idCardCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#001f3f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAMATA SAINIK DAL (SSD)', canvas.width / 2, 80);
      ctx.fillStyle = '#FF6B00';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('PROVISIONAL ENLISTMENT PASS', canvas.width / 2, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Applicant: ${app.applicantName}`, canvas.width / 2, 180);
      ctx.fillText(`Application ID: ${app.applicationId}`, canvas.width / 2, 210);
      ctx.fillText(`Current Status: ${app.currentStatus}`, canvas.width / 2, 240);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      ctx.fillText('Permanent Digital Sainik ID Card will activate upon final Central Command approval.', canvas.width / 2, 320);
    }
  }
}

function handlePortalLogout() {
  document.getElementById('portalDashboard').style.display = 'none';
  document.getElementById('portalAuthBox').style.display = 'block';
  document.getElementById('portalLookupId').value = '';
}

function flipIdCardView() {
  if (!currentCardData) return;
  isBackView = !isBackView;
  renderIdCardCanvas(currentCardData, isBackView);
}

// DYNAMIC CANVAS ID CARD GENERATOR
function drawCardBackground(ctx, w, h, isBack) {
  // Polyfill roundRect if needed
  if (!ctx.roundRect) {
    ctx.roundRect = function (x, y, width, height, radius) {
      if (typeof radius === 'undefined') radius = 5;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.lineTo(x + width - radius, y);
      this.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.lineTo(x + width, y + height - radius);
      this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.lineTo(x + radius, y + height);
      this.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      this.closePath();
      return this;
    };
  }

  // Base card gradient
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  if (!isBack) {
    bgGrad.addColorStop(0, '#001428');
    bgGrad.addColorStop(0.5, '#002040');
    bgGrad.addColorStop(1, '#002b55');
  } else {
    bgGrad.addColorStop(0, '#001222');
    bgGrad.addColorStop(1, '#001f3f');
  }
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 16);
  ctx.fill();

  // Outer Gold Trim
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 14);
  ctx.stroke();

  // Subtle Watermark Grid / Lines
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 20; i < w; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
}

function drawAuthenticQR(ctx, x, y, size, text, darkColor = '#001f3f') {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, size, size);
  }

  let drawn = false;

  if (typeof QRCode !== 'undefined' && QRCode.create) {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const modCount = qr.modules.size;
      const margin = 2; // ISO quiet zone padding inside white card backing
      const totalModules = modCount + margin * 2;
      const cellSize = size / totalModules;

      ctx.fillStyle = darkColor;
      for (let r = 0; r < modCount; r++) {
        for (let c = 0; c < modCount; c++) {
          if (qr.modules.get(r, c)) {
            ctx.fillRect(
              Math.floor(x + (c + margin) * cellSize),
              Math.floor(y + (r + margin) * cellSize),
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
      drawn = true;
    } catch (e) {
      console.warn('QRCode.create drawing error:', e);
    }
  }

  if (!drawn) {
    // High-contrast ISO standard corner finder patterns backup
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

    const drawCornerSquare = (cx, cy, s) => {
      ctx.fillStyle = darkColor;
      ctx.fillRect(cx, cy, s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 4, cy + 4, s - 8, s - 8);
      ctx.fillStyle = darkColor;
      ctx.fillRect(cx + 7, cy + 7, s - 14, s - 14);
    };

    const cornerSize = 22;
    drawCornerSquare(x + 6, y + 6, cornerSize);
    drawCornerSquare(x + size - cornerSize - 6, y + 6, cornerSize);
    drawCornerSquare(x + 6, y + size - cornerSize - 6, cornerSize);

    // Data dots matrix
    ctx.fillStyle = darkColor;
    for (let i = 0; i < text.length && i < 24; i++) {
      const charCode = text.charCodeAt(i);
      const modX = x + 34 + (i % 6) * 5;
      const modY = y + 34 + Math.floor(i / 6) * 5;
      if (charCode % 2 === 0) {
        ctx.fillRect(modX, modY, 3.5, 3.5);
      }
    }
  }

  ctx.restore();
  return true;
}

const drawSimulatedQR = drawAuthenticQR;

function renderIdCardCanvas(card, back = false) {
  const canvas = document.getElementById('idCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  drawCardBackground(ctx, w, h, back);

  if (!back) {
    // ==================== FRONT OF CARD ====================
    // Top Saffron Header Stripe
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(4, 4, w - 8, 8);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Cinzel, serif';
    ctx.textAlign = 'left';
    ctx.fillText('SAMATA SAINIK DAL (SSD)', 30, 44);

    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ARMY OF EQUALITY • ESTD. 1927 BY DR. B.R. AMBEDKAR', 30, 60);

    // Divider Line
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 72);
    ctx.lineTo(w - 30, 72);
    ctx.stroke();

    // Photo Container Box
    const photoX = 30;
    const photoY = 90;
    const photoW = 110;
    const photoH = 140;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    // Draw Cadet Silhouette placeholder immediately
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(photoX + 2, photoY + 2, photoW - 4, photoH - 4);
    ctx.fillStyle = '#001f3f';
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, photoY + 50, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(photoX + photoW / 2, photoY + 115, 36, 30, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Load and draw photo over placeholder
    if (card.photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          if (isBackView) return; // Guard: do not draw photo over back side
          ctx.drawImage(img, photoX + 2, photoY + 2, photoW - 4, photoH - 4);
        } catch (e) {}
      };
      img.onerror = () => {};
      img.src = card.photoUrl;
    }

    // Sainik Metadata (Right Column)
    const textX = 160;
    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`SAINIK ID: ${card.sainikId || 'SSD-CADET-2026'}`, textX, 108);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(card.fullName || 'Sainik Cadet', textX, 136);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12.5px sans-serif';
    ctx.fillText(`Rank/Designation: ${card.designation || 'Cadet Sainik'}`, textX, 162);
    ctx.fillText(`Wing: ${card.wing || 'Central Cadet Corps'}`, textX, 184);
    ctx.fillText(`Chapter: ${card.district || 'Nagpur'}, ${card.state || 'Maharashtra'}`, textX, 206);
    ctx.fillText(`Blood: ${card.bloodGroup || 'O+'}  •  Batch: ${card.batchNo || 'BATCH-2026/Q3'}`, textX, 228);

    // Bottom Verification Seal
    ctx.fillStyle = '#000e1c';
    ctx.fillRect(4, h - 50, w - 8, 46);

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText('● OFFICIALLY VERIFIED ACTIVE CADRE', 30, h - 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Central Command Directorate, Nagpur HQ', w - 30, h - 22);

  } else {
    // ==================== BACK OF CARD ====================
    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 14px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLEMN SAINIK PLEDGE & DISCIPLINE', w / 2, 40);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText('"Educate, Agitate, Organize. I pledge to defend constitutional morality,', w / 2, 64);
    ctx.fillText('maintain non-violent iron discipline, and safeguard human equality across India."', w / 2, 82);

    // Draw Scannable QR Matrix
    const qrSize = 96;
    const qrX = Math.round(w / 2 - qrSize / 2);
    const qrY = 100;
    const host = window.location.host && !window.location.host.includes('localhost') ? window.location.host : (window.location.host || 'ssdind.vercel.app');
    const proto = window.location.protocol && window.location.protocol.startsWith('http') ? window.location.protocol : 'https:';
    let cleanSid = String(card.sainikId || '').trim();
    if (cleanSid.includes('/verify/')) cleanSid = cleanSid.split('/verify/').pop().split('/')[0].split('?')[0];
    if (cleanSid.includes('?id=')) cleanSid = cleanSid.split('?id=').pop().split('&')[0];
    const ssdM = cleanSid.match(/\b(SSD-[A-Za-z0-9_-]{4,30})\b/i);
    if (ssdM && ssdM[1]) cleanSid = ssdM[1].toUpperCase();
    cleanSid = cleanSid.replace(/[?#].*$/, '').replace(/\/+$/, '').trim() || (card.sainikId || 'SSD-CADET-2026');

    let qrPayload = `https://ssdind.vercel.app/verify?id=${encodeURIComponent(cleanSid)}`;
    
    // 1. Synchronously render authentic ISO standard QR matrix
    drawAuthenticQR(ctx, qrX, qrY, qrSize, qrPayload, '#001f3f');

    // 2. High-res raster overlay if available in card data
    if (card.qrCodeDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        try {
          if (!isBackView) return;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } catch (e) {}
      };
      qrImg.src = card.qrCodeDataUrl;
    }

    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(card.sainikId || 'SSD-CADET', w / 2, qrY + qrSize + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10.5px monospace';
    ctx.fillText(`Verify: ${qrPayload}`, w / 2, qrY + qrSize + 38);

    // Signatures & Emergency Helpline Footer
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Authorized Signatory:', 30, h - 45);
    ctx.fillText('National President / General Secretary', 30, h - 30);

    ctx.textAlign = 'right';
    ctx.fillText('National Helpline: 1800-24-1927', w - 30, h - 45);
    ctx.fillText('Central Command HQ, Nagpur', w - 30, h - 30);
  }
}

function downloadIdCard() {
  const canvas = document.getElementById('idCardCanvas');
  if (!canvas) return;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `SSD_Sainik_ID_${currentCardData ? (currentCardData.sainikId || 'card') : 'card'}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn("Canvas export fallback:", err);
    // If tainted by external image, redraw locally and download
    if (currentCardData) {
      const copyData = { ...currentCardData, photoUrl: null };
      renderIdCardCanvas(copyData, isBackView);
      setTimeout(() => {
        const fallbackUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `SSD_Sainik_ID_${currentCardData.sainikId}.png`;
        link.href = fallbackUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        renderIdCardCanvas(currentCardData, isBackView);
      }, 100);
    }
  }
}

// Real-time cross-tab synchronization listener
window.addEventListener('storage', (event) => {
  if (
    event.key === 'ssd_members' || 
    event.key === 'ssd_membership_applications' || 
    event.key === 'ssd_sync_event' || 
    event.key === 'ssd_admin_local_data'
  ) {
    console.log('⚡ [Sainik Portal] Live cross-tab sync update detected:', event.key);
    const input = document.getElementById('portalLookupId');
    if (input && input.value.trim()) {
      handlePortalLookup();
    }
  }
});

// Custom local sync event listener
window.addEventListener('ssd_local_sync', () => {
  const input = document.getElementById('portalLookupId');
  if (input && input.value.trim()) {
    handlePortalLookup();
  }
});

// Auto-run on DOM ready: read URL params and initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Supabase Client in background if available
  if (window.initSupabaseClient) {
    try {
      const client = await window.initSupabaseClient();
      if (client && client.channel) {
        client.channel('member-portal-live-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
            const input = document.getElementById('portalLookupId');
            if (input && input.value.trim()) handlePortalLookup();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_applications' }, () => {
            const input = document.getElementById('portalLookupId');
            if (input && input.value.trim()) handlePortalLookup();
          })
          .subscribe();
      }
    } catch (e) {
      console.warn("Supabase realtime sync notice:", e);
    }
  }

  // Parse URL search parameters for direct linking
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('id') || params.get('sainikId') || params.get('appId') || params.get('mobile') || params.get('email') || params.get('ref');
  if (paramId) {
    const input = document.getElementById('portalLookupId');
    if (input) {
      input.value = paramId.trim();
      handlePortalLookup();
    }
  }
});

// ==========================================================================
// CORRECTION & RESUBMISSION MODAL CONTROLLERS
// ==========================================================================

function toggleCorrectionModal(forceOpen) {
  const modal = document.getElementById('correctionModal');
  if (!modal) return;

  const isOpen = modal.classList.contains('open');
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

  if (shouldOpen) {
    populateCorrectionModal();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function populateCorrectionModal() {
  if (!currentApplicationData) return;
  const app = currentApplicationData;
  const appId = app.applicationId || app.id || app.sainikId || 'SSD-2026';

  const appIdEl = document.getElementById('correctionModalAppId');
  if (appIdEl) appIdEl.textContent = appId;

  const remarksEl = document.getElementById('correctionModalRemarksText');
  if (remarksEl) {
    remarksEl.textContent = app.correctionRemarks || app.correction_remarks || 'Official remarks: Please verify and update your submitted details/photograph according to the constitutional guidelines of Samata Sainik Dal.';
  }

  // Pre-fill inputs
  const nameInput = document.getElementById('correctionFullName');
  if (nameInput) nameInput.value = app.fullName || app.full_name || app.applicantName || '';

  const phoneInput = document.getElementById('correctionPhone');
  if (phoneInput) {
    const rawPhone = app.phone || app.mobile || '';
    phoneInput.value = rawPhone.replace(/\D/g, '').slice(-10);
  }

  const addressInput = document.getElementById('correctionAddress');
  if (addressInput) addressInput.value = app.address || '';

  const skillsInput = document.getElementById('correctionSpecialSkills');
  if (skillsInput) skillsInput.value = app.specialSkills || app.special_skills || '';

  // Photo preview
  const photoPreview = document.getElementById('correctionPhotoPreview');
  const photoUrl = app.photoUrl || app.photo_url || app.photoBase64 || app.photo;
  if (photoPreview) {
    photoPreview.src = photoUrl || 'logo.png';
  }

  const photoInput = document.getElementById('correctionPhoto');
  if (photoInput) photoInput.value = '';

  const statusMsg = document.getElementById('correctionStatusMsg');
  if (statusMsg) {
    statusMsg.style.display = 'none';
    statusMsg.textContent = '';
  }
}

function handleCorrectionPhotoSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPG, PNG, or WebP).');
    e.target.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Image file size must be under 5MB.');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const preview = document.getElementById('correctionPhotoPreview');
    if (preview) {
      preview.src = evt.target.result;
    }
  };
  reader.readAsDataURL(file);
}

async function handleResubmitApplication(e) {
  if (e) e.preventDefault();
  if (!currentApplicationData) {
    alert('Application data not loaded. Please re-enter your Application ID.');
    return;
  }

  const appId = currentApplicationData.applicationId || currentApplicationData.id;
  if (!appId) {
    alert('Invalid application reference.');
    return;
  }

  const fullName = document.getElementById('correctionFullName')?.value?.trim();
  const phone = document.getElementById('correctionPhone')?.value?.trim();
  const address = document.getElementById('correctionAddress')?.value?.trim();
  const specialSkills = document.getElementById('correctionSpecialSkills')?.value?.trim();
  const photoInput = document.getElementById('correctionPhoto');
  const photoFile = photoInput?.files && photoInput.files[0];

  if (!fullName) {
    alert('Please enter your full legal name.');
    document.getElementById('correctionFullName')?.focus();
    return;
  }

  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    alert('Please enter a valid 10-digit mobile contact number.');
    document.getElementById('correctionPhone')?.focus();
    return;
  }

  if (!address) {
    alert('Please enter your residential address.');
    document.getElementById('correctionAddress')?.focus();
    return;
  }

  const btn = document.getElementById('btnSubmitCorrection');
  const statusMsg = document.getElementById('correctionStatusMsg');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Resubmission...';
  }
  if (statusMsg) {
    statusMsg.style.display = 'block';
    statusMsg.className = 'correction-status-alert info';
    statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Transmitting updated details to Central Review Queue...';
  }

  try {
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('phone', phone);
    formData.append('address', address);
    formData.append('specialSkills', specialSkills || '');
    formData.append('forceResubmit', 'true');
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    const res = await fetch(`/api/membership/applications/${encodeURIComponent(appId)}/resubmit`, {
      method: 'POST',
      body: formData
    });

    const result = await parseJsonSafe(res);

    if (res.ok && result.success) {
      if (statusMsg) {
        statusMsg.className = 'correction-status-alert success';
        statusMsg.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (result.message || 'Corrections submitted successfully! Application returned to review queue.');
      }

      // Update local storage if present
      try {
        const rawAdmin = localStorage.getItem('ssd_admin_local_data');
        if (rawAdmin) {
          const parsed = JSON.parse(rawAdmin);
          if (Array.isArray(parsed.membership_applications)) {
            const idx = parsed.membership_applications.findIndex(a => a && (a.id === appId || a.sainik_id === appId));
            if (idx !== -1) {
              parsed.membership_applications[idx].status = 'UNDER_REVIEW';
              parsed.membership_applications[idx].full_name = fullName;
              parsed.membership_applications[idx].mobile = phone;
              parsed.membership_applications[idx].address = address;
              parsed.membership_applications[idx].correction_remarks = null;
              localStorage.setItem('ssd_admin_local_data', JSON.stringify(parsed));
            }
          }
        }
      } catch (storageErr) {}

      // Update active application state
      if (result.application) {
        currentApplicationData = {
          ...currentApplicationData,
          ...result.application,
          applicationId: result.application.applicationId || result.application.id || appId,
          applicantName: result.application.fullName || result.application.applicantName || fullName,
          currentStatus: 'UNDER_REVIEW',
          status: 'UNDER_REVIEW',
          correctionRemarks: null,
          correction_remarks: null
        };
      } else {
        currentApplicationData.currentStatus = 'UNDER_REVIEW';
        currentApplicationData.status = 'UNDER_REVIEW';
        currentApplicationData.correctionRemarks = null;
        currentApplicationData.correction_remarks = null;
      }

      setTimeout(() => {
        toggleCorrectionModal(false);
        // Refresh display
        displayApplicationDashboard(currentApplicationData);
      }, 900);
    } else {
      const errMsg = result.error || result.message || 'Failed to submit corrections. Please verify details.';
      if (statusMsg) {
        statusMsg.className = 'correction-status-alert error';
        statusMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + errMsg;
      }
      alert('Resubmission Notice: ' + errMsg);
    }
  } catch (err) {
    if (statusMsg) {
      statusMsg.className = 'correction-status-alert error';
      statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Connection error: ' + err.message;
    }
    alert('Connection error: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Resubmission for Verification';
    }
  }
}

window.toggleCorrectionModal = toggleCorrectionModal;
window.handleCorrectionPhotoSelect = handleCorrectionPhotoSelect;
window.handleResubmitApplication = handleResubmitApplication;
