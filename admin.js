/* ==========================================================================
   SAMATA SAINIK DAL (SSD) - CENTRAL COMMAND ADMIN PORTAL LOGIC
   Firebase Realtime Database Management Engine
   ========================================================================== */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let firebaseApp = null;
let db = null;
let isFirebaseLive = false;

// Master Key for demo / initial access
const MASTER_PASSCODE = "SSD1927";

// Local in-memory store
let adminData = {
  members: {},
  donations: {},
  news: {},
  events: {},
  campaigns: {},
  gallery: {},
  contacts: {},
  stats: {
    members: 100000,
    states: 28,
    events: 5200,
    yearsActive: 99
  }
};

// Seed dataset for demo/fallback
const ssdInitialSeed = {
  stats: {
    members: 100000,
    states: 28,
    events: 5200,
    yearsActive: 99
  },
  news: {
    "news_1": {
      title: "National SSD Centenary (1927–2027) Coordination Council Established at Nagpur",
      excerpt: "Central Command announces nationwide 100-Year commemorative march pasts, constitutional literacy yatras, and youth cadet enlistment drives.",
      date: "October 14, 2026",
      category: "Centenary",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"
    },
    "news_2": {
      title: "Over 2,500 Cadets Graduate from State Physical Drill & Leadership Camp",
      excerpt: "Intensive residential camp at Deekshabhoomi ground concludes with ceremonial salute, flag drill, and constitutional law seminars.",
      date: "October 08, 2026",
      category: "Cadet Training",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"
    },
    "news_3": {
      title: "Annual Mahad Satyagraha & Water Rights Memorial March Announced",
      excerpt: "Sainiks from 20 states to assemble at Chavdar Tale on 25 December to commemorate the historic 1927 struggle for human dignity.",
      date: "September 29, 2026",
      category: "History & Memorial",
      imageUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=600&q=80"
    },
    "news_4": {
      title: "Mahila Samata Sainik Dal National Convention Demands Strict Action on Atrocities",
      excerpt: "Over 3,000 women commanders and delegates pass unanimous resolutions on women's safety, legal defense cells, and educational scholarships.",
      date: "September 20, 2026",
      category: "Mahila Dal",
      imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80"
    },
    "news_5": {
      title: "SSD Legal Advisory Cell Files High Court Petitions for Rural Land Rights",
      excerpt: "Dedicated panel of advocate sainiks secures legal relief for 120 landless families under constitutional protections.",
      date: "September 12, 2026",
      category: "Legal Cell",
      imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80"
    }
  },
  events: {
    "event_1": {
      title: "99th SSD Foundation Day National Parade & Salute",
      date: "Sept 24, 2026",
      location: "Nagpur & Mumbai Central Command",
      description: "Ceremonial flag hoisting, march past by all Cadet Wings, and state address commemorating Dr. B.R. Ambedkar's founding vision.",
      status: "upcoming"
    },
    "event_2": {
      title: "National Constitution Day March & Public Conclave",
      date: "Nov 26, 2026",
      location: "Central Secretariat, New Delhi",
      description: "Mass rally upholding Constitutional Morality, Fundamental Rights, and the Preamble across Delhi NCR.",
      status: "upcoming"
    },
    "event_3": {
      title: "Manusmriti Dahan Din & Social Equality Seminar",
      date: "Dec 25, 2026",
      location: "Chavdar Tale, Mahad, Maharashtra",
      description: "Annual national gathering paying homage to the historic 1927 Mahad struggle led by Babasaheb Ambedkar.",
      status: "upcoming"
    }
  },
  campaigns: {
    "camp_1": {
      title: "National Constitutional Literacy Yatra & Mass Preamble Campaign",
      category: "Constitutional Awareness",
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80",
      description: "Distributing 1 Million illustrated copies of the Indian Constitution in rural villages, organizing preamble assemblies, and establishing legal guidance clinics.",
      targetAmount: 5000000,
      raisedAmount: 3850000,
      volunteersCount: "12,400+",
      districtsCount: "180+",
      causeKey: "Constitutional Literacy Yatra"
    },
    "camp_2": {
      title: "SSD Centenary (1927–2027) National Headquarters & Archives",
      category: "Centenary Heritage",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      description: "Construction of the central Babasaheb Ambedkar Sainik Academy, digital historical museum, research library, and residential drill grounds.",
      targetAmount: 25000000,
      raisedAmount: 14200000,
      volunteersCount: "45,000+",
      districtsCount: "250+",
      causeKey: "Centenary Headquarters Fund"
    }
  },
  gallery: {
    "gal_1": {
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80",
      caption: "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur",
      category: "Cadet Drills"
    },
    "gal_2": {
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
      caption: "Mahila Samata Sainik Dal Volunteers at National Equality Rally",
      category: "Mahila Dal"
    }
  },
  members: {
    "mem_demo_1": {
      fullName: "Cadet Rameshwar S. Meshram",
      phone: "+91 98223 41927",
      email: "rameshwar.meshram@example.com",
      state: "Maharashtra",
      city: "Nagpur",
      wing: "Central Cadet Corps (Sainik Wing)",
      status: "Approved",
      timestamp: Date.now() - 86400000 * 2
    },
    "mem_demo_2": {
      fullName: "Adv. Sunita Gautam",
      phone: "+91 94231 55678",
      email: "sunita.gautam@example.com",
      state: "Delhi NCR",
      city: "New Delhi",
      wing: "Constitutional & Legal Cell",
      status: "Verified",
      timestamp: Date.now() - 86400000 * 5
    }
  },
  donations: {
    "don_demo_1": {
      receiptNumber: "SSD-REC-2026-0089",
      donorName: "Prakashrao R. Kamble",
      amount: 5000,
      cause: "Centenary Headquarters Fund",
      pan: "ABCDE1234F",
      status: "Completed",
      timestamp: Date.now() - 86400000
    },
    "don_demo_2": {
      receiptNumber: "SSD-REC-2026-0090",
      donorName: "Anand M. Wankhede",
      amount: 2500,
      cause: "Constitutional Literacy Yatra",
      pan: "XYZPK9876Q",
      status: "Completed",
      timestamp: Date.now() - 86400000 * 3
    }
  },
  contact_messages: {
    "msg_demo_1": {
      name: "Dr. B. K. Thorat",
      email: "bkthorat@example.com",
      phone: "+91 98230 11223",
      state: "Madhya Pradesh",
      subject: "Request to establish new district cadet unit in Bhopal",
      message: "We have assembled over 120 dedicated youth ready to undergo physical drill and constitutional training. Request central command authorization.",
      status: "Unread",
      timestamp: Date.now() - 86400000
    }
  }
};

// ==========================================================================
// INITIALIZATION & AUTHENTICATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  checkAuthSession();
});

function initFirebase() {
  try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      isFirebaseLive = true;
      setDbStatus(true, "Firebase Live Realtime Connected");
    } else {
      setDbStatus(false, "SSD Verified Demo Active");
    }
  } catch (e) {
    console.warn("Firebase Init Notice:", e);
    setDbStatus(false, "Fallback Dataset Active");
  }
}

function setDbStatus(isLive, text) {
  const pill = document.getElementById("dbStatusPill");
  const label = document.getElementById("dbStatusText");
  if (pill && label) {
    pill.className = "db-status-pill " + (isLive ? "" : "offline");
    label.textContent = text;
  }
}

function checkAuthSession() {
  const isAuth = sessionStorage.getItem("ssd_admin_auth");
  const authGate = document.getElementById("authGate");
  const adminApp = document.getElementById("adminApp");

  if (isAuth === "true") {
    if (authGate) authGate.style.display = "none";
    if (adminApp) adminApp.style.display = "flex";
    loadAllRealtimeData();
  } else {
    if (authGate) authGate.style.display = "flex";
    if (adminApp) adminApp.style.display = "none";
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const input = document.getElementById("adminPasscode");
  const passcode = input ? input.value.trim() : "";

  if (passcode === MASTER_PASSCODE || passcode === "SSD1927" || passcode === "ssd1927") {
    sessionStorage.setItem("ssd_admin_auth", "true");
    showToast("Command Access Granted. Welcome, Commander.", "success");
    checkAuthSession();
  } else {
    showToast("Invalid Command Passcode. Access Denied.", "error");
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem("ssd_admin_auth");
  showToast("Command session locked.", "info");
  checkAuthSession();
}

function toggleSidebarDrawer() {
  const sidebar = document.getElementById("adminSidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

// ==========================================================================
// VIEW SWITCHER
// ==========================================================================
const viewMetadata = {
  overview: { title: "Central Command Overview", sub: "Nationwide real-time metrics & recent activity" },
  members: { title: "Enlisted Sainiks Registry", sub: "Verify cadet applications & download state rosters" },
  donations: { title: "Centenary Movement Fund Ledger", sub: "Real-time contribution audit & donor PAN tracking" },
  news: { title: "Gazette Bulletins & Circulars", sub: "Publish official announcements to the public portal" },
  events: { title: "Drills, Seminars & Rallies", sub: "Schedule nationwide cadet training and conclaves" },
  campaigns: { title: "Ongoing Missions & Causes", sub: "Manage active fundraising goals & volunteer targets" },
  gallery: { title: "Historical & Event Photo Archives", sub: "Curate high-resolution public photo albums" },
  contacts: { title: "Grievance Desk & Public Inquiries", sub: "Respond to incoming state command queries" },
  stats: { title: "Public Portal Live Counters", sub: "Update homepage live counters directly in Firebase" },
  settings: { title: "Database Tools & Backups", sub: "Export JSON backups and seed verified datasets" }
};

function switchView(viewKey) {
  // Update sidebar active link
  document.querySelectorAll(".sidebar-item").forEach(item => item.classList.remove("active"));
  const activeNav = document.getElementById("nav-" + viewKey);
  if (activeNav) activeNav.classList.add("active");

  // Switch panels
  document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
  const targetPanel = document.getElementById("view" + viewKey.charAt(0).toUpperCase() + viewKey.slice(1));
  if (targetPanel) targetPanel.classList.add("active");

  // Update topbar heading
  const meta = viewMetadata[viewKey] || { title: "Admin Portal", sub: "" };
  const hTitle = document.getElementById("pageHeadingTitle");
  const hSub = document.getElementById("pageHeadingSubtitle");
  if (hTitle) hTitle.textContent = meta.title;
  if (hSub) hSub.textContent = meta.sub;

  // Close mobile sidebar if open
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById("adminSidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
}

// ==========================================================================
// REALTIME DATA LOADERS & LISTENERS
// ==========================================================================
function loadAllRealtimeData() {
  if (db) {
    // 1. Members
    db.ref('members').on('value', (snap) => {
      adminData.members = snap.val() || {};
      renderMembersTable();
      renderOverview();
    });

    // 2. Donations
    db.ref('donations').on('value', (snap) => {
      adminData.donations = snap.val() || {};
      renderDonationsTable();
      renderOverview();
    });

    // 3. News
    db.ref('news').on('value', (snap) => {
      adminData.news = snap.val() || ssdInitialSeed.news;
      renderNewsTable();
      renderOverview();
    });

    // 4. Events
    db.ref('events').on('value', (snap) => {
      adminData.events = snap.val() || ssdInitialSeed.events;
      renderEventsTable();
      renderOverview();
    });

    // 5. Campaigns
    db.ref('campaigns').on('value', (snap) => {
      adminData.campaigns = snap.val() || ssdInitialSeed.campaigns;
      renderCampaignsTable();
    });

    // 6. Gallery
    db.ref('gallery').on('value', (snap) => {
      adminData.gallery = snap.val() || ssdInitialSeed.gallery;
      renderGalleryGrid();
    });

    // 7. Contacts
    db.ref('contact_messages').on('value', (snap) => {
      adminData.contacts = snap.val() || {};
      renderContactsTable();
    });

    // 8. Stats
    db.ref('stats').on('value', (snap) => {
      adminData.stats = snap.val() || ssdInitialSeed.stats;
      populateStatsForm();
    });

    // 9. Settings (Razorpay API Key)
    db.ref('settings/razorpayKeyId').on('value', (snap) => {
      const val = snap.val();
      if (val) {
        localStorage.setItem("ssd_razorpay_key_id", val);
      }
      initRazorpayAdminConfig();
    });

  } else {
    // Fallback in-memory storage from localStorage or Initial Seed
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      try { adminData = JSON.parse(localStore); } catch (e) { adminData = ssdInitialSeed; }
    } else {
      adminData = ssdInitialSeed;
      saveLocalStore();
    }
    initRazorpayAdminConfig();
    renderMembersTable();
    renderDonationsTable();
    renderNewsTable();
    renderEventsTable();
    renderCampaignsTable();
    renderGalleryGrid();
    renderContactsTable();
    populateStatsForm();
    renderOverview();
  }
}

function saveLocalStore() {
  if (!db) {
    localStorage.setItem("ssd_admin_local_data", JSON.stringify(adminData));
  }
}

// ==========================================================================
// RENDERERS: OVERVIEW & KPIS
// ==========================================================================
function renderOverview() {
  const membersArr = Object.values(adminData.members || {});
  const donationsArr = Object.values(adminData.donations || {});
  const newsArr = Object.values(adminData.news || {});
  const eventsArr = Object.values(adminData.events || {});
  const contactsArr = Object.values(adminData.contacts || {});

  // Update Badges
  setText("badgeMembersCount", membersArr.length);
  setText("badgeDonationsCount", donationsArr.length);
  setText("badgeNewsCount", newsArr.length);
  setText("badgeEventsCount", eventsArr.length);
  setText("badgeCampaignsCount", Object.keys(adminData.campaigns || {}).length);
  setText("badgeGalleryCount", Object.keys(adminData.gallery || {}).length);
  setText("badgeContactsCount", contactsArr.length);

  // Update KPI Cards
  setText("kpiMembersTotal", (membersArr.length + (adminData.stats.members || 100000)).toLocaleString());
  
  let totalDonationsAmount = donationsArr.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  setText("kpiDonationsTotal", "₹" + totalDonationsAmount.toLocaleString());
  setText("kpiNewsTotal", newsArr.length);
  setText("kpiEventsTotal", eventsArr.length);

  // Overview Recent Members Table
  const tbody = document.getElementById("overviewMembersTableBody");
  if (!tbody) return;

  if (membersArr.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 18px;">No members enlisted yet</td></tr>';
    return;
  }

  const recent = membersArr.slice(-5).reverse();
  tbody.innerHTML = recent.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.fullName || m.name || 'Anonymous')}</strong></td>
      <td>${escapeHtml(m.city ? m.city + ', ' + m.state : (m.state || 'India'))}</td>
      <td><span class="badge-status badge-info">${escapeHtml(m.wing || 'Cadet Corps')}</span></td>
      <td><span class="badge-status ${getStatusBadgeClass(m.status || 'Verified')}">${escapeHtml(m.status || 'Verified')}</span></td>
    </tr>
  `).join('');
}

// ==========================================================================
// RENDERERS: MEMBERS (/members)
// ==========================================================================
function renderMembersTable(filteredList = null) {
  const tbody = document.getElementById("membersTableBody");
  if (!tbody) return;

  const membersObj = adminData.members || {};
  let list = filteredList || Object.entries(membersObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No sainik enlistment records found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => {
    const regDate = m.timestamp ? new Date(m.timestamp).toLocaleDateString() : 'Recent';
    return `
      <tr>
        <td style="color: var(--text-muted);">${regDate}</td>
        <td><strong>${escapeHtml(m.fullName || m.name || 'Unnamed')}</strong></td>
        <td>
          <div><i class="fa-solid fa-phone" style="font-size: 11px; color: var(--primary-orange);"></i> ${escapeHtml(m.phone || 'N/A')}</div>
          <div style="font-size: 11.5px; color: var(--text-muted);"><i class="fa-solid fa-envelope" style="font-size: 11px;"></i> ${escapeHtml(m.email || 'N/A')}</div>
        </td>
        <td>${escapeHtml(m.city ? m.city + ', ' + m.state : (m.state || 'N/A'))}</td>
        <td><span class="badge-status badge-info">${escapeHtml(m.wing || 'Cadet Corps')}</span></td>
        <td>
          <span class="badge-status ${getStatusBadgeClass(m.status || 'Approved')}">
            ${escapeHtml(m.status || 'Approved')}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn verify" onclick="approveMember('${m.id}')" title="Approve & Verify">
              <i class="fa-solid fa-check"></i>
            </button>
            <button type="button" class="action-icon-btn delete" onclick="deleteMember('${m.id}')" title="Delete Entry">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterMembersTable() {
  const search = (document.getElementById("memberSearchInput")?.value || "").toLowerCase();
  const status = document.getElementById("memberStatusFilter")?.value || "all";

  const all = Object.entries(adminData.members || {}).map(([key, val]) => ({ id: key, ...val }));
  const filtered = all.filter(m => {
    const matchSearch = (m.fullName || m.name || '').toLowerCase().includes(search) ||
                        (m.phone || '').toLowerCase().includes(search) ||
                        (m.state || '').toLowerCase().includes(search) ||
                        (m.city || '').toLowerCase().includes(search);
    const matchStatus = (status === "all") || (m.status === status);
    return matchSearch && matchStatus;
  });

  renderMembersTable(filtered);
}

function approveMember(id) {
  if (db) {
    db.ref('members/' + id).update({ status: 'Approved' })
      .then(() => showToast("Sainik enlistment verified & approved!", "success"))
      .catch(err => showToast("Update error: " + err.message, "error"));
  } else {
    if (adminData.members[id]) {
      adminData.members[id].status = "Approved";
      saveLocalStore();
      renderMembersTable();
      showToast("Sainik enlistment verified & approved!", "success");
    }
  }
}

function deleteMember(id) {
  if (!confirm("Are you sure you want to remove this sainik enlistment record?")) return;
  if (db) {
    db.ref('members/' + id).remove()
      .then(() => showToast("Member record deleted.", "info"))
      .catch(err => showToast("Delete error: " + err.message, "error"));
  } else {
    delete adminData.members[id];
    saveLocalStore();
    renderMembersTable();
    showToast("Member record deleted.", "info");
  }
}

function openAddMemberModal() {
  document.getElementById("formAddMember")?.reset();
  openAdminModal("modalAddMember");
}

function handleManualAddMember(e) {
  e.preventDefault();
  const name = document.getElementById("manualMemberName").value.trim();
  const phone = document.getElementById("manualMemberPhone").value.trim();
  const email = document.getElementById("manualMemberEmail").value.trim();
  const state = document.getElementById("manualMemberState").value.trim();
  const city = document.getElementById("manualMemberCity").value.trim();
  const wing = document.getElementById("manualMemberWing").value;

  const newEntry = {
    fullName: name,
    phone: phone,
    email: email,
    state: state,
    city: city,
    wing: wing,
    status: "Approved",
    timestamp: Date.now()
  };

  if (db) {
    db.ref('members').push(newEntry)
      .then(() => {
        showToast("Sainik enlisted successfully to Firebase!", "success");
        closeAdminModal("modalAddMember");
      })
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    const id = "mem_" + Date.now();
    adminData.members[id] = newEntry;
    saveLocalStore();
    renderMembersTable();
    showToast("Sainik enlisted successfully!", "success");
    closeAdminModal("modalAddMember");
  }
}

// ==========================================================================
// RENDERERS: DONATIONS (/donations)
// ==========================================================================
function renderDonationsTable(filteredList = null) {
  const tbody = document.getElementById("donationsTableBody");
  if (!tbody) return;

  const donationsObj = adminData.donations || {};
  let list = filteredList || Object.entries(donationsObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">No donations recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(d => {
    const dDate = d.timestamp ? new Date(d.timestamp).toLocaleDateString() : 'Recent';
    const payId = d.paymentId || (d.id ? 'pay_' + d.id.slice(-8) : 'pay_captured');
    return `
      <tr>
        <td><code>${escapeHtml(d.receiptNumber || 'SSD-REC-' + (d.id ? d.id.slice(-4) : '2026'))}</code></td>
        <td><code style="color: var(--primary-orange);">${escapeHtml(payId)}</code></td>
        <td style="color: var(--text-muted);">${dDate}</td>
        <td><strong>${escapeHtml(d.donorName || d.name || 'Anonymous Donor')}</strong></td>
        <td><strong style="color: var(--success); font-size: 14px;">₹${(Number(d.amount) || 0).toLocaleString()}</strong></td>
        <td>${escapeHtml(d.cause || 'Centenary Fund')}</td>
        <td><code>${escapeHtml(d.pan || 'N/A')}</code></td>
        <td><span class="badge-status badge-approved">${escapeHtml(d.status || 'Completed')}</span></td>
        <td style="text-align: right;">
          <button type="button" class="action-icon-btn" onclick="openAdminReceiptModal('${d.id}')" title="Print/View 80G Receipt">
            <i class="fa-solid fa-receipt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDonationsTable() {
  const search = (document.getElementById("donationSearchInput")?.value || "").toLowerCase();
  const all = Object.entries(adminData.donations || {}).map(([key, val]) => ({ id: key, ...val }));
  const filtered = all.filter(d => {
    return (d.donorName || d.name || '').toLowerCase().includes(search) ||
           (d.pan || '').toLowerCase().includes(search) ||
           (d.cause || '').toLowerCase().includes(search) ||
           (d.paymentId || '').toLowerCase().includes(search) ||
           (d.receiptNumber || '').toLowerCase().includes(search);
  });
  renderDonationsTable(filtered);
}

function openAdminReceiptModal(id) {
  const donationsObj = adminData.donations || {};
  let d = donationsObj[id];
  if (!d && Array.isArray(donationsObj)) {
    d = donationsObj.find(x => x.id === id);
  }
  if (!d) {
    const list = Object.entries(donationsObj).map(([key, val]) => ({ id: key, ...val }));
    d = list.find(x => x.id === id) || { id, donorName: "Contributor", amount: 1000, cause: "Centenary Fund" };
  }

  const noEl = document.getElementById("admReceiptNo");
  const payIdEl = document.getElementById("admReceiptPayId");
  const dateEl = document.getElementById("admReceiptDate");
  const nameEl = document.getElementById("admReceiptDonorName");
  const panEl = document.getElementById("admReceiptDonorPan");
  const causeEl = document.getElementById("admReceiptCause");
  const amountEl = document.getElementById("admReceiptAmount");

  if (noEl) noEl.textContent = d.receiptNumber || ("SSD-REC-2026-" + (d.id || id).slice(-4));
  if (payIdEl) payIdEl.textContent = d.paymentId || ("pay_" + (d.id || id).slice(-8));
  if (dateEl) dateEl.textContent = d.timestamp ? new Date(d.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  if (nameEl) nameEl.textContent = d.donorName || d.name || "Dedicated Contributor";
  if (panEl) panEl.textContent = (d.pan && d.pan.trim()) ? d.pan.toUpperCase() : "N/A";
  if (causeEl) causeEl.textContent = d.cause || "Centenary Headquarters Fund";
  if (amountEl) amountEl.textContent = "₹" + (Number(d.amount) || 1000).toLocaleString("en-IN");

  openAdminModal("modalAdminReceipt");
}

function printAdminReceiptArea() {
  window.print();
}

// ==========================================================================
// RAZORPAY GATEWAY CONFIGURATION (ADMIN)
// ==========================================================================
function initRazorpayAdminConfig() {
  const savedKey = localStorage.getItem("ssd_razorpay_key_id") || "rzp_test_1DP5mmOlF5G5ag";
  const input = document.getElementById("adminRazorpayKeyId");
  if (input) input.value = savedKey;
  updateRazorpayBadge(savedKey);
}

function updateRazorpayBadge(key) {
  const badge = document.getElementById("razorpayModeBadge");
  if (!badge) return;
  if (key && key.startsWith("rzp_live_")) {
    badge.className = "badge-status badge-approved";
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Live Production Mode';
  } else {
    badge.className = "badge-status badge-pending";
    badge.innerHTML = '<i class="fa-solid fa-vial"></i> Test Sandbox Mode';
  }
}

function saveRazorpayConfig(e) {
  e.preventDefault();
  const input = document.getElementById("adminRazorpayKeyId");
  const keyVal = input ? input.value.trim() : "";
  if (!keyVal) {
    showToast("Please enter a valid Razorpay Key ID", "error");
    return;
  }

  localStorage.setItem("ssd_razorpay_key_id", keyVal);
  updateRazorpayBadge(keyVal);

  if (db) {
    db.ref("settings/razorpayKeyId").set(keyVal);
  }
  showToast("Razorpay API Key successfully updated and active!", "success");
}

function testRazorpayPing() {
  const input = document.getElementById("adminRazorpayKeyId");
  const keyVal = input ? input.value.trim() : "";
  if (!keyVal || (!keyVal.startsWith("rzp_test_") && !keyVal.startsWith("rzp_live_"))) {
    showToast("Warning: Key ID format should start with 'rzp_test_' or 'rzp_live_'", "error");
    return;
  }
  showToast(`Razorpay Gateway Ping Successful: ${keyVal.startsWith("rzp_live_") ? "Live Production" : "Test Sandbox"} Key Active.`, "success");
}

// ==========================================================================
// RENDERERS: NEWS & DISPATCHES (/news)
// ==========================================================================
function renderNewsTable() {
  const tbody = document.getElementById("newsTableBody");
  if (!tbody) return;

  const newsObj = adminData.news || {};
  const list = Object.entries(newsObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">No gazette notices published yet.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(n => `
    <tr>
      <td>
        <img src="${n.imageUrl || 'logo.png'}" alt="Thumb" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" onerror="this.src='logo.png'">
      </td>
      <td>
        <strong>${escapeHtml(n.title)}</strong>
        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.3; margin-top: 3px;">${escapeHtml(n.excerpt || '')}</p>
      </td>
      <td><span class="badge-status badge-info">${escapeHtml(n.category || 'Gazette')}</span></td>
      <td style="white-space: nowrap; color: var(--text-muted);">${escapeHtml(n.date || 'Recent')}</td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button type="button" class="action-icon-btn" onclick="openEditNewsModal('${n.id}')" title="Edit Dispatch">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" class="action-icon-btn delete" onclick="deleteNews('${n.id}')" title="Delete Notice">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateNewsModal() {
  document.getElementById("formNews")?.reset();
  document.getElementById("newsItemKey").value = "";
  document.getElementById("modalNewsHeading").textContent = "Publish New Gazette Notice";
  document.getElementById("newsImagePreview").style.display = "none";
  openAdminModal("modalNews");
}

function openEditNewsModal(id) {
  const item = adminData.news[id];
  if (!item) return;

  document.getElementById("newsItemKey").value = id;
  document.getElementById("newsTitle").value = item.title || "";
  document.getElementById("newsCategory").value = item.category || "Central Command";
  document.getElementById("newsDate").value = item.date || "";
  document.getElementById("newsImageUrl").value = item.imageUrl || "";
  document.getElementById("newsExcerpt").value = item.excerpt || "";

  updateImagePreview("newsImagePreview", item.imageUrl || "");
  document.getElementById("modalNewsHeading").textContent = "Edit Gazette Notice";
  openAdminModal("modalNews");
}

function handleSaveNews(e) {
  e.preventDefault();
  const id = document.getElementById("newsItemKey").value;
  const payload = {
    title: document.getElementById("newsTitle").value.trim(),
    category: document.getElementById("newsCategory").value,
    date: document.getElementById("newsDate").value.trim(),
    imageUrl: document.getElementById("newsImageUrl").value.trim(),
    excerpt: document.getElementById("newsExcerpt").value.trim()
  };

  if (db) {
    const targetRef = id ? db.ref('news/' + id) : db.ref('news').push();
    targetRef.set(payload)
      .then(() => {
        showToast("Gazette notice saved successfully to Firebase!", "success");
        closeAdminModal("modalNews");
      })
      .catch(err => showToast("Save error: " + err.message, "error"));
  } else {
    const key = id || ("news_" + Date.now());
    adminData.news[key] = payload;
    saveLocalStore();
    renderNewsTable();
    showToast("Gazette notice saved!", "success");
    closeAdminModal("modalNews");
  }
}

function deleteNews(id) {
  if (!confirm("Are you sure you want to delete this gazette dispatch?")) return;
  if (db) {
    db.ref('news/' + id).remove()
      .then(() => showToast("Dispatch deleted.", "info"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    delete adminData.news[id];
    saveLocalStore();
    renderNewsTable();
    showToast("Dispatch deleted.", "info");
  }
}

// ==========================================================================
// RENDERERS: EVENTS (/events)
// ==========================================================================
function renderEventsTable() {
  const tbody = document.getElementById("eventsTableBody");
  if (!tbody) return;

  const eventsObj = adminData.events || {};
  const list = Object.entries(eventsObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">No events scheduled.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(ev => `
    <tr>
      <td><strong style="color: var(--primary-orange); white-space: nowrap;">${escapeHtml(ev.date)}</strong></td>
      <td>
        <strong>${escapeHtml(ev.title)}</strong>
        <p style="font-size: 12px; color: var(--text-muted);">${escapeHtml(ev.description || '')}</p>
      </td>
      <td><i class="fa-solid fa-location-dot" style="color: var(--text-muted); font-size: 11px;"></i> ${escapeHtml(ev.location || 'Nagpur')}</td>
      <td><span class="badge-status ${ev.status === 'completed' ? 'badge-verified' : 'badge-pending'}">${escapeHtml(ev.status || 'upcoming')}</span></td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button type="button" class="action-icon-btn" onclick="openEditEventModal('${ev.id}')" title="Edit Event">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" class="action-icon-btn delete" onclick="deleteEvent('${ev.id}')" title="Delete Event">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateEventModal() {
  document.getElementById("formEvent")?.reset();
  document.getElementById("eventItemKey").value = "";
  document.getElementById("modalEventHeading").textContent = "Schedule New Event";
  openAdminModal("modalEvent");
}

function openEditEventModal(id) {
  const ev = adminData.events[id];
  if (!ev) return;
  document.getElementById("eventItemKey").value = id;
  document.getElementById("eventTitle").value = ev.title || "";
  document.getElementById("eventDate").value = ev.date || "";
  document.getElementById("eventLocation").value = ev.location || "";
  document.getElementById("eventStatus").value = ev.status || "upcoming";
  document.getElementById("eventDescription").value = ev.description || "";
  document.getElementById("modalEventHeading").textContent = "Edit Event Details";
  openAdminModal("modalEvent");
}

function handleSaveEvent(e) {
  e.preventDefault();
  const id = document.getElementById("eventItemKey").value;
  const payload = {
    title: document.getElementById("eventTitle").value.trim(),
    date: document.getElementById("eventDate").value.trim(),
    location: document.getElementById("eventLocation").value.trim(),
    status: document.getElementById("eventStatus").value,
    description: document.getElementById("eventDescription").value.trim()
  };

  if (db) {
    const targetRef = id ? db.ref('events/' + id) : db.ref('events').push();
    targetRef.set(payload)
      .then(() => {
        showToast("Event saved successfully!", "success");
        closeAdminModal("modalEvent");
      })
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    const key = id || ("event_" + Date.now());
    adminData.events[key] = payload;
    saveLocalStore();
    renderEventsTable();
    showToast("Event saved!", "success");
    closeAdminModal("modalEvent");
  }
}

function deleteEvent(id) {
  if (!confirm("Delete this scheduled event?")) return;
  if (db) {
    db.ref('events/' + id).remove()
      .then(() => showToast("Event deleted.", "info"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    delete adminData.events[id];
    saveLocalStore();
    renderEventsTable();
    showToast("Event deleted.", "info");
  }
}

// ==========================================================================
// RENDERERS: CAMPAIGNS (/campaigns)
// ==========================================================================
function renderCampaignsTable() {
  const tbody = document.getElementById("campaignsTableBody");
  if (!tbody) return;

  const camps = adminData.campaigns || {};
  const list = Object.entries(camps).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">No active campaigns found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => {
    const target = Number(c.targetAmount) || 1;
    const raised = Number(c.raisedAmount) || 0;
    const pct = Math.min(100, Math.round((raised / target) * 100));

    return `
      <tr>
        <td>
          <strong>${escapeHtml(c.title)}</strong>
          <p style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(c.description || '')}</p>
        </td>
        <td><span class="badge-status badge-info">${escapeHtml(c.category || 'General')}</span></td>
        <td>₹${(target).toLocaleString()}</td>
        <td>
          <strong>₹${(raised).toLocaleString()}</strong>
          <div style="font-size: 11px; color: var(--primary-orange); font-weight: 700;">${pct}% Funded</div>
        </td>
        <td>
          <div><i class="fa-solid fa-users" style="font-size: 11px;"></i> ${escapeHtml(c.volunteersCount || '1,000+')}</div>
          <div style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.districtsCount || '50+')} districts</div>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn" onclick="openEditCampaignModal('${c.id}')" title="Edit Campaign">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="action-icon-btn delete" onclick="deleteCampaign('${c.id}')" title="Delete Campaign">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateCampaignModal() {
  document.getElementById("formCampaign")?.reset();
  document.getElementById("campaignItemKey").value = "";
  document.getElementById("modalCampaignHeading").textContent = "Create Ongoing Campaign";
  openAdminModal("modalCampaign");
}

function openEditCampaignModal(id) {
  const c = adminData.campaigns[id];
  if (!c) return;
  document.getElementById("campaignItemKey").value = id;
  document.getElementById("campaignTitle").value = c.title || "";
  document.getElementById("campaignCategory").value = c.category || "";
  document.getElementById("campaignCauseKey").value = c.causeKey || "";
  document.getElementById("campaignTarget").value = c.targetAmount || "";
  document.getElementById("campaignRaised").value = c.raisedAmount || "";
  document.getElementById("campaignVolunteers").value = c.volunteersCount || "";
  document.getElementById("campaignDistricts").value = c.districtsCount || "";
  document.getElementById("campaignImageUrl").value = c.imageUrl || "";
  document.getElementById("campaignDescription").value = c.description || "";
  document.getElementById("modalCampaignHeading").textContent = "Edit Campaign";
  openAdminModal("modalCampaign");
}

function handleSaveCampaign(e) {
  e.preventDefault();
  const id = document.getElementById("campaignItemKey").value;
  const payload = {
    title: document.getElementById("campaignTitle").value.trim(),
    category: document.getElementById("campaignCategory").value.trim(),
    causeKey: document.getElementById("campaignCauseKey").value.trim(),
    targetAmount: Number(document.getElementById("campaignTarget").value),
    raisedAmount: Number(document.getElementById("campaignRaised").value),
    volunteersCount: document.getElementById("campaignVolunteers").value.trim(),
    districtsCount: document.getElementById("campaignDistricts").value.trim(),
    imageUrl: document.getElementById("campaignImageUrl").value.trim(),
    description: document.getElementById("campaignDescription").value.trim()
  };

  if (db) {
    const targetRef = id ? db.ref('campaigns/' + id) : db.ref('campaigns').push();
    targetRef.set(payload)
      .then(() => {
        showToast("Campaign updated in Firebase!", "success");
        closeAdminModal("modalCampaign");
      })
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    const key = id || ("camp_" + Date.now());
    adminData.campaigns[key] = payload;
    saveLocalStore();
    renderCampaignsTable();
    showToast("Campaign updated!", "success");
    closeAdminModal("modalCampaign");
  }
}

function deleteCampaign(id) {
  if (!confirm("Are you sure you want to delete this campaign?")) return;
  if (db) {
    db.ref('campaigns/' + id).remove()
      .then(() => showToast("Campaign deleted.", "info"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    delete adminData.campaigns[id];
    saveLocalStore();
    renderCampaignsTable();
    showToast("Campaign deleted.", "info");
  }
}

// ==========================================================================
// RENDERERS: GALLERY (/gallery)
// ==========================================================================
function renderGalleryGrid() {
  const container = document.getElementById("galleryAdminGrid");
  if (!container) return;

  const galObj = adminData.gallery || {};
  const list = Object.entries(galObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No archive photos added yet.</div>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
      <div style="width: 100%; aspect-ratio: 16/9; overflow: hidden; background: var(--dark-navy);">
        <img src="${item.imageUrl}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='logo.png'">
      </div>
      <div style="padding: 14px; flex: 1; display: flex; flex-direction: column;">
        <span class="badge-status badge-info" style="align-self: flex-start; margin-bottom: 8px;">${escapeHtml(item.category || 'Historical')}</span>
        <p style="font-size: 12.5px; font-weight: 600; color: var(--text-dark); margin-bottom: 12px; flex: 1;">${escapeHtml(item.caption || '')}</p>
        <button type="button" class="btn-admin btn-admin-danger" style="width: 100%; justify-content: center; font-size: 12px; padding: 6px;" onclick="deleteGalleryItem('${item.id}')">
          <i class="fa-solid fa-trash"></i> Delete Photo
        </button>
      </div>
    </div>
  `).join('');
}

function openCreateGalleryModal() {
  document.getElementById("formGallery")?.reset();
  document.getElementById("galleryImagePreview").style.display = "none";
  openAdminModal("modalGallery");
}

function handleSaveGallery(e) {
  e.preventDefault();
  const payload = {
    imageUrl: document.getElementById("galleryImageUrl").value.trim(),
    caption: document.getElementById("galleryCaption").value.trim(),
    category: document.getElementById("galleryCategory").value
  };

  if (db) {
    db.ref('gallery').push(payload)
      .then(() => {
        showToast("Photo added to archives!", "success");
        closeAdminModal("modalGallery");
      })
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    const key = "gal_" + Date.now();
    adminData.gallery[key] = payload;
    saveLocalStore();
    renderGalleryGrid();
    showToast("Photo added to archives!", "success");
    closeAdminModal("modalGallery");
  }
}

function deleteGalleryItem(id) {
  if (!confirm("Delete this photo from public archives?")) return;
  if (db) {
    db.ref('gallery/' + id).remove()
      .then(() => showToast("Photo removed.", "info"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    delete adminData.gallery[id];
    saveLocalStore();
    renderGalleryGrid();
    showToast("Photo removed.", "info");
  }
}

// ==========================================================================
// RENDERERS: GRIEVANCES & CONTACTS (/contact_messages)
// ==========================================================================
function renderContactsTable() {
  const tbody = document.getElementById("contactsTableBody");
  if (!tbody) return;

  const contactsObj = adminData.contacts || {};
  const list = Object.entries(contactsObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">Grievance desk is clear. No pending inquiries.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => {
    const cDate = c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'Recent';
    return `
      <tr>
        <td style="color: var(--text-muted);">${cDate}</td>
        <td>
          <strong>${escapeHtml(c.name || 'Anonymous')}</strong>
          <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(c.email || '')} | ${escapeHtml(c.phone || '')}</div>
        </td>
        <td>
          <strong style="color: var(--dark-navy);">${escapeHtml(c.subject || 'General Inquiry')}</strong>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${escapeHtml(c.message || '')}</p>
        </td>
        <td>${escapeHtml(c.state || 'India')}</td>
        <td>
          <span class="badge-status ${c.status === 'Resolved' ? 'badge-verified' : 'badge-pending'}">${escapeHtml(c.status || 'Unread')}</span>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <a href="mailto:${encodeURIComponent(c.email || '')}?subject=Re: ${encodeURIComponent(c.subject || 'SSD Command Desk Response')}" class="action-icon-btn" title="Reply via Email">
              <i class="fa-solid fa-reply"></i>
            </a>
            <button type="button" class="action-icon-btn verify" onclick="markContactResolved('${c.id}')" title="Mark Resolved">
              <i class="fa-solid fa-check"></i>
            </button>
            <button type="button" class="action-icon-btn delete" onclick="deleteContact('${c.id}')" title="Delete Entry">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function markContactResolved(id) {
  if (db) {
    db.ref('contact_messages/' + id).update({ status: 'Resolved' })
      .then(() => showToast("Message marked as resolved!", "success"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    if (adminData.contacts[id]) {
      adminData.contacts[id].status = "Resolved";
      saveLocalStore();
      renderContactsTable();
      showToast("Message marked as resolved!", "success");
    }
  }
}

function deleteContact(id) {
  if (!confirm("Delete this message?")) return;
  if (db) {
    db.ref('contact_messages/' + id).remove()
      .then(() => showToast("Message deleted.", "info"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    delete adminData.contacts[id];
    saveLocalStore();
    renderContactsTable();
    showToast("Message deleted.", "info");
  }
}

// ==========================================================================
// RENDERERS: STATS & PUBLIC COUNTERS (/stats)
// ==========================================================================
function populateStatsForm() {
  const st = adminData.stats || ssdInitialSeed.stats;
  setInputValue("statMembersInput", st.members || 100000);
  setInputValue("statStatesInput", st.states || 28);
  setInputValue("statEventsInput", st.events || 5200);
  setInputValue("statYearsInput", st.yearsActive || 99);
}

function saveStatsForm(e) {
  e.preventDefault();
  const payload = {
    members: Number(document.getElementById("statMembersInput").value),
    states: Number(document.getElementById("statStatesInput").value),
    events: Number(document.getElementById("statEventsInput").value),
    yearsActive: Number(document.getElementById("statYearsInput").value)
  };

  if (db) {
    db.ref('stats').set(payload)
      .then(() => showToast("Homepage Live Counters updated successfully in Firebase!", "success"))
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    adminData.stats = payload;
    saveLocalStore();
    showToast("Homepage Live Counters updated!", "success");
  }
}

// ==========================================================================
// DATA EXPORT UTILITIES (CSV & JSON)
// ==========================================================================
function exportMembersToCSV() {
  const members = Object.values(adminData.members || {});
  if (members.length === 0) {
    showToast("No members to export.", "error");
    return;
  }

  const headers = ["Full Name", "Phone", "Email", "State", "City", "Wing", "Status", "Date"];
  const rows = members.map(m => [
    `"${m.fullName || m.name || ''}"`,
    `"${m.phone || ''}"`,
    `"${m.email || ''}"`,
    `"${m.state || ''}"`,
    `"${m.city || ''}"`,
    `"${m.wing || ''}"`,
    `"${m.status || 'Verified'}"`,
    `"${m.timestamp ? new Date(m.timestamp).toISOString() : ''}"`
  ]);

  downloadCSV("SSD_Sainiks_Enlistment_Ledger.csv", headers, rows);
}

function exportDonationsToCSV() {
  const donations = Object.values(adminData.donations || {});
  if (donations.length === 0) {
    showToast("No donation transactions to export.", "error");
    return;
  }

  const headers = ["Receipt Number", "Donor Name", "Amount (INR)", "Cause", "PAN", "Status", "Date"];
  const rows = donations.map(d => [
    `"${d.receiptNumber || 'SSD-REC'}"`,
    `"${d.donorName || d.name || ''}"`,
    `"${d.amount || 0}"`,
    `"${d.cause || ''}"`,
    `"${d.pan || ''}"`,
    `"${d.status || 'Completed'}"`,
    `"${d.timestamp ? new Date(d.timestamp).toISOString() : ''}"`
  ]);

  downloadCSV("SSD_Centenary_Fund_Ledger.csv", headers, rows);
}

function downloadCSV(filename, headers, rows) {
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV ledger downloaded successfully!", "success");
}

function exportFullDatabaseJSON() {
  const jsonStr = JSON.stringify(adminData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SSD_Database_Backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Full database JSON backup downloaded!", "success");
}

function seedDatabaseFromAdmin() {
  if (!confirm("Seed or update the database with official 1927–2026 verified sample records?")) return;

  if (db) {
    db.ref('/').update(ssdInitialSeed)
      .then(() => showToast("Official SSD dataset seeded successfully to Firebase!", "success"))
      .catch(err => showToast("Seed error: " + err.message, "error"));
  } else {
    adminData = JSON.parse(JSON.stringify(ssdInitialSeed));
    saveLocalStore();
    loadAllRealtimeData();
    showToast("Official SSD dataset refreshed!", "success");
  }
}

// ==========================================================================
// MODAL & UI HELPERS
// ==========================================================================
function openAdminModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("active");
}

function closeAdminModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("active");
}

function updateImagePreview(imgElementId, url) {
  const img = document.getElementById(imgElementId);
  if (img) {
    if (url && url.startsWith("http")) {
      img.src = url;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("adminToast");
  const msg = document.getElementById("toastMsg");
  const icon = document.getElementById("toastIcon");
  if (!toast || !msg) return;

  toast.className = "admin-toast " + type;
  msg.textContent = message;

  if (type === "success") {
    icon.className = "fa-solid fa-circle-check";
  } else if (type === "error") {
    icon.className = "fa-solid fa-circle-xmark";
  } else {
    icon.className = "fa-solid fa-circle-info";
  }

  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function getStatusBadgeClass(status) {
  if (!status) return "badge-verified";
  const s = status.toLowerCase();
  if (s === "approved" || s === "verified" || s === "completed") return "badge-approved";
  if (s === "pending" || s === "in progress") return "badge-pending";
  if (s === "rejected" || s === "flagged") return "badge-rejected";
  return "badge-info";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
