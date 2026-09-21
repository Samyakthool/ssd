/* ==========================================================================
   SAMATA SAINIK DAL (SSD) - CENTRAL COMMAND ADMIN PORTAL LOGIC
   Firebase Realtime Database Management Engine
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDwo2xrFri50j5SQ1c5xrFAV75AEFCWhKo",
  authDomain: "ssdind-9b4f8.firebaseapp.com",
  databaseURL: "https://ssdind-9b4f8-default-rtdb.firebaseio.com",
  projectId: "ssdind-9b4f8",
  storageBucket: "ssdind-9b4f8.firebasestorage.app",
  messagingSenderId: "524844669740",
  appId: "1:524844669740:web:3f6ef6a2571df74b09ea89",
  measurementId: "G-W8HWC1Z415"
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
  email_dispatches: {},
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
  },
  leadership: {
    "lead_1": {
      name: "Dr. Siddharth M. Meshram",
      designation: "National President (राष्ट्रीय अध्यक्ष)",
      category: "Supreme Council",
      level: "national",
      state: "National HQ",
      rankBadge: "National Command",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      bio: "Eminent Constitutional scholar and veteran Ambedkarite leader with 40+ years in social transformation; overseeing national policy and the Centenary 2027 vision.",
      credentials: "Ph.D. Constitutional Law | Nagpur HQ",
      order: 1
    },
    "lead_2": {
      name: "Commander Ravindra K. Gautam",
      designation: "National General Secretary (राष्ट्रीय महासचिव)",
      category: "Executive Council",
      level: "national",
      state: "National HQ",
      rankBadge: "Executive Council",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bio: "Former NCC Gold Medalist and grassroots organizer; coordinates operations across 28 State Chapters and directs the national cadet syllabus.",
      credentials: "M.A. Public Admin | New Delhi Secretariat",
      order: 2
    },
    "lead_3": {
      name: "Col. (Retd.) Vijay Anand Thorat",
      designation: "Chief Cadet Commander (मुख्य सैनिक दलनायक)",
      category: "Cadet Directorate",
      level: "national",
      state: "National HQ",
      rankBadge: "Drill & Defense",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      bio: "Indian Armed Forces Veteran; leads cadet drill curriculum, ceremonial parade standards, emergency disaster rescue wings, and physical fitness camps.",
      credentials: "Ex-Indian Army | Central Cadet Directorate",
      order: 3
    },
    "lead_4": {
      name: "Smt. Anuradha Tai Kamble",
      designation: "National Convener, Mahila Dal (राष्ट्रीय संयोजिका)",
      category: "Mahila Dal",
      level: "national",
      state: "National HQ",
      rankBadge: "Mahila Front",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Social activist and educator; leading women's frontline self-defense wings, legal crisis support networks, and Savitribai Phule girls' educational scholarships.",
      credentials: "M.S.W., LL.B. | Mumbai State HQ",
      order: 4
    },
    "lead_5": {
      name: "Senior Adv. B. P. Sonwane",
      designation: "Chairman, National Legal Cell (अध्यक्ष, विधिक प्रकोष्ठ)",
      category: "Legal Cell",
      level: "national",
      state: "National HQ",
      rankBadge: "Supreme Court Panel",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "Senior Advocate with extensive experience in the Supreme Court of India; spearheading pro-bono defense, SC/ST Act enforcement, and constitutional litigation.",
      credentials: "LL.M. Constitutional Law | Supreme Court of India",
      order: 5
    },
    "lead_6": {
      name: "Prof. Mahendra V. Khobragade",
      designation: "National Treasurer & Comptroller (राष्ट्रीय कोषाध्यक्ष)",
      category: "Finance & Audit",
      level: "national",
      state: "National HQ",
      rankBadge: "Finance & Audit",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      bio: "Chartered Accountant and academician; ensures 100% organizational transparency, public audit compliance, 80G tax exemptions, and Centenary 2027 trust governance.",
      credentials: "FCA, M.Com | Central Audit Bureau",
      order: 6
    },
    "lead_state_mh_1": {
      name: "Commander Pramod R. Moon",
      designation: "State President (महाराष्ट्र प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Maharashtra",
      district: "Nagpur & Mumbai State Office",
      rankBadge: "Maharashtra State Command",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      bio: "Spearheads statewide cadre building across 36 districts of Maharashtra; organizes annual Deekshabhoomi rally defense drills and Dr. Ambedkar youth camps.",
      credentials: "M.A. Social Work | Mumbai & Nagpur State HQ",
      order: 10
    },
    "lead_state_mh_2": {
      name: "Adv. Nitin V. Dongre",
      designation: "State General Secretary (महाराष्ट्र प्रदेश महासचिव)",
      category: "Executive Council",
      level: "state",
      state: "Maharashtra",
      district: "Pune & Western Maharashtra",
      rankBadge: "State Executive",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      bio: "Coordinates district dalpatis and administers constitutional awareness camps across Vidarbha, Marathwada, and Western Maharashtra.",
      credentials: "B.A., LL.B. | Pune State Secretariat",
      order: 11
    },
    "lead_state_up_1": {
      name: "Shri Ramcharan Gautam",
      designation: "State President (उत्तर प्रदेश प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Uttar Pradesh",
      district: "Lucknow Central Command",
      rankBadge: "UP State Command",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bio: "Leading SSD organizational growth across 75 districts of Uttar Pradesh; championing community self-defense wings and student literacy centers.",
      credentials: "M.Sc., B.Ed. | Lucknow State Office",
      order: 12
    },
    "lead_state_up_2": {
      name: "Commander Sunil Kumar Rawat",
      designation: "State Chief Dalpati (उत्तर प्रदेश मुख्य दलनायक)",
      category: "Cadet Directorate",
      level: "state",
      state: "Uttar Pradesh",
      district: "Agra & Kanpur Division",
      rankBadge: "UP Cadet Directorate",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      bio: "Oversees physical drills, parade formations, and district volunteer regiments across Eastern and Western Uttar Pradesh.",
      credentials: "Ex-Police Instructor | Agra Command",
      order: 13
    },
    "lead_state_mp_1": {
      name: "Dr. Kailash Chandra Ahirwar",
      designation: "State President (मध्य प्रदेश प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Madhya Pradesh",
      district: "Bhopal & Indore Command",
      rankBadge: "MP State Command",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "Educationist and activist leading the revival of Samata Sainik Dal units in Madhya Pradesh; coordinating Dr. Ambedkar birth centenary drives.",
      credentials: "Ph.D. Sociology | Bhopal State HQ",
      order: 14
    },
    "lead_state_delhi_1": {
      name: "Adv. R. K. Mourya",
      designation: "State President, Delhi NCR (दिल्ली प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Delhi NCR",
      district: "National Capital Region",
      rankBadge: "Delhi NCR Command",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      bio: "Directs Delhi NCR legal support desks, civil rights rallies, and national centenary parade delegations in the capital.",
      credentials: "Advocate, Delhi High Court | New Delhi Office",
      order: 15
    },
    "lead_state_ka_1": {
      name: "Prof. Anand Kumar Swamy",
      designation: "State President (कर्नाटक प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Karnataka",
      district: "Bengaluru & Mysuru Command",
      rankBadge: "Karnataka State Command",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      bio: "Coordinates SSD Southern Zone expansion, multilingual Ambedkarite literature publication, and campus cadet corps in Karnataka.",
      credentials: "M.A., Ph.D. | Bengaluru State Secretariat",
      order: 16
    },
    "lead_state_rj_1": {
      name: "Shri Bharat Lal Bairwa",
      designation: "State President (राजस्थान प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Rajasthan",
      district: "Jaipur Command",
      rankBadge: "Rajasthan State Command",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      bio: "Grassroots organizer championing SC/ST atrocities monitoring, rural education cells, and district youth drill regiments across Rajasthan.",
      credentials: "M.A. Political Science | Jaipur State Office",
      order: 17
    },
    "lead_state_pb_1": {
      name: "Col. (Retd.) Harjit Singh Rahi",
      designation: "State President (पंजाब प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Punjab",
      district: "Jalandhar & Chandigarh Command",
      rankBadge: "Punjab State Command",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bio: "Army Veteran managing Punjab state sainik units, honoring Dr. Ambedkar's historical 1936 Punjab visits and training youth cadres.",
      credentials: "Ex-Indian Army | Jalandhar Command",
      order: 18
    },
    "lead_state_br_1": {
      name: "Shri Dharmendra Kumar Paswan",
      designation: "State President (बिहार प्रदेशाध्यक्ष)",
      category: "Executive Council",
      level: "state",
      state: "Bihar",
      district: "Patna Command",
      rankBadge: "Bihar State Command",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      bio: "Directs democratic rights defense, disaster flood relief teams, and village level equality brigades throughout Bihar.",
      credentials: "M.A. History | Patna State HQ",
      order: 19
    },
    "lead_7": {
      name: "Prof. Yashwantrao More",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
      bio: "Senior Ambedkarite Historian, author of multiple research treatises on Dr. Ambedkar's social movements and Satyagrahas.",
      credentials: "Author & Senior Historian | Pune",
      order: 20
    },
    "lead_8": {
      name: "Adv. Rekha Gaikwad",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
      bio: "Human Rights Defender and Constitutional scholar actively engaged in social justice and women empowerment initiatives.",
      credentials: "Advocate & Scholar | Mumbai",
      order: 21
    },
    "lead_9": {
      name: "Commander Suresh Jadhav",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
      bio: "Veteran organizer of the historic 1956 Deekshabhoomi Dhamma Deeksha volunteer corps; mentor to youth training battalions.",
      credentials: "1956 Deeksha Veteran | Nagpur",
      order: 22
    }
  },
  admin_users: {
    "usr_1": {
      name: "Commander-in-Chief (Super Admin)",
      email: "admin@ssd.org",
      passcode: "SSD1927",
      role: "super_admin",
      dept: "Supreme Command Council",
      status: "Active",
      timestamp: Date.now()
    },
    "usr_2": {
      name: "Commander Ravindra Gautam",
      email: "secretary@ssd.org",
      passcode: "EXEC1927",
      role: "executive",
      dept: "National Executive Secretariat",
      status: "Active",
      timestamp: Date.now()
    },
    "usr_3": {
      name: "Prof. Mahendra Khobragade",
      email: "finance@ssd.org",
      passcode: "TREASURY1927",
      role: "treasurer",
      dept: "National Treasury & Audit Bureau",
      status: "Active",
      timestamp: Date.now()
    },
    "usr_4": {
      name: "Capt. Anand Meshram",
      email: "media@ssd.org",
      passcode: "MEDIA1927",
      role: "media",
      dept: "Gazette & Public Relations Cell",
      status: "Active",
      timestamp: Date.now()
    }
  }
};

// ==========================================================================
// INITIALIZATION & AUTHENTICATION
// ==========================================================================
function getActiveFirebaseConfig() {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    return firebaseConfig;
  }
  try {
    const custom = localStorage.getItem("ssd_firebase_config");
    if (custom) return JSON.parse(custom);
  } catch (e) {
    console.warn("Custom Firebase config parse error:", e);
  }
  return firebaseConfig;
}

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  checkAuthSession();
});

function initFirebase() {
  try {
    const activeCfg = getActiveFirebaseConfig();
    if (activeCfg.apiKey && activeCfg.apiKey !== "YOUR_API_KEY") {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(activeCfg);
      } else {
        firebaseApp = firebase.app();
      }
      db = firebase.database();
      isFirebaseLive = true;
      setDbStatus(true, "Firebase Live Realtime Connected");
    } else {
      isFirebaseLive = false;
      setDbStatus(false, "Database Disconnected (Configure in Settings)");
    }
  } catch (e) {
    console.warn("Firebase Init Notice:", e);
    isFirebaseLive = false;
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
  const userJson = sessionStorage.getItem("ssd_admin_user");
  const authGate = document.getElementById("authGate");
  const adminApp = document.getElementById("adminApp");

  if (isAuth === "true") {
    if (authGate) authGate.style.display = "none";
    if (adminApp) adminApp.style.display = "flex";

    let officer = null;
    try {
      if (userJson) officer = JSON.parse(userJson);
    } catch (e) {}

    if (!officer) {
      officer = { name: "Commander-in-Chief", role: "super_admin", dept: "Supreme Command" };
    }

    const nameEl = document.getElementById("sidebarUserName");
    const roleEl = document.getElementById("sidebarUserRole");
    if (nameEl) nameEl.textContent = officer.name || "Command Officer";
    if (roleEl) roleEl.textContent = getRoleDisplayName(officer.role);

    applyRolePermissions(officer.role);
    loadAllRealtimeData();
  } else {
    if (authGate) authGate.style.display = "flex";
    if (adminApp) adminApp.style.display = "none";
  }
}

function getRoleDisplayName(role) {
  switch (role) {
    case "super_admin": return "Supreme Council Level (Full Access)";
    case "executive": return "National Executive Level";
    case "treasurer": return "Treasury & Finance Level";
    case "media": return "Gazette & Media Cell";
    default: return "Command Officer";
  }
}

function applyRolePermissions(role) {
  const permissions = {
    super_admin: ["overview", "members", "donations", "leadership", "news", "events", "campaigns", "gallery", "admins", "contacts", "stats", "settings"],
    executive: ["overview", "members", "leadership", "news", "events", "campaigns", "gallery", "contacts"],
    treasurer: ["overview", "donations", "campaigns"],
    media: ["overview", "news", "events", "gallery"]
  };

  const allowed = permissions[role] || permissions.super_admin;
  document.querySelectorAll(".sidebar-item").forEach(item => {
    const navId = item.id.replace("nav-", "");
    if (allowed.includes(navId)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function handleAdminLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("adminUsername");
  const passcodeInput = document.getElementById("adminPasscode");
  const identifier = usernameInput ? usernameInput.value.trim() : "";
  const passcode = passcodeInput ? passcodeInput.value.trim() : "";

  // 1. Emergency Master Passcode Override
  if (identifier === MASTER_PASSCODE || identifier === "SSD1927" || identifier === "ssd1927" || passcode === MASTER_PASSCODE || passcode === "SSD1927" || passcode === "ssd1927") {
    const superAdmin = {
      name: "Commander-in-Chief (Master Access)",
      email: "admin@ssd.org",
      role: "super_admin",
      dept: "Supreme Command Council",
      status: "Active"
    };
    sessionStorage.setItem("ssd_admin_auth", "true");
    sessionStorage.setItem("ssd_admin_user", JSON.stringify(superAdmin));
    showToast("Master Command Access Granted. Welcome, Commander.", "success");
    checkAuthSession();
    return;
  }

  // 2. Check multi-user accounts
  const adminsObj = adminData.admin_users || ssdInitialSeed.admin_users;
  const adminList = Object.entries(adminsObj).map(([k, v]) => ({ id: k, ...v }));

  const matchedOfficer = adminList.find(u => {
    const emailMatch = u.email && u.email.toLowerCase() === identifier.toLowerCase();
    const nameMatch = u.name && u.name.toLowerCase() === identifier.toLowerCase();
    const passMatch = u.passcode === passcode || (!passcode && u.passcode === identifier);
    return (emailMatch || nameMatch) && passMatch;
  });

  if (matchedOfficer) {
    if (matchedOfficer.status === "Suspended") {
      showToast("Access Blocked: Your command authorization is suspended.", "error");
      return;
    }
    sessionStorage.setItem("ssd_admin_auth", "true");
    sessionStorage.setItem("ssd_admin_user", JSON.stringify(matchedOfficer));
    showToast(`Access Granted. Welcome, ${matchedOfficer.name}.`, "success");
    checkAuthSession();
  } else {
    showToast("Invalid credentials. Please verify your officer username/passcode.", "error");
    if (passcodeInput) {
      passcodeInput.value = "";
      passcodeInput.focus();
    }
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem("ssd_admin_auth");
  sessionStorage.removeItem("ssd_admin_user");
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
  leadership: { title: "Governing Body & Council", sub: "Appoint and manage National Leadership & Advisory Board" },
  news: { title: "Gazette Bulletins & Circulars", sub: "Publish official announcements to the public portal" },
  events: { title: "Drills, Seminars & Rallies", sub: "Schedule nationwide cadet training and conclaves" },
  campaigns: { title: "Ongoing Missions & Causes", sub: "Manage active fundraising goals & volunteer targets" },
  gallery: { title: "Historical & Event Photo Archives", sub: "Curate high-resolution public photo albums" },
  admins: { title: "Authorized Command Officers", sub: "Multi-user authentication, roles & access permissions" },
  contacts: { title: "Grievance Desk & Public Inquiries", sub: "Respond to incoming state command queries" },
  stats: { title: "Public Portal Live Counters", sub: "Update homepage live counters directly in Firebase" },
  settings: { title: "Database Tools & Backups", sub: "Export JSON backups and seed verified datasets" }
};

function switchView(viewKey) {
  document.querySelectorAll(".sidebar-item").forEach(item => item.classList.remove("active"));
  const activeNav = document.getElementById("nav-" + viewKey);
  if (activeNav) activeNav.classList.add("active");

  document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
  const targetPanel = document.getElementById("view" + viewKey.charAt(0).toUpperCase() + viewKey.slice(1));
  if (targetPanel) targetPanel.classList.add("active");

  const meta = viewMetadata[viewKey] || { title: "Admin Portal", sub: "" };
  const hTitle = document.getElementById("pageHeadingTitle");
  const hSub = document.getElementById("pageHeadingSubtitle");
  if (hTitle) hTitle.textContent = meta.title;
  if (hSub) hSub.textContent = meta.sub;

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

    // 10. Governing Body & Leadership Council
    db.ref('leadership').on('value', (snap) => {
      adminData.leadership = snap.val() || ssdInitialSeed.leadership;
      renderLeadershipTable();
      renderOverview();
    });

    // 11. Authorized Admin Users
    db.ref('admin_users').on('value', (snap) => {
      adminData.admin_users = snap.val() || ssdInitialSeed.admin_users;
      renderAdminsTable();
      renderOverview();
    });

    // 12. Automated Email Dispatches
    db.ref('email_dispatches').on('value', (snap) => {
      adminData.email_dispatches = snap.val() || {};
      renderEmailDispatchesTable();
    });

    // 13. Settings (Email Config)
    db.ref('settings/emailConfig').on('value', (snap) => {
      const val = snap.val();
      if (val) {
        localStorage.setItem("ssd_email_config", JSON.stringify(val));
      }
      initEmailConfigForm();
    });

    initFirebaseConfigForm();
    initEmailConfigForm();

  } else {
    // Fallback in-memory storage from localStorage or Initial Seed
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      try { adminData = JSON.parse(localStore); } catch (e) { adminData = ssdInitialSeed; }
    } else {
      adminData = ssdInitialSeed;
      saveLocalStore();
    }
    initFirebaseConfigForm();
    initRazorpayAdminConfig();
    initEmailConfigForm();
    renderMembersTable();
    renderDonationsTable();
    renderLeadershipTable();
    renderNewsTable();
    renderEventsTable();
    renderCampaignsTable();
    renderGalleryGrid();
    renderAdminsTable();
    renderContactsTable();
    renderEmailDispatchesTable();
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
  const leadArr = Object.values(adminData.leadership || {});
  const adminsArr = Object.values(adminData.admin_users || {});

  // Update Badges
  setText("badgeMembersCount", membersArr.length);
  setText("badgeDonationsCount", donationsArr.length);
  setText("badgeLeadershipCount", leadArr.length);
  setText("badgeNewsCount", newsArr.length);
  setText("badgeEventsCount", eventsArr.length);
  setText("badgeCampaignsCount", Object.keys(adminData.campaigns || {}).length);
  setText("badgeGalleryCount", Object.keys(adminData.gallery || {}).length);
  setText("badgeAdminsCount", adminsArr.length);
  setText("badgeContactsCount", contactsArr.length);

  // Update KPI Cards
  const statsMembers = (adminData.stats && adminData.stats.members) ? adminData.stats.members : 100000;
  setText("kpiMembersTotal", (membersArr.length + statsMembers).toLocaleString());
  
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

  const sortedMembers = [...membersArr].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const recent = sortedMembers.slice(0, 5);
  tbody.innerHTML = recent.map(m => `
    <tr>
      <td><strong>${escapeHtml(m.fullName || m.name || 'Anonymous')}</strong></td>
      <td>${escapeHtml(m.city ? m.city + ', ' + m.state : (m.state || 'India'))}</td>
      <td><span class="badge-status badge-info">${escapeHtml(m.wing || 'Cadet Corps')}</span></td>
      <td><span class="badge-status ${getStatusBadgeClass(m.status || 'Pending')}">${escapeHtml(m.status || 'Pending')}</span></td>
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

  // Sort newest first
  list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  tbody.innerHTML = list.map(m => {
    const regDate = m.timestamp ? new Date(m.timestamp).toLocaleDateString() : 'Recent';
    const isApproved = (m.status || '').toLowerCase() === 'approved';
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
          <span class="badge-status ${getStatusBadgeClass(m.status || 'Pending')}">
            ${escapeHtml(m.status || 'Pending')}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            ${!isApproved ? `
            <button type="button" class="action-icon-btn verify" onclick="approveMember('${m.id}')" title="Approve & Send Official Welcome Email">
              <i class="fa-solid fa-check"></i>
            </button>` : `
            <button type="button" class="action-icon-btn" onclick="resendApprovalEmail('${m.id}')" title="Resend Official Approval Email" style="color: var(--primary-orange);">
              <i class="fa-solid fa-paper-plane"></i>
            </button>`}
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
                        (m.city || '').toLowerCase().includes(search) ||
                        (m.wing || '').toLowerCase().includes(search);
    const mStatus = (m.status || 'Pending').toLowerCase();
    const fStatus = status.toLowerCase();
    const matchStatus = (status === "all") || mStatus.includes(fStatus) || fStatus.includes(mStatus);
    return matchSearch && matchStatus;
  });

  renderMembersTable(filtered);
}

function sendMemberApprovalEmail(m) {
  if (!m) return Promise.reject(new Error("No member data provided"));
  const email = (m.email || "").trim();
  if (!email) {
    showToast("Notice: Cadet has no email address. Status updated without email.", "info");
    return Promise.resolve({ success: true, noEmail: true });
  }

  const cfg = getEmailConfig();
  const senderEmail = cfg.senderEmail || "samyak.ssd@gmail.com";
  const senderName = cfg.senderName || "Samata Sainik Dal (SSD)";
  const enlistId = m.enlistmentId || ("SSD-CADET-" + (m.id ? m.id.slice(-6).toUpperCase() : Math.floor(1000 + Math.random() * 9000)));

  const payload = {
    type: 'approval',
    senderEmail: senderEmail,
    recipientEmail: email,
    recipientName: m.fullName || m.name || "Sainik Cadet",
    appPassword: cfg.appPassword,
    data: {
      ...m,
      name: m.fullName || m.name || "Sainik Cadet",
      fullName: m.fullName || m.name || "Sainik Cadet",
      email: email,
      enlistmentId: enlistId,
      status: "Approved",
      approvedAt: Date.now()
    }
  };

  showToast(`Dispatching official approval email to ${email}...`, "info");

  return fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(`Success! Official Approval Letter sent via ${res.provider} to ${email}!`, "success");
    } else {
      showToast(`Email Warning: ${res.error || res.message}`, "warning");
    }

    if (typeof emailjs !== "undefined" && cfg.publicKey && cfg.serviceId) {
      try {
        emailjs.init({ publicKey: cfg.publicKey });
        emailjs.send(cfg.serviceId, cfg.enrollmentTemplateId || "template_cadet_welcome", {
          from_name: senderName,
          from_email: senderEmail,
          reply_to: senderEmail,
          cadet_name: m.fullName || m.name || "Cadet",
          to_name: m.fullName || m.name || "Cadet",
          to_email: email,
          cadet_phone: m.phone || "N/A",
          cadet_wing: m.wing || "Central Cadet Corps",
          cadet_state: m.state || "Maharashtra",
          cadet_city: m.city || "District Command",
          enlistment_id: enlistId,
          status: "Officially Approved",
          date: new Date().toLocaleDateString('en-IN')
        }).catch(e => console.warn("EmailJS approval error:", e));
      } catch (err) {
        console.warn("EmailJS error:", err);
      }
    }

    if (db) {
      db.ref('email_dispatches').push({
        type: "Cadet Enlistment Approved",
        senderEmail: senderEmail,
        recipientEmail: email,
        recipientName: m.fullName || m.name || "Cadet",
        enlistmentId: enlistId,
        wing: m.wing || "Cadet Corps",
        state: m.state || "",
        status: res.success ? "Dispatched" : "Attempted",
        timestamp: Date.now()
      }).catch(e => console.warn("Dispatch log error:", e));
    }

    return res;
  })
  .catch(err => {
    console.error("Approval email network error:", err);
    showToast(`Network error sending approval email: ${err.message}`, "error");
  });
}

function approveMember(id) {
  const member = (adminData.members && adminData.members[id]) ? { id, ...adminData.members[id] } : null;

  if (db) {
    db.ref('members/' + id).update({
      status: 'Approved',
      approvedAt: Date.now()
    })
    .then(() => {
      showToast("Sainik enlistment verified & approved!", "success");
      if (member) {
        member.status = 'Approved';
        sendMemberApprovalEmail(member);
      }
    })
    .catch(err => showToast("Update error: " + err.message, "error"));
  } else {
    if (adminData.members && adminData.members[id]) {
      adminData.members[id].status = "Approved";
      adminData.members[id].approvedAt = Date.now();
      saveLocalStore();
      renderMembersTable();
      showToast("Sainik enlistment verified & approved!", "success");
      sendMemberApprovalEmail(adminData.members[id]);
    }
  }
}

function resendApprovalEmail(id) {
  const member = (adminData.members && adminData.members[id]) ? { id, ...adminData.members[id] } : null;
  if (!member) {
    showToast("Member record not found.", "error");
    return;
  }
  sendMemberApprovalEmail(member);
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
    approvedAt: Date.now(),
    timestamp: Date.now()
  };

  if (db) {
    db.ref('members').push(newEntry)
      .then(() => {
        showToast("Sainik enlisted successfully to Firebase!", "success");
        closeAdminModal("modalAddMember");
        if (email) {
          sendMemberApprovalEmail(newEntry);
        }
      })
      .catch(err => showToast("Error: " + err.message, "error"));
  } else {
    const id = "mem_" + Date.now();
    adminData.members[id] = newEntry;
    saveLocalStore();
    renderMembersTable();
    showToast("Sainik enlisted successfully!", "success");
    closeAdminModal("modalAddMember");
    if (email) {
      sendMemberApprovalEmail(newEntry);
    }
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

  window._currentAdminReceiptData = { ...d, id: d.id || id };

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

function resendAdminReceiptEmail() {
  const d = window._currentAdminReceiptData;
  if (!d) {
    showToast("No donation receipt selected.", "error");
    return;
  }
  const defaultEmail = d.email || d.donorEmail || "";
  const recipientEmail = prompt("Enter donor email address to send official 80G receipt:", defaultEmail || "samyak.ssd@gmail.com");
  if (!recipientEmail) return;

  const cfg = getEmailConfig();
  const senderEmail = cfg.senderEmail || "samyak.ssd@gmail.com";
  showToast(`Dispatching official 80G Contribution Receipt to ${recipientEmail}...`, "info");

  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'donation',
      recipientEmail: recipientEmail,
      recipientName: d.donorName || d.name || "Supporter",
      appPassword: cfg.appPassword,
      data: {
        ...d,
        name: d.donorName || d.name || "Supporter",
        email: recipientEmail,
        receiptNumber: d.receiptNumber || ("SSD-REC-2026-" + (d.id || '2026').slice(-4)),
        paymentId: d.paymentId || "pay_captured"
      }
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(`Success! 80G Receipt sent via ${res.provider} to ${recipientEmail}!`, "success");
    } else {
      showToast(`Email Warning: ${res.error || res.message}`, "warning");
    }
  })
  .catch(err => {
    showToast("Error sending receipt: " + err.message, "error");
  });
}

function printAdminReceiptArea() {
  window.print();
}

// ==========================================================================
// RENDERERS: GOVERNING BODY & LEADERSHIP COUNCIL (/leadership)
// ==========================================================================
function renderLeadershipTable(filteredList = null) {
  const tbody = document.getElementById("leadershipTableBody");
  if (!tbody) return;

  const leadObj = adminData.leadership || ssdInitialSeed.leadership;
  let list = filteredList || Object.entries(leadObj).map(([key, val]) => ({ id: key, ...val }));

  list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No governing body members found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => {
    const isState = (m.level === 'state') || (m.state && m.state !== 'National HQ');
    const stateName = m.state || (isState ? 'State Unit' : 'National HQ');
    return `
      <tr>
        <td>
          <img src="${escapeHtml(m.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80')}" alt="${escapeHtml(m.name)}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-orange);">
        </td>
        <td>
          <strong>${escapeHtml(m.name)}</strong>
          ${m.district ? `<br><small style="color: var(--text-muted);">${escapeHtml(m.district)}</small>` : ''}
        </td>
        <td>
          <span class="badge-status ${isState ? 'badge-info' : 'badge-approved'}">
            <i class="fa-solid ${isState ? 'fa-map-pin' : 'fa-landmark'}"></i> ${escapeHtml(stateName)}
          </span>
        </td>
        <td>
          <div><strong>${escapeHtml(m.designation)}</strong></div>
          <small class="badge-status badge-approved" style="font-size: 10px; margin-top: 3px; display: inline-block;">${escapeHtml(m.rankBadge || (isState ? stateName + ' Command' : 'National Command'))}</small>
        </td>
        <td><span class="badge-status badge-info">${escapeHtml(m.category || 'Supreme Council')}</span></td>
        <td><small style="color: var(--text-muted);">${escapeHtml(m.credentials || 'HQ')}</small></td>
        <td style="text-align: right;">
          <div class="action-btn-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn" onclick="openEditLeadershipModal('${m.id}')" title="Edit Member">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="action-icon-btn delete" onclick="deleteLeadershipMember('${m.id}')" title="Remove Member">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterLeadershipTable() {
  const tier = document.getElementById("leadershipTierFilter")?.value || "all";
  const state = document.getElementById("leadershipStateFilter")?.value || "all";
  const cat = document.getElementById("leadershipFilter")?.value || "all";

  const all = Object.entries(adminData.leadership || ssdInitialSeed.leadership).map(([key, val]) => ({ id: key, ...val }));
  const filtered = all.filter(m => {
    const isState = (m.level === 'state') || (m.state && m.state !== 'National HQ' && m.state !== 'All-India');
    if (tier === 'national' && isState) return false;
    if (tier === 'state' && !isState) return false;

    if (state !== 'all') {
      const matchState = (m.state || '').toLowerCase() === state.toLowerCase();
      if (!matchState) return false;
    }

    if (cat !== 'all') {
      if (m.category !== cat) return false;
    }

    return true;
  });

  renderLeadershipTable(filtered);
}

function openAddLeadershipModal() {
  setInputValue("leadItemKey", "");
  setInputValue("leadName", "");
  setInputValue("leadDesignation", "");
  setInputValue("leadLevel", document.getElementById("leadershipTierFilter")?.value === 'state' ? 'state' : 'national');
  setInputValue("leadState", document.getElementById("leadershipStateFilter")?.value !== 'all' ? document.getElementById("leadershipStateFilter").value : 'National HQ');
  setInputValue("leadCategory", "Supreme Council");
  setInputValue("leadRankBadge", "National Command");
  setInputValue("leadPhotoUrl", "");
  setInputValue("leadCredentials", "");
  setInputValue("leadBio", "");
  setInputValue("leadOrder", "1");
  updateImagePreview("leadPhotoPreview", "");
  setText("modalLeadershipHeading", "Appoint Council Officer / State Commander");
  openAdminModal("modalLeadership");
}

function openEditLeadershipModal(id) {
  const leadObj = adminData.leadership || ssdInitialSeed.leadership;
  const m = leadObj[id];
  if (!m) return;

  const isState = (m.level === 'state') || (m.state && m.state !== 'National HQ');

  setInputValue("leadItemKey", id);
  setInputValue("leadName", m.name || "");
  setInputValue("leadDesignation", m.designation || "");
  setInputValue("leadLevel", m.level || (isState ? 'state' : 'national'));
  setInputValue("leadState", m.state || (isState ? 'Maharashtra' : 'National HQ'));
  setInputValue("leadCategory", m.category || "Supreme Council");
  setInputValue("leadRankBadge", m.rankBadge || "");
  setInputValue("leadPhotoUrl", m.photoUrl || "");
  setInputValue("leadCredentials", m.credentials || "");
  setInputValue("leadBio", m.bio || "");
  setInputValue("leadOrder", m.order || "1");
  updateImagePreview("leadPhotoPreview", m.photoUrl || "");
  setText("modalLeadershipHeading", `Edit Officer: ${m.name}`);
  openAdminModal("modalLeadership");
}

function handleSaveLeadership(e) {
  e.preventDefault();
  const key = document.getElementById("leadItemKey").value;
  const level = document.getElementById("leadLevel")?.value || "national";
  const state = document.getElementById("leadState")?.value || (level === 'state' ? 'Maharashtra' : 'National HQ');

  const memberData = {
    name: document.getElementById("leadName").value.trim(),
    designation: document.getElementById("leadDesignation").value.trim(),
    level: level,
    state: state,
    category: document.getElementById("leadCategory").value,
    rankBadge: document.getElementById("leadRankBadge").value.trim(),
    photoUrl: document.getElementById("leadPhotoUrl").value.trim(),
    credentials: document.getElementById("leadCredentials").value.trim(),
    bio: document.getElementById("leadBio").value.trim(),
    order: Number(document.getElementById("leadOrder").value) || 1,
    updatedAt: Date.now()
  };

  const onSuccess = () => {
    showToast(`Council member ${memberData.name} saved successfully!`, "success");
    closeAdminModal("modalLeadership");
  };

  if (db) {
    if (key) {
      db.ref(`leadership/${key}`).update(memberData).then(onSuccess).catch(err => showToast(err.message, "error"));
    } else {
      db.ref("leadership").push(memberData).then(onSuccess).catch(err => showToast(err.message, "error"));
    }
  } else {
    if (!adminData.leadership) adminData.leadership = { ...ssdInitialSeed.leadership };
    const newKey = key || ("lead_" + Date.now());
    adminData.leadership[newKey] = memberData;
    saveLocalStore();
    renderLeadershipTable();
    onSuccess();
  }
}

function deleteLeadershipMember(id) {
  const leadObj = adminData.leadership || ssdInitialSeed.leadership;
  const m = leadObj[id];
  const name = m ? m.name : "this member";
  if (!confirm(`Are you sure you want to remove ${name} from the Governing Body?`)) return;

  const onSuccess = () => {
    showToast("Council member removed.", "info");
  };

  if (db) {
    db.ref(`leadership/${id}`).remove().then(onSuccess).catch(err => showToast(err.message, "error"));
  } else {
    if (adminData.leadership) {
      delete adminData.leadership[id];
      saveLocalStore();
      renderLeadershipTable();
      onSuccess();
    }
  }
}

// ==========================================================================
// RENDERERS: AUTHORIZED ADMIN USERS & ROLES (/admin_users)
// ==========================================================================
function renderAdminsTable() {
  const tbody = document.getElementById("adminsTableBody");
  if (!tbody) return;

  const adminsObj = adminData.admin_users || ssdInitialSeed.admin_users;
  const list = Object.entries(adminsObj).map(([key, val]) => ({ id: key, ...val }));

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No authorized officers found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td><code>${escapeHtml(u.email)}</code></td>
      <td><span class="badge-status ${u.role === 'super_admin' ? 'badge-approved' : 'badge-info'}">${escapeHtml(getRoleDisplayName(u.role))}</span></td>
      <td>${escapeHtml(u.dept || 'Central Command')}</td>
      <td><code>••••••••</code></td>
      <td><span class="badge-status ${u.status === 'Active' ? 'badge-approved' : 'badge-rejected'}">${escapeHtml(u.status || 'Active')}</span></td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button type="button" class="action-icon-btn" onclick="openEditAdminUserModal('${u.id}')" title="Edit Officer Permissions">
            <i class="fa-solid fa-user-pen"></i>
          </button>
          <button type="button" class="action-icon-btn ${u.status === 'Active' ? 'warning' : 'verify'}" onclick="toggleAdminStatus('${u.id}')" title="${u.status === 'Active' ? 'Suspend Officer' : 'Activate Officer'}">
            <i class="fa-solid ${u.status === 'Active' ? 'fa-ban' : 'fa-check'}"></i>
          </button>
          <button type="button" class="action-icon-btn delete" onclick="deleteAdminUser('${u.id}')" title="Revoke Authorization">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddAdminUserModal() {
  setInputValue("adminUserKey", "");
  setInputValue("newAdminName", "");
  setInputValue("newAdminEmail", "");
  setInputValue("newAdminPasscode", "");
  setInputValue("newAdminRole", "executive");
  setInputValue("newAdminDept", "");
  setInputValue("newAdminStatus", "Active");
  setText("modalAdminUserHeading", "Authorize New Command Officer");
  openAdminModal("modalAdminUser");
}

function openEditAdminUserModal(id) {
  const adminsObj = adminData.admin_users || ssdInitialSeed.admin_users;
  const u = adminsObj[id];
  if (!u) return;

  setInputValue("adminUserKey", id);
  setInputValue("newAdminName", u.name || "");
  setInputValue("newAdminEmail", u.email || "");
  setInputValue("newAdminPasscode", u.passcode || "");
  setInputValue("newAdminRole", u.role || "executive");
  setInputValue("newAdminDept", u.dept || "");
  setInputValue("newAdminStatus", u.status || "Active");
  setText("modalAdminUserHeading", `Edit Officer Authorization: ${u.name}`);
  openAdminModal("modalAdminUser");
}

function handleSaveAdminUser(e) {
  e.preventDefault();
  const key = document.getElementById("adminUserKey").value;
  const userData = {
    name: document.getElementById("newAdminName").value.trim(),
    email: document.getElementById("newAdminEmail").value.trim(),
    passcode: document.getElementById("newAdminPasscode").value.trim(),
    role: document.getElementById("newAdminRole").value,
    dept: document.getElementById("newAdminDept").value.trim(),
    status: document.getElementById("newAdminStatus").value,
    updatedAt: Date.now()
  };

  const onSuccess = () => {
    showToast(`Officer ${userData.name} authorized successfully!`, "success");
    closeAdminModal("modalAdminUser");
  };

  if (db) {
    if (key) {
      db.ref(`admin_users/${key}`).update(userData).then(onSuccess).catch(err => showToast(err.message, "error"));
    } else {
      db.ref("admin_users").push(userData).then(onSuccess).catch(err => showToast(err.message, "error"));
    }
  } else {
    if (!adminData.admin_users) adminData.admin_users = { ...ssdInitialSeed.admin_users };
    const newKey = key || ("usr_" + Date.now());
    adminData.admin_users[newKey] = userData;
    saveLocalStore();
    renderAdminsTable();
    onSuccess();
  }
}

function toggleAdminStatus(id) {
  const adminsObj = adminData.admin_users || ssdInitialSeed.admin_users;
  const u = adminsObj[id];
  if (!u) return;
  const newStatus = u.status === "Active" ? "Suspended" : "Active";

  if (db) {
    db.ref(`admin_users/${id}/status`).set(newStatus).then(() => {
      showToast(`Officer status set to ${newStatus}.`, "info");
    });
  } else {
    if (adminData.admin_users && adminData.admin_users[id]) {
      adminData.admin_users[id].status = newStatus;
      saveLocalStore();
      renderAdminsTable();
      showToast(`Officer status set to ${newStatus}.`, "info");
    }
  }
}

function deleteAdminUser(id) {
  const adminsObj = adminData.admin_users || ssdInitialSeed.admin_users;
  const u = adminsObj[id];
  const name = u ? u.name : "this officer";
  if (!confirm(`Are you sure you want to revoke admin access for ${name}?`)) return;

  if (db) {
    db.ref(`admin_users/${id}`).remove().then(() => {
      showToast("Officer access revoked.", "info");
    });
  } else {
    if (adminData.admin_users) {
      delete adminData.admin_users[id];
      saveLocalStore();
      renderAdminsTable();
      showToast("Officer access revoked.", "info");
    }
  }
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
// AUTOMATED EMAIL DISPATCH CONFIGURATION & TESTING (ADMIN)
// ==========================================================================
function getEmailConfig() {
  const defaultCfg = {
    senderEmail: "samyak.ssd@gmail.com",
    senderName: "Samata Sainik Dal (SSD)",
    appPassword: "",
    serviceId: "service_ssd_official",
    donationTemplateId: "template_donation_80g",
    enrollmentTemplateId: "template_cadet_welcome",
    publicKey: "",
    enabled: true
  };
  try {
    const custom = localStorage.getItem("ssd_email_config");
    if (custom) return { ...defaultCfg, ...JSON.parse(custom) };
  } catch (e) {
    console.warn("Email config parse error:", e);
  }
  return defaultCfg;
}

function initEmailConfigForm() {
  const cfg = getEmailConfig();
  const senderEmailEl = document.getElementById("adminSenderEmail");
  const senderNameEl = document.getElementById("adminSenderName");
  const appPassEl = document.getElementById("adminGmailAppPassword");
  const serviceIdEl = document.getElementById("adminEmailServiceId");
  const pubKeyEl = document.getElementById("adminEmailPublicKey");
  const donTplEl = document.getElementById("adminEmailDonationTpl");
  const enlTplEl = document.getElementById("adminEmailEnrollmentTpl");

  if (senderEmailEl) senderEmailEl.value = cfg.senderEmail || "samyak.ssd@gmail.com";
  if (senderNameEl) senderNameEl.value = cfg.senderName || "Samata Sainik Dal (SSD)";
  if (appPassEl) appPassEl.value = cfg.appPassword || "";
  if (serviceIdEl) serviceIdEl.value = cfg.serviceId || "";
  if (pubKeyEl) pubKeyEl.value = cfg.publicKey || "";
  if (donTplEl) donTplEl.value = cfg.donationTemplateId || "";
  if (enlTplEl) enlTplEl.value = cfg.enrollmentTemplateId || "";

  const badge = document.getElementById("emailSetupBadge");
  if (badge) {
    if (cfg.appPassword) {
      badge.className = "badge-status badge-approved";
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gmail Direct SMTP Active (' + (cfg.senderEmail || 'samyak.ssd@gmail.com') + ')';
    } else if (cfg.publicKey && cfg.serviceId) {
      badge.className = "badge-status badge-approved";
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> EmailJS Active (' + (cfg.senderEmail || 'samyak.ssd@gmail.com') + ')';
    } else {
      badge.className = "badge-status badge-info";
      badge.innerHTML = '<i class="fa-solid fa-bolt"></i> Sender: ' + (cfg.senderEmail || 'samyak.ssd@gmail.com');
    }
  }
}

function saveEmailConfig(e) {
  e.preventDefault();
  const senderEmail = document.getElementById("adminSenderEmail")?.value.trim() || "samyak.ssd@gmail.com";
  const senderName = document.getElementById("adminSenderName")?.value.trim() || "Samata Sainik Dal (SSD)";
  const appPassword = document.getElementById("adminGmailAppPassword")?.value.trim().replace(/\s+/g, '') || "";
  const serviceId = document.getElementById("adminEmailServiceId")?.value.trim() || "service_ssd_official";
  const publicKey = document.getElementById("adminEmailPublicKey")?.value.trim() || "";
  const donationTemplateId = document.getElementById("adminEmailDonationTpl")?.value.trim() || "template_donation_80g";
  const enrollmentTemplateId = document.getElementById("adminEmailEnrollmentTpl")?.value.trim() || "template_cadet_welcome";

  const emailCfg = {
    senderEmail,
    senderName,
    appPassword,
    serviceId,
    publicKey,
    donationTemplateId,
    enrollmentTemplateId,
    enabled: true,
    updatedAt: Date.now()
  };

  localStorage.setItem("ssd_email_config", JSON.stringify(emailCfg));

  if (db) {
    db.ref("settings/emailConfig").set(emailCfg)
      .then(() => showToast(`Automated Email settings saved! Sender: ${senderEmail}`, "success"))
      .catch(err => showToast("Error saving email settings: " + err.message, "error"));
  } else {
    showToast(`Automated Email settings saved! Sender: ${senderEmail}`, "success");
  }
  initEmailConfigForm();
}

function testSendDonationEmail() {
  const testRecipient = prompt("Enter the email address to receive the test 80G Donation Receipt:", "samyak.ssd@gmail.com");
  if (!testRecipient) return;

  showToast("Dispatching test 80G Contribution Receipt email...", "info");

  const testData = {
    name: "Commander Testing",
    email: testRecipient,
    amount: 5000,
    receiptNumber: "SSD-REC-2026-TEST",
    paymentId: "pay_test_" + Math.random().toString(36).substring(2, 8),
    cause: "Centenary 2027 Movement Trust Fund",
    pan: "ABCDE1234F",
    timestamp: Date.now()
  };

  const cfg = getEmailConfig();

  // 1. Try Direct Serverless SMTP / API Dispatch
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'donation',
      recipientEmail: testData.email,
      recipientName: testData.name,
      appPassword: cfg.appPassword,
      data: testData
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(`Success! 80G Receipt Email sent via ${res.provider} to ${testRecipient}!`, "success");
    } else {
      showToast(`Email Notice: ${res.error || res.message}`, "warning");
    }
  })
  .catch(err => {
    console.warn("Serverless email send error:", err);
  });

  // 2. Try EmailJS SDK if configured
  if (typeof emailjs !== "undefined" && cfg.publicKey && cfg.serviceId) {
    try {
      emailjs.init({ publicKey: cfg.publicKey });
      emailjs.send(cfg.serviceId, cfg.donationTemplateId, {
        from_name: cfg.senderName || "Samata Sainik Dal (SSD)",
        from_email: cfg.senderEmail || "samyak.ssd@gmail.com",
        reply_to: cfg.senderEmail || "samyak.ssd@gmail.com",
        to_name: testData.name,
        to_email: testData.email,
        amount: testData.amount.toLocaleString(),
        receipt_number: testData.receiptNumber,
        payment_id: testData.paymentId,
        cause: testData.cause,
        pan: testData.pan,
        date: new Date().toLocaleDateString('en-IN')
      }).then(() => {
        showToast("80G Donation Email also dispatched via EmailJS!", "success");
      }).catch(err => {
        console.warn("EmailJS test error:", err);
      });
    } catch (e) {
      console.warn("EmailJS error:", e);
    }
  }

  if (db) {
    db.ref('email_dispatches').push({
      type: "Donation 80G Receipt (Test)",
      senderEmail: cfg.senderEmail || "samyak.ssd@gmail.com",
      recipientEmail: testData.email,
      recipientName: testData.name,
      receiptNumber: testData.receiptNumber,
      amount: testData.amount,
      paymentId: testData.paymentId,
      status: "Dispatched",
      timestamp: Date.now()
    });
  }
}

function testSendEnrollmentEmail() {
  const testRecipient = prompt("Enter the email address to receive the test Cadet Welcome Letter:", "samyak.ssd@gmail.com");
  if (!testRecipient) return;

  showToast("Dispatching test Cadet Enlistment Confirmation email...", "info");

  const testData = {
    fullName: "Cadet Test Volunteer",
    name: "Cadet Test Volunteer",
    email: testRecipient,
    phone: "+91 98765 43210",
    wing: "Dr. B. R. Ambedkar Cadet Corps",
    state: "Maharashtra",
    city: "Nagpur Central Command",
    enlistmentId: "SSD-CADET-2026-TEST",
    timestamp: Date.now()
  };

  const cfg = getEmailConfig();

  // 1. Try Direct Serverless SMTP / API Dispatch
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'enrollment',
      recipientEmail: testData.email,
      recipientName: testData.name,
      appPassword: cfg.appPassword,
      data: testData
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(`Success! Cadet Welcome Email sent via ${res.provider} to ${testRecipient}!`, "success");
    } else {
      showToast(`Email Notice: ${res.error || res.message}`, "warning");
    }
  })
  .catch(err => {
    console.warn("Serverless email send error:", err);
  });

  // 2. Try EmailJS SDK if configured
  if (typeof emailjs !== "undefined" && cfg.publicKey && cfg.serviceId) {
    try {
      emailjs.init({ publicKey: cfg.publicKey });
      emailjs.send(cfg.serviceId, cfg.enrollmentTemplateId, {
        from_name: cfg.senderName || "Samata Sainik Dal (SSD)",
        from_email: cfg.senderEmail || "samyak.ssd@gmail.com",
        reply_to: cfg.senderEmail || "samyak.ssd@gmail.com",
        cadet_name: testData.name,
        to_name: testData.name,
        to_email: testData.email,
        cadet_phone: testData.phone,
        cadet_wing: testData.wing,
        cadet_state: testData.state,
        cadet_city: testData.city,
        enlistment_id: testData.enlistmentId,
        date: new Date().toLocaleDateString('en-IN')
      }).then(() => {
        showToast("Cadet Welcome Email also dispatched via EmailJS!", "success");
      }).catch(err => {
        console.warn("EmailJS test error:", err);
      });
    } catch (e) {
      console.warn("EmailJS error:", e);
    }
  }

  if (db) {
    db.ref('email_dispatches').push({
      type: "Cadet Enlistment Welcome (Test)",
      senderEmail: cfg.senderEmail || "samyak.ssd@gmail.com",
      recipientEmail: testData.email,
      recipientName: testData.name,
      enlistmentId: testData.enlistmentId,
      wing: testData.wing,
      state: testData.state,
      status: "Dispatched",
      timestamp: Date.now()
    });
  }
}

function renderEmailDispatchesTable() {
  const tbody = document.getElementById("emailDispatchesTableBody");
  if (!tbody) return;

  const emailsObj = adminData.email_dispatches || {};
  let list = Object.entries(emailsObj).map(([key, val]) => ({ id: key, ...val }));

  setText("badgeEmailsCount", `${list.length} Dispatches`);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No email dispatches recorded yet.</td></tr>';
    return;
  }

  // Sort newest first
  list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  tbody.innerHTML = list.map(item => {
    const dDate = item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';
    const isDonation = (item.type || '').includes('Donation');
    const badgeClass = isDonation ? 'badge-approved' : 'badge-info';
    const icon = isDonation ? '<i class="fa-solid fa-receipt"></i>' : '<i class="fa-solid fa-user-shield"></i>';
    const refId = item.receiptNumber || item.enlistmentId || item.paymentId || ('REF-' + item.id.slice(-6));

    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 12.5px;">${dDate}</td>
        <td>
          <strong>${escapeHtml(item.recipientName || 'Recipient')}</strong>
          <div style="font-size: 11.5px; color: var(--text-muted);"><i class="fa-solid fa-envelope" style="font-size: 10px;"></i> ${escapeHtml(item.recipientEmail || 'N/A')}</div>
        </td>
        <td><span class="badge-status ${badgeClass}">${icon} ${escapeHtml(item.type || 'Automated Email')}</span></td>
        <td><code>${escapeHtml(refId)}</code></td>
        <td><span class="badge-status badge-approved"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(item.status || 'Dispatched')}</span></td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// FIREBASE REALTIME DATABASE CONFIGURATION (ADMIN)
// ==========================================================================
function initFirebaseConfigForm() {
  const cfg = getActiveFirebaseConfig();
  const apiKeyEl = document.getElementById("fbApiKey");
  const dbUrlEl = document.getElementById("fbDbUrl");
  const projIdEl = document.getElementById("fbProjectId");
  const authDomainEl = document.getElementById("fbAuthDomain");
  const badge = document.getElementById("fbSetupConnectionBadge");

  if (apiKeyEl) apiKeyEl.value = (cfg.apiKey && cfg.apiKey !== "YOUR_API_KEY") ? cfg.apiKey : "";
  if (dbUrlEl) dbUrlEl.value = (cfg.databaseURL && !cfg.databaseURL.includes("YOUR_PROJECT")) ? cfg.databaseURL : "";
  if (projIdEl) projIdEl.value = (cfg.projectId && cfg.projectId !== "YOUR_PROJECT_ID") ? cfg.projectId : "";
  if (authDomainEl) authDomainEl.value = (cfg.authDomain && !cfg.authDomain.includes("YOUR_PROJECT")) ? cfg.authDomain : "";

  if (badge) {
    if (isFirebaseLive) {
      badge.className = "badge-status badge-approved";
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Live Realtime Connected';
    } else {
      badge.className = "badge-status badge-pending";
      badge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Disconnected: Enter Credentials';
    }
  }
}

function parseRawFirebaseJson(raw) {
  if (!raw || !raw.trim()) return;
  try {
    let clean = raw.trim();
    if (clean.includes("=")) clean = clean.substring(clean.indexOf("=") + 1).trim();
    if (clean.endsWith(";")) clean = clean.slice(0, -1).trim();
    if (!clean.startsWith("{")) return;
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      parsed = Function('"use strict";return (' + clean + ')')();
    }

    if (parsed && typeof parsed === "object") {
      if (parsed.apiKey) document.getElementById("fbApiKey").value = parsed.apiKey;
      if (parsed.databaseURL) document.getElementById("fbDbUrl").value = parsed.databaseURL;
      if (parsed.projectId) document.getElementById("fbProjectId").value = parsed.projectId;
      if (parsed.authDomain) document.getElementById("fbAuthDomain").value = parsed.authDomain;
      showToast("Firebase Config JSON auto-parsed into fields!", "info");
    }
  } catch (err) {
    // Ignore while user is typing
  }
}

function saveFirebaseConfig(e) {
  e.preventDefault();
  const apiKey = document.getElementById("fbApiKey")?.value.trim();
  const databaseURL = document.getElementById("fbDbUrl")?.value.trim();
  const projectId = document.getElementById("fbProjectId")?.value.trim();
  const authDomain = document.getElementById("fbAuthDomain")?.value.trim() || `${projectId}.firebaseapp.com`;

  if (!apiKey || !databaseURL || !projectId) {
    showToast("Please provide API Key, Database URL, and Project ID.", "error");
    return;
  }

  const newConfig = {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: "",
    appId: ""
  };

  localStorage.setItem("ssd_firebase_config", JSON.stringify(newConfig));
  showToast("Firebase configuration saved! Connecting...", "info");

  try {
    if (firebase.apps.length) {
      Promise.all(firebase.apps.map(app => app.delete())).then(() => {
        firebaseApp = firebase.initializeApp(newConfig);
        db = firebase.database();
        isFirebaseLive = true;
        setDbStatus(true, "Firebase Live Realtime Connected");
        initFirebaseConfigForm();
        loadAllRealtimeData();
        showToast("Connected to Live Firebase Database successfully!", "success");
      }).catch(() => {
        location.reload();
      });
    } else {
      firebaseApp = firebase.initializeApp(newConfig);
      db = firebase.database();
      isFirebaseLive = true;
      setDbStatus(true, "Firebase Live Realtime Connected");
      initFirebaseConfigForm();
      loadAllRealtimeData();
      showToast("Connected to Live Firebase Database successfully!", "success");
    }
  } catch (err) {
    console.error("Firebase connection error:", err);
    showToast("Connection failed: " + err.message, "error");
  }
}

function testFirebasePing() {
  if (!db) {
    showToast("Database not initialized. Please save your credentials first.", "error");
    return;
  }
  showToast("Testing Realtime Database read & write access...", "info");

  const testKey = "_ping_health_check";
  const testPayload = { testTime: Date.now(), ping: "pong" };

  // 1. Test Write Access
  db.ref(testKey).set(testPayload)
    .then(() => {
      // 2. Test Read Access
      return db.ref(testKey).once('value');
    })
    .then((snap) => {
      // 3. Clean up test record
      db.ref(testKey).remove();
      if (snap.exists() && snap.val().ping === "pong") {
        showToast("Database Test PASSED: Full Live Read & Write Permissions Verified! Real-time sync active.", "success");
      } else {
        showToast("Database connected but read verification returned unexpected response.", "warning");
      }
    })
    .catch((err) => {
      console.error("Firebase Test Error:", err);
      if (err.message && err.message.toLowerCase().includes("permission_denied")) {
        showToast("PERMISSION DENIED! Please go to Firebase Console > Realtime Database > Rules and set .read: true, .write: true", "error");
      } else {
        showToast("Database Connection Error: " + err.message, "error");
      }
    });
}

function resetFirebaseConfigDefault() {
  if (confirm("Reset Firebase credentials to fallback demo mode?")) {
    localStorage.removeItem("ssd_firebase_config");
    location.reload();
  }
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
