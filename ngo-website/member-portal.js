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

async function handlePortalLookup(e) {
  if (e) e.preventDefault();
  const inputId = document.getElementById('portalLookupId').value.trim().toUpperCase();
  if (!inputId) return;

  const btn = document.getElementById('portalLookupBtn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Retrieving Records...';
  btn.disabled = true;

  try {
    // 1. Try fetching Digital ID Card
    const cardRes = await fetch(`/api/members/card/${encodeURIComponent(inputId)}`);
    const cardJson = await parseJsonSafe(cardRes);

    if (cardJson.success && cardJson.cardData) {
      currentCardData = cardJson.cardData;
      displayMemberDashboard(currentCardData);
    } else {
      // 2. Try fetching as pending/in-process Application
      const appRes = await fetch(`/api/membership/status/${encodeURIComponent(inputId)}`);
      const appJson = await parseJsonSafe(appRes);

      if (appJson.success) {
        displayApplicationDashboard(appJson);
      } else {
        alert(appJson.error || 'Identifier not found. Please verify your reference ID.');
      }
    }
  } catch (err) {
    alert('Error connecting to Central Command: ' + err.message);
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Access Sainik Dashboard';
    btn.disabled = false;
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

  if (card.photoUrl) {
    document.getElementById('portalUserPhoto').src = card.photoUrl;
  }

  const verifyLink = document.getElementById('portalVerifyLink');
  verifyLink.href = card.verifyUrl;
  verifyLink.textContent = card.verifyUrl;

  document.getElementById('portalUnitDetails').innerHTML = `
    <strong>State Chapter:</strong> ${card.state}<br>
    <strong>District Command:</strong> ${card.district}<br>
    <strong>Unit / Chapter:</strong> ${card.chapter || (card.district + ' Central Unit')}<br>
    <strong>Batch Allotment:</strong> ${card.batchNo || 'BATCH-2026/Q1'}<br>
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

  document.getElementById('portalUserName').textContent = app.applicantName;
  document.getElementById('portalUserBadge').innerHTML = `<i class="fa-solid fa-file-signature"></i> APP ID: ${app.applicationId}`;
  document.getElementById('portalUserDesignation').textContent = `Enlistment Candidate | ${app.wing}`;
  document.getElementById('portalStatusPill').textContent = app.currentStatus;

  if (app.currentStatus === 'SUBMITTED' || app.currentStatus === 'UNDER_REVIEW') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-pending';
  } else if (app.currentStatus === 'RECOMMENDED') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-approved';
  } else if (app.currentStatus === 'CORRECTION_REQUIRED') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-rejected';
    document.getElementById('correctionBanner').style.display = 'block';
    document.getElementById('correctionText').textContent = app.correctionRemarks || 'Please review your application details.';
  }

  document.getElementById('portalUnitDetails').innerHTML = `
    <strong>Target State Chapter:</strong> ${app.state}<br>
    <strong>Assigned District Command:</strong> ${app.district}<br>
    <strong>Target Wing:</strong> ${app.wing}<br>
    <strong>Submission Date:</strong> ${new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
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
  }
  timeline.innerHTML = timelineHtml;

  // Placeholder Provisional Card Canvas
  const canvas = document.getElementById('idCardCanvas');
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
function renderIdCardCanvas(card, back = false) {
  const canvas = document.getElementById('idCardCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!back) {
    // ==================== FRONT OF CARD ====================
    // Card Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#001428');
    bgGrad.addColorStop(1, '#002b55');
    ctx.fillStyle = bgGrad;
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 4;
    ctx.roundRect(4, 4, w - 8, h - 8, 14);
    ctx.stroke();

    // Top Header Banner
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(4, 4, w - 8, 8);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px Cinzel, serif';
    ctx.textAlign = 'left';
    ctx.fillText('SAMATA SAINIK DAL (SSD)', 30, 48);

    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('ARMY OF SOLDIERS FOR EQUALITY | ESTD. 1927 BY DR. B.R. AMBEDKAR', 30, 66);

    // Divider Line
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 78);
    ctx.lineTo(w - 30, 78);
    ctx.stroke();

    // Photo Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 100, 110, 140);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 100, 110, 140);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = card.photoUrl || '/logo.png';
    img.onload = () => {
      ctx.drawImage(img, 30, 100, 110, 140);
    };

    // Sainik Meta on Right
    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`SAINIK ID: ${card.sainikId}`, 160, 118);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(card.fullName, 160, 146);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Rank/Designation: ${card.designation}`, 160, 172);
    ctx.fillText(`Wing: ${card.wing}`, 160, 194);
    ctx.fillText(`State/District: ${card.district}, ${card.state}`, 160, 216);
    ctx.fillText(`Blood Group: ${card.bloodGroup || 'N/A'}  |  Batch: ${card.batchNo || '2026/Q1'}`, 160, 238);

    // Verification Bottom Seal
    ctx.fillStyle = '#001020';
    ctx.fillRect(4, h - 55, w - 8, 51);

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('● OFFICIALLY VERIFIED ACTIVE CADRE', 30, h - 25);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Central Command Directorate, Nagpur HQ', w - 30, h - 25);

  } else {
    // ==================== BACK OF CARD ====================
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#001428');
    bgGrad.addColorStop(1, '#002040');
    ctx.fillStyle = bgGrad;
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 4;
    ctx.roundRect(4, 4, w - 8, h - 8, 14);
    ctx.stroke();

    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 15px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLEMN SAINIK PLEDGE & DISCIPLINE', w / 2, 45);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText('"Educate, Agitate, Organize. I pledge to defend constitutional morality,', w / 2, 70);
    ctx.fillText('maintain non-violent iron discipline, and safeguard human equality across India."', w / 2, 88);

    // Verification QR Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 50, 115, 100, 100);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 50, 115, 100, 100);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('SCAN QR TO VERIFY', w / 2, 172);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(card.verifyUrl || `/verify/${card.sainikId}`, w / 2, 235);

    // Signatures
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Authorized Signatory:', 30, h - 50);
    ctx.fillText('National President / General Secretary', 30, h - 35);

    ctx.textAlign = 'right';
    ctx.fillText('Emergency Helpdesk: 1800-24-1927', w - 30, h - 50);
    ctx.fillText('Central Command HQ, Nagpur', w - 30, h - 35);
  }
}

function downloadIdCard() {
  const canvas = document.getElementById('idCardCanvas');
  const link = document.createElement('a');
  link.download = `SSD_Sainik_ID_${currentCardData ? currentCardData.sainikId : 'card'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
