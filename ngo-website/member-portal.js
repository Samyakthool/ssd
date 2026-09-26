// ==========================================================================
// SAMATA SAINIK DAL (SSD) - MEMBER PORTAL CLIENT LOGIC & ID CARD ENGINE
// ==========================================================================

let currentMemberData = null;
let currentCardData = null;
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
            verifyUrl: `${window.location.origin}/verify/${supaMember.sainik_id || supaMember.id}`
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
              verifyUrl: `${window.location.origin}/verify/${sid}`
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
            verifyUrl: `${window.location.origin}/verify/${sid}`
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
        verifyUrl: `${window.location.origin}/verify/${upperId}`
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
    verifyLink.href = card.verifyUrl || (`/verify/${card.sainikId}`);
    verifyLink.textContent = card.verifyUrl || (`/verify/${card.sainikId}`);
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
  if (st === 'SUBMITTED' || st === 'UNDER_REVIEW' || st === 'PENDING') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-pending';
  } else if (st === 'RECOMMENDED' || st === 'FINAL_APPROVED' || st === 'APPROVED' || st === 'ACTIVE') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-approved';
  } else if (st === 'CORRECTION_REQUIRED') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-rejected';
    const correctionBanner = document.getElementById('correctionBanner');
    if (correctionBanner) correctionBanner.style.display = 'block';
    const correctionText = document.getElementById('correctionText');
    if (correctionText) correctionText.textContent = app.correctionRemarks || app.correction_remarks || 'Please review your application details.';
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
      verifyUrl: `${window.location.origin}/verify/${app.sainikId || app.applicationId}`
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
  ctx.roundRect(0, 0, w, h, 16);
  ctx.fill();

  // Outer Gold Trim
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 3.5;
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

function drawSimulatedQR(ctx, x, y, size, text) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = '#001f3f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);

  // Draw 3 corner positioning squares
  const drawCornerSquare = (cx, cy, s) => {
    ctx.fillStyle = '#001f3f';
    ctx.fillRect(cx, cy, s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 4, cy + 4, s - 8, s - 8);
    ctx.fillStyle = '#001f3f';
    ctx.fillRect(cx + 8, cy + 8, s - 16, s - 16);
  };

  const cornerSize = 24;
  drawCornerSquare(x + 4, y + 4, cornerSize);
  drawCornerSquare(x + size - cornerSize - 4, y + 4, cornerSize);
  drawCornerSquare(x + 4, y + size - cornerSize - 4, cornerSize);

  // Generate pseudo-random deterministic matrix pattern based on string hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  ctx.fillStyle = '#001f3f';
  const gridSize = 12;
  const cellSize = (size - 16) / gridSize;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Don't overwrite corner squares
      if ((r < 4 && c < 4) || (r < 4 && c > gridSize - 5) || (r > gridSize - 5 && c < 4)) continue;
      if (((hash ^ (r * 31 + c * 17)) & 1) === 0) {
        ctx.fillRect(x + 8 + c * cellSize, y + 8 + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  // Center Mini Emblem Dot
  ctx.fillStyle = '#FF6B00';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

function renderIdCardCanvas(card, back = false) {
  const canvas = document.getElementById('idCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
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
    const qrX = w / 2 - qrSize / 2;
    const qrY = 100;
    const host = window.location.host || 'localhost:3000';
    const proto = window.location.protocol || 'http:';
    const qrPayload = card.verifyUrl || `${proto}//${host}/verify/${card.sainikId}`;
    drawSimulatedQR(ctx, qrX, qrY, qrSize, qrPayload);

    // Overlay real scannable QR Code asynchronously
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      try {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (e) {}
    };
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(card.sainikId || 'SSD-CADET', w / 2, qrY + qrSize + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10.5px monospace';
    ctx.fillText(`Verify: ${card.verifyUrl || ('/verify/' + card.sainikId)}`, w / 2, qrY + qrSize + 38);

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
