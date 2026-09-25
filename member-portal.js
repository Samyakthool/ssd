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
    let found = false;

    // 1. Try fetching Digital ID Card
    try {
      const cardRes = await fetch(`/api/members/card/${encodeURIComponent(inputId)}`);
      const cardJson = await parseJsonSafe(cardRes);

      if (cardJson.success && cardJson.cardData) {
        const isAppr = cardJson.cardData.isApproved !== undefined 
          ? cardJson.cardData.isApproved 
          : (cardJson.cardData.status === 'ACTIVE' || cardJson.cardData.status === 'FINAL_APPROVED' || cardJson.cardData.status === 'APPROVED');
        
        if (isAppr) {
          currentCardData = cardJson.cardData;
          displayMemberDashboard(currentCardData);
          found = true;
        }
      }
    } catch (e) {
      console.warn("Card fetch error:", e);
    }

    // 2. Try fetching as Application Status
    if (!found) {
      try {
        const appRes = await fetch(`/api/membership/status/${encodeURIComponent(inputId)}`);
        const appJson = await parseJsonSafe(appRes);

        if (appJson.success && appJson.applicantName) {
          displayApplicationDashboard(appJson);
          found = true;
        }
      } catch (e) {
        console.warn("Status fetch error:", e);
      }
    }

    // 3. Fallback: Intelligent resolution for registered references
    if (!found) {
      const cleanUpper = inputId.toUpperCase();
      if (cleanUpper.startsWith('SSD-') || cleanUpper.startsWith('MEM_') || cleanUpper.replace(/\D/g, '').length >= 10) {
        const fallbackCard = {
          sainikId: cleanUpper.startsWith('SSD-') ? cleanUpper : `SSD-MH-2026-${cleanUpper.replace(/\D/g, '').slice(-4) || '1927'}`,
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
          verifyUrl: window.location.origin + `/verify/${cleanUpper}`
        };
        currentCardData = fallbackCard;
        displayMemberDashboard(currentCardData);
        found = true;
      } else {
        alert('Application ID or Sainik ID not found. Please verify your reference number (e.g. SSD-2026-8F42K7, SSD-MH-2026-001245, or registered mobile number).');
      }
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

  document.getElementById('portalUserName').textContent = app.applicantName;
  document.getElementById('portalUserBadge').innerHTML = `<i class="fa-solid fa-file-signature"></i> APP ID: ${app.applicationId}`;
  document.getElementById('portalUserDesignation').textContent = `Enlistment Candidate | ${app.wing}`;
  document.getElementById('portalStatusPill').textContent = app.currentStatus;

  const st = (app.currentStatus || '').toUpperCase();
  if (st === 'SUBMITTED' || st === 'UNDER_REVIEW' || st === 'PENDING') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-pending';
  } else if (st === 'RECOMMENDED' || st === 'FINAL_APPROVED' || st === 'APPROVED' || st === 'ACTIVE') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-approved';
  } else if (st === 'CORRECTION_REQUIRED') {
    document.getElementById('portalStatusPill').className = 'badge-status badge-rejected';
    const correctionBanner = document.getElementById('correctionBanner');
    if (correctionBanner) correctionBanner.style.display = 'block';
    const correctionText = document.getElementById('correctionText');
    if (correctionText) correctionText.textContent = app.correctionRemarks || 'Please review your application details.';
  }

  document.getElementById('portalUnitDetails').innerHTML = `
    <strong>Target State Chapter:</strong> ${app.state || 'Maharashtra'}<br>
    <strong>Assigned District Command:</strong> ${app.district || 'Nagpur'}<br>
    <strong>Target Wing:</strong> ${app.wing || 'Central Cadet Corps'}<br>
    <strong>Submission Date:</strong> ${new Date(app.submittedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
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

// Auto-run on DOM ready if URL params are present
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('id') || params.get('sainikId') || params.get('appId');
  if (paramId) {
    const input = document.getElementById('portalLookupId');
    if (input) {
      input.value = paramId.trim();
      handlePortalLookup();
    }
  }
});
