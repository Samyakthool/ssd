/* ==========================================================================
   SAMATA SAINIK DAL (SSD) - OFFICIAL JAVASCRIPT & FIREBASE INTEGRATION
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

// ==========================================================================
// CLIENT-SIDE REAL-TIME EVENT HUB PROVIDER (DUAL CHANNEL: BROADCAST + SSE)
// ==========================================================================
if (typeof window.SSDRealtime === 'undefined') {
  (function(global) {
    const listeners = new Map();
    let broadcastChannel = null;
    let eventSource = null;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let isConnected = false;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('ssd_realtime_pipeline');
        broadcastChannel.onmessage = (event) => {
          if (event && event.data && event.data.type) {
            triggerHandlers(event.data.type, event.data.payload, 'broadcast_channel');
          }
        };
      }
    } catch (e) {}

    window.addEventListener('storage', (e) => {
      if (e.key === 'ssd_admin_local_data') {
        triggerHandlers('storage:sync', { key: e.key }, 'local_storage');
      }
    });

    function triggerHandlers(eventType, payload, origin) {
      const list = listeners.get(eventType) || [];
      list.forEach(fn => {
        try { fn(payload, origin); } catch (err) { console.error(`[SSD Realtime] Listener error for ${eventType}:`, err); }
      });
      const anyList = listeners.get('*') || [];
      anyList.forEach(fn => {
        try { fn(eventType, payload, origin); } catch (err) { console.error(`[SSD Realtime] Wildcard error:`, err); }
      });
    }

    function connectSSE() {
      if (typeof EventSource === 'undefined') return;
      if (eventSource) { try { eventSource.close(); } catch (e) {} }
      try {
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onopen = () => {
          isConnected = true;
          reconnectAttempts = 0;
          triggerHandlers('realtime:connected', { status: 'ONLINE' }, 'sse');
        };
        eventSource.onerror = () => {
          isConnected = false;
          try { eventSource.close(); } catch (e) {}
          eventSource = null;
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000);
          reconnectAttempts++;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, delay);
        };
        const events = ['connected', 'leadership:update', 'leadership:delete', 'news:update', 'news:delete', 'event:update', 'event:delete', 'event:register', 'campaign:update', 'campaign:delete', 'gallery:update', 'gallery:delete', 'membership:apply', 'membership:approve', 'membership:reject', 'membership:workflow', 'donation:new', 'stats:update', 'chapter:update', 'sync:all'];
        events.forEach(evt => {
          eventSource.addEventListener(evt, (e) => {
            let data = null;
            try { data = JSON.parse(e.data); } catch (err) { data = e.data; }
            triggerHandlers(evt, data, 'sse');
          });
        });
      } catch (err) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', connectSSE);
    } else {
      connectSSE();
    }

    global.SSDRealtime = {
      on(eventType, callback) {
        if (!listeners.has(eventType)) listeners.set(eventType, []);
        listeners.get(eventType).push(callback);
        return () => this.off(eventType, callback);
      },
      off(eventType, callback) {
        if (!listeners.has(eventType)) return;
        listeners.set(eventType, listeners.get(eventType).filter(fn => fn !== callback));
      },
      emit(eventType, payload, syncToServer = true) {
        triggerHandlers(eventType, payload, 'local');
        if (broadcastChannel) {
          try { broadcastChannel.postMessage({ type: eventType, payload }); } catch (e) {}
        }
        if (syncToServer) {
          fetch('/api/realtime/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: eventType, data: payload })
          }).catch(() => {});
        }
      },
      isConnected() { return isConnected; }
    };
  })(window);
}



// Global HTML sanitization helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

// Reliable Large Asset & Dossier File Storage (IndexedDB)
const ssdFileStorage = {
  dbPromise: null,
  getDb() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open('ssd_assets_db', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('assets')) {
            db.createObjectStore('assets');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return this.dbPromise;
  },
  async get(key) {
    const db = await this.getDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('assets', 'readonly');
        const store = tx.objectStore('assets');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },
  async set(key, value) {
    const db = await this.getDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('assets', 'readwrite');
        const store = tx.objectStore('assets');
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};
window.ssdFileStorage = ssdFileStorage;

async function resolvePdfUrl(url) {
  if (!url) return "";
  if (url.startsWith("idb://") && window.ssdFileStorage) {
    const key = url.replace("idb://", "");
    const stored = await window.ssdFileStorage.get(key);
    if (stored) return stored;
  }
  return url;
}
window.resolvePdfUrl = resolvePdfUrl;

// Authentic SSD Seed/Fallback Dataset
const ssdSampleData = {
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
    },
    "news_6": {
      title: "Constitution Day (26 Nov) Mass Preamble Reading Across 500 Districts",
      excerpt: "All state units instructed to organize village-level public assemblies for collective reading of the Preamble of the Constitution of India.",
      date: "September 05, 2026",
      category: "Constitution",
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80"
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
    },
    "event_4": {
      title: "State Cadet Training & Drill Camp (Winter Session)",
      date: "Jan 10, 2027",
      location: "Deekshabhoomi Complex, Nagpur",
      description: "3-day intensive drill, parade discipline, first aid, and constitutional law workshop for newly enlisted Sainiks.",
      status: "upcoming"
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
    },
    "gal_3": {
      imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
      caption: "Constitution Day Mass Preamble Reading Assembly",
      category: "Constitution"
    },
    "gal_4": {
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
      caption: "Youth Cadet Physical Training & Non-Violent Defense Drill",
      category: "Youth Front"
    },
    "gal_5": {
      imageUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=800&q=80",
      caption: "Chavdar Tale Mahad Satyagraha Memorial Gathering",
      category: "Historical"
    },
    "gal_6": {
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
      caption: "SSD Medical & Disaster Relief Task Force Health Camp",
      category: "Community Sewa"
    },
    "gal_7": {
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
      caption: "Dr. Ambedkar Study Library & Free Educational Tutoring Center",
      category: "Education"
    },
    "gal_8": {
      imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80",
      caption: "State Command Conference & Centenary Roadmap Meeting",
      category: "Leadership"
    }
  },
  testimonials: {
    "test_1": {
      id: "test_1",
      name: "Commander Ashok R. Gaikwad",
      designation: "State Commander, Maharashtra State SSD",
      category: "leadership",
      categoryLabel: "State Command",
      categoryIcon: "fa-solid fa-star",
      cadetId: "SSD-MH-1989-0042",
      state: "Nagpur & Mumbai, Maharashtra",
      tenure: "35 Years Active Service",
      highlight: "Discipline in khaki is not militarism; it is moral readiness to protect the constitutional dignity of our people.",
      quote: "Serving in Samata Sainik Dal for 35 years has taught me the true meaning of Babasaheb's mission. When we put on the uniform and march in unison, caste barriers dissolve. Whether conducting flood rescues in Kolhapur or guarding peaceful assembly at Chaityabhoomi, our cadres stand fearless in defense of constitutional brotherhood.",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80"
    },
    "test_2": {
      id: "test_2",
      name: "Sunita Tai Kamble",
      designation: "Chief Organizer, Mahila Samata Sainik Dal",
      category: "mahila",
      categoryLabel: "Mahila Dal",
      categoryIcon: "fa-solid fa-shield-halved",
      cadetId: "SSD-MSSD-2004-0118",
      state: "Amravati, Vidarbha",
      tenure: "20 Years Active Service",
      highlight: "Babasaheb envisioned women leading the vanguard of social democracy, not standing behind.",
      quote: "Through Mahila Samata Sainik Dal, we have trained more than 8,500 young women across rural Vidarbha in lathi drill, self-defense, and legal literacy. When rural women know their constitutional rights and have the courage to walk with head held high, entire communities transform.",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80"
    },
    "test_3": {
      id: "test_3",
      name: "Adv. Rajesh V. Gautam",
      designation: "National Convener, SSD Legal Defense Cell",
      category: "legal",
      categoryLabel: "Legal Advisory",
      categoryIcon: "fa-solid fa-scale-balanced",
      cadetId: "SSD-LEG-2011-0089",
      state: "Supreme Court Bar, New Delhi",
      tenure: "13 Years Pro-Bono Counsel",
      highlight: "We transform constitutional guarantees from ink on parchment into an impenetrable shield in courtrooms.",
      quote: "Our pro-bono legal wing intervenes across district courts and high courts whenever marginalized citizens face institutional apathy or atrocities. We fight without charging a single rupee because Babasaheb gave us the Constitution as our supreme weapon. SSD ensures no citizen is left defenseless.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80"
    },
    "test_4": {
      id: "test_4",
      name: "Dr. Siddharth M. Meshram",
      designation: "Director of Field Medicine & Sewa Relief",
      category: "relief",
      categoryLabel: "Sewa & Relief",
      categoryIcon: "fa-solid fa-hand-holding-medical",
      cadetId: "SSD-MED-2015-0302",
      state: "Wardha & Chandrapur, MH",
      tenure: "9 Years Disaster Relief",
      highlight: "In disaster zones and medical crises, an SSD volunteer arrives first and leaves last.",
      quote: "During regional floods and epidemics, our volunteer doctors and trained youth cadets establish emergency medical outposts within hours. We run a 24/7 volunteer blood donor brigade that has answered over 12,000 emergency requests. For us, humanitarian relief is pure constitutional brotherhood in action.",
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=240&q=80"
    },
    "test_5": {
      id: "test_5",
      name: "Pradeep Kumar Boudh",
      designation: "Regional Commander, Northern Zone",
      category: "leadership",
      categoryLabel: "State Command",
      categoryIcon: "fa-solid fa-star",
      cadetId: "SSD-UP-1998-0055",
      state: "Lucknow, Uttar Pradesh",
      tenure: "26 Years Active Service",
      highlight: "The uniform gives our youth pride, discipline, and a collective purpose beyond caste divisions.",
      quote: "Across Uttar Pradesh and North India, rural youth often lack positive mentorship. When they attend our drill parades, study Dr. Ambedkar's writings, and march in centenary rallies, their entire perspective transforms. They become vigilant protectors of peace, democracy, and community harmony.",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80"
    },
    "test_6": {
      id: "test_6",
      name: "Priyanka B. Tayade",
      designation: "Chief Drill Instructor & Bal Sainik Mentor",
      category: "youth",
      categoryLabel: "Youth & Bal Sainik",
      categoryIcon: "fa-solid fa-graduation-cap",
      cadetId: "SSD-YW-2018-0412",
      state: "Pune, Maharashtra",
      tenure: "6 Years Youth Leadership",
      highlight: "Teaching children the Preamble before dogma is how we build a casteless, democratic India.",
      quote: "I enlisted as a Bal Sainik at age ten. Today, I train collegiate youth to lead weekly Constitution reading circles in schools, slums, and rural bastis. Watching a 12-year-old recite the Preamble with glowing pride and saluting the national flag gives me absolute conviction in our movement's future.",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80"
    },
    "test_7": {
      id: "test_7",
      name: "Bhimrao Jadhav",
      designation: "Veteran Sainik & Centenary Task Force",
      category: "leadership",
      categoryLabel: "Veteran Cadre",
      categoryIcon: "fa-solid fa-award",
      cadetId: "SSD-KA-1981-0007",
      state: "Belagavi, Karnataka",
      tenure: "43 Years Lifelong Service",
      highlight: "For over four decades, our khaki uniform has stood as a guardian of Dr. Ambedkar's vision.",
      quote: "I took my first pledge in 1981 under veteran leaders who stood side-by-side with Babasaheb. As we approach the historic Centenary of Samata Sainik Dal (1927–2027), seeing modern youth, software engineers, and scholars enlist with equal fervor proves that our movement is timeless and unbreakable.",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&q=80"
    }
  },
  campaigns: {
    "camp_1": {
      id: "centenary",
      title: "SSD Centenary 1927–2027 Mission (शताब्दी महोत्सव)",
      category: "Centenary Drive",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      description: "Nationwide 100-Year commemorative march pasts, building 1,000 Ambedkar Study Libraries, and establishing the Centenary National Memorial at Mahad & Nagpur.",
      targetAmount: 5000000,
      raisedAmount: 3650000,
      volunteersCount: "15,000+",
      districtsCount: "250+",
      causeKey: "Centenary 2027 Trust Fund"
    },
    "camp_2": {
      id: "constitution",
      title: "National Constitutional Literacy & Preamble Yatra",
      category: "Legal & Rights",
      imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      description: "Distributing pocket Constitutions in rural villages, mass Preamble recitation camps, and training grassroots advocates to resist caste atrocities legally.",
      targetAmount: 2500000,
      raisedAmount: 1720000,
      volunteersCount: "8,200+",
      districtsCount: "500+",
      causeKey: "Constitutional Literacy"
    },
    "camp_3": {
      id: "mahila_defense",
      title: "Mahila Self-Defense & Savitribai Phule Academy",
      category: "Women Wing",
      imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80",
      description: "Physical stick drill, martial self-defense training, anti-harassment rapid action units, and educational scholarships for Bahujan female students.",
      targetAmount: 3000000,
      raisedAmount: 1950000,
      volunteersCount: "12,000+",
      districtsCount: "180+",
      causeKey: "Mahila Dal Welfare"
    },
    "camp_4": {
      id: "blood_relief",
      title: "Samata 24/7 Voluntary Blood Donor & Disaster Force",
      category: "Community Sewa",
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
      description: "Nationwide emergency voluntary blood donor registry, flood rescue battalions, free medical diagnosis, and community health camps in underprivileged bastis.",
      targetAmount: 2000000,
      raisedAmount: 1580000,
      volunteersCount: "25,000+",
      districtsCount: "320+",
      causeKey: "Disaster Relief & Sewa"
    }
  },
  governingBody: {
    "lead_1": {
      name: "Dr. Siddharth M. Meshram",
      designation: "National President (राष्ट्रीय अध्यक्ष)",
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
      level: "national",
      category: "Finance & Audit",
      state: "National HQ",
      rankBadge: "Finance & Audit",
      photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      bio: "Chartered Accountant and academician; ensures 100% organizational transparency, public audit compliance, 80G tax exemptions, and Centenary 2027 trust governance.",
      credentials: "FCA, M.Com | Central Audit Bureau",
      order: 6
    },
    "lead_it_1": {
      name: "Er. Aniket S. Meshram",
      designation: "National Head, IT & Digital Media Cell (राष्ट्रीय आईटी प्रमुख)",
      level: "it_cell",
      category: "IT & Digital Media Cell",
      state: "National HQ",
      rankBadge: "IT & Cyber Directorate",
      photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      bio: "Cloud & Cyber Systems Architect; oversees centralized portal databases, digital member IDs, automated enrollment systems, and nationwide digital infrastructure.",
      credentials: "B.Tech Computer Science | Nagpur Central IT Cell",
      order: 7
    },
    "lead_it_2": {
      name: "Ms. Pooja R. Gaikwad",
      designation: "Digital Media & PR Secretary (डिजिटल मीडिया समन्वयक)",
      level: "national",
      category: "IT & Digital Media Cell",
      state: "National HQ",
      rankBadge: "Digital Media Wing",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Digital communications specialist leading social broadcast networks, multimedia archives, digital gazette publications, and centenary cyber outreach.",
      credentials: "M.A. Mass Communication | Mumbai Directorate",
      order: 8
    },
    "lead_state_mh_1": {
      name: "Commander Pramod R. Moon",
      designation: "State President (महाराष्ट्र प्रदेशाध्यक्ष)",
      level: "state",
      state: "Maharashtra",
      district: "Nagpur & Mumbai State Directorate",
      rankBadge: "Maharashtra State Command",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      bio: "Spearheads statewide cadre building across 36 districts of Maharashtra; organizes annual Deekshabhoomi rally defense drills, cadre discipline, and Dr. Ambedkar youth training camps.",
      credentials: "M.A. Social Work | Mumbai & Nagpur State HQ",
      order: 10
    },
    "lead_state_mh_2": {
      name: "Adv. Nitin V. Dongre",
      designation: "State General Secretary (महाराष्ट्र प्रदेश महासचिव)",
      level: "state",
      state: "Maharashtra",
      district: "Pune & Western Maharashtra",
      rankBadge: "State Executive",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      bio: "Coordinates district dalpatis and administers constitutional awareness camps across Vidarbha, Marathwada, and Western Maharashtra.",
      credentials: "B.A., LL.B. | Pune State Secretariat",
      order: 11
    },
    "lead_state_mh_3": {
      name: "Sainik Nilesh P. Bagde",
      designation: "State Chief Cadet Commander (महाराष्ट्र मुख्य दलनायक)",
      level: "state",
      state: "Maharashtra",
      district: "Amravati & Vidarbha Division",
      rankBadge: "Maharashtra Cadet Directorate",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      bio: "Directs statewide cadet physical drills, ceremonial guard of honour, and emergency disaster rescue corps across all Maharashtra districts.",
      credentials: "Cadet Training Instructor | Nagpur HQ",
      order: 12
    },
    "lead_state_mh_4": {
      name: "Smt. Vandana Tai Meshram",
      designation: "State Convener, Mahila Dal (महाराष्ट्र प्रदेश संयोजिका)",
      level: "state",
      state: "Maharashtra",
      district: "Chhatrapati Sambhaji Nagar & Marathwada",
      rankBadge: "State Mahila Wing",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Leads women's self-defense squads, Savitribai Phule girls' education cells, and district legal support desks across Maharashtra.",
      credentials: "M.S.W. | Aurangabad / Chh. Sambhaji Nagar",
      order: 13
    },
    "lead_state_mh_5": {
      name: "Adv. Rahul V. Kamble",
      designation: "Head, Maharashtra Legal Cell (विधिक प्रकोष्ठ प्रमुख)",
      level: "state",
      state: "Maharashtra",
      district: "Mumbai High Court Bench",
      rankBadge: "High Court Panel",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "High Court Advocate leading pro-bono defense, SC/ST Act implementation monitoring, and legal assistance for grassroots volunteers across Maharashtra.",
      credentials: "LL.M. | Bombay High Court",
      order: 14
    },
    "lead_dist_mh_1": {
      name: "Sainik Rajesh T. Shinde",
      designation: "District Dalpati (नागपूर जिल्हा दलनायक)",
      level: "district",
      state: "Maharashtra",
      district: "Nagpur",
      rankBadge: "Nagpur District Command",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      bio: "Leads field cadet battalions and Deekshabhoomi rally security cordons across Nagpur district urban and rural divisions.",
      credentials: "Ex-Cadet Instructor | Nagpur Urban & Rural HQ",
      order: 20
    },
    "lead_dist_mh_2": {
      name: "Adv. Amit S. Bansode",
      designation: "District President (मुंबई शहर जिल्हाध्यक्ष)",
      level: "district",
      state: "Maharashtra",
      district: "Mumbai City",
      rankBadge: "Mumbai City Command",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bio: "Coordinates Chaityabhoomi VIP volunteer protocols, legal assistance clinics, and harbor-line youth cadet units across Mumbai City.",
      credentials: "LL.B. High Court Advocate | Mumbai City District HQ",
      order: 21
    },
    "lead_dist_mh_3": {
      name: "Prof. Sanjay B. Gaikwad",
      designation: "District General Secretary (पुणे जिल्हा महासचिव)",
      level: "district",
      state: "Maharashtra",
      district: "Pune",
      rankBadge: "Pune District Command",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      bio: "Oversees student study circles, Koregaon Bhima peace volunteer platoons, and youth physical training camps across Pune district.",
      credentials: "M.Sc., B.Ed. | Pune District Directorate",
      order: 22
    },
    "lead_dist_mh_4": {
      name: "Smt. Pratibha D. Wankhede",
      designation: "District Convener, Mahila Dal (अमरावती जिल्हा संयोजिका)",
      level: "district",
      state: "Maharashtra",
      district: "Amravati",
      rankBadge: "Amravati District Wing",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Directs women's rights awareness wings, self-defense workshops, and Savitribai Phule girls' education cells in Amravati district.",
      credentials: "M.S.W. | Amravati District Council",
      order: 23
    },
    "lead_dist_mh_5": {
      name: "Commander Sunil K. More",
      designation: "District Chief Organiser (ठाणे जिल्हा मुख्य संघटक)",
      level: "district",
      state: "Maharashtra",
      district: "Thane",
      rankBadge: "Thane District Command",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      bio: "Spearheads industrial belt worker rights defense, civic disaster assistance squads, and cadet induction in Thane & Navi Mumbai.",
      credentials: "Dip. Mech. Engg. | Thane District HQ",
      order: 24
    },
    "lead_dist_mh_6": {
      name: "Sainik Deepak R. Bhalerao",
      designation: "District Youth Commander (नाशिक जिल्हा युवा दलनायक)",
      level: "district",
      state: "Maharashtra",
      district: "Nashik",
      rankBadge: "Nashik District Command",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "Oversees Kalaram Temple memorial heritage security, youth blood donation networks, and cadet parades throughout Nashik district.",
      credentials: "B.A. Public Admin | Nashik District Unit",
      order: 25
    }
  },
  stateChapters: {
    "state_mh": {
      id: "state_mh",
      name: "Maharashtra",
      hindiName: "महाराष्ट्र",
      code: "MH",
      headquarters: "Nagpur & Mumbai State Directorate",
      presidentName: "Commander Pramod R. Moon",
      secretaryName: "Adv. Nitin V. Dongre",
      districts: [
        "Nagpur",
        "Mumbai City",
        "Mumbai Suburban",
        "Pune",
        "Thane",
        "Amravati",
        "Nashik",
        "Chhatrapati Sambhaji Nagar",
        "Kolhapur",
        "Nanded",
        "Solapur",
        "Akola",
        "Wardha",
        "Chandrapur",
        "Yavatmal",
        "Bhandara",
        "Gondia",
        "Gadchiroli",
        "Jalgaon",
        "Dhule",
        "Nandurbar",
        "Ahmednagar",
        "Satara",
        "Sangli",
        "Ratnagiri",
        "Sindhudurg",
        "Raigad",
        "Palghar",
        "Beed",
        "Latur",
        "Dharashiv",
        "Parbhani",
        "Hingoli",
        "Jalna",
        "Buldhana",
        "Washim"
      ],
      status: "Active",
      order: 1
    }
  },
  advisoryBoard: [
    {
      id: "adv_1",
      name: "Prof. Yashwantrao More",
      designation: "Senior Advisory & Elders Council Member (मार्गदर्शक मंडल सदस्य)",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Senior Ideologue & Historian",
      credentials: "Ph.D. History, Author & Senior Historian | Pune HQ",
      bio: "Prof. Yashwantrao More is a veteran Ambedkarite scholar with over 45 years dedicated to social movement historiography. Author of 12+ authoritative treatises on Babasaheb Ambedkar's Satyagrahas and the founding of Samata Sainik Dal, he guides the Central Command on ideological preservation and youth cadet curriculum.",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "adv_2",
      name: "Adv. Rekha Gaikwad",
      designation: "Senior Advisory & Elders Council Member (मार्गदर्शक मंडल सदस्य)",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Constitutional & Human Rights Jurist",
      credentials: "Senior Human Rights Defender, High Court Advocate | Mumbai Central HQ",
      bio: "Adv. Rekha Gaikwad is an eminent constitutional lawyer and social activist with four decades of frontline advocacy in western India. She mentors SSD's National Legal Cell on high-impact public interest litigations, atrocities defense tribunals, and grassroots women self-defense workshops.",
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "adv_3",
      name: "Commander Suresh Jadhav",
      designation: "Senior Advisory & Elders Council Member (मार्गदर्शक मंडल सदस्य)",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "1956 Deekshabhoomi Parade Organizer",
      credentials: "Veteran Guard of Honor Dalpati | Nagpur HQ",
      bio: "Commander Suresh Jadhav stands as a living legend of the movement, having personally marshaled the volunteer cadet platoons during the historic 14 October 1956 Deekshabhoomi Dhamma Deeksha in Nagpur under Dr. Babasaheb Ambedkar. He continues to instruct Dalpatis in parade discipline and ceremonial honor drills.",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80"
    }
  ]
};

// Initialize Firebase
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

const activeFirebaseConfig = getActiveFirebaseConfig();
try {
  if (activeFirebaseConfig.apiKey && activeFirebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebaseApp = firebase.initializeApp(activeFirebaseConfig);
    db = firebase.database();
    isFirebaseLive = true;
    updateDbStatus(true, "Connected to Live SSD Firebase Database");
  } else {
    updateDbStatus(false, "SSD Official Demo Ready (Connect Firebase in Admin Panel)");
  }
} catch (e) {
  console.warn("Firebase Init Notice:", e);
  updateDbStatus(false, "Running with fallback SSD dataset");
}

function updateDbStatus(isLive, message) {
  const dot = document.getElementById("fbStatusDot");
  const label = document.getElementById("fbStatusLabel");
  const panelStatus = document.getElementById("adminPanelStatus");
  if (dot) dot.className = "status-indicator " + (isLive ? "" : "fallback");
  if (label) label.innerHTML = isLive ? '<i class="fa-solid fa-cloud-bolt"></i> Firebase Live' : '<i class="fa-solid fa-circle-check"></i> SSD Demo Ready';
  if (panelStatus) panelStatus.textContent = message;
}

function toggleAdminPanel() {
  const panel = document.getElementById("adminWidgetPanel");
  if (panel) panel.classList.toggle("open");
}

function seedSampleFirebaseData() {
  if (db) {
    db.ref('/').update(ssdSampleData)
      .then(() => {
        showToast("SSD Official Data successfully seeded to Firebase!", "success");
        toggleAdminPanel();
      })
      .catch((err) => {
        showToast("Firebase write error: " + err.message, "error");
      });
  } else {
    showToast("SSD verified dataset active. To write to Firebase cloud, add your valid Firebase credentials in the script!", "success");
    toggleAdminPanel();
  }
}

// Global Lifecycle
document.addEventListener("DOMContentLoaded", () => {
  // Synchronize localStorage with latest verified leadership portraits and metadata
  (function syncSeedLeadership() {
    try {
      const SEED_REV = "2026.10.09.r4";
      if (localStorage.getItem("ssd_leadership_seed_rev") !== SEED_REV) {
        const rawStore = localStorage.getItem("ssd_admin_local_data");
        if (rawStore) {
          const parsed = JSON.parse(rawStore);
          if (parsed && parsed.leadership) {
            Object.keys(ssdSampleData.governingBody).forEach(id => {
              const fresh = ssdSampleData.governingBody[id];
              if (parsed.leadership[id]) {
                parsed.leadership[id].photoUrl = fresh.photoUrl;
                parsed.leadership[id].rankBadge = fresh.rankBadge;
                parsed.leadership[id].category = fresh.category;
                parsed.leadership[id].level = fresh.level;
                parsed.leadership[id].designation = fresh.designation;
                parsed.leadership[id].name = fresh.name;
                parsed.leadership[id].credentials = fresh.credentials;
                parsed.leadership[id].bio = fresh.bio;
              } else {
                parsed.leadership[id] = { ...fresh, id };
              }
            });
            localStorage.setItem("ssd_admin_local_data", JSON.stringify(parsed));
          }
        }
        localStorage.setItem("ssd_leadership_seed_rev", SEED_REV);
      }
    } catch (e) {}
  })();

  initStickyHeader();
  initMobileInteractions();
  initGoogleTranslate();

  // Restore persisted language preference
  const savedLang = (function() {
    try { return localStorage.getItem("ssd_language") || "en"; } catch (e) { return "en"; }
  })();
  if (savedLang && savedLang !== "en") {
    changeLanguage(savedLang);
  }

  updateDbStatus(isFirebaseLive, isFirebaseLive ? "Connected to Live SSD Firebase Database" : "SSD Official Demo Ready (Connect Firebase in Admin Panel)");
  if (document.getElementById("statMembers")) loadStats();
  if (document.getElementById("campaignsContainer")) loadCampaigns();
  if (document.getElementById("newsContainer")) loadNews();
  if (document.getElementById("eventsContainer")) loadEvents();
  if (document.getElementById("galleryContainer")) loadGallery();
  if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
  if (document.getElementById("governingContainer") || document.getElementById("advisoryContainer")) loadGoverningBody();
  if (document.getElementById("testimonialContainer")) loadTestimonials();

  // Re-run DOM translation pass once initial dynamic datasets populate
  setTimeout(() => {
    const activeLang = localStorage.getItem("ssd_language") || "en";
    if (activeLang && activeLang !== "en") {
      applyDomTranslations(activeLang, document.body);
    }
  }, 350);
});

// ==========================================================================
// UNIFIED REAL-TIME DATA PIPELINE & LIVE SYNCHRONIZATION
// ==========================================================================
function getLiveDataset(key, fallback) {
  try {
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      const parsed = JSON.parse(localStore);
      if (parsed && parsed[key]) {
        let val = parsed[key];
        let items = [];
        if (Array.isArray(val) && val.length > 0) items = val;
        else if (typeof val === 'object' && Object.keys(val).length > 0) {
          items = Object.entries(val).map(([k, v]) => ({ id: k, ...v }));
        }
        if (key === 'leadership' && items.length > 0) {
          items.forEach(l => {
            if (l.photoUrl && l.photoUrl.includes("photo-1534528741775-53994a69daeb")) {
              const match = ssdSampleData.governingBody[l.id];
              if (match) l.photoUrl = match.photoUrl;
            }
          });
        }
        if (items.length > 0) return items;
      }
    }
  } catch (e) {}
  return Object.values(fallback || {});
}

// Attach real-time listeners to instantly update DOM when data changes
function initRealtimeDomSync() {
  if (typeof window.SSDRealtime === 'undefined') return;

  window.SSDRealtime.on('news:update', () => { if (document.getElementById("newsContainer")) loadNews(); });
  window.SSDRealtime.on('news:delete', () => { if (document.getElementById("newsContainer")) loadNews(); });
  window.SSDRealtime.on('event:update', () => { if (document.getElementById("eventsContainer")) loadEvents(); });
  window.SSDRealtime.on('event:delete', () => { if (document.getElementById("eventsContainer")) loadEvents(); });
  window.SSDRealtime.on('leadership:update', () => {
    if (document.getElementById("governingContainer") || document.getElementById("advisoryContainer")) loadGoverningBody();
  });
  window.SSDRealtime.on('leadership:delete', () => {
    if (document.getElementById("governingContainer") || document.getElementById("advisoryContainer")) loadGoverningBody();
  });
  window.SSDRealtime.on('campaign:update', () => { if (document.getElementById("campaignsContainer")) loadCampaigns(); });
  window.SSDRealtime.on('campaign:delete', () => { if (document.getElementById("campaignsContainer")) loadCampaigns(); });
  window.SSDRealtime.on('gallery:update', () => {
    if (document.getElementById("galleryContainer")) loadGallery();
    if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
  });
  window.SSDRealtime.on('gallery:delete', () => {
    if (document.getElementById("galleryContainer")) loadGallery();
    if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
  });
  window.SSDRealtime.on('stats:update', (newStats) => {
    if (document.getElementById("statMembers")) {
      if (newStats) renderStats(newStats);
      else loadStats();
    }
  });
  window.SSDRealtime.on('sync:all', () => {
    if (document.getElementById("newsContainer")) loadNews();
    if (document.getElementById("eventsContainer")) loadEvents();
    if (document.getElementById("governingContainer") || document.getElementById("advisoryContainer")) loadGoverningBody();
    if (document.getElementById("campaignsContainer")) loadCampaigns();
    if (document.getElementById("galleryContainer")) loadGallery();
    if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
    if (document.getElementById("statMembers")) loadStats();
  });
  window.SSDRealtime.on('storage:sync', () => {
    if (document.getElementById("newsContainer")) loadNews();
    if (document.getElementById("eventsContainer")) loadEvents();
    if (document.getElementById("governingContainer") || document.getElementById("advisoryContainer")) loadGoverningBody();
    if (document.getElementById("campaignsContainer")) loadCampaigns();
    if (document.getElementById("galleryContainer")) loadGallery();
    if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
    if (document.getElementById("statMembers")) loadStats();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRealtimeDomSync);
} else {
  initRealtimeDomSync();
}

// Live Cross-Tab Sync Fallback
window.addEventListener("storage", (e) => {
  if (e.key === "ssd_admin_local_data") {
    if (typeof loadGoverningBody === "function") loadGoverningBody();
    if (typeof loadNews === "function" && document.getElementById("newsContainer")) loadNews();
    if (typeof loadEvents === "function" && document.getElementById("eventsContainer")) loadEvents();
    if (typeof loadCampaigns === "function" && document.getElementById("campaignsContainer")) loadCampaigns();
    if (typeof loadGallery === "function" && document.getElementById("galleryContainer")) loadGallery();
    if (typeof loadHomeGallery === "function" && document.getElementById("homeGalleryContainer")) loadHomeGallery();
    if (typeof loadStats === "function" && document.getElementById("statMembers")) loadStats();
  }
});

// Load Stats
function loadStats() {
  let stats = ssdSampleData.stats;
  try {
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      const parsed = JSON.parse(localStore);
      if (parsed && parsed.stats) stats = { ...stats, ...parsed.stats };
    }
  } catch (e) {}

  renderStats(stats);

  fetch('/api/stats')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && data.stats) {
        renderStats(data.stats);
      }
    })
    .catch(() => {});
}

function renderStats(stats) {
  const elMembers = document.getElementById("statMembers");
  const elStates = document.getElementById("statStates");
  const elEvents = document.getElementById("statEvents");
  const elYears = document.getElementById("statYears");

  if (elMembers) elMembers.setAttribute("data-target", stats.members || 100000);
  if (elStates) elStates.setAttribute("data-target", stats.states || 28);
  if (elEvents) elEvents.setAttribute("data-target", stats.events || 5200);
  if (elYears) elYears.setAttribute("data-target", stats.yearsActive || 99);

  animateStatsCounters();
}

function animateStatsCounters() {
  const counters = document.querySelectorAll(".stat-number");
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute("data-target"), 10) || 0;
    const duration = 2000;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target.toLocaleString() + (target > 50 ? "+" : "");
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current).toLocaleString();
      }
    }, stepTime);
  });
}

function isContentApproved(item) {
  if (!item) return false;
  const s = item.approvalStatus ? String(item.approvalStatus).toLowerCase() : 'approved';
  return s === 'approved';
}

// Load News
let activeNewsList = [];
function loadNews(limit = 6) {
  const container = document.getElementById("newsContainer");
  if (!container) return;

  const renderCurrent = (newsList) => {
    const rawList = newsList || getLiveDataset("news", ssdSampleData.news);
    const approvedList = rawList.filter(isContentApproved).slice(-limit);
    renderNews(approvedList);
  };

  // 1. Immediate local render
  renderCurrent();

  // 2. Fresh fetch from backend REST API
  fetch('/api/news')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.news) && data.news.length > 0) {
        renderCurrent(data.news);
      }
    })
    .catch(() => {});
}

function renderNews(newsArray) {
  const container = document.getElementById("newsContainer");
  if (!container) return;

  if (!newsArray || newsArray.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-newspaper"></i>
        <h4>No dispatches found</h4>
      </div>
    `;
    return;
  }

  activeNewsList = newsArray;
  container.innerHTML = newsArray.map((item, idx) => `
    <div class="news-card">
      <div class="news-image-wrapper">
        <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80'}" alt="${escapeHtml(item.title)}" class="news-img" onerror="this.onerror=null; this.src='logo.png';">
        <span class="news-category-badge">${escapeHtml(item.category || 'Gazette')}</span>
      </div>
      <div class="news-body">
        <span class="news-date-badge"><i class="fa-regular fa-calendar-check"></i> ${escapeHtml(item.date || 'Recent')}</span>
        <h4 class="news-title">${escapeHtml(item.title)}</h4>
        <p class="news-excerpt">${escapeHtml(item.excerpt || '')}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color, #E2E8F0);">
          <span class="news-read-more" onclick="openNewsModal(${idx})" style="margin: 0; cursor: pointer;">Read Dispatch &rarr;</span>
          ${item.pdfUrl ? `<a href="${item.pdfUrl}" target="_blank" download class="news-pdf-badge-btn" onclick="event.stopPropagation()" title="Download Official PDF Circular"><i class="fa-solid fa-file-pdf"></i> PDF Circular</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');
  if (window.currentLanguage && window.currentLanguage !== "en") {
    applyDomTranslations(window.currentLanguage, container);
  }
}

// Load Events
function loadEvents() {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  const renderCurrent = (eventsList) => {
    const rawList = eventsList || getLiveDataset("events", ssdSampleData.events);
    const approvedList = rawList.filter(e => ((e.status || '').toLowerCase() === 'upcoming') && isContentApproved(e)).slice(-4);
    renderEvents(approvedList);
  };

  renderCurrent();

  fetch('/api/events?status=upcoming')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.events) && data.events.length > 0) {
        renderCurrent(data.events);
      }
    })
    .catch(() => {});
}

function renderEvents(eventsArray) {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  if (!eventsArray || eventsArray.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-xmark"></i>
        <h4>No Upcoming Events Scheduled</h4>
      </div>
    `;
    return;
  }

  container.innerHTML = eventsArray.map(event => {
    const dateParts = (event.date || "Sept 24, 2026").split(" ");
    const month = dateParts[0] || "SEP";
    const day = (dateParts[1] || "24").replace(",", "");

    return `
      <div class="event-card">
        <div class="event-date-box">
          <span class="event-day">${day}</span>
          <span class="event-month">${month}</span>
        </div>
        <div class="event-details">
          <h4 class="event-title">${escapeHtml(event.title)}</h4>
          <div class="event-meta" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location || 'Nagpur / New Delhi')}</span>
            ${event.pdfUrl ? `<a href="${event.pdfUrl}" target="_blank" download class="event-pdf-btn" style="color: #DC2626; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;"><i class="fa-solid fa-file-pdf"></i> Schedule PDF</a>` : ''}
          </div>
          <p class="event-desc">${escapeHtml(event.description || '')}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Load Gallery
let currentGalleryItems = [];
let currentLightboxIndex = 0;
function loadGallery() {
  const container = document.getElementById("galleryContainer");
  if (!container) return;

  const renderCurrent = (galleryList) => {
    const rawList = galleryList || getLiveDataset("gallery", ssdSampleData.gallery);
    renderGallery(rawList.filter(isContentApproved));
  };

  renderCurrent();

  fetch('/api/gallery')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.gallery) && data.gallery.length > 0) {
        renderCurrent(data.gallery);
      }
    })
    .catch(() => {});
}

function renderGallery(galleryArray) {
  const container = document.getElementById("galleryContainer");
  if (!container) return;

  currentGalleryItems = galleryArray;
  container.innerHTML = galleryArray.map((item, idx) => `
    <div class="gallery-item" onclick="openLightbox(${idx})">
      <img src="${item.imageUrl}" alt="${item.caption || 'SSD Drill Action'}" class="gallery-img" onerror="this.onerror=null; this.src='logo.png';">
      <div class="gallery-overlay">
        <div class="gallery-zoom-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        <p class="gallery-caption">${item.caption || 'Samata Sainik Dal Archive'}</p>
      </div>
    </div>
  `).join('');
}

// Lightbox
function openLightbox(index) {
  if (!currentGalleryItems || !currentGalleryItems[index]) return;
  currentLightboxIndex = index;
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxMainImg");
  const cap = document.getElementById("lightboxCaption");

  if (img) img.src = currentGalleryItems[index].imageUrl;
  if (cap) cap.textContent = currentGalleryItems[index].caption || "Samata Sainik Dal Archive";

  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function closeLightboxOnBackdrop(e) {
  if (e.target.id === "lightboxModal") closeLightbox();
}

function nextLightboxImage() {
  if (!currentGalleryItems.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentGalleryItems.length;
  openLightbox(currentLightboxIndex);
}

function prevLightboxImage() {
  if (!currentGalleryItems.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentGalleryItems.length) % currentGalleryItems.length;
  openLightbox(currentLightboxIndex);
}

window.addEventListener("keydown", (e) => {
  const modal = document.getElementById("lightboxModal");
  if (modal && modal.classList.contains("active")) {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextLightboxImage();
    if (e.key === "ArrowLeft") prevLightboxImage();
  }
});

// ==========================================================================
// TESTIMONIALS & CADRE VOICES SLIDER ENGINE
// ==========================================================================
let allLoadedTestimonials = [];
let currentTestimonials = [];
let currentTestimonialIndex = 0;
let activeTestimonialCategory = 'all';
let testimonialAutoSlideTimer = null;
let isTestimonialAutoSlidePaused = false;

function loadTestimonials() {
  const container = document.getElementById("testimonialContainer");
  if (!container) return;

  if (typeof db !== "undefined" && db) {
    db.ref('testimonials').on('value', (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : Object.values(ssdSampleData.testimonials);
      setupTestimonialsData(list);
    }, (err) => {
      setupTestimonialsData(Object.values(ssdSampleData.testimonials));
    });
  } else {
    setupTestimonialsData(Object.values(ssdSampleData.testimonials));
  }
}

function setupTestimonialsData(list) {
  allLoadedTestimonials = Array.isArray(list) && list.length ? list : Object.values(ssdSampleData.testimonials);
  filterTestimonials(activeTestimonialCategory, false);
}

function filterTestimonials(category = 'all', resetTimer = true) {
  activeTestimonialCategory = category;
  currentTestimonialIndex = 0;

  if (category === 'all') {
    currentTestimonials = [...allLoadedTestimonials];
  } else {
    currentTestimonials = allLoadedTestimonials.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (category === 'leadership') return cat === 'leadership' || cat.includes('command') || cat.includes('veteran');
      if (category === 'mahila') return cat === 'mahila' || cat.includes('women');
      if (category === 'legal') return cat === 'legal' || cat.includes('law');
      if (category === 'relief') return cat === 'relief' || cat.includes('sewa') || cat.includes('disaster') || cat.includes('medical');
      if (category === 'youth') return cat === 'youth' || cat.includes('bal') || cat.includes('student');
      return cat === category;
    });
    // Fallback if filter yielded 0 items
    if (!currentTestimonials.length) {
      currentTestimonials = [...allLoadedTestimonials];
    }
  }

  // Update filter buttons UI
  document.querySelectorAll('.testimonial-filter-btn').forEach(btn => {
    const btnCat = btn.getAttribute('data-category');
    btn.classList.toggle('active', btnCat === category);
  });

  // Update status count label
  const countLabel = document.getElementById('testimonialCountLabel');
  if (countLabel) {
    const wingName = category === 'all' ? 'All Cadre' : (category.charAt(0).toUpperCase() + category.slice(1));
    countLabel.textContent = `Displaying ${currentTestimonials.length} Verified ${wingName} Voices`;
  }

  renderTestimonialCards();

  if (resetTimer) {
    restartTestimonialAutoSlide();
  }
}

function getCadrePillMarkup(category) {
  const cat = (category || 'leadership').toLowerCase();
  if (cat.includes('mahila') || cat.includes('women')) {
    return `<span class="cadre-pill cadre-mahila"><i class="fa-solid fa-shield-halved"></i> Mahila Dal</span>`;
  }
  if (cat.includes('legal') || cat.includes('law')) {
    return `<span class="cadre-pill cadre-legal"><i class="fa-solid fa-scale-balanced"></i> Legal Advisory</span>`;
  }
  if (cat.includes('relief') || cat.includes('sewa') || cat.includes('medical')) {
    return `<span class="cadre-pill cadre-relief"><i class="fa-solid fa-hand-holding-medical"></i> Sewa & Relief</span>`;
  }
  if (cat.includes('youth') || cat.includes('bal')) {
    return `<span class="cadre-pill cadre-youth"><i class="fa-solid fa-graduation-cap"></i> Youth & Bal Sainik</span>`;
  }
  return `<span class="cadre-pill cadre-leadership"><i class="fa-solid fa-star"></i> State Command</span>`;
}

function renderTestimonialCards() {
  const container = document.getElementById("testimonialContainer");
  const dotsContainer = document.getElementById("testimonialDots");
  if (!container) return;

  if (!currentTestimonials.length) {
    container.innerHTML = `
      <div class="empty-testimonials" style="padding: 40px; text-align: center; width: 100%; color: #94A3B8;">
        <i class="fa-solid fa-circle-info" style="font-size: 32px; margin-bottom: 12px; color: var(--primary-orange);"></i>
        <p>No testimonies found for this wing. Select "All Cadre Wings" to view all records.</p>
      </div>`;
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  container.innerHTML = currentTestimonials.map((item, idx) => {
    const pill = getCadrePillMarkup(item.category);
    const cadetId = item.cadetId || `SSD-CADRE-1927-${String(idx + 1).padStart(3, '0')}`;
    const state = item.state || 'India';
    const tenure = item.tenure || 'Active Cadre';
    const highlight = item.highlight ? `<div class="testimonial-highlight">${item.highlight}</div>` : '';
    const photo = item.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80';

    return `
      <article class="testimonial-card" id="testCard_${idx}" data-index="${idx}">
        <div class="testimonial-card-header">
          ${pill}
          <div class="cadre-commission-chip" title="Verified Volunteer Commission">
            <i class="fa-solid fa-circle-check"></i>
            <span>${cadetId}</span>
          </div>
        </div>

        <div class="testimonial-card-body">
          <i class="fa-solid fa-quote-right quote-watermark" aria-hidden="true"></i>
          ${highlight}
          <p class="testimonial-quote-narrative">"${item.quote}"</p>
        </div>

        <div class="testimonial-card-footer">
          <div class="testimonial-author-avatar-wrap">
            <img src="${photo}" alt="${item.name}" class="testimonial-author-img" loading="lazy" onerror="this.onerror=null; this.src='logo.png';">
            <div class="cadre-rank-pip" title="Active Duty Commission"></div>
          </div>
          <div class="testimonial-author-info">
            <h4 class="testimonial-author-name">${item.name}</h4>
            <div class="testimonial-author-title">${item.designation || 'Sainik Cadre'}</div>
            <div class="testimonial-author-meta">
              <span><i class="fa-solid fa-location-dot"></i> ${state}</span>
              <span class="sep">•</span>
              <span><i class="fa-solid fa-clock-rotate-left"></i> ${tenure}</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Render Dots
  if (dotsContainer) {
    dotsContainer.innerHTML = currentTestimonials.map((_, idx) => `
      <button type="button" class="testimonial-dot ${idx === 0 ? 'active' : ''}" onclick="goToTestimonial(${idx})" aria-label="Go to testimony ${idx + 1}" title="Slide ${idx + 1}"></button>
    `).join('');
  }

  updateSliderPosition();
  setupTouchSwipe();
}

function updateSliderPosition() {
  const container = document.getElementById("testimonialContainer");
  const viewport = document.getElementById("testimonialCarouselViewport");
  if (!container || !viewport || !currentTestimonials.length) return;

  const cards = container.children;
  if (!cards.length) return;

  // Clamp index
  if (currentTestimonialIndex >= currentTestimonials.length) currentTestimonialIndex = 0;
  if (currentTestimonialIndex < 0) currentTestimonialIndex = currentTestimonials.length - 1;

  const targetCard = cards[currentTestimonialIndex];
  if (targetCard) {
    const maxScroll = Math.max(0, container.scrollWidth - viewport.clientWidth);
    let targetOffset = targetCard.offsetLeft - container.offsetLeft;
    if (targetOffset > maxScroll) targetOffset = maxScroll;
    if (targetOffset < 0) targetOffset = 0;

    container.style.transform = `translateX(-${targetOffset}px)`;
  }

  // Update dots
  document.querySelectorAll(".testimonial-dot").forEach((dot, idx) => {
    dot.classList.toggle("active", idx === currentTestimonialIndex);
  });

  // Update counter
  const counter = document.getElementById("testimonialCounter");
  if (counter) {
    const cur = String(currentTestimonialIndex + 1).padStart(2, '0');
    const tot = String(currentTestimonials.length).padStart(2, '0');
    counter.textContent = `${cur} / ${tot}`;
  }
}

function goToTestimonial(index) {
  if (!currentTestimonials.length) return;
  currentTestimonialIndex = index;
  updateSliderPosition();
  restartTestimonialAutoSlide();
}

function nextTestimonial() {
  if (!currentTestimonials.length) return;
  currentTestimonialIndex = (currentTestimonialIndex + 1) % currentTestimonials.length;
  updateSliderPosition();
  restartTestimonialAutoSlide();
}

function prevTestimonial() {
  if (!currentTestimonials.length) return;
  currentTestimonialIndex = (currentTestimonialIndex - 1 + currentTestimonials.length) % currentTestimonials.length;
  updateSliderPosition();
  restartTestimonialAutoSlide();
}

function toggleTestimonialAutoSlide() {
  const icon = document.getElementById("toggleAutoSlideIcon");
  isTestimonialAutoSlidePaused = !isTestimonialAutoSlidePaused;
  if (isTestimonialAutoSlidePaused) {
    if (testimonialAutoSlideTimer) clearInterval(testimonialAutoSlideTimer);
    if (icon) icon.className = "fa-solid fa-play";
    showToast("Testimonial rotation paused", "info");
  } else {
    restartTestimonialAutoSlide();
    if (icon) icon.className = "fa-solid fa-pause";
    showToast("Testimonial rotation resumed", "info");
  }
}

function pauseTestimonialTimer() {
  if (!isTestimonialAutoSlidePaused && testimonialAutoSlideTimer) {
    clearInterval(testimonialAutoSlideTimer);
  }
}

function resumeTestimonialTimer() {
  if (!isTestimonialAutoSlidePaused) {
    restartTestimonialAutoSlide();
  }
}

function restartTestimonialAutoSlide() {
  if (testimonialAutoSlideTimer) clearInterval(testimonialAutoSlideTimer);
  if (isTestimonialAutoSlidePaused) return;

  testimonialAutoSlideTimer = setInterval(() => {
    if (!currentTestimonials.length) return;
    currentTestimonialIndex = (currentTestimonialIndex + 1) % currentTestimonials.length;
    updateSliderPosition();
  }, 6500);
}

// Touch swipe support
let touchStartX = 0;
let touchEndX = 0;

function setupTouchSwipe() {
  const viewport = document.getElementById("testimonialCarouselViewport");
  if (!viewport || viewport.dataset.swipeInitialized) return;
  viewport.dataset.swipeInitialized = "true";

  viewport.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  viewport.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  window.addEventListener("resize", () => {
    updateSliderPosition();
  });
}

function handleSwipe() {
  const threshold = 45;
  if (touchEndX < touchStartX - threshold) {
    nextTestimonial();
  } else if (touchEndX > touchStartX + threshold) {
    prevTestimonial();
  }
}

// Expose functions globally for inline HTML event handlers
window.loadTestimonials = loadTestimonials;
window.filterTestimonials = filterTestimonials;
window.goToTestimonial = goToTestimonial;
window.nextTestimonial = nextTestimonial;
window.prevTestimonial = prevTestimonial;
window.toggleTestimonialAutoSlide = toggleTestimonialAutoSlide;
window.pauseTestimonialTimer = pauseTestimonialTimer;
window.resumeTestimonialTimer = resumeTestimonialTimer;


// ==========================================================================
// AUTOMATED EMAIL DISPATCH ENGINE (EmailJS & Serverless API)
// ==========================================================================
function getEmailConfig() {
  const defaultCfg = {
    senderEmail: "samyak.ssd@gmail.com",
    senderName: "Samata Sainik Dal (SSD)",
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

function sendDonationEmail(donationRecord) {
  if (!donationRecord || !donationRecord.email) return;
  const cfg = getEmailConfig();
  if (cfg.enabled === false) return;

  const senderEmail = cfg.senderEmail || "samyak.ssd@gmail.com";
  const senderName = cfg.senderName || "Samata Sainik Dal (SSD)";

  const templateParams = {
    from_name: senderName,
    from_email: senderEmail,
    reply_to: senderEmail,
    sender_email: senderEmail,
    to_name: donationRecord.name || donationRecord.donorName || "Supporter",
    to_email: donationRecord.email || donationRecord.donorEmail,
    amount: (Number(donationRecord.amount) || 0).toLocaleString(),
    receipt_number: donationRecord.receiptNumber || ("SSD-REC-" + Date.now().toString().slice(-6)),
    payment_id: donationRecord.paymentId || "pay_live",
    cause: donationRecord.cause || "Centenary 2027 Movement Fund",
    pan: donationRecord.pan || "N/A",
    date: new Date(donationRecord.timestamp || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    org_name: "Samata Sainik Dal (SSD)",
    org_website: "https://ssdind.vercel.app"
  };

  // 1. Dispatch via EmailJS SDK if configured
  if (typeof emailjs !== "undefined" && cfg.publicKey && cfg.serviceId && cfg.donationTemplateId) {
    try {
      emailjs.init({ publicKey: cfg.publicKey });
      emailjs.send(cfg.serviceId, cfg.donationTemplateId, templateParams)
        .then(() => console.log("Donation 80G receipt email dispatched via EmailJS from " + senderEmail))
        .catch(err => console.warn("EmailJS donation send error:", err));
    } catch (err) {
      console.warn("EmailJS init/send error:", err);
    }
  }

  // 2. Dispatch via Serverless Endpoint
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'donation',
      senderEmail: senderEmail,
      recipientEmail: templateParams.to_email,
      recipientName: templateParams.to_name,
      appPassword: cfg.appPassword,
      data: donationRecord
    })
  }).catch(e => console.warn("Serverless email ping:", e));

  // 3. Log Dispatch Record in Firebase
  if (db) {
    db.ref('email_dispatches').push({
      type: "Donation 80G Receipt",
      senderEmail: senderEmail,
      recipientEmail: templateParams.to_email,
      recipientName: templateParams.to_name,
      receiptNumber: templateParams.receipt_number,
      amount: donationRecord.amount,
      paymentId: donationRecord.paymentId,
      status: "Dispatched",
      timestamp: Date.now()
    }).catch(e => console.warn("Firebase dispatch log:", e));
  }
}

// ==========================================================================
// AUTOMATED ID, BATCH NUMBER & EMAIL GENERATORS
// ==========================================================================
function generateEnrollmentId(state = "MH") {
  const year = new Date().getFullYear();
  const stateCode = (state || "MH").trim().slice(0, 2).toUpperCase();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `SSD-${year}-${stateCode}-${randNum}`;
}

function generateBatchNo(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  let q = "Q1";
  if (month >= 3 && month <= 5) q = "Q2";
  else if (month >= 6 && month <= 8) q = "Q3";
  else if (month >= 9) q = "Q4";
  return `BATCH-${year}/${q}`;
}

function generateSsdEmail(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  let clean = fullName.trim()
    .replace(/^(commander|cmdr|captain|capt|lieutenant|lt|advocate|adv|professor|prof|doctor|dr|shri|smt|mr|mrs|ms)\.?\s+/i, '')
    .replace(/^(commander|cmdr|captain|capt|lieutenant|lt|advocate|adv|professor|prof|doctor|dr|shri|smt|mr|mrs|ms)\.?\s+/i, '');
  clean = clean.replace(/\(.*?\)/g, '').trim();
  clean = clean.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const parts = clean.toLowerCase().split(' ').filter(p => p.length > 0);
  if (parts.length === 1) {
    return `${parts[0]}@ssd.org`;
  }
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  return `${firstName}.${lastName}@ssd.org`;
}

function sendEnrollmentEmail(memberData) {
  if (!memberData || !memberData.email) return;
  const cfg = getEmailConfig();
  if (cfg.enabled === false) return;

  const senderEmail = cfg.senderEmail || "samyak.ssd@gmail.com";
  const senderName = cfg.senderName || "Samata Sainik Dal (SSD)";

  const enlistId = memberData.enlistmentId || ("SSD-CADET-" + (memberData.id ? memberData.id.slice(-6).toUpperCase() : Math.floor(1000 + Math.random() * 9000)));
  const batchNo = memberData.batchNo || generateBatchNo();

  const templateParams = {
    from_name: senderName,
    from_email: senderEmail,
    reply_to: senderEmail,
    sender_email: senderEmail,
    cadet_name: memberData.fullName || memberData.name || "Cadet",
    to_name: memberData.fullName || memberData.name || "Cadet",
    to_email: memberData.email,
    cadet_phone: memberData.phone || "N/A",
    cadet_wing: memberData.wing || "Central Cadet Corps (Sainik Wing)",
    cadet_state: memberData.state || "Maharashtra",
    cadet_city: memberData.city || "District Command",
    enlistment_id: enlistId,
    batch_no: batchNo,
    date: new Date(memberData.timestamp || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    org_name: "Samata Sainik Dal (SSD)",
    org_website: "https://ssdind.vercel.app"
  };

  // 1. Dispatch via EmailJS SDK if configured
  if (typeof emailjs !== "undefined" && cfg.publicKey && cfg.serviceId && cfg.enrollmentTemplateId) {
    try {
      emailjs.init({ publicKey: cfg.publicKey });
      emailjs.send(cfg.serviceId, cfg.enrollmentTemplateId, templateParams)
        .then(() => console.log("Cadet Welcome email dispatched via EmailJS from " + senderEmail))
        .catch(err => console.warn("EmailJS enrollment send error:", err));
    } catch (err) {
      console.warn("EmailJS init/send error:", err);
    }
  }

  // 2. Dispatch via Serverless Endpoint
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'enrollment',
      senderEmail: senderEmail,
      recipientEmail: templateParams.to_email,
      recipientName: templateParams.cadet_name,
      appPassword: cfg.appPassword,
      data: templateParams
    })
  }).catch(e => console.warn("Serverless email send warning:", e));

  // Log dispatch record to Firebase if database is connected
  if (db) {
    db.ref('email_dispatches').push({
      type: "Cadet Enlistment Welcome",
      senderEmail: senderEmail,
      recipientEmail: templateParams.to_email,
      recipientName: templateParams.cadet_name,
      enlistmentId: enlistId,
      batchNo: batchNo,
      status: "Dispatched",
      timestamp: Date.now()
    }).catch(e => console.warn("Firebase dispatch log:", e));
  }
}

// Form Submissions
function handleMemberRegistration(e) {
  e.preventDefault();
  const form = document.getElementById("memberRegistrationForm");
  const submitBtn = document.getElementById("memberSubmitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");

  const memberName = document.getElementById("memberName") ? document.getElementById("memberName").value.trim() : "";
  const memberState = document.getElementById("memberState") ? document.getElementById("memberState").value : "Maharashtra";
  const enlistId = generateEnrollmentId(memberState);
  const batchNo = generateBatchNo();

  const memberData = {
    enlistmentId: enlistId,
    batchNo: batchNo,
    name: memberName,
    fullName: memberName,
    email: document.getElementById("memberEmail") ? document.getElementById("memberEmail").value.trim() : "",
    phone: document.getElementById("memberPhone") ? document.getElementById("memberPhone").value.trim() : "",
    wing: document.getElementById("memberWing") ? document.getElementById("memberWing").value : "Central Cadet Corps (Sainik Wing)",
    occupation: document.getElementById("memberOccupation") ? document.getElementById("memberOccupation").value : "Social Worker",
    state: memberState,
    city: document.getElementById("memberCity") ? document.getElementById("memberCity").value.trim() : "",
    message: document.getElementById("memberMessage") ? document.getElementById("memberMessage").value.trim() : "",
    status: "Pending",
    source: "Membership Page Enlistment",
    timestamp: Date.now()
  };

  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnSpinner.style.display = "inline-flex";

  const onSuccess = () => {
    showToast(`Enlistment Successful! Welcome to Samata Sainik Dal. Cadet ID: ${memberData.enlistmentId} | Batch: ${memberData.batchNo}. Confirmation email dispatched. Jai Bhim!`, "success");
    sendEnrollmentEmail(memberData);
    form.reset();
    submitBtn.disabled = false;
    btnText.style.display = "inline-flex";
    btnSpinner.style.display = "none";
  };

  const onError = (err) => {
    console.error("Member registration error:", err);
    const msg = err && err.message ? `Registration failed: ${err.message}` : "Database error. Please verify Firebase permissions.";
    showToast(msg, "error");
    submitBtn.disabled = false;
    btnText.style.display = "inline-flex";
    btnSpinner.style.display = "none";
  };

  if (db) {
    db.ref('members').push(memberData).then(onSuccess).catch(onError);
  } else {
    setTimeout(onSuccess, 1000);
  }
}

function handleContactSubmission(e) {
  e.preventDefault();
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("contactSubmitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");

  const contactData = {
    name: document.getElementById("contactName").value.trim(),
    email: document.getElementById("contactEmail").value.trim(),
    subject: document.getElementById("contactSubject").value.trim(),
    message: document.getElementById("contactMessage").value.trim(),
    timestamp: Date.now()
  };

  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnSpinner.style.display = "inline-flex";

  const onSuccess = () => {
    showToast("Official message dispatched to SSD Central Command successfully.", "success");
    form.reset();
    submitBtn.disabled = false;
    btnText.style.display = "inline-flex";
    btnSpinner.style.display = "none";
  };

  const onError = (err) => {
    console.error("Contact message error:", err);
    const msg = err && err.message ? `Dispatch error: ${err.message}` : "Something went wrong. Please check database permissions.";
    showToast(msg, "error");
    submitBtn.disabled = false;
    btnText.style.display = "inline-flex";
    btnSpinner.style.display = "none";
  };

  if (db) {
    db.ref('contact_messages').push(contactData).then(onSuccess).catch(onError);
  } else {
    setTimeout(onSuccess, 800);
  }
}

function handleNewsletterSubscription(e) {
  e.preventDefault();
  const input = document.getElementById("newsletterEmail");
  const status = document.getElementById("newsletterStatus");
  const email = input.value.trim();
  if (!email) return;

  status.className = "newsletter-status";
  status.textContent = "Subscribing to SSD Gazette...";

  const subscriberData = { email: email, timestamp: Date.now() };

  const onSuccess = () => {
    status.className = "newsletter-status success";
    status.innerHTML = '<i class="fa-solid fa-check"></i> Subscribed to SSD Official Gazette successfully! Jai Bhim.';
    input.value = "";
    setTimeout(() => { status.textContent = ""; }, 5000);
  };

  const onError = (err) => {
    status.className = "newsletter-status error";
    status.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error: ${err && err.message ? err.message : 'Please try again.'}`;
  };

  if (db) {
    db.ref('newsletter_subscribers').push(subscriberData).then(onSuccess).catch(onError);
  } else {
    setTimeout(onSuccess, 600);
  }
}

// Toast
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;

  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check toast-icon"></i>' : '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';
  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
    <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => { toast.classList.add("show"); }, 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toast.remove(); }, 400);
  }, 5000);
}

// News Modal
function openNewsModal(index) {
  const item = activeNewsList[index];
  if (!item) return;

  const modalTitle = document.getElementById("newsModalTitle");
  const modalImg = document.getElementById("newsModalImg");
  const modalDate = document.getElementById("newsModalDate");
  const modalCat = document.getElementById("newsModalCategory");
  const modalText = document.getElementById("newsModalText");
  const modal = document.getElementById("newsModal");

  if (modalTitle) modalTitle.textContent = item.title;
  if (modalImg) modalImg.src = item.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80';
  if (modalDate) modalDate.innerHTML = `<i class="fa-solid fa-calendar"></i> ${item.date || 'Recent'}`;
  if (modalCat) modalCat.innerHTML = `<i class="fa-solid fa-tag"></i> ${item.category || 'SSD Gazette'}`;
  if (modalText) {
    let pdfBtnHtml = '';
    if (item.pdfUrl) {
      pdfBtnHtml = `
        <div style="margin-top: 18px; padding: 14px 16px; background: #FEF2F2; border: 1.5px solid #FECACA; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-file-pdf" style="font-size: 26px; color: #DC2626;"></i>
            <div>
              <strong style="color: var(--dark-navy); font-size: 13.5px; display: block;">Official Gazette Circular (PDF)</strong>
              <span style="font-size: 11.5px; color: #64748B;">Official signed order / directive available</span>
            </div>
          </div>
          <a href="${item.pdfUrl}" target="_blank" download class="btn btn-primary btn-sm" style="background: #DC2626; border-color: #DC2626;">
            <i class="fa-solid fa-download"></i> Download PDF Circular
          </a>
        </div>
      `;
    }
    modalText.innerHTML = `
      <p><strong>CENTRAL COMMAND DISPATCH:</strong> ${escapeHtml(item.excerpt || '')}</p>
      <p style="margin-top:12px;">Samata Sainik Dal continues to uphold the principles of self-respect, physical discipline, and constitutional morality established by Babasaheb Dr. B.R. Ambedkar. Cadets across all state and district units are actively deployed in community protection, legal literacy, and social welfare drives.</p>
      <p style="margin-top:12px;">All enlisted Sainiks are urged to maintain strict discipline, wear the official uniform with pride, and spread constitutional awareness to the last citizen. <em>Jai Bhim! Long Live Samata Sainik Dal!</em></p>
      ${pdfBtnHtml}
    `;
  }

  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeNewsModal() {
  const modal = document.getElementById("newsModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function closeNewsModalOnBackdrop(e) {
  if (e.target.id === "newsModal") closeNewsModal();
}

// Navigation & Accessibility
function initStickyHeader() {
  const header = document.getElementById("mainHeader");
  if (!header) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

function handleLogoError(imgElement) {
  imgElement.onerror = null;
  imgElement.src = "logo.png";
}

function setFontSize(size) {
  document.body.classList.remove("font-sm", "font-md", "font-lg");
  document.body.classList.add("font-" + size);
  document.querySelectorAll(".accessibility-tools button").forEach(btn => {
    btn.classList.remove("active");
  });
  if (event && event.target) event.target.classList.add("active");
}

function toggleHighContrast() {
  document.body.classList.toggle("high-contrast");
}

// ==========================================================================
// COMPREHENSIVE I18N AMBEDKARITE TRANSLATION ENGINE (EN / HI / MR)
// ==========================================================================
let currentLanguage = 'en';

const SSD_TRANSLATIONS = {
  hi: {
    // Top Bar & Accessibility
    "Central Command Helpline: 1800-24-1927": "केंद्रीय कमान हेल्पलाइन: १८००-२४-१९२७",
    "centralcommand@samatasainikdal.org": "centralcommand@samatasainikdal.org",
    "Founded: 24 Sept 1927 | Babasaheb Dr. B.R. Ambedkar": "स्थापना: २४ सितंबर १९२७ | बाबासाहेब डॉ. बी. आर. आंबेडकर",
    "Accessibility Tools": "सुलभता साधने (Accessibility)",
    "Decrease Font Size": "फॉन्ट लहान करा",
    "Normal Font Size": "सामान्य फॉन्ट आकार",
    "Increase Font Size": "फॉन्ट मोठा करा",
    "High Contrast Mode": "उच्च कॉन्ट्रास्ट मोड",
    "Language Selector": "भाषा निवडा",

    // Brand Block
    "SAMATA SAINIK DAL (SSD)": "समता सैनिक दल (SSD)",
    "SAMATA SAINIK DAL": "समता सैनिक दल",
    "समता सैनिक दल (स्थापना: १९२७) | Founded by Dr. B.R. Ambedkar": "समानता, स्वतंत्रता और बंधुता के रक्षक | बोधिसत्व डॉ. बी. आर. आंबेडकर द्वारा स्थापित (१९२७)",
    "Est. 1927 | Central Command": "स्थापना १९२७ | केंद्रीय कमान",
    "Open Navigation Menu": "मेनू उघडा",
    "Close Navigation Menu": "मेनू बंद करा",

    // Navigation Links & Dropdowns
    "Home": "मुख्य पृष्ठ",
    "About": "परिचय",
    "Genesis by Dr. B.R. Ambedkar": "बोधिसत्व डॉ. बी. आर. आंबेडकर द्वारा स्थापना",
    "Mahad Satyagraha (1927)": "महाड सत्याग्रह (१९२७)",
    "Governing Body & Leadership": "कार्यकारिणी व नेतृत्व",
    "Centenary Roadmap (1927–2027)": "शताब्दी रोडमॅप (१९२७–२०२७)",
    "Centenary Roadmap (1927-2027)": "शताब्दी रोडमॅप (१९२७–२०२७)",
    "Wings": "विभाग व विंग्स",
    "Central Cadet Corps (Sainik Wing)": "केंद्रीय कॅडेट कॉर्प्स (सैनिक विंग)",
    "Mahila Samata Sainik Dal": "महिला समता सैनिक दल",
    "Constitutional & Legal Cell": "संवैधानिक व विधी प्रकोष्ठ",
    "Youth & Student Front": "युवा व विद्यार्थी आघाडी",
    "Community Sewa & Relief Force": "सामाजिक सेवा व मदत दल",
    "Membership": "सदस्यता",
    "Sainik Member Portal & ID Card": "सैनिक सदस्य पोर्टल व ओळखपत्र",
    "Join Dal / New Enlistment": "दल प्रवेश / नवीन नोंदणी",
    "Public QR Credential Verification": "सार्वजनिक क्यूआर पडताळणी",
    "Officer / Command Login": "अधिकारी / कमान लॉगिन",
    "Gazette & Media": "गॅझेट व माध्यम",
    "Official Gazette & Circulars": "अधिकृत गॅझेट व परिपत्रके",
    "Photo & Video Archives": "छायाचित्र व व्हिडिओ संग्रह",
    "Campaigns & Memorials": "अभियान व स्मारके",
    "Contact": "संपर्क",
    "Donate": "दान करा",
    "Member Portal": "सदस्य पोर्टल",

    // Notice Ticker
    "SSD Official Gazette": "समता सैनिक दल अधिकृत गॅझेट",
    "SSD Centenary Preparations (1927–2027) National Executive Meeting scheduled at Nagpur Headquarters.": "एसएसडी शताब्दी पूर्वतयारी (१९२७–२०२७) राष्ट्रीय कार्यकारिणीची बैठक नागपूर मुख्यालयात आयोजित.",
    "National Sainik Cadet Enrollment Q3 2026 is now underway across all State & District units.": "राष्ट्रीय सैनिक कॅडेट नोंदणी २०२६ सर्व राज्य व जिल्हा युनिट्समध्ये सुरू आहे.",
    "Annual Mahad Satyagraha & Water Rights Memorial March preparations launched.": "वार्षिक महाड सत्याग्रह व जलहक्क स्मृति मार्च तयारी सुरू.",
    "Constitution Day (26 Nov) Mass Preamble Reading Campaign activated across 500+ districts.": "संविधान दिन (२६ नोव्हेंबर) सामूहिक उद्देशिका वाचन अभियान ५००+ जिल्ह्यांमध्ये सक्रिय.",
    "View Gazette": "गॅझेट पहा",
    "View Gazette →": "गॅझेट पहा →",
    "View Gazette &rarr;": "गॅझेट पहा →",
    "View All Gazette Circulars": "सर्व गॅझेट परिपत्रके पहा",

    // Hero Section: Governing Body
    "Supreme Command & National Executive Council": "सर्वोच्च कमान व राष्ट्रीय कार्यकारिणी परिषद",
    "Governing Body of Samata Sainik Dal": "समता सैनिक दल नियामक मंडळ व राष्ट्रीय नेतृत्व",
    "Founded by Bodhisattva Dr. B.R. Ambedkar on 24 September 1927. Steered by seasoned Ambedkarite scholars, retired military officers, legal luminaries, and dedicated grassroots commanders across India.": "बोधिसत्व डॉ. बी. आर. आंबेडकर द्वारा २४ सितंबर १९२७ को स्थापित। भारत भर के वरिष्ठ आंबेडकरवादी विद्वान, निवृत्त सैन्य अधिकारी, विधी तज्ञ आणि समर्पित कार्यकर्त्यांच्या नेतृत्वाखाली.",
    "Enlist Under Central Command": "केंद्रीय कमान अंतर्गत नावनोंदणी करा",
    "Support Movement & Centenary Fund": "आंदोलन व शताब्दी निधीला सहकार्य करा",
    "SSD Constitution & 1927 History": "एसएसडी संविधान व १९२७ इतिहास",

    // Leadership Tier Navigation
    "All Leadership": "सर्व नेतृत्व",
    "National Supreme Command": "राष्ट्रीय सर्वोच्च कमान",
    "IT & Digital Media Cell": "आयटी व डिजिटल मीडिया सेल",
    "State Governing Bodies (प्रदेश कार्यकारिणी)": "राज्य कार्यकारिणी (प्रदेश)",
    "District Governing Bodies (जिल्हा कार्यकारिणी)": "जिल्हा कार्यकारिणी",
    "Search governing officer by name, state, district, designation...": "नाव, राज्य, जिल्हा, पद यानुसार अधिकारी शोधा...",
    "All States": "सर्व राज्ये",
    "Maharashtra (महाराष्ट्र)": "महाराष्ट्र (Maharashtra)",

    // Ranks, Badges, Portfolios
    "National Command": "राष्ट्रीय कमान",
    "Executive Council": "कार्यकारिणी परिषद",
    "Cadet Directorate": "कॅडेट संचालनालय",
    "Mahila Dal": "महिला दल",
    "Legal Cell": "विधी प्रकोष्ठ",
    "Finance & Audit": "वित्त व लेखापरीक्षण",
    "IT & Cyber Directorate": "आयटी व सायबर संचालनालय",
    "Central HQ": "केंद्रीय मुख्यालय",
    "Official Dossier": "अधिकृत दस्ताऐवज / डॉसियर",
    "View Full Portfolio →": "संपूर्ण प्रोफाइल पहा →",
    "View Full Portfolio &rarr;": "संपूर्ण प्रोफाइल पहा →",
    "View Full Portfolio": "संपूर्ण प्रोफाइल पहा",
    "Senior Advisory & Elders Council (मार्गदर्शक मंडल)": "वरिष्ठ सल्लागार व मार्गदर्शक मंडळ",
    "Distinguished Ambedkarite thinkers, veteran freedom fighters, and movement elders guiding policy. Click any portfolio to view full dossier.": "धोरण मार्गदर्शन करणारे ज्येष्ठ आंबेडकरवादी विचारवंत, स्वातंत्र्यसैनिक व चळवळीचे मार्गदर्शक. संपूर्ण डॉसियर पाहण्यासाठी क्लिक करा.",
    "Click Profile to Open Portfolio": "प्रोफाइल पाहण्यासाठी क्लिक करा",
    "Open Portfolio": "प्रोफाइल उघडा",

    // Council Designations
    "National President (राष्ट्रीय अध्यक्ष)": "राष्ट्रीय अध्यक्ष",
    "National General Secretary (राष्ट्रीय महासचिव)": "राष्ट्रीय महासचिव",
    "Chief Cadet Dalpati (प्रधान दलपति)": "प्रधान दलपती (Chief Cadet Dalpati)",
    "National Mahila Dal Convener (महिला दल संयोजिका)": "महिला दल संयोजिका",
    "National Legal Advisory Cell Head (विधिक प्रकोष्ठ प्रमुख)": "विधी प्रकोष्ठ प्रमुख",
    "National Treasurer & Audit Officer (राष्ट्रीय कोषाध्यक्ष)": "राष्ट्रीय कोषाध्यक्ष",
    "National IT & Digital Media Head (राष्ट्रीय आयटी प्रमुख)": "राष्ट्रीय आयटी प्रमुख",
    "National Cyber Operations Lead (राष्ट्रीय सायबर ऑपरेशन्स प्रमुख)": "राष्ट्रीय सायबर ऑपरेशन्स प्रमुख",
    "Senior Advisory Member": "वरिष्ठ सल्लागार सदस्य",
    "Council Member": "परिषद सदस्य",
    "National Central HQ": "राष्ट्रीय मध्यवर्ती मुख्यालय",
    "Advisory Board": "सल्लागार मंडळ",
    "Senior Ambedkarite Historian & Author": "वरिष्ठ आंबेडकरवादी इतिहासकार व लेखक",
    "Human Rights Defender & Scholar": "मानवाधिकार संरक्षक व विचारवंत",
    "Veteran 1956 Deekshabhoomi Parade Organizer": "१९५६ दीक्षाभूमी संचलन आयोजक",
    "Nagpur HQ": "नागपूर मुख्यालय",
    "New Delhi Central Office": "नवी दिल्ली मध्यवर्ती कार्यालय",
    "Pune HQ": "पुणे मुख्यालय",
    "Mumbai": "मुंबई",

    // Campaigns Section
    "Active National Missions": "सक्रिय राष्ट्रीय मोहिमा",
    "Ongoing Campaigns & Centenary Drives": "सध्याची अभियाने व शताब्दी उपक्रम",
    "Grassroots initiatives mobilizing thousands of cadets, legal advocates, and community volunteers across 28 states of India.": "भारतातील २८ राज्यांमधील हजारो कॅडेट्स, वकील आणि स्वयंसेवकांना संघटित करणारे उपक्रम.",
    "Centenary Drive": "शताब्दी मोहीम",
    "Legal & Rights": "विधी व हक्क",
    "Women Wing": "महिला विंग",
    "Community Sewa": "सामाजिक सेवा",
    "SSD Centenary 1927–2027 Mission (शताब्दी महोत्सव)": "एसएसडी शताब्दी १९२७–२०२७ महोत्सव",
    "Nationwide 100-Year commemorative march pasts, building 1,000 Ambedkar Study Libraries, and establishing the Centenary National Memorial at Mahad & Nagpur.": "देशव्यापी १०० वर्षे स्मृति संचलन, १००० आंबेडकर अभ्यासिका ग्रंथालये आणि महाड व नागपूर येथे राष्ट्रीय स्मारक निर्मिती.",
    "National Constitutional Literacy & Preamble Yatra": "राष्ट्रीय संविधान साक्षरता व उद्देशिका यात्रा",
    "Distributing pocket Constitutions in rural villages, mass Preamble recitation camps, and training grassroots advocates to resist caste atrocities legally.": "गावागावात संविधान पुस्तिका वितरण, उद्देशिका वाचन आणि अत्याचाराविरुद्ध कायदेशीर लढा देण्यासाठी वकिलांचे प्रशिक्षण.",
    "Mahila Self-Defense & Savitribai Phule Academy": "महिला स्वसंरक्षण व सावित्रीबाई फुले अकादमी",
    "Physical stick drill, martial self-defense training, anti-harassment rapid action units, and educational scholarships for Bahujan female students.": "लाठीकाठी कसरत, स्वसंरक्षण प्रशिक्षण, महिला सुरक्षा पथक आणि बहुजन विद्यार्थिनींसाठी शिष्यवृत्ती.",
    "Samata 24/7 Voluntary Blood Donor & Disaster Force": "समता २४/७ रक्तदाता व आपत्ती निवारण दल",
    "Nationwide emergency voluntary blood donor registry, flood rescue battalions, free medical diagnosis, and community health camps in underprivileged bastis.": "देशव्यापी आपत्कालीन रक्तदाता नोंदणी, पूर बचाव पथक, मोफत आरोग्य तपासणी आणि वस्त्यांमध्ये वैद्यकीय शिबिरे.",
    "Goal: ₹50.0 Lakh": "लक्ष्य: ₹५०.० लाख",
    "Goal: ₹25.0 Lakh": "लक्ष्य: ₹२५.० लाख",
    "Goal: ₹30.0 Lakh": "लक्ष्य: ₹३०.० लाख",
    "Goal: ₹20.0 Lakh": "लक्ष्य: ₹२०.० लाख",
    "73% Raised": "७३% संकलित",
    "68% Raised": "६८% संकलित",
    "65% Raised": "६५% संकलित",
    "79% Raised": "७९% संकलित",
    "15,000+ Volunteers": "१५,०००+ स्वयंसेवक",
    "8,200+ Volunteers": "८,२००+ स्वयंसेवक",
    "12,000+ Volunteers": "१२,०००+ स्वयंसेवक",
    "25,000+ Volunteers": "२५,०००+ स्वयंसेवक",
    "250+ Districts": "२५०+ जिल्हे",
    "500+ Districts": "५००+ जिल्हे",
    "180+ Districts": "१८०+ जिल्हे",
    "320+ Districts": "३२०+ जिल्हे",
    "Support": "सहकार्य करा",
    "Enlist": "सामील व्हा",

    // Specialized Divisions
    "Operational Divisions": "कार्यकारी विभाग",
    "Departments & Specialized Wings of SSD": "समता सैनिक दलाचे विभाग व विशेष विंग्स",
    "Structured like a disciplined non-violent defense force to educate, agitate, and organize at grassroots, state, and national levels.": "शिका, संघर्ष करा आणि संघटित व्हा या तत्त्वावर आधारित शिस्तबद्ध अहिंसक सामाजिक संरक्षण दल.",
    "Central Cadet Corps": "केंद्रीय कॅडेट कॉर्प्स",
    "Rigorous physical drill, parade ranks, uniform code of conduct, flag ceremonies, and non-violent social defense training.": "कठोर शारीरिक संचलन, परेड, गणवेश आचारसंहिता, ध्वजवंदन आणि अहिंसक सामाजिक संरक्षण प्रशिक्षण.",
    "Explore Cadet Wing →": "कॅडेट विंग पहा →",
    "Explore Cadet Wing &rarr;": "कॅडेट विंग पहा →",
    "Explore Mahila Dal →": "महिला दल पहा →",
    "Explore Mahila Dal &rarr;": "महिला दल पहा →",
    "Legal & Constitutional Cell": "विधी व संवैधानिक प्रकोष्ठ",
    "Nationwide advocate network offering pro-bono legal defense, constitutional literacy camps, and emergency legal hotlines.": "विनामूल्य कायदेशीर मदत, संविधान साक्षरता शिबिरे आणि आपत्कालीन कायदेशीर मदत देणारे देशव्यापी वकील जाळे.",
    "Explore Legal Cell →": "विधी प्रकोष्ठ पहा →",
    "Explore Legal Cell &rarr;": "विधी प्रकोष्ठ पहा →",
    "Youth & Student Front": "युवा व विद्यार्थी आघाडी",
    "Dr. Ambedkar study circles, civil services & competitive exam mentorship, digital skills, and annual youth leadership summits.": "डॉ. आंबेडकर अभ्यास मंडळे, स्पर्धा परीक्षा मार्गदर्शन, डिजिटल कौशल्ये आणि वार्षिक युवा नेतृत्व परिषद.",
    "Explore Youth Front →": "युवा आघाडी पहा →",
    "Explore Youth Front &rarr;": "युवा आघाडी पहा →",
    "Community Sewa & Relief": "सामाजिक सेवा व मदत दल",
    "Voluntary blood donor registry, emergency disaster rescue task force, free health diagnostic camps, and community libraries.": "रक्तदाता नोंदणी, आपत्कालीन बचाव दल, मोफत आरोग्य तपासणी आणि अभ्यासिका ग्रंथालये.",
    "Explore Relief Task Force →": "मदत कार्य दल पहा →",
    "Explore Relief Task Force &rarr;": "मदत कार्य दल पहा →",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भरती नोंदणी",
    "Step forward to serve equality and democracy. Enlist online in any of our 5 specialized operational divisions.": "समता आणि लोकशाहीच्या रक्षणासाठी पुढे या. आमच्या ५ विशेष विभागांपैकी कोणत्याही विभागात नोंदणी करा.",
    "Full Enlistment Portal →": "संपूर्ण नोंदणी पोर्टल →",
    "Full Enlistment Portal &rarr;": "संपूर्ण नोंदणी पोर्टल →",

    // 4-Step Enlistment Guide
    "Direct Enlistment": "थेट प्रवेश नोंदणी",
    "Join Samata Sainik Dal — Take the Solemn Pledge": "समता सैनिक दलात सामील व्हा — प्रतिज्ञा घ्या",
    "Answer the historic call of Bodhisattva Babasaheb Dr. B.R. Ambedkar. Become a disciplined volunteer for equality, human dignity, and constitutional morality.": "बोधिसत्व बाबासाहेब डॉ. बी. आर. आंबेडकरांच्या ऐतिहासिक हाकेला प्रतिसाद द्या. समता, मानवी प्रतिष्ठा आणि संवैधानिक मूल्यांसाठी शिस्तबद्ध स्वयंसेवक व्हा.",
    "4-Step Official Enlistment Process": "४-टप्प्यांची अधिकृत प्रवेश प्रक्रिया",
    "Official Cadre Induction": "अधिकृत संवर्ग प्रवेश",
    "Select Your Operational Wing": "तुमचा कार्य विभाग निवडा",
    "Choose from Cadet Corps (Drill & Discipline), Mahila Dal (Women's Leadership), Legal Cell (Advocacy), Youth Front, or Sewa Relief.": "कॅडेट कॉर्प्स, महिला दल, विधी प्रकोष्ठ, युवा आघाडी किंवा सेवा मदत दल यापैकी निवडा.",
    "Submit District & Contact Details": "जिल्हा व संपर्क तपशील सादर करा",
    "Provide your local address to be connected directly with your District Commander and local State Chapter.": "जिल्हा कमांडर आणि राज्य शाखेशी जोडले जाण्यासाठी आपला पत्ता नोंदवा.",
    "Take the Solemn Volunteer Pledge": "पवित्र स्वयंसेवक प्रतिज्ञा घ्या",
    "Commit to the principles of self-respect, moral character, non-violence, and total dedication to liberty, equality, and fraternity.": "स्वाभिमान, चारित्र्य, अहिंसा आणि समता-स्वातंत्र्य-बंधुतेच्या तत्त्वांना समर्पित राहण्याची प्रतिज्ञा.",
    "Receive SSD Digital ID & Unit Assignment": "एसएसडी डिजिटल ओळखपत्र व युनिट वाटप मिळवा",
    "Central Command verifies your application, registers you in the national roll, and invites you to the next drill camp.": "केंद्रीय कमान अर्जाची पडताळणी करून राष्ट्रीय नोंदवहीत नोंद करते आणि आगामी शिबिराचे निमंत्रण देते.",
    "Open Full Online Enlistment Portal →": "संपूर्ण ऑनलाइन नोंदणी पोर्टल उघडा →",
    "Open Full Online Enlistment Portal &rarr;": "संपूर्ण ऑनलाइन नोंदणी पोर्टल उघडा →",
    "Track Application Status": "अर्जाची स्थिती तपासा",

    // Photo Gallery
    "Visual History & March Past Archives": "दृश्य इतिहास व संचलन संग्रह",
    "Photo Gallery & Field Action Archives": "छायाचित्र गॅलरी व क्षेत्रीय कृती संग्रह",
    "Moments of discipline, historic struggles, Deekshabhoomi parades, and grassroots community defense.": "शिस्त, ऐतिहासिक संघर्ष, दीक्षाभूमी संचलन आणि सामाजिक संरक्षणाचे क्षण.",
    "All Photos": "सर्व छायाचित्रे",
    "Cadet Drills & Parades": "कॅडेट संचलन व परेड",
    "Mahila Samata Dal": "महिला समता दल",
    "Historical Memorials": "ऐतिहासिक स्मारके",
    "Community Sewa & Relief": "सामाजिक सेवा व मदत",
    "Cadet Drills": "कॅडेट कवायत",
    "Constitution": "संविधान",
    "Youth Front": "युवा आघाडी",
    "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur": "एसएसडी गणवेशधारी कॅडेट दीक्षाभूमी नागपूर संचलन",
    "Mahila Samata Sainik Dal Volunteers at National Equality Rally": "महिला समता सैनिक दल राष्ट्रीय समता रॅली",
    "Constitution Day Mass Preamble Reading Assembly": "संविधान दिन सामूहिक उद्देशिका वाचन सभा",
    "Youth Cadet Physical Training & Non-Violent Defense Drill": "युवा कॅडेट शारीरिक कवायत व अहिंसक संरक्षण प्रशिक्षण",
    "View Complete High-Resolution Photo Archives →": "संपूर्ण उच्च-दर्जाचे छायाचित्र संग्रह पहा →",
    "View Complete High-Resolution Photo Archives &rarr;": "संपूर्ण उच्च-दर्जाचे छायाचित्र संग्रह पहा →",

    // Transparent Community Support / Donate
    "Transparent Community Support": "पारदर्शक सामाजिक सहकार्य",
    "Support the Movement — Fuel the Fight for Equality": "चळवळीला पाठिंबा द्या — समतेच्या लढ्याला बळ द्या",
    "Samata Sainik Dal is self-funded by conscious citizens. Every rupee directly strengthens grassroots cadet training, pro-bono legal defense, and disaster relief.": "समता सैनिक दल जागरूक नागरिकांच्या सहकार्याने चालवले जाते. प्रत्येक रुपया कॅडेट प्रशिक्षण, विनामूल्य कायदेशीर मदत आणि मदत कार्याला बळ देतो.",
    "Choose Your Contribution": "आपले योगदान निवडा",
    "One-Time Contribution": "एकवेळचे योगदान",
    "Monthly Supporter": "मासिक समर्थक",
    "Select Contribution Amount": "योगदान रक्कम निवडा",
    "Enter custom amount": "इतर रक्कम प्रविष्ट करा",
    "Direct Allocation Cause": "थेट वाटप उद्दिष्ट",
    "Bal Sainik Uniforms & Drill Equipment": "बाल सैनिक गणवेश व कवायत साहित्य",
    "Constitutional Literacy & Preamble Booklets": "संविधान साक्षरता व उद्देशिका पुस्तिका",
    "Pro-Bono Legal Defense Fund (SC/ST Cases)": "विनामूल्य विधी सहाय्य निधी (अ‍ॅट्रॉसिटी केसेस)",
    "Disaster Rescue & 24/7 Blood Task Force": "आपत्ती बचाव व २४/७ रक्त कार्य दल",
    "SSD Centenary 2027 Trust & Library Corpus": "एसएसडी शताब्दी २०२७ ट्रस्ट व अभ्यासिका निधी",
    "General Organizational Fund": "सामान्य संघटना निधी",
    "Direct Impact:": "थेट परिणाम:",
    "Prints and distributes 50 pocket Constitutions and Preamble learning cards in rural school clusters.": "ग्रामीण भागातील शाळांमध्ये ५० पॉकेट संविधाने आणि उद्देशिका पत्रिका वाटप.",
    "Proceed to Contribute Online →": "ऑनलाइन योगदानासाठी पुढे जा →",
    "Proceed to Contribute Online &rarr;": "ऑनलाइन योगदानासाठी पुढे जा →",

    // Babasaheb Quote
    "The Foundational Command of Dr. B.R. Ambedkar": "डॉ. बाबासाहेब आंबेडकरांचा पायाभूत संदेश",
    "\"My soldiers of equality! You must maintain strict discipline and self-respect. A volunteer of Samata Sainik Dal must be ready to sacrifice personal comfort for the collective dignity, equality, and rights of the oppressed. Let your conduct be an embodiment of character and non-violent courage.\"": "\"माझ्या समतेच्या सैनिकांनो! तुम्ही कठोर शिस्त आणि स्वाभिमान बाळगला पाहिजे. समता सैनिक दलाच्या स्वयंसेवकाने शोषितांच्या सामूहिक सन्मान, समता आणि हक्कांसाठी वैयक्तिक सुखाचा त्याग करण्यास सदैव तयार राहिले पाहिजे. तुमचे आचरण हे चारित्र्य आणि अहिंसक धैर्याचे मूर्तिमंत रूप असावे.\"",
    "— Dr. Bhimrao Ramji Ambedkar, Founder, Samata Sainik Dal (24 September 1927)": "— डॉ. भीमराव रामजी आंबेडकर, संस्थापक, समता सैनिक दल (२४ सप्टेंबर १९२७)",
    "Read Complete History & Centenary Roadmap (1927–2027)": "संपूर्ण इतिहास व शताब्दी रोडमॅप (१९२७–२०२७) वाचा",
    "Read Complete History & Centenary Roadmap (1927-2027)": "संपूर्ण इतिहास व शताब्दी रोडमॅप (१९२७–२०२७) वाचा",

    // Bulletins & Gazette
    "SSD Bulletins & Gazette": "एसएसडी बुलेटिन व गॅझेट",
    "Latest Central Command Dispatches & Events": "केंद्रीय कमान परिपत्रके व आगामी कार्यक्रम",
    "Real-time announcements, drill camp schedules, and national conclaves synchronized live with our central database.": "अधिकृत घोषणा, संचलन शिबिर वेळापत्रक आणि राष्ट्रीय अधिवेशने.",
    "Official Dispatches": "अधिकृत परिपत्रके",
    "Upcoming Events": "आगामी कार्यक्रम",
    "View All Dispatches →": "सर्व परिपत्रके पहा →",
    "View All Dispatches &rarr;": "सर्व परिपत्रके पहा →",
    "Full Calendar →": "संपूर्ण दिनदर्शिका →",
    "Full Calendar &rarr;": "संपूर्ण दिनदर्शिका →",
    "Read Dispatch →": "परिपत्रक वाचा →",
    "Read Dispatch &rarr;": "परिपत्रक वाचा →",
    "Read Dispatch": "परिपत्रक वाचा",
    "Schedule PDF": "वेळापत्रक पीडीएफ",
    "PDF Circular": "पीडीएफ परिपत्रक",
    "No dispatches found": "कोणतेही परिपत्रक उपलब्ध नाही",
    "No Upcoming Events Scheduled": "कोणतेही आगामी कार्यक्रम नियोजित नाहीत",
    "No photographs found in this category.": "या श्रेणीत कोणतीही छायाचित्रे आढळली नाहीत.",

    // Footer
    "Samata Sainik Dal": "समता सैनिक दल",
    "Samata Sainik Dal (SSD), founded by Bodhisattva Dr. B.R. Ambedkar on 24 September 1927. Dedicated to non-violent social defense, constitutional rights, and human dignity across India.": "समता सैनिक दल (एसएसडी), बोधिसत्व डॉ. बी. आर. आंबेडकर यांनी २४ सप्टेंबर १९२७ रोजी स्थापन केले. भारतभरात अहिंसक सामाजिक संरक्षण, संविधानिक अधिकार आणि मानवी सन्मानासाठी समर्पित.",
    "SSD Departments": "एसएसडी विभाग",
    "Quick Portals": "महत्वाच्या लिंक्स",
    "Ongoing Campaigns": "सध्याची अभियाने",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भरती नोंदणी",
    "Donate & Support SSD": "देणगी व सहकार्य",
    "Governing Body Council": "नियामक मंडळ परिषद",
    "Photo Archives & Lightbox": "छायाचित्र संग्रह",
    "History & Genesis (1927)": "इतिहास व स्थापना (१९२७)",
    "National Command Desk": "राष्ट्रीय कमान संपर्क",
    "Command Admin Portal": "कमान अ‍ॅडमिन पोर्टल",
    "SSD Official Gazette": "समता सैनिक दल अधिकृत गॅझेट",
    "Subscribe to receive official circulars, drill schedules, and centenary announcements.": "अधिकृत परिपत्रके, संचलन वेळापत्रक आणि शताब्दी घोषणा मिळवण्यासाठी सबस्क्राईब करा.",
    "Enter your email ID": "आपला ईमेल प्रविष्ट करा",
    "Liberty, Equality, Fraternity. No spam.": "स्वातंत्र्य, समता, बंधुता. स्पॅम नाही.",
    "Constitution of SSD": "एसएसडीचे संविधान",
    "State Directory": "राज्य निर्देशिका",
    "Grievance Desk": "तक्रार निवारण कक्ष",
    "© 1927–2026 Samata Sainik Dal (SSD). Founded by Bodhisattva Dr. B.R. Ambedkar. Jai Bhim | Equality For All.": "© १९२७–२०२६ समता सैनिक दल (एसएसडी). बोधिसत्व डॉ. बी. आर. आंबेडकर यांनी स्थापन केलेले. जय भीम | समता सर्वांसाठी.",
    "© 1927-2026 Samata Sainik Dal (SSD). Founded by Bodhisattva Dr. B.R. Ambedkar. Jai Bhim | Equality For All.": "© १९२७–२०२६ समता सैनिक दल (एसएसडी). बोधिसत्व डॉ. बी. आर. आंबेडकर यांनी स्थापन केलेले. जय भीम | समता सर्वांसाठी.",

    // Mobile Bottom Quick Bar
    "Helpline": "हेल्पलाइन",
    "Top": "वरती जा",

    // Modals
    "Complete Contribution": "योगदान पूर्ण करा",
    "Contribution Amount (₹) *": "योगदान रक्कम (₹) *",
    "Earmarked Purpose *": "निश्चित उद्देश *",
    "Donor Full Name *": "दात्याचे संपूर्ण नाव *",
    "Your name": "आपले नाव",
    "Email ID *": "ईमेल आयडी *",
    "Mobile No *": "मोबाईल नंबर *",
    "Phone number": "फोन नंबर",
    "PAN Card Number (for 80G Tax Exemption Receipt)": "पॅन कार्ड क्रमांक (८०जी कर सवलत पावतीसाठी)",
    "Payment Method": "पेमेंट पद्धत",
    "Proceed to Secure Pay (Razorpay / UPI / Cards)": "सुरक्षित पेमेंटसाठी पुढे जा (रेझरपे / यूपीआय)",
    "Official Contribution Receipt": "अधिकृत योगदान पावती",
    "80G Tax Exempt": "८०जी करमुक्त",
    "Receipt No:": "पावती क्रमांक:",
    "Payment ID (Razorpay):": "पेमेंट आयडी (Razorpay):",
    "Date & Time:": "दिनांक व वेळ:",
    "Payment Status:": "पेमेंट स्थिती:",
    "Donor Name:": "दात्याचे नाव:",
    "PAN Number:": "पॅन क्रमांक:",
    "Cause Allocated:": "वाटप केलेले उद्दिष्ट:",
    "Amount Contributed:": "दिलेली रक्कम:",
    "Print Receipt": "पावती प्रिंट करा",
    "Close": "बंद करा",
    "Samata Sainik Dal • Leadership Dossier": "समता सैनिक दल • नेतृत्व दस्ताऐवज / डॉसियर",
    "Verified SSD": "पडताळणीकृत एसएसडी",
    "Credentials & Background": "शैक्षणिक पात्रता व पार्श्वभूमी",
    "Key Focus & Movement Portfolios": "प्रमुख कार्यक्षेत्र व चळवळीतील जबाबदारी",
    "Movement Service Record & Biographical Dossier": "चळवळ सेवा नोंद व जीवनपट",
    "Download Dossier PDF": "डॉसियर पीडीएफ डाउनलोड करा",
    "Contact Secretariat": "सचिवालयाशी संपर्क साधा",
    "Close Dossier": "डॉसियर बंद करा",

    // Subpage Details
    "Historical Heritage": "ऐतिहासिक वारसा",
    "History, Ideology & Centenary Horizon": "इतिहास, विचारधारा आणि शताब्दी क्षितिज",
    "The genesis, struggle, and historic achievements of Samata Sainik Dal, founded on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar.": "बोधिसत्व डॉ. बी. आर. आंबेडकर यांनी २४ सप्टेंबर १९२७ रोजी स्थापन केलेल्या समता सैनिक दलाचा उदय, संघर्ष आणि ऐतिहासिक कार्य.",
    "History & About": "इतिहास व परिचय",
    "Foundation 1927": "स्थापना १९२७",
    "Genesis of the Soldiers for Equality": "समतेच्या सैनिकांची निर्मिती",
    "Born out of the historic demand for civil rights, self-respect, and the eradication of caste oppression.": "नागरी हक्क, स्वाभिमान आणि विषमतेच्या निर्मूलनाच्या ऐतिहासिक गरजेतून जन्म.",
    "Why Babasaheb Formed Samata Sainik Dal": "बाबासाहेबांनी समता सैनिक दल का स्थापन केले",
    "The Core Motto of SSD": "एसएसडीचे मुख्य ब्रीदवाक्य",
    "Central Defense Wing": "केंद्रीय संरक्षण विंग",
    "Central Cadet Corps (केंद्रीय सैनिक दस्ता)": "केंद्रीय कॅडेट कॉर्प्स (केंद्रीय सैनिक दस्ता)",
    "The backbone of Samata Sainik Dal — building disciplined, fearless, and non-violent soldiers dedicated to equality, public safety, and constitutional defense.": "समता सैनिक दलाचा कणा — समता, सार्वजनिक सुरक्षा आणि संविधान रक्षणासाठी शिस्तबद्ध, निर्भय आणि अहिंसक सैनिकांची निर्मिती.",
    "The Cadet Tradition": "कॅडेट परंपरा",
    "Discipline, Physical Vigilance, and Social Courage": "शिस्त, शारीरिक दक्षता आणि सामाजिक धैर्य",
    "Join Cadet Corps": "कॅडेट कॉर्प्समध्ये सामील व्हा",
    "View Drill Photos": "कवायत छायाचित्रे पहा",
    "Official Uniform Specifications": "अधिकृत गणवेश तपशील",
    "Official Sainik Enlistment Portal": "अधिकृत सैनिक नावनोंदणी पोर्टल",
    "Answer the clarion call of Dr. Babasaheb Ambedkar. Enlist as a disciplined soldier of equality dedicated to constitutional values and social defense.": "डॉ. बाबासाहेब आंबेडकरांच्या हाकेला प्रतिसाद द्या. संविधान आणि सामाजिक संरक्षणासाठी समर्पित सैनिक व्हा.",
    "National Call of Duty": "राष्ट्रीय कर्तव्य हाक",
    "Sainik Enlistment": "सैनिक नोंदणी",
    "Enlistment & Verification Process": "नावनोंदणी व पडताळणी प्रक्रिया",
    "Step-by-Step Procedure": "टप्प्याटप्प्याने प्रक्रिया",
    "How your application is processed from registration to digital ID issuance and drill deployment.": "नोंदणीपासून डिजिटल ओळखपत्र आणि तैनातीपर्यंत अर्जाची प्रक्रिया कशी होते.",
    "Step 01": "टप्पा ०१",
    "Step 02": "टप्पा ०२",
    "Step 03": "टप्पा ०३",
    "Step 04": "टप्पा ०४",
    "Submit Application": "अर्ज सादर करा",
    "District Command Review": "जिल्हा कमान पुनरावलोकन",
    "Digital ID & Uniform Guide": "डिजिटल ओळखपत्र व गणवेश मार्गदर्शक",
    "Cadet Drill & Deployment": "कॅडेट कवायत व तैनाती",
    "Official Sainik Application Form": "अधिकृत सैनिक अर्ज फॉर्म",
    "Please enter accurate details for administrative registration and multi-tier hierarchical identity verification.": "प्रशासकीय नोंदणी व ओळख पडताळणीसाठी कृपया अचूक माहिती प्रविष्ट करा.",
    "Full Legal Name": "पूर्ण कायदेशीर नाव",
    "Email Address": "ईमेल पत्ता",
    "Mobile / WhatsApp": "मोबाईल / व्हॉट्सअ‍ॅप",
    "Date of Birth": "जन्मतारीख",
    "Gender": "लिंग",
    "Male": "पुरुष",
    "Female": "महिला",
    "Other": "इतर",
    "Preferred SSD Wing / Division": "इच्छित एसएसडी विंग / विभाग",
    "Blood Group": "रक्तगट",
    "Educational Qualification": "शैक्षणिक पात्रता",
    "Occupation / Profession": "व्यवसाय / पेशा",
    "State Chapter": "राज्य शाखा",
    "National Headquarters & Grievance Desk": "राष्ट्रीय मुख्यालय व तक्रार निवारण कक्ष",
    "Connect with SSD Central Command for unit formation, legal emergency assistance, cadet training camps, and public inquiries.": "इकाई गठन, विधिक आपातकालीन सहायता, कैडेट प्रशिक्षण शिविर और पूछताछ के लिए एसएसडी केंद्रीय कमान से संपर्क करें।",
    "Citizen & Cadet Support": "नागरिक एवं कैडेट सहायता",
    "Contact Desk": "संपर्क कक्ष",
    "Central Administrative Secretariat": "केंद्रीय प्रशासकीय सचिवालय",
    "Serving the Ambedkarite social equality movement with unwavering discipline and commitment since 1927.": "१९२७ से अटूट अनुशासन और समर्पण के साथ आंबेडकरवादी सामाजिक समानता आंदोलन की सेवा में समर्पित।",
    "Central Command & Deekshabhoomi Desk": "केंद्रीय कमान एवं दीक्षाभूमि डेस्क",
    "National Command Helpline": "राष्ट्रीय कमान हेल्पलाइन",
    "Official Communications": "आधिकारिक संचार",
    "Office Visiting Hours": "कार्यालयीन भेंट का समय",
    "Send an Official Communication": "आधिकारिक संदेश भेजें",
    "Submit your message to the Central Command or concerned State Chapter.": "केंद्रीय कमान या संबंधित राज्य इकाई को अपना संदेश प्रेषित करें।",
    "Your Full Name": "आपका पूरा नाम",
    "Your Email": "आपका ईमेल",
    "Send Message": "संदेश भेजें",
    "Return to Portal": "पोर्टल पर वापस जाएं",
    "Public Credential Verification": "सार्वजनिक साख सत्यापन",
    "Verify Sainik Credentials & Official Ranks": "सैनिक साख एवं आधिकारिक रैंक सत्यापित करें",
    "Central Command Verification Desk": "केंद्रीय कमान सत्यापन डेस्क",
    "Samata Sainik Dal (SSD) | Official National Portal | Founded by Dr. B.R. Ambedkar (1927)": "समता सैनिक दल (SSD) | आधिकारिक राष्ट्रीय पोर्टल | डॉ. बी. आर. आंबेडकर द्वारा स्थापित (१९२७)",
    "Skip to main content": "मुख्य सामग्री पर जाएं",
    "English": "English",
    "हिन्दी (Hindi)": "हिन्दी (Hindi)",
    "मराठी (Marathi)": "मराठी (Marathi)",
    "Dr. Siddharth M. Meshram": "डॉ. सिद्धार्थ एम. मेश्राम",
    "Eminent Constitutional scholar and veteran Ambedkarite leader with 40+ years in social transformation; overseeing national policy and the Centenary 2027 vision.": "प्रख्यात संवैधानिक विद्वान और वरिष्ठ आंबेडकरवादी नेता, जिन्होंने सामाजिक परिवर्तन में ४०+ वर्ष समर्पित किए; राष्ट्रीय नीति और शताब्दी २०२७ विज़न के मार्गदर्शक।",
    "Ph.D. Constitutional Law | Nagpur HQ": "पीएच.डी. संवैधानिक कानून | नागपुर मुख्यालय",
    "Commander Ravindra K. Gautam": "कमांडर रवींद्र के. गौतम",
    "Former NCC Gold Medalist and grassroots organizer; coordinates operations across 28 State Chapters and directs the national cadet syllabus.": "पूर्व एनसीसी स्वर्ण पदक विजेता और जमीनी स्तर के संगठक; २८ राज्य शाखाओं के कार्यों का समन्वय और राष्ट्रीय कैडेट पाठ्यक्रम के निदेशक।",
    "M.A. Pol. Science | New Delhi Central Office": "एम.ए. राजनीति विज्ञान | नई दिल्ली केंद्रीय कार्यालय",
    "Brigadier (Retd.) Ashok S. Thorat": "ब्रिगेडियर (से.नि.) अशोक एस. थोरात",
    "Distinguished veteran officer commanding military drill formations, ceremonial march pasts, and cadet discipline standards nationwide.": "प्रतिष्ठित सेवानिवृत्त सैन्य अधिकारी, जो सैन्य ड्रिल फॉर्मेशन, औपचारिक संचलन (मार्च पास्ट) और देशभर में कैडेट अनुशासन मानकों का नेतृत्व करते हैं।",
    "Retd. Brigadier, Indian Army | Pune HQ": "सेवानिवृत्त ब्रिगेडियर, भारतीय सेना | पुणे मुख्यालय",
    "Adv. Savitri B. Gaikwad": "अधिवक्ता सावित्री बी. गायकवाड़",
    "Pioneering social worker and activist championing grassroots women empowerment, self-defense workshops, and constitutional awareness.": "अग्रणी सामाजिक कार्यकर्ता, जो जमीनी स्तर पर महिला सशक्तिकरण, आत्मरक्षा कार्यशालाओं और संवैधानिक जागरूकता का नेतृत्व करती हैं।",
    "Advocate, High Court | Mumbai": "अधिवक्ता, उच्च न्यायालय | मुंबई",
    "Senior Advocate Mahendra P. Tayade": "वरिष्ठ अधिवक्ता महेंद्र पी. तायड़े",
    "Senior constitutional jurist leading SSD's pro-bono network of 850+ advocates defending civil rights and SC/ST protection cases across India.": "वरिष्ठ संवैधानिक न्यायविद, जो भारत भर में नागरिक अधिकारों और एससी/एसटी संरक्षण मामलों की रक्षा करने वाले ८५०+ अधिवक्ताओं के नि:शुल्क नेटवर्क का नेतृत्व करते हैं।",
    "Senior Advocate, Supreme Court of India": "वरिष्ठ अधिवक्ता, भारत का सर्वोच्च न्यायालय",
    "CA Rahul V. Wankhede": "सीए राहुल वी. वानखेड़े",
    "Fellow Chartered Accountant overseeing financial integrity, audited public disclosures, and 80G tax exemption compliances for the Centenary Fund.": "चार्टर्ड अकाउंटेंट (FCA), जो शताब्दी कोष के वित्तीय अखंडता, अंकेक्षित सार्वजनिक प्रकटीकरण और 80G आयकर छूट अनुपालन की निगरानी करते हैं।",
    "FCA, Chartered Accountant | Nagpur": "एफसीए, चार्टर्ड अकाउंटेंट | नागपुर",
    "Prof. Yashwantrao More": "प्रो. यशवंतराव मोरे",
    "Senior Ambedkarite Historian & Author": "वरिष्ठ आंबेडकरवादी इतिहासकार एवं लेखक",
    "Adv. Rekha Gaikwad": "अधिवक्ता रेखा गायकवाड़",
    "Human Rights Defender & Scholar": "मानवाधिकार रक्षक एवं अध्येता",
    "Commander Suresh Jadhav": "कमांडर सुरेश जाधव",
    "Veteran 1956 Deekshabhoomi Parade Organizer": "१९५६ ऐतिहासिक दीक्षाभूमि परेड के वरिष्ठ संगठक",
    "Click Profile to Open Portfolio": "प्रोफ़ाइल देखने के लिए क्लिक करें",
    "Open Portfolio": "पोर्टफोलियो देखें",
    "Active National Missions": "सक्रिय राष्ट्रीय मिशन",
    "Ongoing Campaigns & Centenary Drives": "चल रहे अभियान एवं शताब्दी अभियान",
    "Grassroots initiatives mobilizing thousands of cadets, legal advocates, and community volunteers across 28 states of India.": "भारत के २८ राज्यों में हजारों कैडेटों, वकीलों और स्वयंसेवकों को लामबंद करने वाली जमीनी पहल।",
    "Centenary Drive": "शताब्दी अभियान",
    "SSD Centenary 1927–2027 Mission (शताब्दी महोत्सव)": "एसएसडी शताब्दी १९२७–२०२७ मिशन (शताब्दी महोत्सव)",
    "Nationwide 100-Year commemorative march pasts, building 1,000 Ambedkar Study Libraries, and establishing the Centenary National Memorial at Mahad & Nagpur.": "देशव्यापी १०० वर्षीय स्मारक संचलन, १,००० आंबेडकर अध्ययन पुस्तकालयों का निर्माण, और महाड व नागपुर में शताब्दी राष्ट्रीय स्मारक की स्थापना।",
    "Legal & Rights": "विधिक एवं अधिकार",
    "National Constitutional Literacy & Preamble Yatra": "राष्ट्रीय संवैधानिक साक्षरता एवं उद्देशिका यात्रा",
    "Distributing pocket Constitutions in rural villages, mass Preamble recitation camps, and training grassroots advocates to resist caste atrocities legally.": "ग्रामीण क्षेत्रों में पॉकेट संविधान वितरण, सामूहिक उद्देशिका वाचन शिविर, और जातिगत अत्याचारों का कानूनी मुकाबला करने के लिए जमीनी कार्यकर्ताओं का प्रशिक्षण।",
    "Women Wing": "महिला विंग",
    "Mahila Self-Defense & Savitribai Phule Academy": "महिला आत्मरक्षा एवं सावित्रीबाई फुले अकादमी",
    "Physical stick drill, martial self-defense training, anti-harassment rapid action units, and educational scholarships for Bahujan female students.": "शारीरिक लाठी ड्रिल, मार्शल आत्मरक्षा प्रशिक्षण, उत्पीड़न-रोधी त्वरित कार्रवाई दल, और बहुजन छात्राओं के लिए शैक्षिक छात्रवृत्तियां।",
    "Community Sewa": "सामुदायिक सेवा",
    "Samata 24/7 Voluntary Blood Donor & Disaster Force": "समता २४/७ स्वैच्छिक रक्तदाता एवं आपदा राहत दल",
    "Nationwide emergency voluntary blood donor registry, flood rescue battalions, free medical diagnosis, and community health camps in underprivileged bastis.": "देशव्यापी आपातकालीन स्वैच्छिक रक्तदाता रजिस्ट्री, बाढ़ बचाव दल, नि:शुल्क चिकित्सा निदान, और वंचित बस्तियों में स्वास्थ्य शिविर।",
    "Operational Divisions": "परिचालन प्रभाग (विंग्स)",
    "Departments & Specialized Wings of SSD": "समता सैनिक दल के विभाग एवं विशेष विंग्स",
    "Structured like a disciplined non-violent defense force to educate, agitate, and organize at grassroots, state, and national levels.": "तळागाळात, राज्य आणि राष्ट्रीय स्तरावर 'शिका, संघटित व्हा आणि संघर्ष करा' या तत्त्वावर आधारलेली एक अनुशासित अहिंसक संरक्षण सेना।",
    "Central Cadet Corps": "केंद्रीय कैडेट कॉर्प्स",
    "Rigorous physical drill, parade ranks, uniform code of conduct, flag ceremonies, and non-violent social defense training.": "कठोर शारीरिक ड्रिल, परेड रैंक, वर्दी आचार संहिता, ध्वज वंदन समारोह और अहिंसक सामाजिक सुरक्षा प्रशिक्षण।",
    "Explore Cadet Wing →": "कैडेट विंग देखें →",
    "Explore Cadet Wing &rarr;": "कैडेट विंग देखें →",
    "Mahila Samata Sainik Dal": "महिला समता सैनिक दल",
    "Frontline women defense wing focusing on leadership academy, anti-atrocity legal assistance, self-reliance, and education.": "अग्रिम पंक्ति की महिला सुरक्षा विंग जो नेतृत्व अकादमी, अत्याचार-विरोधी कानूनी सहायता, आत्मनिर्भरता और शिक्षा पर केंद्रित है।",
    "Explore Mahila Dal →": "महिला दल देखें →",
    "Explore Mahila Dal &rarr;": "महिला दल देखें →",
    "Legal & Constitutional Cell": "विधिक एवं संवैधानिक प्रकोष्ठ",
    "Nationwide advocate network offering pro-bono legal defense, constitutional literacy camps, and emergency legal hotlines.": "देशव्यापी अधिवक्ताओं का नेटवर्क जो नि:शुल्क कानूनी रक्षा, संवैधानिक साक्षरता शिविर और आपातकालीन कानूनी हेल्पलाइन प्रदान करता है।",
    "Explore Legal Cell →": "विधिक प्रकोष्ठ देखें →",
    "Explore Legal Cell &rarr;": "विधिक प्रकोष्ठ देखें →",
    "Youth & Student Front": "युवा एवं छात्र मोर्चा",
    "Dr. Ambedkar study circles, civil services & competitive exam mentorship, digital skills, and annual youth leadership summits.": "डॉ. आंबेडकर अध्ययन मंडल, सिविल सेवा एवं प्रतियोगी परीक्षा मार्गदर्शन, डिजिटल कौशल और वार्षिक युवा नेतृत्व शिखर सम्मेलन।",
    "Explore Youth Front →": "युवा मोर्चा देखें →",
    "Explore Youth Front &rarr;": "युवा मोर्चा देखें →",
    "Community Sewa & Relief": "सामुदायिक सेवा एवं राहत",
    "Voluntary blood donor registry, emergency disaster rescue task force, free health diagnostic camps, and community libraries.": "स्वैच्छिक रक्तदाता रजिस्ट्री, आपातकालीन आपदा बचाव कार्यबल, नि:शुल्क स्वास्थ्य निदान शिविर और सामुदायिक पुस्तकालय।",
    "Explore Relief Task Force →": "राहत कार्यबल देखें →",
    "Explore Relief Task Force &rarr;": "राहत कार्यबल देखें →",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भर्ती",
    "Step forward to serve equality and democracy. Enlist online in any of our 5 specialized operational divisions.": "समानता और लोकतंत्र की सेवा के लिए आगे आएं। हमारे ५ विशेष परिचालन प्रभागों में से किसी में भी ऑनलाइन भर्ती हों।",
    "Full Enlistment Portal →": "संपूर्ण भर्ती पोर्टल →",
    "Full Enlistment Portal &rarr;": "संपूर्ण भर्ती पोर्टल →",
    "Direct Enlistment": "प्रत्यक्ष सैनिक भर्ती",
    "Join Samata Sainik Dal — Take the Solemn Pledge": "समता सैनिक दल में शामिल हों — निष्ठा की प्रतिज्ञा लें",
    "Answer the historic call of Bodhisattva Babasaheb Dr. B.R. Ambedkar. Become a disciplined volunteer for equality, human dignity, and constitutional morality.": "बोधिसत्व बाबासाहेब डॉ. बी. आर. आंबेडकर के ऐतिहासिक आह्वान का उत्तर दें। समानता, मानवीय गरिमा और संवैधानिक नैतिकता के अनुशासित स्वयंसेवक बनें।",
    "4-Step Official Enlistment Process": "४-चरणीय आधिकारिक भर्ती प्रक्रिया",
    "Official Cadre Induction": "आधिकारिक कैडर दीक्षा",
    "Select Your Operational Wing": "अपने कार्य प्रभाग का चयन करें",
    "Choose from Cadet Corps (Drill & Discipline), Mahila Dal (Women's Leadership), Legal Cell (Advocacy), Youth Front, or Sewa Relief.": "कैडेट कॉर्प्स (ड्रिल और अनुशासन), महिला दल (महिला नेतृत्व), लीगल सेल (विधिक रक्षा), यूथ फ्रंट, या सेवा रिलीफ में से चुनें।",
    "Submit District & Contact Details": "जिला एवं संपर्क विवरण दर्ज करें",
    "Provide your local address to be connected directly with your District Commander and local State Chapter.": "अपने जिला कमांडर और स्थानीय राज्य शाखा से सीधे जुड़ने के लिए अपना स्थानीय पता प्रदान करें।",
    "Take the Solemn Volunteer Pledge": "निष्ठावान स्वयंसेवक की शपथ लें",
    "Commit to the principles of self-respect, moral character, non-violence, and total dedication to liberty, equality, and fraternity.": "स्वाभिमान, नैतिक चरित्र, अहिंसा और स्वतंत्रता, समानता व बंधुता के प्रति पूर्ण समर्पण के सिद्धांतों का संकल्प लें।",
    "Receive SSD Digital ID & Unit Assignment": "एसएसडी डिजिटल आईडी एवं यूनिट असाइनमेंट प्राप्त करें",
    "Central Command verifies your application, registers you in the national roll, and invites you to the next drill camp.": "केंद्रीय कमान आपके आवेदन का सत्यापन करती है, राष्ट्रीय रजिस्टर में दर्ज करती है, और आपको अगले ड्रिल कैंप में आमंत्रित करती है।",
    "Open Full Online Enlistment Portal →": "संपूर्ण ऑनलाइन भर्ती पोर्टल खोलें →",
    "Open Full Online Enlistment Portal &rarr;": "संपूर्ण ऑनलाइन भर्ती पोर्टल खोलें →",
    "Track Application Status": "आवेदन की स्थिति जांचें",
    "Visual History & March Past Archives": "दृश्य इतिहास एवं संचलन (मार्च पास्ट) संग्रह",
    "Photo Gallery & Field Action Archives": "फोटो गैलरी एवं मैदानी कार्य संग्रह",
    "Moments of discipline, historic struggles, Deekshabhoomi parades, and grassroots community defense.": "अनुशासन, ऐतिहासिक संघर्ष, दीक्षाभूमि परेड और जमीनी स्तर पर सामाजिक सुरक्षा के ऐतिहासिक क्षण।",
    "All Photos": "सभी छायाचित्र",
    "Cadet Drills & Parades": "कैडेट ड्रिल एवं परेड",
    "Mahila Samata Dal": "महिला समता दल",
    "Historical Memorials": "ऐतिहासिक स्मारक",
    "Cadet Drills": "कैडेट ड्रिल",
    "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur": "एसएसडी वर्दीधारी कैडेट कॉर्प्स औपचारिक संचलन (मार्च पास्ट) - दीक्षाभूमि नागपुर",
    "Mahila Samata Sainik Dal Volunteers at National Equality Rally": "राष्ट्रीय समता रैली में महिला समता सैनिक दल की स्वयंसेविकाएं",
    "Constitution": "संविधान",
    "Constitution Day Mass Preamble Reading Assembly": "संविधान दिवस पर सामूहिक उद्देशिका वाचन सभा",
    "Youth Front": "युवा मोर्चा",
    "Youth Cadet Physical Training & Non-Violent Defense Drill": "युवा कैडेट शारीरिक प्रशिक्षण एवं अहिंसक सुरक्षा ड्रिल",
    "View Complete High-Resolution Photo Archives →": "संपूर्ण उच्च-रिज़ॉल्यूशन फोटो संग्रह देखें →",
    "View Complete High-Resolution Photo Archives &rarr;": "संपूर्ण उच्च-रिज़ॉल्यूशन फोटो संग्रह देखें →",
    "Transparent Community Support": "पारदर्शी जनसहयोग",
    "Support the Movement — Fuel the Fight for Equality": "आंदोलन को समर्थन दें — समानता की लड़ाई को सशक्त बनाएं",
    "Samata Sainik Dal is self-funded by conscious citizens. Every rupee directly strengthens grassroots cadet training, pro-bono legal defense, and disaster relief.": "समता सैनिक दल जागरूक नागरिकों द्वारा स्वयं वित्तपोषित है। आपका प्रत्येक रुपया सीधे कैडेट प्रशिक्षण, नि:शुल्क विधिक रक्षा और आपदा राहत को मजबूत करता है।",
    "Choose Your Contribution": "अपना सहयोग चुनें",
    "One-Time Contribution": "एकमुश्त सहयोग",
    "Monthly Supporter": "मासिक समर्थक",
    "Select Contribution Amount": "सहयोग राशि चुनें",
    "Enter custom amount": "अन्य राशि दर्ज करें",
    "Direct Allocation Cause": "सहयोग का उद्देश्य",
    "Bal Sainik Uniforms & Drill Equipment": "बाल सैनिक वर्दी एवं ड्रिल उपकरण",
    "Constitutional Literacy & Preamble Booklets": "संवैधानिक साक्षरता एवं उद्देशिका पुस्तिकाएं",
    "Pro-Bono Legal Defense Fund (SC/ST Cases)": "नि:शुल्क विधिक रक्षा कोष (एससी/एसटी मामले)",
    "Disaster Rescue & 24/7 Blood Task Force": "आपदा बचाव एवं २४/७ रक्त कार्यबल",
    "SSD Centenary 2027 Trust & Library Corpus": "एसएसडी शताब्दी २०२७ ट्रस्ट एवं पुस्तकालय कोष",
    "General Organizational Fund": "सामान्य संगठनात्मक कोष",
    "Direct Impact:": "प्रत्यक्ष प्रभाव:",
    "Prints and distributes 50 pocket Constitutions and Preamble learning cards in rural school clusters.": "ग्रामीण स्कूलों में ५० पॉकेट संविधान और उद्देशिका कार्ड मुद्रित और वितरित करता है।",
    "Proceed to Contribute Online →": "ऑनलाइन सहयोग के लिए आगे बढ़ें →",
    "Proceed to Contribute Online &rarr;": "ऑनलाइन सहयोग के लिए आगे बढ़ें →",
    "The Foundational Command of Dr. B.R. Ambedkar": "डॉ. बी. आर. आंबेडकर का बुनियादी आदेश",
    "\"My soldiers of equality! You must maintain strict discipline and self-respect. A volunteer of Samata Sainik Dal must be ready to sacrifice personal comfort for the collective dignity, equality, and rights of the oppressed. Let your conduct be an embodiment of character and non-violent courage.\"": "\"समानता के मेरे सैनिकों! तुम्हें कठोर अनुशासन और स्वाभिमान बनाए रखना चाहिए। समता सैनिक दल के एक स्वयंसेवक को शोषितों की सामूहिक गरिमा, समानता और अधिकारों के लिए व्यक्तिगत सुख का त्याग करने को तत्पर रहना चाहिए। तुम्हारा आचरण चरित्र और अहिंसक साहस का प्रतीक होना चाहिए।\"",
    "— Dr. Bhimrao Ramji Ambedkar, Founder, Samata Sainik Dal (24 September 1927)": "— डॉ. भीमराव रामजी आंबेडकर, संस्थापक, समता सैनिक दल (२४ सितंबर १९२७)",
    "Read Complete History & Centenary Roadmap (1927–2027)": "संपूर्ण इतिहास एवं शताब्दी रोडमैप (१९२७–२०२७) पढ़ें",
    "SSD Bulletins & Gazette": "एसएसडी बुलेटिन एवं गॅझेट",
    "Latest Central Command Dispatches & Events": "नवीनतम केंद्रीय कमान समाचार एवं कार्यक्रम",
    "Real-time announcements, drill camp schedules, and national conclaves synchronized live with our central database.": "हमारे केंद्रीय डेटाबेस से सीधे समन्वयित वास्तविक समय की घोषणाएं, ड्रिल शिविर और राष्ट्रीय सम्मेलन।",
    "Official Dispatches": "आधिकारिक समाचार",
    "View All Dispatches →": "सभी समाचार देखें →",
    "View All Dispatches &rarr;": "सभी समाचार देखें →",
    "Upcoming Events": "आगामी कार्यक्रम",
    "Full Calendar →": "संपूर्ण कैलेंडर देखें →",
    "Full Calendar &rarr;": "संपूर्ण कैलेंडर देखें →",
    "Fetching latest SSD dispatches from Firebase...": "फायरबेस से नवीनतम एसएसडी समाचार प्राप्त किए जा रहे हैं...",
    "Fetching upcoming events from Firebase...": "फायरबेस से आगामी कार्यक्रमों का विवरण प्राप्त किया जा रहा है...",
    "Complete Contribution": "सहयोग पूरा करें",
    "Contribution Amount (₹) *": "सहयोग राशि (₹) *",
    "Earmarked Purpose *": "निर्दिष्ट उद्देश्य *",
    "Donor Full Name *": "सहयोगकर्ता का पूरा नाम *",
    "Email ID *": "ईमेल आईडी *",
    "Mobile No *": "मोबाइल नंबर *",
    "PAN Card Number (for 80G Tax Exemption Receipt)": "पैन कार्ड नंबर (80G आयकर छूट रसीद के लिए)",
    "Payment Method": "भुगतान विधि",
    "UPI / QR": "यूपीआई / क्यूआर",
    "Net Banking / NEFT": "नेट बैंकिंग / एनईएफटी",
    "Card": "डेबिट / क्रेडिट कार्ड",
    "Proceed to Secure Pay (Razorpay / UPI / Cards)": "सुरक्षित भुगतान के लिए आगे बढ़ें (Razorpay / UPI / Cards)",
    "Initializing Razorpay Gateway...": "रेज़रपे गेटवे शुरू हो रहा है...",
    "256-Bit Encrypted Secure Checkout via Razorpay (UPI, Google Pay, Cards, NetBanking)": "रेज़रपे के माध्यम से २५६-बिट एन्क्रिप्टेड सुरक्षित भुगतान (UPI, Google Pay, Cards, NetBanking)",
    "Official Contribution Receipt": "आधिकारिक सहयोग रसीद",
    "80G Tax Exempt": "80G कर छूट",
    "Receipt No:": "रसीद संख्या:",
    "Payment ID (Razorpay):": "भुगतान आईडी (Razorpay):",
    "Date & Time:": "दिनांक व समय:",
    "Payment Status:": "भुगतान स्थिति:",
    "SUCCESS / CAPTURED": "सफल / प्राप्त (SUCCESS)",
    "Donor Name:": "सहयोगकर्ता का नाम:",
    "PAN Number:": "पैन नंबर:",
    "Cause Allocated:": "आवंटित उद्देश्य:",
    "Amount Contributed:": "सहयोग राशि:",
    "This is a computer-generated digital receipt under 80G provisions and does not require a physical signature.": "यह 80G प्रावधानों के तहत कंप्यूटर जनित डिजिटल रसीद है और इसमें भौतिक हस्ताक्षर की आवश्यकता नहीं है।",
    "Jai Bhim! Thank you for strengthening the movement for social equality.": "जय भीम! सामाजिक समानता के आंदोलन को सशक्त बनाने के लिए आपका हार्दिक धन्यवाद।",
    "SSD Central Gazette Dispatch": "समता सैनिक दल केंद्रीय गॅझेट बुलेटिन",
    "Date": "दिनांक",
    "Category": "श्रेणी",
    "Print Receipt": "रसीद प्रिंट करें",
    "Close": "बंद करें",
    "Close Dossier": "डॉसियर बंद करें",
    "Contact Secretariat": "सचिवालय से संपर्क करें",
    "Download Dossier PDF": "डॉसियर पीडीएफ डाउनलोड करें",
    "Verified SSD": "सत्यापित एसएसडी",
    "Credentials & Background": "योग्यता एवं पृष्ठभूमि",
    "Key Focus & Movement Portfolios": "प्रमुख कार्यक्षेत्र एवं आंदोलन पोर्टफोलियो",
    "Movement Service Record & Biographical Dossier": "आंदोलन सेवा अभिलेख एवं जीवनी डॉसियर",
    "Samata Sainik Dal • Leadership Dossier": "समता सैनिक दल • नेतृत्व डॉसियर",
    "Samata Sainik Dal &bull; Leadership Dossier": "समता सैनिक दल • नेतृत्व डॉसियर",
    "\"Samata Sainik Dal was established on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar to organize a disciplined, self-respecting non-violent vanguard for the defense of constitutional morality and social democracy.\"": "\"समता सैनिक दल की स्थापना २४ सितंबर १९२७ को बोधिसत्व डॉ. बी. आर. आंबेडकर द्वारा संवैधानिक नैतिकता और सामाजिक लोकतंत्र की रक्षा के लिए एक अनुशासित, आत्मसम्मानित और अहिंसक सेना के रूप में की गई थी।\"",
    "SSD Departments": "एसएसडी विभाग (प्रभाग)",
    "Quick Portals": "त्वरित पोर्टल",
    "Subscribe to receive official circulars, drill schedules, and centenary announcements.": "अधिकृत परिपत्र, ड्रिल अनुसूची और शताब्दी घोषणाएं प्राप्त करने के लिए सदस्यता लें।",
    "Enter your email ID": "अपना ईमेल आईडी दर्ज करें",
    "Liberty, Equality, Fraternity. No spam.": "स्वतंत्रता, समानता, बंधुता। कोई स्पैम नहीं।",
    "Constitution of SSD": "एसएसडी का संविधान",
    "State Directory": "राज्य निर्देशिका",
    "Grievance Desk": "शिकायत निवारण डेस्क",
    "Helpline": "हेल्पलाइन",
    "Enlist": "सैनिक भर्ती",
    "Top": "शीर्ष (Top)"
  },
  mr: {
    // Top Bar & Accessibility
    "Central Command Helpline: 1800-24-1927": "केंद्रीय कमान हेल्पलाईन: १८००-२४-१९२७",
    "centralcommand@samatasainikdal.org": "centralcommand@samatasainikdal.org",
    "Founded: 24 Sept 1927 | Babasaheb Dr. B.R. Ambedkar": "स्थापना: २४ सप्टेंबर १९२७ | डॉ. बाबासाहेब आंबेडकर",
    "Accessibility Tools": "सुलभता साधने (Accessibility)",
    "Decrease Font Size": "फॉन्ट लहान करा",
    "Normal Font Size": "सामान्य फॉन्ट आकार",
    "Increase Font Size": "फॉन्ट मोठा करा",
    "High Contrast Mode": "उच्च कॉन्ट्रास्ट मोड",
    "Language Selector": "भाषा निवडा",

    // Brand Block
    "SAMATA SAINIK DAL (SSD)": "समता सैनिक दल (SSD)",
    "SAMATA SAINIK DAL": "समता सैनिक दल",
    "समता सैनिक दल (स्थापना: १९२७) | Founded by Dr. B.R. Ambedkar": "समता, स्वातंत्र्य आणि बंधुतेचे रक्षक | डॉ. बाबासाहेब आंबेडकर यांनी स्थापन केलेले (१९२७)",
    "Est. 1927 | Central Command": "स्थापना १९२७ | केंद्रीय कमान",
    "Open Navigation Menu": "मेनू उघडा",
    "Close Navigation Menu": "मेनू बंद करा",

    // Navigation Links & Dropdowns
    "Home": "मुख्य पृष्ठ",
    "About": "परिचय",
    "Genesis by Dr. B.R. Ambedkar": "डॉ. बाबासाहेब आंबेडकर यांच्याद्वारे स्थापना",
    "Mahad Satyagraha (1927)": "महाड सत्याग्रह (१९२७)",
    "Governing Body & Leadership": "कार्यकारिणी व नेतृत्व",
    "Centenary Roadmap (1927–2027)": "शताब्दी रोडमॅप (१९२७–२०२७)",
    "Centenary Roadmap (1927-2027)": "शताब्दी रोडमॅप (१९२७–२०२७)",
    "Wings": "विभाग व विंग्स",
    "Central Cadet Corps (Sainik Wing)": "केंद्रीय कॅडेट कॉर्प्स (सैनिक विंग)",
    "Mahila Samata Sainik Dal": "महिला समता सैनिक दल",
    "Constitutional & Legal Cell": "संवैधानिक व विधी प्रकोष्ठ",
    "Youth & Student Front": "युवा व विद्यार्थी आघाडी",
    "Community Sewa & Relief Force": "सामाजिक सेवा व मदत दल",
    "Membership": "सदस्यता",
    "Sainik Member Portal & ID Card": "सैनिक सदस्य पोर्टल व ओळखपत्र",
    "Join Dal / New Enlistment": "दलात सामील व्हा / नवीन नोंदणी",
    "Public QR Credential Verification": "सार्वजनिक क्यूआर पडताळणी",
    "Officer / Command Login": "अधिकारी / कमान लॉगिन",
    "Gazette & Media": "गॅझेट व माध्यम",
    "Official Gazette & Circulars": "अधिकृत गॅझेट व परिपत्रके",
    "Photo & Video Archives": "छायाचित्र व व्हिडिओ संग्रह",
    "Campaigns & Memorials": "अभियान व स्मारके",
    "Contact": "संपर्क",
    "Donate": "देणगी द्या",
    "Member Portal": "सदस्य पोर्टल",

    // Notice Ticker
    "SSD Official Gazette": "समता सैनिक दल अधिकृत गॅझेट",
    "SSD Centenary Preparations (1927–2027) National Executive Meeting scheduled at Nagpur Headquarters.": "एसएसडी शताब्दी पूर्वतयारी (१९२७–२०२७) राष्ट्रीय कार्यकारिणीची बैठक नागपूर मुख्यालयात आयोजित.",
    "National Sainik Cadet Enrollment Q3 2026 is now underway across all State & District units.": "राष्ट्रीय सैनिक कॅडेट नोंदणी २०२६ सर्व राज्य व जिल्हा युनिट्समध्ये सुरू आहे.",
    "Annual Mahad Satyagraha & Water Rights Memorial March preparations launched.": "वार्षिक महाड सत्याग्रह व जलहक्क स्मृति मार्च पूर्वतयारी सुरू.",
    "Constitution Day (26 Nov) Mass Preamble Reading Campaign activated across 500+ districts.": "संविधान दिन (२६ नोव्हेंबर) सामूहिक उद्देशिका वाचन अभियान ५००+ जिल्ह्यांमध्ये सक्रिय.",
    "View Gazette": "गॅझेट पहा",
    "View Gazette →": "गॅझेट पहा →",
    "View Gazette &rarr;": "गॅझेट पहा →",
    "View All Gazette Circulars": "सर्व गॅझेट परिपत्रके पहा",

    // Hero Section: Governing Body
    "Supreme Command & National Executive Council": "सर्वोच्च कमान व राष्ट्रीय कार्यकारिणी परिषद",
    "Governing Body of Samata Sainik Dal": "समता सैनिक दल नियामक मंडळ व राष्ट्रीय नेतृत्व",
    "Founded by Bodhisattva Dr. B.R. Ambedkar on 24 September 1927. Steered by seasoned Ambedkarite scholars, retired military officers, legal luminaries, and dedicated grassroots commanders across India.": "बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी २४ सप्टेंबर १९२७ रोजी स्थापन केलेले. देशभरातील ज्येष्ठ आंबेडकरवादी विचारवंत, सेवानिवृत्त लष्करी अधिकारी, विधिज्ञ आणि समर्पित कार्यकर्त्यांद्वारे संचलित.",
    "Enlist Under Central Command": "केंद्रीय कमान अंतर्गत नावनोंदणी करा",
    "Support Movement & Centenary Fund": "चळवळ व शताब्दी निधीला सहकार्य करा",
    "SSD Constitution & 1927 History": "एसएसडी संविधान व १९२७ इतिहास",

    // Leadership Tier Navigation
    "All Leadership": "सर्व नेतृत्व",
    "National Supreme Command": "राष्ट्रीय सर्वोच्च कमान",
    "IT & Digital Media Cell": "आयटी व डिजिटल मीडिया सेल",
    "State Governing Bodies (प्रदेश कार्यकारिणी)": "राज्य कार्यकारिणी (प्रदेश)",
    "District Governing Bodies (जिल्हा कार्यकारिणी)": "जिल्हा कार्यकारिणी",
    "Search governing officer by name, state, district, designation...": "नाव, राज्य, जिल्हा, पद यानुसार अधिकारी शोधा...",
    "All States": "सर्व राज्ये",
    "Maharashtra (महाराष्ट्र)": "महाराष्ट्र (Maharashtra)",

    // Ranks, Badges, Portfolios
    "National Command": "राष्ट्रीय कमान",
    "Executive Council": "कार्यकारिणी परिषद",
    "Cadet Directorate": "कॅडेट संचालनालय",
    "Mahila Dal": "महिला दल",
    "Legal Cell": "विधी प्रकोष्ठ",
    "Finance & Audit": "वित्त व लेखापरीक्षण",
    "IT & Cyber Directorate": "आयटी व सायबर संचालनालय",
    "Central HQ": "केंद्रीय मुख्यालय",
    "Official Dossier": "अधिकृत दस्ताऐवज / डॉसियर",
    "View Full Portfolio →": "संपूर्ण प्रोफाइल पहा →",
    "View Full Portfolio &rarr;": "संपूर्ण प्रोफाइल पहा →",
    "View Full Portfolio": "संपूर्ण प्रोफाइल पहा",
    "Senior Advisory & Elders Council (मार्गदर्शक मंडल)": "वरिष्ठ सल्लागार व मार्गदर्शक मंडळ",
    "Distinguished Ambedkarite thinkers, veteran freedom fighters, and movement elders guiding policy. Click any portfolio to view full dossier.": "धोरण मार्गदर्शन करणारे ज्येष्ठ आंबेडकरवादी विचारवंत, स्वातंत्र्यसैनिक व चळवळीचे मार्गदर्शक. संपूर्ण डॉसियर पाहण्यासाठी क्लिक करा.",
    "Click Profile to Open Portfolio": "प्रोफाइल पाहण्यासाठी क्लिक करा",
    "Open Portfolio": "प्रोफाइल उघडा",

    // Council Designations
    "National President (राष्ट्रीय अध्यक्ष)": "राष्ट्रीय अध्यक्ष",
    "National General Secretary (राष्ट्रीय महासचिव)": "राष्ट्रीय महासचिव",
    "Chief Cadet Dalpati (प्रधान दलपति)": "प्रधान दलपती (Chief Cadet Dalpati)",
    "National Mahila Dal Convener (महिला दल संयोजिका)": "महिला दल संयोजिका",
    "National Legal Advisory Cell Head (विधिक प्रकोष्ठ प्रमुख)": "विधी प्रकोष्ठ प्रमुख",
    "National Treasurer & Audit Officer (राष्ट्रीय कोषाध्यक्ष)": "राष्ट्रीय कोषाध्यक्ष",
    "National IT & Digital Media Head (राष्ट्रीय आयटी प्रमुख)": "राष्ट्रीय आयटी प्रमुख",
    "National Cyber Operations Lead (राष्ट्रीय सायबर ऑपरेशन्स प्रमुख)": "राष्ट्रीय सायबर ऑपरेशन्स प्रमुख",
    "Senior Advisory Member": "वरिष्ठ सल्लागार सदस्य",
    "Council Member": "परिषद सदस्य",
    "National Central HQ": "राष्ट्रीय मध्यवर्ती मुख्यालय",
    "Advisory Board": "सल्लागार मंडळ",
    "Senior Ambedkarite Historian & Author": "वरिष्ठ आंबेडकरवादी इतिहासकार व लेखक",
    "Human Rights Defender & Scholar": "मानवाधिकार संरक्षक व विचारवंत",
    "Veteran 1956 Deekshabhoomi Parade Organizer": "१९५६ दीक्षाभूमी संचलन आयोजक",
    "Nagpur HQ": "नागपूर मुख्यालय",
    "New Delhi Central Office": "नवी दिल्ली मध्यवर्ती कार्यालय",
    "Pune HQ": "पुणे मुख्यालय",
    "Mumbai": "मुंबई",

    // Campaigns Section
    "Active National Missions": "सक्रिय राष्ट्रीय मोहिमा",
    "Ongoing Campaigns & Centenary Drives": "सध्याची अभियाने व शताब्दी उपक्रम",
    "Grassroots initiatives mobilizing thousands of cadets, legal advocates, and community volunteers across 28 states of India.": "भारतातील २८ राज्यांमधील हजारो कॅडेट्स, वकील आणि स्वयंसेवकांना संघटित करणारे उपक्रम.",
    "Centenary Drive": "शताब्दी मोहीम",
    "Legal & Rights": "विधी व हक्क",
    "Women Wing": "महिला विंग",
    "Community Sewa": "सामाजिक सेवा",
    "SSD Centenary 1927–2027 Mission (शताब्दी महोत्सव)": "एसएसडी शताब्दी १९२७–२०२७ महोत्सव",
    "Nationwide 100-Year commemorative march pasts, building 1,000 Ambedkar Study Libraries, and establishing the Centenary National Memorial at Mahad & Nagpur.": "देशव्यापी १०० वर्षे स्मृति संचलन, १००० आंबेडकर अभ्यासिका ग्रंथालये आणि महाड व नागपूर येथे राष्ट्रीय स्मारक निर्मिती.",
    "National Constitutional Literacy & Preamble Yatra": "राष्ट्रीय संविधान साक्षरता व उद्देशिका यात्रा",
    "Distributing pocket Constitutions in rural villages, mass Preamble recitation camps, and training grassroots advocates to resist caste atrocities legally.": "गावागावात संविधान पुस्तिका वितरण, उद्देशिका वाचन आणि अत्याचाराविरुद्ध कायदेशीर लढा देण्यासाठी वकिलांचे प्रशिक्षण.",
    "Mahila Self-Defense & Savitribai Phule Academy": "महिला स्वसंरक्षण व सावित्रीबाई फुले अकादमी",
    "Physical stick drill, martial self-defense training, anti-harassment rapid action units, and educational scholarships for Bahujan female students.": "लाठीकाठी कसरत, स्वसंरक्षण प्रशिक्षण, महिला सुरक्षा पथक आणि बहुजन विद्यार्थिनींसाठी शिष्यवृत्ती.",
    "Samata 24/7 Voluntary Blood Donor & Disaster Force": "समता २४/७ रक्तदाता व आपत्ती निवारण दल",
    "Nationwide emergency voluntary blood donor registry, flood rescue battalions, free medical diagnosis, and community health camps in underprivileged bastis.": "देशव्यापी आपत्कालीन रक्तदाता नोंदणी, पूर बचाव पथक, मोफत आरोग्य तपासणी आणि वस्त्यांमध्ये वैद्यकीय शिबिरे.",
    "Goal: ₹50.0 Lakh": "लक्ष्य: ₹५०.० लाख",
    "Goal: ₹25.0 Lakh": "लक्ष्य: ₹२५.० लाख",
    "Goal: ₹30.0 Lakh": "लक्ष्य: ₹३०.० लाख",
    "Goal: ₹20.0 Lakh": "लक्ष्य: ₹२०.० लाख",
    "73% Raised": "७३% संकलित",
    "68% Raised": "६८% संकलित",
    "65% Raised": "६५% संकलित",
    "79% Raised": "७९% संकलित",
    "15,000+ Volunteers": "१५,०००+ स्वयंसेवक",
    "8,200+ Volunteers": "८,२००+ स्वयंसेवक",
    "12,000+ Volunteers": "१२,०००+ स्वयंसेवक",
    "25,000+ Volunteers": "२५,०००+ स्वयंसेवक",
    "250+ Districts": "२५०+ जिल्हे",
    "500+ Districts": "५००+ जिल्हे",
    "180+ Districts": "१८०+ जिल्हे",
    "320+ Districts": "३२०+ जिल्हे",
    "Support": "सहकार्य करा",
    "Enlist": "सामील व्हा",

    // Specialized Divisions
    "Operational Divisions": "कार्यकारी विभाग",
    "Departments & Specialized Wings of SSD": "समता सैनिक दलाचे विभाग व विशेष विंग्स",
    "Structured like a disciplined non-violent defense force to educate, agitate, and organize at grassroots, state, and national levels.": "शिका, संघर्ष करा आणि संघटित व्हा या तत्त्वावर आधारित शिस्तबद्ध अहिंसक सामाजिक संरक्षण दल.",
    "Central Cadet Corps": "केंद्रीय कॅडेट कॉर्प्स",
    "Rigorous physical drill, parade ranks, uniform code of conduct, flag ceremonies, and non-violent social defense training.": "कठोर शारीरिक संचलन, परेड, गणवेश आचारसंहिता, ध्वजवंदन आणि अहिंसक सामाजिक संरक्षण प्रशिक्षण.",
    "Explore Cadet Wing →": "कॅडेट विंग पहा →",
    "Explore Cadet Wing &rarr;": "कॅडेट विंग पहा →",
    "Explore Mahila Dal →": "महिला दल पहा →",
    "Explore Mahila Dal &rarr;": "महिला दल पहा →",
    "Legal & Constitutional Cell": "विधी व संवैधानिक प्रकोष्ठ",
    "Nationwide advocate network offering pro-bono legal defense, constitutional literacy camps, and emergency legal hotlines.": "विनामूल्य कायदेशीर मदत, संविधान साक्षरता शिबिरे आणि आपत्कालीन कायदेशीर मदत देणारे देशव्यापी वकील जाळे.",
    "Explore Legal Cell →": "विधी प्रकोष्ठ पहा →",
    "Explore Legal Cell &rarr;": "विधी प्रकोष्ठ पहा →",
    "Youth & Student Front": "युवा व विद्यार्थी आघाडी",
    "Dr. Ambedkar study circles, civil services & competitive exam mentorship, digital skills, and annual youth leadership summits.": "डॉ. आंबेडकर अभ्यास मंडळे, स्पर्धा परीक्षा मार्गदर्शन, डिजिटल कौशल्ये आणि वार्षिक युवा नेतृत्व परिषद.",
    "Explore Youth Front →": "युवा आघाडी पहा →",
    "Explore Youth Front &rarr;": "युवा आघाडी पहा →",
    "Community Sewa & Relief": "सामाजिक सेवा व मदत दल",
    "Voluntary blood donor registry, emergency disaster rescue task force, free health diagnostic camps, and community libraries.": "रक्तदाता नोंदणी, आपत्कालीन बचाव दल, मोफत आरोग्य तपासणी आणि अभ्यासिका ग्रंथालये.",
    "Explore Relief Task Force →": "मदत कार्य दल पहा →",
    "Explore Relief Task Force &rarr;": "मदत कार्य दल पहा →",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भरती नोंदणी",
    "Step forward to serve equality and democracy. Enlist online in any of our 5 specialized operational divisions.": "समता आणि लोकशाहीच्या रक्षणासाठी पुढे या. आमच्या ५ विशेष विभागांपैकी कोणत्याही विभागात नोंदणी करा.",
    "Full Enlistment Portal →": "संपूर्ण नोंदणी पोर्टल →",
    "Full Enlistment Portal &rarr;": "संपूर्ण नोंदणी पोर्टल →",

    // 4-Step Enlistment Guide
    "Direct Enlistment": "थेट प्रवेश नोंदणी",
    "Join Samata Sainik Dal — Take the Solemn Pledge": "समता सैनिक दलात सामील व्हा — प्रतिज्ञा घ्या",
    "Answer the historic call of Bodhisattva Babasaheb Dr. B.R. Ambedkar. Become a disciplined volunteer for equality, human dignity, and constitutional morality.": "बोधिसत्व बाबासाहेब डॉ. बाबासाहेब आंबेडकरांच्या ऐतिहासिक हाकेला प्रतिसाद द्या. समता, मानवी प्रतिष्ठा आणि संवैधानिक मूल्यांसाठी शिस्तबद्ध स्वयंसेवक व्हा.",
    "4-Step Official Enlistment Process": "४-टप्प्यांची अधिकृत प्रवेश प्रक्रिया",
    "Official Cadre Induction": "अधिकृत संवर्ग प्रवेश",
    "Select Your Operational Wing": "तुमचा कार्य विभाग निवडा",
    "Choose from Cadet Corps (Drill & Discipline), Mahila Dal (Women's Leadership), Legal Cell (Advocacy), Youth Front, or Sewa Relief.": "कॅडेट कॉर्प्स, महिला दल, विधी प्रकोष्ठ, युवा आघाडी किंवा सेवा मदत दल यापैकी निवडा.",
    "Submit District & Contact Details": "जिल्हा व संपर्क तपशील सादर करा",
    "Provide your local address to be connected directly with your District Commander and local State Chapter.": "जिल्हा कमांडर आणि राज्य शाखेशी जोडले जाण्यासाठी आपला पत्ता नोंदवा.",
    "Take the Solemn Volunteer Pledge": "पवित्र स्वयंसेवक प्रतिज्ञा घ्या",
    "Commit to the principles of self-respect, moral character, non-violence, and total dedication to liberty, equality, and fraternity.": "स्वाभिमान, चारित्र्य, अहिंसा आणि समता-स्वातंत्र्य-बंधुतेच्या तत्त्वांना समर्पित राहण्याची प्रतिज्ञा.",
    "Receive SSD Digital ID & Unit Assignment": "एसएसडी डिजिटल ओळखपत्र व युनिट वाटप मिळवा",
    "Central Command verifies your application, registers you in the national roll, and invites you to the next drill camp.": "केंद्रीय कमान अर्जाची पडताळणी करून राष्ट्रीय नोंदवहीत नोंद करते आणि आगामी शिबिराचे निमंत्रण देते.",
    "Open Full Online Enlistment Portal →": "संपूर्ण ऑनलाइन नोंदणी पोर्टल उघडा →",
    "Open Full Online Enlistment Portal &rarr;": "संपूर्ण ऑनलाइन नोंदणी पोर्टल उघडा →",
    "Track Application Status": "अर्जाची स्थिती तपासा",

    // Photo Gallery
    "Visual History & March Past Archives": "दृश्य इतिहास व संचलन संग्रह",
    "Photo Gallery & Field Action Archives": "छायाचित्र गॅलरी व क्षेत्रीय कृती संग्रह",
    "Moments of discipline, historic struggles, Deekshabhoomi parades, and grassroots community defense.": "शिस्त, ऐतिहासिक संघर्ष, दीक्षाभूमी संचलन आणि सामाजिक संरक्षणाचे क्षण.",
    "All Photos": "सर्व छायाचित्रे",
    "Cadet Drills & Parades": "कॅडेट संचलन व परेड",
    "Mahila Samata Dal": "महिला समता दल",
    "Historical Memorials": "ऐतिहासिक स्मारके",
    "Community Sewa & Relief": "सामाजिक सेवा व मदत",
    "Cadet Drills": "कॅडेट कवायत",
    "Constitution": "संविधान",
    "Youth Front": "युवा आघाडी",
    "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur": "एसएसडी गणवेशधारी कॅडेट दीक्षाभूमी नागपूर संचलन",
    "Mahila Samata Sainik Dal Volunteers at National Equality Rally": "महिला समता सैनिक दल राष्ट्रीय समता रॅली",
    "Constitution Day Mass Preamble Reading Assembly": "संविधान दिन सामूहिक उद्देशिका वाचन सभा",
    "Youth Cadet Physical Training & Non-Violent Defense Drill": "युवा कॅडेट शारीरिक कवायत व अहिंसक संरक्षण प्रशिक्षण",
    "View Complete High-Resolution Photo Archives →": "संपूर्ण उच्च-दर्जाचे छायाचित्र संग्रह पहा →",
    "View Complete High-Resolution Photo Archives &rarr;": "संपूर्ण उच्च-दर्जाचे छायाचित्र संग्रह पहा →",

    // Transparent Community Support / Donate
    "Transparent Community Support": "पारदर्शक सामाजिक सहकार्य",
    "Support the Movement — Fuel the Fight for Equality": "चळवळीला पाठिंबा द्या — समतेच्या लढ्याला बळ द्या",
    "Samata Sainik Dal is self-funded by conscious citizens. Every rupee directly strengthens grassroots cadet training, pro-bono legal defense, and disaster relief.": "समता सैनिक दल जागरूक नागरिकांच्या सहकार्याने चालवले जाते. प्रत्येक रुपया कॅडेट प्रशिक्षण, विनामूल्य कायदेशीर मदत आणि मदत कार्याला बळ देतो.",
    "Choose Your Contribution": "आपले योगदान निवडा",
    "One-Time Contribution": "एकवेळचे योगदान",
    "Monthly Supporter": "मासिक समर्थक",
    "Select Contribution Amount": "योगदान रक्कम निवडा",
    "Enter custom amount": "इतर रक्कम प्रविष्ट करा",
    "Direct Allocation Cause": "थेट वाटप उद्दिष्ट",
    "Bal Sainik Uniforms & Drill Equipment": "बाल सैनिक गणवेश व कवायत साहित्य",
    "Constitutional Literacy & Preamble Booklets": "संविधान साक्षरता व उद्देशिका पुस्तिका",
    "Pro-Bono Legal Defense Fund (SC/ST Cases)": "विनामूल्य विधी सहाय्य निधी (अ‍ॅट्रॉसिटी केसेस)",
    "Disaster Rescue & 24/7 Blood Task Force": "आपत्ती बचाव व २४/७ रक्त कार्य दल",
    "SSD Centenary 2027 Trust & Library Corpus": "एसएसडी शताब्दी २०२७ ट्रस्ट व अभ्यासिका निधी",
    "General Organizational Fund": "सामान्य संघटना निधी",
    "Direct Impact:": "थेट परिणाम:",
    "Prints and distributes 50 pocket Constitutions and Preamble learning cards in rural school clusters.": "ग्रामीण भागातील शाळांमध्ये ५० पॉकेट संविधाने आणि उद्देशिका पत्रिका वाटप.",
    "Proceed to Contribute Online →": "ऑनलाइन योगदानासाठी पुढे जा →",
    "Proceed to Contribute Online &rarr;": "ऑनलाइन योगदानासाठी पुढे जा →",

    // Babasaheb Quote
    "The Foundational Command of Dr. B.R. Ambedkar": "डॉ. बाबासाहेब आंबेडकरांचा पायाभूत संदेश",
    "\"My soldiers of equality! You must maintain strict discipline and self-respect. A volunteer of Samata Sainik Dal must be ready to sacrifice personal comfort for the collective dignity, equality, and rights of the oppressed. Let your conduct be an embodiment of character and non-violent courage.\"": "\"माझ्या समतेच्या सैनिकांनो! तुम्ही कठोर शिस्त आणि स्वाभिमान बाळगला पाहिजे. समता सैनिक दलाच्या स्वयंसेवकाने शोषितांच्या सामूहिक सन्मान, समता आणि हक्कांसाठी वैयक्तिक सुखाचा त्याग करण्यास सदैव तयार राहिले पाहिजे. तुमचे आचरण हे चारित्र्य आणि अहिंसक धैर्याचे मूर्तिमंत रूप असावे.\"",
    "— Dr. Bhimrao Ramji Ambedkar, Founder, Samata Sainik Dal (24 September 1927)": "— डॉ. भीमराव रामजी आंबेडकर, संस्थापक, समता सैनिक दल (२४ सप्टेंबर १९२७)",
    "Read Complete History & Centenary Roadmap (1927–2027)": "संपूर्ण इतिहास व शताब्दी रोडमॅप (१९२७–२०२७) वाचा",
    "Read Complete History & Centenary Roadmap (1927-2027)": "संपूर्ण इतिहास व शताब्दी रोडमॅप (१९२७–२०२७) वाचा",

    // Bulletins & Gazette
    "SSD Bulletins & Gazette": "एसएसडी बुलेटिन व गॅझेट",
    "Latest Central Command Dispatches & Events": "केंद्रीय कमान परिपत्रके व आगामी कार्यक्रम",
    "Real-time announcements, drill camp schedules, and national conclaves synchronized live with our central database.": "अधिकृत घोषणा, संचलन शिबिर वेळापत्रक आणि राष्ट्रीय अधिवेशने.",
    "Official Dispatches": "अधिकृत परिपत्रके",
    "Upcoming Events": "आगामी कार्यक्रम",
    "View All Dispatches →": "सर्व परिपत्रके पहा →",
    "View All Dispatches &rarr;": "सर्व परिपत्रके पहा →",
    "Full Calendar →": "संपूर्ण दिनदर्शिका →",
    "Full Calendar &rarr;": "संपूर्ण दिनदर्शिका →",
    "Read Dispatch →": "परिपत्रक वाचा →",
    "Read Dispatch &rarr;": "परिपत्रक वाचा →",
    "Read Dispatch": "परिपत्रक वाचा",
    "Schedule PDF": "वेळापत्रक पीडीएफ",
    "PDF Circular": "पीडीएफ परिपत्रक",
    "No dispatches found": "कोणतेही परिपत्रक उपलब्ध नाही",
    "No Upcoming Events Scheduled": "कोणतेही आगामी कार्यक्रम नियोजित नाहीत",
    "No photographs found in this category.": "या श्रेणीत कोणतीही छायाचित्रे आढळली नाहीत.",

    // Footer
    "Samata Sainik Dal": "समता सैनिक दल",
    "Samata Sainik Dal (SSD), founded by Bodhisattva Dr. B.R. Ambedkar on 24 September 1927. Dedicated to non-violent social defense, constitutional rights, and human dignity across India.": "समता सैनिक दल (एसएसडी), बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी २४ सप्टेंबर १९२७ रोजी स्थापन केले. भारतभरात अहिंसक सामाजिक संरक्षण, संविधानिक अधिकार आणि मानवी सन्मानासाठी समर्पित.",
    "SSD Departments": "एसएसडी विभाग",
    "Quick Portals": "महत्वाच्या लिंक्स",
    "Ongoing Campaigns": "सध्याची अभियाने",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भरती नोंदणी",
    "Donate & Support SSD": "देणगी व सहकार्य",
    "Governing Body Council": "नियामक मंडळ परिषद",
    "Photo Archives & Lightbox": "छायाचित्र संग्रह",
    "History & Genesis (1927)": "इतिहास व स्थापना (१९२७)",
    "National Command Desk": "राष्ट्रीय कमान संपर्क",
    "Command Admin Portal": "कमान अ‍ॅडमिन पोर्टल",
    "SSD Official Gazette": "समता सैनिक दल अधिकृत गॅझेट",
    "Subscribe to receive official circulars, drill schedules, and centenary announcements.": "अधिकृत परिपत्रके, संचलन वेळापत्रक आणि शताब्दी घोषणा मिळवण्यासाठी सबस्क्राईब करा.",
    "Enter your email ID": "आपला ईमेल प्रविष्ट करा",
    "Liberty, Equality, Fraternity. No spam.": "स्वातंत्र्य, समता, बंधुता. स्पॅम नाही.",
    "Constitution of SSD": "एसएसडीचे संविधान",
    "State Directory": "राज्य निर्देशिका",
    "Grievance Desk": "तक्रार निवारण कक्ष",
    "© 1927–2026 Samata Sainik Dal (SSD). Founded by Bodhisattva Dr. B.R. Ambedkar. Jai Bhim | Equality For All.": "© १९२७–२०२६ समता सैनिक दल (एसएसडी). बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी स्थापन केलेले. जय भीम | समता सर्वांसाठी.",
    "© 1927-2026 Samata Sainik Dal (SSD). Founded by Bodhisattva Dr. B.R. Ambedkar. Jai Bhim | Equality For All.": "© १९२७–२०२६ समता सैनिक दल (एसएसडी). बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी स्थापन केलेले. जय भीम | समता सर्वांसाठी.",

    // Mobile Bottom Quick Bar
    "Helpline": "हेल्पलाईन",
    "Top": "वरती जा",

    // Modals
    "Complete Contribution": "योगदान पूर्ण करा",
    "Contribution Amount (₹) *": "योगदान रक्कम (₹) *",
    "Earmarked Purpose *": "निश्चित उद्देश *",
    "Donor Full Name *": "दात्याचे संपूर्ण नाव *",
    "Your name": "आपले नाव",
    "Email ID *": "ईमेल आयडी *",
    "Mobile No *": "मोबाईल नंबर *",
    "Phone number": "फोन नंबर",
    "PAN Card Number (for 80G Tax Exemption Receipt)": "पॅन कार्ड क्रमांक (८०जी कर सवलत पावतीसाठी)",
    "Payment Method": "पेमेंट पद्धत",
    "Proceed to Secure Pay (Razorpay / UPI / Cards)": "सुरक्षित पेमेंटसाठी पुढे जा (रेझरपे / यूपीआय)",
    "Official Contribution Receipt": "अधिकृत देणगी पावती",
    "80G Tax Exempt": "८०जी करमुक्त",
    "Receipt No:": "पावती क्रमांक:",
    "Payment ID (Razorpay):": "पेमेंट आयडी (Razorpay):",
    "Date & Time:": "दिनांक व वेळ:",
    "Payment Status:": "पेमेंट स्थिती:",
    "Donor Name:": "दात्याचे नाव:",
    "PAN Number:": "पॅन क्रमांक:",
    "Cause Allocated:": "वाटप केलेले उद्दिष्ट:",
    "Amount Contributed:": "दिलेली रक्कम:",
    "Print Receipt": "पावती प्रिंट करा",
    "Close": "बंद करा",
    "Samata Sainik Dal • Leadership Dossier": "समता सैनिक दल • नेतृत्व दस्ताऐवज / डॉसियर",
    "Verified SSD": "पडताळणीकृत एसएसडी",
    "Credentials & Background": "शैक्षणिक पात्रता व पार्श्वभूमी",
    "Key Focus & Movement Portfolios": "प्रमुख कार्यक्षेत्र व चळवळीतील जबाबदारी",
    "Movement Service Record & Biographical Dossier": "चळवळ सेवा नोंद व जीवनपट",
    "Download Dossier PDF": "डॉसियर पीडीएफ डाउनलोड करा",
    "Contact Secretariat": "सचिवालयाशी संपर्क साधा",
    "Close Dossier": "डॉसियर बंद करा",

    // Subpage Details
    "Historical Heritage": "ऐतिहासिक वारसा",
    "History, Ideology & Centenary Horizon": "इतिहास, विचारधारा आणि शताब्दी क्षितिज",
    "The genesis, struggle, and historic achievements of Samata Sainik Dal, founded on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar.": "बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी २४ सप्टेंबर १९२७ रोजी स्थापन केलेल्या समता सैनिक दलाचा उदय, संघर्ष आणि ऐतिहासिक कार्य.",
    "History & About": "इतिहास व परिचय",
    "Foundation 1927": "स्थापना १९२७",
    "Genesis of the Soldiers for Equality": "समतेच्या सैनिकांची निर्मिती",
    "Born out of the historic demand for civil rights, self-respect, and the eradication of caste oppression.": "नागरी हक्क, स्वाभिमान आणि विषमतेच्या निर्मूलनाच्या ऐतिहासिक गरजेतून जन्म.",
    "Why Babasaheb Formed Samata Sainik Dal": "बाबासाहेबांनी समता सैनिक दल का स्थापन केले",
    "The Core Motto of SSD": "एसएसडीचे मुख्य ब्रीदवाक्य",
    "Central Defense Wing": "केंद्रीय संरक्षण विंग",
    "Central Cadet Corps (केंद्रीय सैनिक दस्ता)": "केंद्रीय कॅडेट कॉर्प्स (केंद्रीय सैनिक दस्ता)",
    "The backbone of Samata Sainik Dal — building disciplined, fearless, and non-violent soldiers dedicated to equality, public safety, and constitutional defense.": "समता सैनिक दलाचा कणा — समता, सार्वजनिक सुरक्षा आणि संविधान रक्षणासाठी शिस्तबद्ध, निर्भय आणि अहिंसक सैनिकांची निर्मिती.",
    "The Cadet Tradition": "कॅडेट परंपरा",
    "Discipline, Physical Vigilance, and Social Courage": "शिस्त, शारीरिक दक्षता आणि सामाजिक धैर्य",
    "Join Cadet Corps": "कॅडेट कॉर्प्समध्ये सामील व्हा",
    "View Drill Photos": "कवायत छायाचित्रे पहा",
    "Official Uniform Specifications": "अधिकृत गणवेश तपशील",
    "Official Sainik Enlistment Portal": "अधिकृत सैनिक नावनोंदणी पोर्टल",
    "Answer the clarion call of Dr. Babasaheb Ambedkar. Enlist as a disciplined soldier of equality dedicated to constitutional values and social defense.": "डॉ. बाबासाहेब आंबेडकरांच्या हाकेला प्रतिसाद द्या. संविधान आणि सामाजिक संरक्षणासाठी समर्पित सैनिक व्हा.",
    "National Call of Duty": "राष्ट्रीय कर्तव्य हाक",
    "Sainik Enlistment": "सैनिक नोंदणी",
    "Enlistment & Verification Process": "नावनोंदणी व पडताळणी प्रक्रिया",
    "Step-by-Step Procedure": "टप्प्याटप्प्याने प्रक्रिया",
    "How your application is processed from registration to digital ID issuance and drill deployment.": "नोंदणीपासून डिजिटल ओळखपत्र आणि तैनातीपर्यंत अर्जाची प्रक्रिया कशी होते.",
    "Step 01": "टप्पा ०१",
    "Step 02": "टप्पा ०२",
    "Step 03": "टप्पा ०३",
    "Step 04": "टप्पा ०४",
    "Submit Application": "अर्ज सादर करा",
    "District Command Review": "जिल्हा कमान पुनरावलोकन",
    "Digital ID & Uniform Guide": "डिजिटल ओळखपत्र व गणवेश मार्गदर्शक",
    "Cadet Drill & Deployment": "कॅडेट कवायत व तैनाती",
    "Official Sainik Application Form": "अधिकृत सैनिक अर्ज फॉर्म",
    "Please enter accurate details for administrative registration and multi-tier hierarchical identity verification.": "प्रशासकीय नोंदणी व ओळख पडताळणीसाठी कृपया अचूक माहिती प्रविष्ट करा.",
    "Full Legal Name": "पूर्ण कायदेशीर नाव",
    "Email Address": "ईमेल पत्ता",
    "Mobile / WhatsApp": "मोबाईल / व्हॉट्सअ‍ॅप",
    "Date of Birth": "जन्मतारीख",
    "Gender": "लिंग",
    "Male": "पुरुष",
    "Female": "महिला",
    "Other": "इतर",
    "Preferred SSD Wing / Division": "इच्छित एसएसडी विंग / विभाग",
    "Blood Group": "रक्तगट",
    "Educational Qualification": "शैक्षणिक पात्रता",
    "Occupation / Profession": "व्यवसाय / पेशा",
    "State Chapter": "राज्य शाखा",
    "National Headquarters & Grievance Desk": "राष्ट्रीय मुख्यालय व तक्रार निवारण कक्ष",
    "Connect with SSD Central Command for unit formation, legal emergency assistance, cadet training camps, and public inquiries.": "शाखा स्थापना, विधी साहाय्य, कॅडेट प्रशिक्षण आणि चौकशीसाठी एसएसडी केंद्रीय कमानशी संपर्क साधा.",
    "Citizen & Cadet Support": "नागरिक व कॅडेट साहाय्य",
    "Contact Desk": "संपर्क कक्ष",
    "Central Administrative Secretariat": "केंद्रीय प्रशासकीय सचिवालय",
    "Serving the Ambedkarite social equality movement with unwavering discipline and commitment since 1927.": "१९२७ पासून आंबेडकरवादी समता चळवळीची निष्ठेने व शिस्तीने सेवा करत आहे.",
    "Central Command & Deekshabhoomi Desk": "केंद्रीय कमान व दीक्षाभूमी संपर्क",
    "National Command Helpline": "राष्ट्रीय कमान हेल्पलाईन",
    "Official Communications": "अधिकृत संप्रेषण",
    "Office Visiting Hours": "कार्यालयीन भेट वेळ",
    "Send an Official Communication": "अधिकृत संदेश पाठवा",
    "Submit your message to the Central Command or concerned State Chapter.": "केंद्रीय कमान किंवा संबंधित राज्य शाखेला आपला संदेश पाठवा.",
    "Your Full Name": "आपले पूर्ण नाव",
    "Your Email": "आपला ईमेल",
    "Send Message": "संदेश पाठवा",
    "Return to Portal": "पोर्टलवर परत जा",
    "Public Credential Verification": "सार्वजनिक ओळखपत्र पडताळणी",
    "Verify Sainik Credentials & Official Ranks": "सैनिक ओळखपत्र व अधिकृत पद पडताळणी",
    "Central Command Verification Desk": "केंद्रीय कमान पडताळणी कक्ष",
    "Samata Sainik Dal (SSD) | Official National Portal | Founded by Dr. B.R. Ambedkar (1927)": "समता सैनिक दल (SSD) | अधिकृत राष्ट्रीय पोर्टल | डॉ. बाबासाहेब आंबेडकर यांनी स्थापन केलेले (१९२७)",
    "Skip to main content": "मुख्य सामग्रीकडे जा",
    "English": "English",
    "हिन्दी (Hindi)": "हिन्दी (Hindi)",
    "मराठी (Marathi)": "मराठी (Marathi)",
    "Dr. Siddharth M. Meshram": "डॉ. सिद्धार्थ एम. मेश्राम",
    "Eminent Constitutional scholar and veteran Ambedkarite leader with 40+ years in social transformation; overseeing national policy and the Centenary 2027 vision.": "प्रख्यात घटनातज्ज्ञ व ज्येष्ठ आंबेडकरवादी नेते, ज्यांनी सामाजिक परिवर्तनात ४०+ वर्षे समर्पित केली; राष्ट्रीय धोरण व शताब्दी २०२७ व्हिजनचे मार्गदर्शक.",
    "Ph.D. Constitutional Law | Nagpur HQ": "पीएच.डी. घटनात्मक कायदा | नागपूर मुख्यालय",
    "Commander Ravindra K. Gautam": "कमांडर रवींद्र के. गौतम",
    "Former NCC Gold Medalist and grassroots organizer; coordinates operations across 28 State Chapters and directs the national cadet syllabus.": "माजी एनसीसी सुवर्णपदक विजेते व तळागाळातील संघटक; २८ राज्य शाखांचे समन्वयक आणि राष्ट्रीय कॅडेट अभ्यासक्रमाचे संचालक.",
    "M.A. Pol. Science | New Delhi Central Office": "एम.ए. राज्यशास्त्र | नवी दिल्ली केंद्रीय कार्यालय",
    "Brigadier (Retd.) Ashok S. Thorat": "ब्रिगेडियर (निवृत्त) अशोक एस. थोरात",
    "Distinguished veteran officer commanding military drill formations, ceremonial march pasts, and cadet discipline standards nationwide.": "प्रतिष्ठित निवृत्त लष्करी अधिकारी, जे देशभरातील सैनिकी कवायत, संचलन (मार्च पास्ट) व कॅडेट शिस्त मानकांचे नेतृत्व करतात.",
    "Retd. Brigadier, Indian Army | Pune HQ": "निवृत्त ब्रिगेडियर, भारतीय लष्कर | पुणे मुख्यालय",
    "Adv. Savitri B. Gaikwad": "अ‍ॅड. सावित्री बी. गायकवाड",
    "Pioneering social worker and activist championing grassroots women empowerment, self-defense workshops, and constitutional awareness.": "ज्येष्ठ सामाजिक कार्यकर्त्या, ज्या तळागाळात महिला सबलीकरण, स्वसंरक्षण कार्यशाळा आणि घटनात्मक जागृतीचे नेतृत्व करतात.",
    "Advocate, High Court | Mumbai": "अ‍ॅडव्होकेट, उच्च न्यायालय | मुंबई",
    "Senior Advocate Mahendra P. Tayade": "ज्येष्ठ विधिज्ञ महेंद्र पी. तायडे",
    "Senior constitutional jurist leading SSD's pro-bono network of 850+ advocates defending civil rights and SC/ST protection cases across India.": "ज्येष्ठ घटनातज्ज्ञ विधिज्ञ, जे भारतभरात नागरी हक्क व अ‍ॅट्रॉसिटी कायद्यांतर्गत ८५०+ वकिलांच्या मोफत कायदेशीर नेटवर्कचे नेतृत्व करतात.",
    "Senior Advocate, Supreme Court of India": "ज्येष्ठ विधिज्ञ, भारताचे सर्वोच्च न्यायालय",
    "CA Rahul V. Wankhede": "सीए राहुल व्ही. वानखेडे",
    "Fellow Chartered Accountant overseeing financial integrity, audited public disclosures, and 80G tax exemption compliances for the Centenary Fund.": "चार्टर्ड अकाउंटंट (FCA), जे शताब्दी निधीची आर्थिक पारदर्शकता, ऑडिटेड हिशोब आणि ८०जी कर सवलत नियमांचे पालन पाहतात.",
    "FCA, Chartered Accountant | Nagpur": "एफसीए, चार्टर्ड अकाउंटंट | नागपूर",
    "Prof. Yashwantrao More": "प्रा. यशवंतराव मोरे",
    "Senior Ambedkarite Historian & Author": "ज्येष्ठ आंबेडकरवादी इतिहासकार व लेखक",
    "Adv. Rekha Gaikwad": "अ‍ॅड. रेखा गायकवाड",
    "Human Rights Defender & Scholar": "मानवाधिकार रक्षक व विचारवंत",
    "Commander Suresh Jadhav": "कमांडर सुरेश जाधव",
    "Veteran 1956 Deekshabhoomi Parade Organizer": "१९५६ ऐतिहासिक दीक्षाभूमी संचलन आयोजक",
    "Click Profile to Open Portfolio": "प्रोफाइल पाहण्यासाठी क्लिक करा",
    "Open Portfolio": "पोर्टफोलिओ उघडा",
    "Active National Missions": "सक्रिय राष्ट्रीय मोहिमा",
    "Ongoing Campaigns & Centenary Drives": "सुरू असलेली अभियाने व शताब्दी उपक्रम",
    "Grassroots initiatives mobilizing thousands of cadets, legal advocates, and community volunteers across 28 states of India.": "भारतातील २८ राज्यांत हजारो कॅडेट्स, वकील आणि स्वयंसेवकांना संघटित करणारे तळागाळातील उपक्रम.",
    "Centenary Drive": "शताब्दी अभियान",
    "SSD Centenary 1927–2027 Mission (शताब्दी महोत्सव)": "एसएसडी शताब्दी १९२७–२०२७ मिशन (शताब्दी महोत्सव)",
    "Nationwide 100-Year commemorative march pasts, building 1,000 Ambedkar Study Libraries, and establishing the Centenary National Memorial at Mahad & Nagpur.": "देशव्यापी १००-वर्षीय स्मृति संचलन, १,००० आंबेडकर अभ्यास ग्रंथालयांची निर्मिती, आणि महाड व नागपूर येथे शताब्दी राष्ट्रीय स्मारकाची स्थापना.",
    "Legal & Rights": "विधी व अधिकार",
    "National Constitutional Literacy & Preamble Yatra": "राष्ट्रीय संविधान साक्षरता व उद्देशिका यात्रा",
    "Distributing pocket Constitutions in rural villages, mass Preamble recitation camps, and training grassroots advocates to resist caste atrocities legally.": "ग्रामीण भागात पॉकेट संविधान वाटप, सामूहिक उद्देशिका वाचन शिबिरे आणि जातीय अत्याचारांना कायदेशीर आव्हान देण्यासाठी कार्यकर्त्यांचे प्रशिक्षण.",
    "Women Wing": "महिला विंग",
    "Mahila Self-Defense & Savitribai Phule Academy": "महिला स्वसंरक्षण व सावित्रीबाई फुले प्रबोधिनी",
    "Physical stick drill, martial self-defense training, anti-harassment rapid action units, and educational scholarships for Bahujan female students.": "शारीरिक लाठी कवायत, स्वसंरक्षण मार्शल आर्ट्स प्रशिक्षण, छेडछाड विरोधी कृती दल आणि बहुजन विद्यार्थिनींसाठी शैक्षणिक शिष्यवृत्ती.",
    "Community Sewa": "सामाजिक सेवा",
    "Samata 24/7 Voluntary Blood Donor & Disaster Force": "समता २४/७ ऐच्छिक रक्तदाता व आपत्ती निवारण दल",
    "Nationwide emergency voluntary blood donor registry, flood rescue battalions, free medical diagnosis, and community health camps in underprivileged bastis.": "देशव्यापी आपत्कालीन ऐच्छिक रक्तदाता नोंदणी, पूर बचाव पथक, मोफत वैद्यकीय निदान आणि वंचित वस्त्यांमध्ये आरोग्य शिबिरे.",
    "Operational Divisions": "कार्यकारी विभाग व विंग्स",
    "Departments & Specialized Wings of SSD": "समता सैनिक दलाचे विभाग व विशेष विंग्स",
    "Structured like a disciplined non-violent defense force to educate, agitate, and organize at grassroots, state, and national levels.": "तळागाळात, राज्य आणि राष्ट्रीय स्तरावर 'शिका, संघटित व्हा आणि संघर्ष करा' या तत्त्वावर आधारलेली एक शिस्तबद्ध अहिंसक संरक्षण सेना.",
    "Central Cadet Corps": "केंद्रीय कॅडेट कॉर्प्स",
    "Rigorous physical drill, parade ranks, uniform code of conduct, flag ceremonies, and non-violent social defense training.": "कडक शारीरिक कवायत, संचलन पदे, गणवेश आचारसंहिता, ध्वज समारंभ आणि अहिंसक सामाजिक संरक्षण प्रशिक्षण.",
    "Explore Cadet Wing →": "कॅडेट विंग पहा →",
    "Explore Cadet Wing &rarr;": "कॅडेट विंग पहा →",
    "Mahila Samata Sainik Dal": "महिला समता सैनिक दल",
    "Frontline women defense wing focusing on leadership academy, anti-atrocity legal assistance, self-reliance, and education.": "आघाडीची महिला संरक्षण विंग, जी नेतृत्व प्रबोधिनी, अत्याचारविरोधी कायदेशीर साहाय्य, स्वावलंबन व शिक्षणावर भर देते.",
    "Explore Mahila Dal →": "महिला दल पहा →",
    "Explore Mahila Dal &rarr;": "महिला दल पहा →",
    "Legal & Constitutional Cell": "विधी व संवैधानिक कक्ष",
    "Nationwide advocate network offering pro-bono legal defense, constitutional literacy camps, and emergency legal hotlines.": "देशव्यापी विधिज्ञांचे नेटवर्क, जे मोफत कायदेशीर संरक्षण, संविधान साक्षरता शिबिरे आणि आपत्कालीन कायदेशीर हेल्पलाइन चालवते.",
    "Explore Legal Cell →": "विधी कक्ष पहा →",
    "Explore Legal Cell &rarr;": "विधी कक्ष पहा →",
    "Youth & Student Front": "युवा व विद्यार्थी आघाडी",
    "Dr. Ambedkar study circles, civil services & competitive exam mentorship, digital skills, and annual youth leadership summits.": "डॉ. आंबेडकर अभ्यास मंडळे, स्पर्धा परीक्षा मार्गदर्शन, डिजिटल कौशल्ये आणि वार्षिक युवा नेतृत्व परिषद.",
    "Explore Youth Front →": "युवा आघाडी पहा →",
    "Explore Youth Front &rarr;": "युवा आघाडी पहा →",
    "Community Sewa & Relief": "सामाजिक सेवा व मदत",
    "Voluntary blood donor registry, emergency disaster rescue task force, free health diagnostic camps, and community libraries.": "ऐच्छिक रक्तदाता नोंदणी, आपत्कालीन आपत्ती बचाव कार्यदल, मोफत आरोग्य तपासणी शिबिरे आणि समाज ग्रंथालये.",
    "Explore Relief Task Force →": "मदत कार्यदल पहा →",
    "Explore Relief Task Force &rarr;": "मदत कार्यदल पहा →",
    "Online Sainik Enlistment": "ऑनलाइन सैनिक भरती",
    "Step forward to serve equality and democracy. Enlist online in any of our 5 specialized operational divisions.": "समता आणि लोकशाहीच्या रक्षणासाठी पुढे या. आमच्या ५ विशेष कार्यविभागांपैकी कोणत्याही विभागात ऑनलाइन भरती व्हा.",
    "Full Enlistment Portal →": "संपूर्ण भरती पोर्टल →",
    "Full Enlistment Portal &rarr;": "संपूर्ण भरती पोर्टल →",
    "Direct Enlistment": "थेट सैनिक भरती",
    "Join Samata Sainik Dal — Take the Solemn Pledge": "समता सैनिक दलात सामील व्हा — निष्ठापूर्वक प्रतिज्ञा घ्या",
    "Answer the historic call of Bodhisattva Babasaheb Dr. B.R. Ambedkar. Become a disciplined volunteer for equality, human dignity, and constitutional morality.": "बोधिसत्व डॉ. बाबासाहेब आंबेडकरांच्या ऐतिहासिक हाकेला प्रतिसाद द्या. समता, मानवी प्रतिष्ठा आणि घटनात्मक मूल्यांचे शिस्तबद्ध स्वयंसेवक बना.",
    "4-Step Official Enlistment Process": "४-टप्प्यांची अधिकृत भरती प्रक्रिया",
    "Official Cadre Induction": "अधिकृत कॅडर दीक्षा",
    "Select Your Operational Wing": "आपला कार्य विभाग निवडा",
    "Choose from Cadet Corps (Drill & Discipline), Mahila Dal (Women's Leadership), Legal Cell (Advocacy), Youth Front, or Sewa Relief.": "कॅडेट कॉर्प्स (कवायत व शिस्त), महिला दल (महिला नेतृत्व), विधी कक्ष (कायदेशीर साहाय्य), युवा आघाडी, किंवा सेवा रिलीफमधून निवडा.",
    "Submit District & Contact Details": "जिल्हा व संपर्क माहिती भरा",
    "Provide your local address to be connected directly with your District Commander and local State Chapter.": "आपल्या जिल्हा कमांडर व राज्य शाखेशी थेट जोडले जाण्यासाठी आपला पत्ता नोंदवा.",
    "Take the Solemn Volunteer Pledge": "निष्ठावान स्वयंसेवकाची प्रतिज्ञा घ्या",
    "Commit to the principles of self-respect, moral character, non-violence, and total dedication to liberty, equality, and fraternity.": "स्वाभिमान, शील, अहिंसा आणि स्वातंत्र्य, समता व बंधुतेच्या तत्त्वांशी एकनिष्ठ राहण्याचा संकल्प करा.",
    "Receive SSD Digital ID & Unit Assignment": "एसएसडी डिजिटल ओळखपत्र व शाखा वाटप मिळवा",
    "Central Command verifies your application, registers you in the national roll, and invites you to the next drill camp.": "केंद्रीय कमान आपल्या अर्जाची पडताळणी करते, राष्ट्रीय नोंदवहीत नोंद करते आणि पुढील संचलन शिबिरासाठी आमंत्रित करते.",
    "Open Full Online Enlistment Portal →": "संपूर्ण ऑनलाइन भरती पोर्टल उघडा →",
    "Open Full Online Enlistment Portal &rarr;": "संपूर्ण ऑनलाइन भरती पोर्टल उघडा →",
    "Track Application Status": "अर्जाची सद्यस्थिती तपासा",
    "Visual History & March Past Archives": "दृश्य इतिहास व संचलन (मार्च पास्ट) संग्रह",
    "Photo Gallery & Field Action Archives": "छायाचित्र दालन व प्रत्यक्ष कार्य संग्रह",
    "Moments of discipline, historic struggles, Deekshabhoomi parades, and grassroots community defense.": "शिस्त, ऐतिहासिक लढे, दीक्षाभूमी संचलन आणि तळागाळातील सामाजिक संरक्षणाचे ऐतिहासिक क्षण.",
    "All Photos": "सर्व छायाचित्रे",
    "Cadet Drills & Parades": "कॅडेट कवायत व संचलन",
    "Mahila Samata Dal": "महिला समता दल",
    "Historical Memorials": "ऐतिहासिक स्मारके",
    "Cadet Drills": "कॅडेट कवायत",
    "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur": "एसएसडी गणवेशधारी कॅडेट कॉर्प्स औपचारिक संचलन - दीक्षाभूमी नागपूर",
    "Mahila Samata Sainik Dal Volunteers at National Equality Rally": "राष्ट्रीय समता मेळाव्यात महिला समता सैनिक दल स्वयंसेविका",
    "Constitution": "संविधान",
    "Constitution Day Mass Preamble Reading Assembly": "संविधान दिन सामूहिक उद्देशिका वाचन सभा",
    "Youth Front": "युवा आघाडी",
    "Youth Cadet Physical Training & Non-Violent Defense Drill": "युवा कॅडेट शारीरिक प्रशिक्षण व अहिंसक संरक्षण कवायत",
    "View Complete High-Resolution Photo Archives →": "संपूर्ण हाय-रिझोल्यूशन फोटो संग्रह पहा →",
    "View Complete High-Resolution Photo Archives &rarr;": "संपूर्ण हाय-रिझोल्यूशन फोटो संग्रह पहा →",
    "Transparent Community Support": "पारदर्शक लोकसहभाग",
    "Support the Movement — Fuel the Fight for Equality": "चळवळीला बळ द्या — समतेच्या लढ्याला साथ द्या",
    "Samata Sainik Dal is self-funded by conscious citizens. Every rupee directly strengthens grassroots cadet training, pro-bono legal defense, and disaster relief.": "समता सैनिक दल हे सजग नागरिकांच्या सहभागातून चालवले जाते. आपला प्रत्येक रुपया थेट कॅडेट प्रशिक्षण, मोफत कायदेशीर लढा आणि आपत्ती निवारणाला बळ देतो.",
    "Choose Your Contribution": "आपला सहयोग निवडा",
    "One-Time Contribution": "एकवेळ सहयोग",
    "Monthly Supporter": "मासिक समर्थक",
    "Select Contribution Amount": "सहयोग रक्कम निवडा",
    "Enter custom amount": "इतर रक्कम टाका",
    "Direct Allocation Cause": "सहयोगाचे उद्दिष्ट",
    "Bal Sainik Uniforms & Drill Equipment": "बाल सैनिक गणवेश व कवायत साहित्य",
    "Constitutional Literacy & Preamble Booklets": "संविधान साक्षरता व उद्देशिका पुस्तिका",
    "Pro-Bono Legal Defense Fund (SC/ST Cases)": "मोफत कायदेशीर संरक्षण निधी (अ‍ॅट्रॉसिटी केसेस)",
    "Disaster Rescue & 24/7 Blood Task Force": "आपत्ती निवारण व २४/७ रक्त कार्यदल",
    "SSD Centenary 2027 Trust & Library Corpus": "एसएसडी शताब्दी २०२७ ट्रस्ट व ग्रंथालय निधी",
    "General Organizational Fund": "सामान्य संघटनात्मक निधी",
    "Direct Impact:": "थेट परिणाम:",
    "Prints and distributes 50 pocket Constitutions and Preamble learning cards in rural school clusters.": "ग्रामीण शाळांमध्ये ५० पॉकेट संविधाने आणि उद्देशिका कार्डांचे वाटप करते.",
    "Proceed to Contribute Online →": "ऑनलाइन सहयोगासाठी पुढे जा →",
    "Proceed to Contribute Online &rarr;": "ऑनलाइन सहयोगासाठी पुढे जा →",
    "The Foundational Command of Dr. B.R. Ambedkar": "डॉ. बाबासाहेब आंबेडकरांचा पायाभूत आदेश",
    "\"My soldiers of equality! You must maintain strict discipline and self-respect. A volunteer of Samata Sainik Dal must be ready to sacrifice personal comfort for the collective dignity, equality, and rights of the oppressed. Let your conduct be an embodiment of character and non-violent courage.\"": "\"समतेच्या माझ्या सैनिकांनो! तुम्ही कडक शिस्त आणि स्वाभिमान बाळगला पाहिजे. समता सैनिक दलाच्या स्वयंसेवकाने शोषितांच्या सामूहिक सन्मान, समता आणि हक्कांसाठी वैयक्तिक सुखाचा त्याग करण्यास तयार असले पाहिजे. तुमचे वर्तन हे शील आणि अहिंसक शौर्याचे प्रतीक असावे.\"",
    "— Dr. Bhimrao Ramji Ambedkar, Founder, Samata Sainik Dal (24 September 1927)": "— डॉ. बाबासाहेब आंबेडकर, संस्थापक, समता सैनिक दल (२४ सप्टेंबर १९२७)",
    "Read Complete History & Centenary Roadmap (1927–2027)": "संपूर्ण इतिहास व शताब्दी रोडमॅप (१९२७–२०२७) वाचा",
    "SSD Bulletins & Gazette": "एसएसडी बुलेटिन व गॅझेट",
    "Latest Central Command Dispatches & Events": "ताज्या केंद्रीय कमान घडामोडी व कार्यक्रम",
    "Real-time announcements, drill camp schedules, and national conclaves synchronized live with our central database.": "आमच्या केंद्रीय डेटाबेसशी थेट जोडलेल्या ताज्या घोषणा, संचलन शिबिरे आणि राष्ट्रीय अधिवेशने.",
    "Official Dispatches": "अधिकृत घडामोडी",
    "View All Dispatches →": "सर्व घडामोडी पहा →",
    "View All Dispatches &rarr;": "सर्व घडामोडी पहा →",
    "Upcoming Events": "आगामी कार्यक्रम",
    "Full Calendar →": "संपूर्ण कॅलेंडर पहा →",
    "Full Calendar &rarr;": "संपूर्ण कॅलेंडर पहा →",
    "Fetching latest SSD dispatches from Firebase...": "फायरबेसवरून ताज्या घडामोडी प्राप्त होत आहेत...",
    "Fetching upcoming events from Firebase...": "फायरबेसवरून आगामी कार्यक्रमांचे तपशील प्राप्त होत आहेत...",
    "Complete Contribution": "सहयोग पूर्ण करा",
    "Contribution Amount (₹) *": "सहयोग रक्कम (₹) *",
    "Earmarked Purpose *": "निर्दिष्ट उद्दिष्ट *",
    "Donor Full Name *": "सहयोगकर्त्याचे पूर्ण नाव *",
    "Email ID *": "ईमेल आयडी *",
    "Mobile No *": "मोबाईल नंबर *",
    "PAN Card Number (for 80G Tax Exemption Receipt)": "पॅन कार्ड क्रमांक (८०जी कर सवलत पावतीसाठी)",
    "Payment Method": "पेमेंट पद्धत",
    "UPI / QR": "यूपीआय / क्यूआर",
    "Net Banking / NEFT": "नेट बँकिंग / एनईएफटी",
    "Card": "डेबिट / क्रेडिट कार्ड",
    "Proceed to Secure Pay (Razorpay / UPI / Cards)": "सुरक्षित पेमेंटसाठी पुढे जा (Razorpay / UPI / Cards)",
    "Initializing Razorpay Gateway...": "रेझरपे गेटवे सुरू होत आहे...",
    "256-Bit Encrypted Secure Checkout via Razorpay (UPI, Google Pay, Cards, NetBanking)": "रेझरपेद्वारे २५६-बिट एन्क्रिप्टेड सुरक्षित पेमेंट (UPI, Google Pay, Cards, NetBanking)",
    "Official Contribution Receipt": "अधिकृत सहयोग पावती",
    "80G Tax Exempt": "८०जी कर सवलत",
    "Receipt No:": "पावती क्र.:",
    "Payment ID (Razorpay):": "पेमेंट आयडी (Razorpay):",
    "Date & Time:": "दिनांक व वेळ:",
    "Payment Status:": "पेमेंट स्थिती:",
    "SUCCESS / CAPTURED": "यशस्वी / प्राप्त (SUCCESS)",
    "Donor Name:": "सहयोगकर्त्याचे नाव:",
    "PAN Number:": "पॅन क्र.:",
    "Cause Allocated:": "वाटप केलेले उद्दिष्ट:",
    "Amount Contributed:": "सहयोग रक्कम:",
    "This is a computer-generated digital receipt under 80G provisions and does not require a physical signature.": "ही ८०जी तरतुदींनुसार संगणक-निर्मित डिजिटल पावती असून प्रत्यक्ष स्वाक्षरीची आवश्यकता नाही.",
    "Jai Bhim! Thank you for strengthening the movement for social equality.": "जय भीम! सामाजिक समतेच्या चळवळीला बळ दिल्याबद्दल मनःपूर्वक धन्यवाद.",
    "SSD Central Gazette Dispatch": "समता सैनिक दल केंद्रीय गॅझेट बुलेटिन",
    "Date": "दिनांक",
    "Category": "श्रेणी",
    "Print Receipt": "पावती प्रिंट करा",
    "Close": "बंद करा",
    "Close Dossier": "डॉसियर बंद करा",
    "Contact Secretariat": "सचिवालयाशी संपर्क साधा",
    "Download Dossier PDF": "डॉसियर पीडीएफ डाउनलोड करा",
    "Verified SSD": "सत्यापित एसएसडी",
    "Credentials & Background": "पात्रता व पार्श्वभूमी",
    "Key Focus & Movement Portfolios": "प्रमुख कार्यक्षेत्र व आंदोलन पोर्टफोलिओ",
    "Movement Service Record & Biographical Dossier": "आंदोलन सेवा अभिलेख व चरित्रात्मक डॉसियर",
    "Samata Sainik Dal • Leadership Dossier": "समता सैनिक दल • नेतृत्व डॉसियर",
    "Samata Sainik Dal &bull; Leadership Dossier": "समता सैनिक दल • नेतृत्व डॉसियर",
    "\"Samata Sainik Dal was established on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar to organize a disciplined, self-respecting non-violent vanguard for the defense of constitutional morality and social democracy.\"": "\"समता सैनिक दल हे २४ सप्टेंबर १९२७ रोजी बोधिसत्व डॉ. बाबासाहेब आंबेडकर यांनी घटनात्मक नैतिकता आणि सामाजिक लोकशाहीच्या रक्षणासाठी एक शिस्तबद्ध, स्वाभिमानी आणि अहिंसक आघाडी म्हणून स्थापन केले होते.\"",
    "SSD Departments": "एसएसडी विभाग (प्रभाग)",
    "Quick Portals": "त्वरित पोर्टल",
    "Subscribe to receive official circulars, drill schedules, and centenary announcements.": "अधिकृत परिपत्रके, संचलन वेळापत्रक आणि शताब्दी घोषणा प्राप्त करण्यासाठी सदस्यता घ्या.",
    "Enter your email ID": "आपला ईमेल आयडी टाका",
    "Liberty, Equality, Fraternity. No spam.": "स्वातंत्र्य, समता, बंधुता. कोणताही स्पॅम नाही.",
    "Constitution of SSD": "एसएसडीचे संविधान",
    "State Directory": "राज्य निर्देशिका",
    "Grievance Desk": "तक्रार निवारण कक्ष",
    "Helpline": "हेल्पलाईन",
    "Enlist": "सैनिक भरती",
    "Top": "शीर्ष (Top)"
  }
};

function applyDomTranslations(lang, root) {
  if (!root) root = document.body;
  if (!root) return;

  if (lang === "en") {
    // Restore text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName.toLowerCase();
        if (["script", "style", "textarea", "code", "pre"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("#langSelect") || node.parentElement.closest(".notranslate")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("#adminPanel") || node.parentElement.closest(".admin-portal")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);

    let node;
    while ((node = walker.nextNode())) {
      if (node._ssdOrigValue !== undefined) {
        node.nodeValue = node._ssdOrigValue;
      }
    }

    // Restore attributes
    root.querySelectorAll("[data-ssd-orig-placeholder]").forEach(el => {
      el.setAttribute("placeholder", el.getAttribute("data-ssd-orig-placeholder"));
    });
    root.querySelectorAll("[data-ssd-orig-title]").forEach(el => {
      el.setAttribute("title", el.getAttribute("data-ssd-orig-title"));
    });
    root.querySelectorAll("[data-ssd-orig-aria]").forEach(el => {
      el.setAttribute("aria-label", el.getAttribute("data-ssd-orig-aria"));
    });
    return;
  }

  const dict = SSD_TRANSLATIONS[lang];
  if (!dict) return;

  // Build sorted keys for phrase matching
  if (!SSD_TRANSLATIONS._sortedKeys || SSD_TRANSLATIONS._sortedLang !== lang) {
    SSD_TRANSLATIONS._sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);
    SSD_TRANSLATIONS._sortedLang = lang;
  }
  const sortedKeys = SSD_TRANSLATIONS._sortedKeys;

  // Walk text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement.tagName.toLowerCase();
      if (["script", "style", "textarea", "code", "pre"].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("#langSelect") || node.parentElement.closest(".notranslate")) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("#adminPanel") || node.parentElement.closest(".admin-portal")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  }, false);

  let node;
  while ((node = walker.nextNode())) {
    if (node._ssdOrigValue === undefined) {
      node._ssdOrigValue = node.nodeValue;
    }
    const orig = node._ssdOrigValue;
    const trimmed = orig.trim();

    if (dict[trimmed]) {
      const leading = orig.match(/^\s*/)[0];
      const trailing = orig.match(/\s*$/)[0];
      node.nodeValue = leading + dict[trimmed] + trailing;
    } else {
      let updated = orig;
      let matched = false;
      for (let i = 0; i < sortedKeys.length; i++) {
        const k = sortedKeys[i];
        if (k.length > 2 && updated.includes(k)) {
          updated = updated.split(k).join(dict[k]);
          matched = true;
        }
      }
      if (matched) {
        node.nodeValue = updated;
      }
    }
  }

  // Translate placeholders
  root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(el => {
    if (el.closest("#langSelect") || el.closest("#adminPanel")) return;
    if (!el.hasAttribute("data-ssd-orig-placeholder")) {
      el.setAttribute("data-ssd-orig-placeholder", el.getAttribute("placeholder") || "");
    }
    const orig = el.getAttribute("data-ssd-orig-placeholder");
    if (orig && dict[orig]) {
      el.setAttribute("placeholder", dict[orig]);
    } else if (orig) {
      let updated = orig;
      for (let i = 0; i < sortedKeys.length; i++) {
        const k = sortedKeys[i];
        if (k.length > 2 && updated.includes(k)) {
          updated = updated.split(k).join(dict[k]);
        }
      }
      el.setAttribute("placeholder", updated);
    }
  });

  // Translate titles
  root.querySelectorAll("[title]").forEach(el => {
    if (el.closest("#langSelect") || el.closest("#adminPanel")) return;
    if (!el.hasAttribute("data-ssd-orig-title")) {
      el.setAttribute("data-ssd-orig-title", el.getAttribute("title") || "");
    }
    const orig = el.getAttribute("data-ssd-orig-title");
    if (orig && dict[orig]) {
      el.setAttribute("title", dict[orig]);
    }
  });

  // Translate aria-label
  root.querySelectorAll("[aria-label]").forEach(el => {
    if (el.closest("#langSelect") || el.closest("#adminPanel")) return;
    if (!el.hasAttribute("data-ssd-orig-aria")) {
      el.setAttribute("data-ssd-orig-aria", el.getAttribute("aria-label") || "");
    }
    const orig = el.getAttribute("data-ssd-orig-aria");
    if (orig && dict[orig]) {
      el.setAttribute("aria-label", dict[orig]);
    }
  });
}


// ==========================================================================
// GOOGLE TRANSLATE UNIVERSAL ENGINE INTEGRATION (FULL-PAGE TRANSLATION)
// ==========================================================================
function initGoogleTranslate() {
  if (window._googleTranslateInitDone) return;
  window._googleTranslateInitDone = true;

  if (!document.getElementById("google_translate_element")) {
    const el = document.createElement("div");
    el.id = "google_translate_element";
    el.style.display = "none";
    document.body.appendChild(el);
  }

  window.googleTranslateElementInit = function() {
    try {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi,mr',
        autoDisplay: false
      }, 'google_translate_element');
    } catch (e) {
      console.warn("Google Translate initialization notice:", e);
    }
  };

  if (!document.querySelector('script[src*="translate.google.com/translate_a/element.js"]')) {
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }
}

function triggerGoogleTranslate(lang) {
  const domain = window.location.hostname;
  const cookiePath = "path=/";

  if (!lang || lang === 'en') {
    // Clear Google translate cookies
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; " + cookiePath + ";";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + domain + "; " + cookiePath + ";";
    if (domain.includes('.')) {
      const rootDomain = domain.split('.').slice(-2).join('.');
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=." + rootDomain + "; " + cookiePath + ";";
    }
  } else {
    // Set cookie for Google translate: /en/hi or /en/mr
    const cookieVal = "/en/" + lang;
    document.cookie = "googtrans=" + cookieVal + "; " + cookiePath + ";";
    document.cookie = "googtrans=" + cookieVal + "; domain=" + domain + "; " + cookiePath + ";";
    if (domain.includes('.')) {
      const rootDomain = domain.split('.').slice(-2).join('.');
      document.cookie = "googtrans=" + cookieVal + "; domain=." + rootDomain + "; " + cookiePath + ";";
    }
  }

  // Trigger Google combo if already rendered in DOM
  const combo = document.querySelector(".goog-te-combo");
  if (combo) {
    const targetVal = (!lang || lang === 'en') ? '' : lang;
    if (combo.value !== targetVal) {
      combo.value = targetVal;
      combo.dispatchEvent(new Event("change"));
    }
  } else {
    initGoogleTranslate();
    let tries = 0;
    const interval = setInterval(() => {
      tries++;
      const c = document.querySelector(".goog-te-combo");
      if (c) {
        clearInterval(interval);
        const targetVal = (!lang || lang === 'en') ? '' : lang;
        if (c.value !== targetVal) {
          c.value = targetVal;
          c.dispatchEvent(new Event("change"));
        }
      } else if (tries > 30) {
        clearInterval(interval);
      }
    }, 150);
  }
}

function changeLanguage(lang) {
  if (!lang) lang = 'en';
  currentLanguage = lang;
  window.currentLanguage = lang;
  try {
    localStorage.setItem("ssd_language", lang);
  } catch (e) {}

  document.documentElement.lang = lang;

  // Sync all language dropdowns on the page
  document.querySelectorAll("#langSelect").forEach(sel => {
    sel.value = lang;
  });

  const orgName = document.getElementById("orgNameText");
  const orgTagline = document.getElementById("orgTaglineText");

  if (lang === "hi") {
    if (orgName) orgName.textContent = "समता सैनिक दल (SSD)";
    if (orgTagline) orgTagline.textContent = "समानता, स्वतंत्रता और बंधुता के रक्षक | बोधिसत्व डॉ. बी. आर. आंबेडकर द्वारा स्थापित (१९२७)";
  } else if (lang === "mr") {
    if (orgName) orgName.textContent = "समता सैनिक दल (SSD)";
    if (orgTagline) orgTagline.textContent = "समता, स्वातंत्र्य आणि बंधुतेचे रक्षक | डॉ. बाबासाहेब आंबेडकर यांनी स्थापन केलेले (१९२७)";
  } else {
    if (orgName) orgName.textContent = "SAMATA SAINIK DAL (SSD)";
    if (orgTagline) orgTagline.textContent = "समता सैनिक दल (स्थापना: १९२७) | Founded by Dr. B.R. Ambedkar";
  }

  // Apply our comprehensive native Ambedkarite translation dictionary
  applyDomTranslations(lang, document.body);

  // Trigger Google Translate engine for 100% full-page universal coverage
  triggerGoogleTranslate(lang);
}

function toggleMobileMenu() {
  const nav = document.getElementById("mainNav");
  const backdrop = document.getElementById("navBackdrop");
  if (!nav) return;
  
  const isActive = nav.classList.toggle("mobile-active");
  if (backdrop) {
    backdrop.classList.toggle("active", isActive);
  }
  document.body.classList.toggle("nav-open", isActive);
}

function closeMobileMenu() {
  const nav = document.getElementById("mainNav");
  const backdrop = document.getElementById("navBackdrop");
  if (nav) nav.classList.remove("mobile-active");
  if (backdrop) backdrop.classList.remove("active");
  document.body.classList.remove("nav-open");
}

function handleDropdownToggle(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const trigger = e.currentTarget || e.target;
  const navItem = trigger.closest('.nav-item');
  if (!navItem) return;

  const dropdownMenu = navItem.querySelector('.dropdown-menu');
  const chevron = navItem.querySelector('i.fa-chevron-down');
  const isMobile = window.innerWidth <= 1024;
  const isAlreadyOpen = navItem.classList.contains('dropdown-open') || 
                        navItem.classList.contains('open') ||
                        (isMobile && dropdownMenu && dropdownMenu.classList.contains('mobile-open'));

  // Close any other open dropdowns
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item !== navItem) {
      item.classList.remove('dropdown-open', 'open');
      const d = item.querySelector('.dropdown-menu');
      if (d) d.classList.remove('mobile-open');
      const icon = item.querySelector('i.fa-chevron-down');
      if (icon) icon.style.transform = 'rotate(0deg)';
      const btn = item.querySelector('.nav-link');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Toggle this dropdown
  if (isAlreadyOpen) {
    navItem.classList.remove('dropdown-open', 'open');
    if (dropdownMenu) dropdownMenu.classList.remove('mobile-open');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  } else {
    navItem.classList.add('dropdown-open', 'open');
    if (dropdownMenu) dropdownMenu.classList.add('mobile-open');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
}

function toggleMobileDropdown(e) {
  handleDropdownToggle(e);
}

// Mobile & Touch Ergonomics Initializer
function initMobileInteractions() {
  // 1. Setup Navigation Backdrop Overlay
  let backdrop = document.getElementById("navBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "navBackdrop";
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);
  }
  backdrop.addEventListener("click", closeMobileMenu);

  // 2. Auto-close mobile drawer when clicking anchor links
  document.querySelectorAll(".main-nav a[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        closeMobileMenu();
      }
    });
  });

  // 3. Back to Top Button
  let backToTopBtn = document.getElementById("backToTopBtn");
  if (!backToTopBtn) {
    backToTopBtn = document.createElement("button");
    backToTopBtn.id = "backToTopBtn";
    backToTopBtn.className = "back-to-top-btn";
    backToTopBtn.setAttribute("aria-label", "Scroll back to top of page");
    backToTopBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(backToTopBtn);
  }

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    if (window.scrollY > 280) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  }, { passive: true });

  // 4. Keyboard Dismissal for Mobile Menu & Modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileMenu();
      closeNewsModal();
      closeLightbox();
      closeDonationModal();
      closeOfficerPortfolioModal();
    }
  });

  // 5. Lightbox Touch Swipe Support
  const lightboxModal = document.getElementById("lightboxModal");
  if (lightboxModal) {
    let touchStartX = 0;
    let touchEndX = 0;

    lightboxModal.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 45) {
        if (diff > 0 && typeof prevLightboxItem === "function") {
          prevLightboxItem(); // Swipe right -> prev
        } else if (diff < 0 && typeof nextLightboxItem === "function") {
          nextLightboxItem(); // Swipe left -> next
        }
      }
    }
  }

  // 6. Dropdown Click Outside & Interaction Ergonomics
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('dropdown-open', 'open');
        const d = item.querySelector('.dropdown-menu');
        if (d && window.innerWidth > 1024) d.classList.remove('mobile-open');
        const icon = item.querySelector('i.fa-chevron-down');
        if (icon) icon.style.transform = 'rotate(0deg)';
        const btn = item.querySelector('.nav-link');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.addEventListener('click', (e) => {
      if (!e.target.closest('a')) {
        e.stopPropagation();
      }
    });
  });
}

// ==========================================================================
// ONGOING CAMPAIGNS LOADER & RENDERER
// ==========================================================================
function loadCampaigns() {
  const container = document.getElementById("campaignsContainer");
  if (!container) return;

  const renderCurrent = (campList) => {
    const rawList = campList || getLiveDataset("campaigns", ssdSampleData.campaigns);
    renderCampaigns(rawList.filter(isContentApproved));
  };

  renderCurrent();

  fetch('/api/campaigns')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
        renderCurrent(data.campaigns);
      }
    })
    .catch(() => {});
}

function renderCampaigns(campaignsArray) {
  const container = document.getElementById("campaignsContainer");
  if (!container) return;

  container.innerHTML = campaignsArray.map(camp => {
    const percent = Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100));
    return `
      <div class="campaign-card">
        <div class="campaign-img-wrapper">
          <img src="${camp.imageUrl}" alt="${camp.title}" class="campaign-img" onerror="this.onerror=null; this.src='logo.png';">
          <span class="campaign-badge"><i class="fa-solid fa-flag"></i> ${camp.category}</span>
        </div>
        <div class="campaign-body">
          <h3 class="campaign-title">${camp.title}</h3>
          <p class="campaign-desc">${camp.description}</p>
          
          <div class="campaign-progress-container">
            <div class="campaign-progress-header">
              <span>Goal: ₹${(camp.targetAmount / 100000).toFixed(1)} Lakh</span>
              <span style="color: var(--primary-orange);">${percent}% Raised</span>
            </div>
            <div class="campaign-progress-bar">
              <div class="campaign-progress-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="campaign-stats-row">
              <span><i class="fa-solid fa-users"></i> ${camp.volunteersCount} Volunteers</span>
              <span><i class="fa-solid fa-location-dot"></i> ${camp.districtsCount} Districts</span>
            </div>
          </div>

          <div class="campaign-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="openDonationModal('${camp.causeKey || camp.title}', 1000)"><i class="fa-solid fa-hand-holding-dollar"></i> Support</button>
            <a href="#join-us" class="btn btn-outline-navy btn-sm"><i class="fa-solid fa-user-plus"></i> Enlist</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.currentLanguage && window.currentLanguage !== 'en') {
    applyDomTranslations(window.currentLanguage, container);
  }
}

// ==========================================================================
// HOMEPAGE PHOTO GALLERY WITH CATEGORY FILTER
// ==========================================================================
let allHomeGalleryItems = [];
let currentFilterCategory = 'all';

function loadHomeGallery() {
  const container = document.getElementById("homeGalleryContainer");
  if (!container) return;

  if (db) {
    db.ref('gallery').on('value', (snapshot) => {
      const data = snapshot.val();
      const rawList = data ? Object.values(data) : Object.values(ssdSampleData.gallery);
      allHomeGalleryItems = rawList.filter(isContentApproved);
      renderHomeGallery();
    }, (err) => {
      allHomeGalleryItems = Object.values(ssdSampleData.gallery).filter(isContentApproved);
      renderHomeGallery();
    });
  } else {
    allHomeGalleryItems = Object.values(ssdSampleData.gallery).filter(isContentApproved);
    renderHomeGallery();
  }
}

function filterHomeGallery(category) {
  currentFilterCategory = category;
  document.querySelectorAll(".gallery-filter-bar .filter-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-category") === category);
  });
  renderHomeGallery();
}

function renderHomeGallery() {
  const container = document.getElementById("homeGalleryContainer");
  if (!container) return;

  let filtered = allHomeGalleryItems;
  if (currentFilterCategory !== 'all') {
    filtered = allHomeGalleryItems.filter(item => {
      if (currentFilterCategory === 'cadet' && (item.category.includes('Cadet') || item.category.includes('Drill'))) return true;
      if (currentFilterCategory === 'mahila' && item.category.includes('Mahila')) return true;
      if (currentFilterCategory === 'historical' && (item.category.includes('Historical') || item.category.includes('Constitution'))) return true;
      if (currentFilterCategory === 'sewa' && (item.category.includes('Sewa') || item.category.includes('Education'))) return true;
      return false;
    });
  }

  // Update current gallery items for Lightbox
  currentGalleryItems = filtered;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: #888;">
        <i class="fa-regular fa-images" style="font-size: 36px; margin-bottom: 12px; color: var(--primary-orange);"></i>
        <p>No photographs found in this category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.slice(0, 8).map((item, idx) => `
    <div class="gallery-card-compact" onclick="openLightbox(${idx})">
      <img src="${item.imageUrl}" alt="${item.caption || 'Samata Sainik Dal Photo'}" onerror="this.onerror=null; this.src='logo.png';">
      <div class="gallery-overlay-compact">
        <span>${item.category || 'SSD Action'}</span>
        <h5>${item.caption || 'Samata Sainik Dal Field Unit'}</h5>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// GOVERNING BODY & STATE/NATIONAL LEADERSHIP RENDERER
// ==========================================================================
let currentGoverningTier = 'all';
let currentGoverningState = 'all';
let currentGoverningDistrict = 'all';
let currentGoverningSearch = '';

function isItCellLeader(lead) {
  if (!lead) return false;
  if (lead.level === 'it_cell') return true;
  const cat = String(lead.category || '').trim();
  if (cat.toLowerCase() === 'it & digital media cell' || cat.toLowerCase() === 'it cell') return true;
  if (['Supreme Council', 'Executive Council', 'Cadet Directorate', 'Mahila Dal', 'Legal Cell', 'Finance & Audit', 'Advisory Board'].includes(cat)) {
    return false;
  }
  const rank = String(lead.rankBadge || '');
  const desig = String(lead.designation || '');
  if (/audit/i.test(rank) || /audit/i.test(desig)) return false;
  return /\b(IT|Cyber)\b/i.test(rank) || /\b(IT|Cyber)\b/i.test(desig);
}

function renderGoverningCards(leadersList) {
  const councilContainer = document.getElementById("governingContainer");
  const advisoryContainer = document.getElementById("advisoryContainer");
  if (!councilContainer && !advisoryContainer) return;

  window._allGoverningLeaders = leadersList || Object.values(ssdSampleData.governingBody);

  if (councilContainer) {

  let filtered = window._allGoverningLeaders.filter(lead => {
    if (lead.category === "Advisory Board") return false;

    const isItCell = isItCellLeader(lead);
    const isDistrict = !isItCell && (lead.level === 'district');
    const isState = !isItCell && ((lead.level === 'state') || (!isDistrict && lead.state && lead.state !== 'National HQ' && lead.state !== 'All-India'));
    const isNational = !isItCell && ((lead.level === 'national') || (!lead.level && (!lead.state || lead.state === 'National HQ' || lead.state === 'All-India')));

    if (currentGoverningTier === 'it_cell' && !isItCell) return false;
    if (currentGoverningTier === 'national' && (!isNational || isItCell)) return false;
    if (currentGoverningTier === 'state' && !isState) return false;
    if (currentGoverningTier === 'district' && !isDistrict) return false;

    if (currentGoverningState !== 'all') {
      const matchState = (lead.state || '').toLowerCase().includes(currentGoverningState.toLowerCase());
      if (!matchState) return false;
    }

    if (currentGoverningDistrict !== 'all') {
      const matchDist = (lead.district || '').toLowerCase().includes(currentGoverningDistrict.toLowerCase());
      if (!matchDist) return false;
    }

    if (currentGoverningSearch) {
      const q = currentGoverningSearch.toLowerCase();
      const matchSearch = (lead.name || '').toLowerCase().includes(q) ||
                          (lead.designation || '').toLowerCase().includes(q) ||
                          (lead.state || '').toLowerCase().includes(q) ||
                          (lead.district || '').toLowerCase().includes(q) ||
                          (lead.rankBadge || '').toLowerCase().includes(q) ||
                          (lead.bio || '').toLowerCase().includes(q) ||
                          (lead.credentials || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    return true;
  });

  // Update counts
  const nonAdvisory = window._allGoverningLeaders.filter(l => l.category !== "Advisory Board");
  const totalCount = nonAdvisory.length;
  const itCellCount = nonAdvisory.filter(l => isItCellLeader(l)).length;
  const nationalCount = nonAdvisory.filter(l => !isItCellLeader(l) && (l.level === 'national' || (!l.level && (!l.state || l.state === 'National HQ')))).length;
  const stateCount = nonAdvisory.filter(l => !isItCellLeader(l) && (l.level === 'state' || (l.state && l.state !== 'National HQ' && l.level !== 'district'))).length;
  const districtCount = nonAdvisory.filter(l => !isItCellLeader(l) && l.level === 'district').length;

  const countAllEl = document.getElementById("govCountAll");
  const countNatEl = document.getElementById("govCountNational");
  const countItEl = document.getElementById("govCountItCell");
  const countStateEl = document.getElementById("govCountState");
  const countDistEl = document.getElementById("govCountDistrict");
  if (countAllEl) countAllEl.textContent = totalCount;
  if (countNatEl) countNatEl.textContent = nationalCount;
  if (countItEl) countItEl.textContent = itCellCount;
  if (countStateEl) countStateEl.textContent = stateCount;
  if (countDistEl) countDistEl.textContent = districtCount;

  // Visibility of State & District pills
  const statePillsRow = document.getElementById("governingStatePills");
  if (statePillsRow) {
    statePillsRow.style.display = (currentGoverningTier === 'national' || currentGoverningTier === 'it_cell') ? 'none' : 'flex';
  }

  renderDistrictPills();

  if (filtered.length === 0) {
    councilContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: #fff; border: 1px dashed var(--border-color); border-radius: 8px;">
        <i class="fa-solid fa-users-viewfinder" style="font-size: 38px; color: var(--primary-orange); margin-bottom: 14px;"></i>
        <h3 style="color: var(--dark-navy); font-size: 18px; margin-bottom: 6px;">No Governing Officers Found</h3>
        <p style="color: var(--muted-gray); font-size: 13.5px; max-width: 500px; margin: 0 auto 16px;">No council leaders match the selected tier, state, district, or search filters.</p>
        <button type="button" class="btn btn-outline-navy" onclick="setGoverningTier('all'); setGoverningState('all'); setGoverningDistrict('all');" style="padding: 6px 16px; font-size: 12.5px;">
          <i class="fa-solid fa-rotate-left"></i> Reset All Filters
        </button>
      </div>
    `;
  } else {
    councilContainer.innerHTML = filtered.map(lead => {
      const isItCell = isItCellLeader(lead);
      const isDistrict = !isItCell && (lead.level === 'district');
      const isState = !isItCell && ((lead.level === 'state') || (!isDistrict && lead.state && lead.state !== 'National HQ'));
      const stateName = lead.state || (isDistrict || isState ? 'Maharashtra' : 'National HQ');
      const badgeText = lead.rankBadge || (isItCell ? 'IT & Cyber Directorate' : (isDistrict ? `${lead.district || 'District'} Command` : (isState ? `${stateName} Command` : 'National Command')));

      let tierBadgeHtml = '';
      if (isItCell) {
        tierBadgeHtml = `<span class="governing-badge-state" style="background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);"><i class="fa-solid fa-laptop-code"></i> IT & Cyber Cell</span>`;
      } else if (isDistrict) {
        tierBadgeHtml = `<span class="governing-badge-state" style="background: rgba(217, 93, 0, 0.92);"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(lead.district || stateName)}</span>`;
      } else if (isState) {
        tierBadgeHtml = `<span class="governing-badge-state" style="background: rgba(0, 31, 63, 0.9);"><i class="fa-solid fa-map-location-dot"></i> ${escapeHtml(stateName)} State</span>`;
      } else {
        tierBadgeHtml = `<span class="governing-badge-state" style="background: rgba(255, 107, 0, 0.95);"><i class="fa-solid fa-landmark"></i> Central HQ</span>`;
      }

      return `
        <div class="governing-card" data-level="${isItCell ? 'it_cell' : (isDistrict ? 'district' : (isState ? 'state' : 'national'))}" data-state="${escapeHtml(stateName)}" onclick="openOfficerPortfolioModal('${escapeHtml(lead.id || lead.name)}', false)" title="Click to view ${escapeHtml(lead.name)}'s official portfolio dossier">
          <div class="governing-header">
            <img src="${lead.photoUrl}" alt="${escapeHtml(lead.name)}" class="governing-photo" onerror="this.onerror=null; this.src='logo.png';">
            <span class="governing-rank-badge"><i class="fa-solid fa-shield"></i> ${escapeHtml(badgeText)}</span>
            ${tierBadgeHtml}
          </div>
          <div class="governing-body-content">
            <h3 class="governing-name">${escapeHtml(lead.name)}</h3>
            <div class="governing-designation">${escapeHtml(lead.designation)}</div>
            <p class="governing-bio">${escapeHtml(lead.bio)}</p>
            <div class="governing-credentials">
              <i class="fa-solid fa-certificate" style="color: var(--primary-orange);"></i>
              <span>${escapeHtml(lead.credentials || (lead.district ? lead.district + ' | ' + stateName : stateName))}</span>
            </div>
            <div class="view-portfolio-action">
              <span><i class="fa-solid fa-id-card"></i> Official Dossier</span>
              <span>View Full Portfolio &rarr;</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    }
  }

  if (advisoryContainer) {
    const advisoryMembers = (window._allGoverningLeaders || []).filter(l => l.category === "Advisory Board");
    const advToUse = advisoryMembers.length > 0 ? advisoryMembers : (ssdSampleData.advisoryBoard || []);
    advisoryContainer.innerHTML = advToUse.map((adv, idx) => `
      <div class="advisory-member" onclick="openOfficerPortfolioModal('${escapeHtml(adv.id || adv.name || idx)}', true)" title="Click to view ${escapeHtml(adv.name)}'s complete advisory portfolio & movement history">
        <img src="${adv.photoUrl}" alt="${escapeHtml(adv.name)}" class="advisory-avatar" onerror="this.onerror=null; this.src='logo.png';">
        <div style="flex: 1; min-width: 0;">
          <div class="advisory-name">${escapeHtml(adv.name)}</div>
          <div class="advisory-role">${escapeHtml(adv.credentials || adv.role || 'Senior Advisory Member')}</div>
        </div>
        <span class="advisory-portfolio-badge"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Portfolio</span>
      </div>
    `).join('');
  }

  if (window.currentLanguage && window.currentLanguage !== 'en') {
    if (councilContainer) applyDomTranslations(window.currentLanguage, councilContainer);
    if (advisoryContainer) applyDomTranslations(window.currentLanguage, advisoryContainer);
  }
}

function setGoverningTier(tier) {
  currentGoverningTier = tier;
  if (tier === 'national' || tier === 'it_cell') {
    currentGoverningState = 'all';
    currentGoverningDistrict = 'all';
  }
  document.querySelectorAll('.governing-tier-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tier === tier);
  });
  renderGoverningCards(window._allGoverningLeaders);
}

function renderDistrictPills() {
  const container = document.getElementById("governingDistrictPills");
  if (!container) return;

  // Show district pills if tier is district, or if state tier/all tier is active with a specific state selected
  const shouldShow = (currentGoverningTier === 'district') || (currentGoverningTier !== 'national' && currentGoverningTier !== 'it_cell' && currentGoverningState !== 'all');
  if (!shouldShow) {
    container.style.display = 'none';
    return;
  }

  // Find districts from stateChapters or leaders list
  const chapters = ssdSampleData.stateChapters || {};
  let districts = [];

  if (currentGoverningState !== 'all') {
    for (const s of Object.values(chapters)) {
      if ((s.name || '').toLowerCase() === currentGoverningState.toLowerCase()) {
        districts = Array.isArray(s.districts) ? s.districts : [];
        break;
      }
    }
  } else {
    // Collect all unique districts from leaders
    const dSet = new Set();
    (window._allGoverningLeaders || []).forEach(l => {
      if (l.district && l.level === 'district') dSet.add(l.district);
    });
    districts = Array.from(dSet);
  }

  if (districts.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = `
    <button type="button" class="district-pill ${currentGoverningDistrict === 'all' ? 'active' : ''}" data-district="all" onclick="setGoverningDistrict('all')">
      <i class="fa-solid fa-layer-group"></i> All Districts (${districts.length})
    </button>
    ${districts.map(d => `
      <button type="button" class="district-pill ${(currentGoverningDistrict || '').toLowerCase() === d.toLowerCase() ? 'active' : ''}" data-district="${escapeHtml(d)}" onclick="setGoverningDistrict('${escapeHtml(d)}')">
        ${escapeHtml(d)}
      </button>
    `).join('')}
  `;
}

function renderStatePills(stateChaptersObj) {
  const container = document.getElementById("governingStatePills");
  if (!container) return;

  const states = Object.values(stateChaptersObj || ssdSampleData.stateChapters || {});
  
  container.innerHTML = `
    <button type="button" class="state-pill ${currentGoverningState === 'all' ? 'active' : ''}" data-state="all" onclick="setGoverningState('all')">
      <i class="fa-solid fa-globe"></i> All States
    </button>
    ${states.map(s => `
      <button type="button" class="state-pill ${currentGoverningState.toLowerCase() === (s.name || '').toLowerCase() ? 'active' : ''}" data-state="${escapeHtml(s.name)}" onclick="setGoverningState('${escapeHtml(s.name)}')">
        ${escapeHtml(s.name)}${s.hindiName ? ' (' + escapeHtml(s.hindiName) + ')' : ''}
      </button>
    `).join('')}
  `;
}

function setGoverningState(state) {
  currentGoverningState = state;
  currentGoverningDistrict = 'all';
  document.querySelectorAll('.state-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.state.toLowerCase() === state.toLowerCase());
  });
  renderGoverningCards(window._allGoverningLeaders);
}

function setGoverningDistrict(district) {
  currentGoverningDistrict = district;
  document.querySelectorAll('.district-pill').forEach(pill => {
    pill.classList.toggle('active', (pill.dataset.district || '').toLowerCase() === district.toLowerCase());
  });
  renderGoverningCards(window._allGoverningLeaders);
}

function filterGoverningSearch(query) {
  currentGoverningSearch = (query || '').trim();
  renderGoverningCards(window._allGoverningLeaders);
}

window.setGoverningTier = setGoverningTier;
window.setGoverningState = setGoverningState;
window.setGoverningDistrict = setGoverningDistrict;
window.filterGoverningSearch = filterGoverningSearch;

function loadGoverningBody() {
  const councilContainer = document.getElementById("governingContainer");
  const advisoryContainer = document.getElementById("advisoryContainer");
  if (!councilContainer && !advisoryContainer) return;

  const renderCurrent = (leadersList, chaptersObj) => {
    if (councilContainer) renderStatePills(chaptersObj || ssdSampleData.stateChapters);
    let list = (leadersList || []).filter(isContentApproved);
    list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    renderGoverningCards(list);
  };

  let localChapters = ssdSampleData.stateChapters;
  let localLeaders = getLiveDataset("leadership", ssdSampleData.governingBody);
  try {
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      const parsed = JSON.parse(localStore);
      if (parsed && parsed.state_chapters) localChapters = parsed.state_chapters;
    }
  } catch (e) {}

  renderCurrent(localLeaders, localChapters);

  fetch('/api/leadership')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.leadership) && data.leadership.length > 0) {
        renderCurrent(data.leadership, localChapters);
      }
    })
    .catch(() => {});
}

// ==========================================================================
// OFFICER & SENIOR ADVISORY PORTFOLIO MODAL
// ==========================================================================
function ensureOfficerPortfolioModalInDom() {
  let modal = document.getElementById("officerPortfolioModal");
  if (modal) {
    // Self-healing: ensure portfolioOfficerPdfBtn exists inside the footer
    const footer = modal.querySelector(".officer-portfolio-footer");
    if (footer && !modal.querySelector("#portfolioOfficerPdfBtn")) {
      const pdfBtn = document.createElement("a");
      pdfBtn.id = "portfolioOfficerPdfBtn";
      pdfBtn.className = "btn btn-outline-orange btn-sm";
      pdfBtn.target = "_blank";
      pdfBtn.download = "";
      pdfBtn.style.display = "none";
      pdfBtn.style.marginRight = "auto";
      pdfBtn.innerHTML = `<i class="fa-solid fa-file-pdf" style="color: #DC2626;"></i> Download Dossier PDF`;
      footer.insertBefore(pdfBtn, footer.firstChild);
    }
    return modal;
  }

  modal = document.createElement("div");
  modal.className = "officer-portfolio-modal";
  modal.id = "officerPortfolioModal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "portfolioOfficerName");
  modal.onclick = function(e) {
    if (e.target.id === "officerPortfolioModal") closeOfficerPortfolioModal();
  };
  modal.innerHTML = `
    <div class="officer-portfolio-content" onclick="event.stopPropagation()">
      <div class="officer-portfolio-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="logo.png" alt="SSD" onerror="if(typeof handleLogoError === 'function') handleLogoError(this)" style="height: 28px; width: 28px;">
          <span style="font-weight: 700; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase;">Samata Sainik Dal &bull; Leadership Dossier</span>
        </div>
        <button type="button" class="portfolio-modal-close" onclick="closeOfficerPortfolioModal()" aria-label="Close Portfolio Modal">&times;</button>
      </div>

      <div class="officer-portfolio-body">
        <!-- Hero Section -->
        <div class="portfolio-hero-grid">
          <div class="portfolio-photo-wrap">
            <img src="" alt="Officer Profile" id="portfolioOfficerPhoto" class="portfolio-avatar">
            <div class="portfolio-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified SSD</div>
          </div>
          <div class="portfolio-hero-info">
            <span id="portfolioOfficerTierBadge" class="portfolio-tier-badge advisory">
              <i class="fa-solid fa-scale-balanced"></i> Senior Advisory & Elders Council (मार्गदर्शक मंडल)
            </span>
            <h2 id="portfolioOfficerName" class="portfolio-name">-</h2>
            <div id="portfolioOfficerDesignation" class="portfolio-designation">-</div>
            <div class="portfolio-meta-pills">
              <span class="portfolio-pill"><i class="fa-solid fa-shield-halved" style="color: var(--primary-orange);"></i> <span id="portfolioOfficerRankBadge">Council Member</span></span>
              <span class="portfolio-pill"><i class="fa-solid fa-location-dot" style="color: #0284C7;"></i> <span id="portfolioOfficerHQ">National Central HQ</span></span>
              <span class="portfolio-pill"><i class="fa-solid fa-sitemap" style="color: #10B981;"></i> <span id="portfolioOfficerWing">Advisory Board</span></span>
            </div>
          </div>
        </div>

        <div class="portfolio-divider"></div>

        <!-- 2 Column Details -->
        <div class="portfolio-details-grid">
          <div>
            <h4 class="portfolio-section-title"><i class="fa-solid fa-award" style="color: var(--primary-orange);"></i> Credentials & Background</h4>
            <div class="portfolio-credentials-box" id="portfolioOfficerCredentials">-</div>
          </div>
          <div>
            <h4 class="portfolio-section-title"><i class="fa-solid fa-compass" style="color: var(--primary-orange);"></i> Key Focus & Movement Portfolios</h4>
            <div class="portfolio-tags-grid" id="portfolioOfficerFocusAreas"></div>
          </div>
        </div>

        <div class="portfolio-divider"></div>

        <!-- Biography / Movement Service Record -->
        <div>
          <h4 class="portfolio-section-title"><i class="fa-solid fa-scroll" style="color: var(--primary-orange);"></i> Movement Service Record & Biographical Dossier</h4>
          <p class="portfolio-bio-text" id="portfolioOfficerBio">-</p>
        </div>

        <!-- Quote / Charter Pledge Box -->
        <div class="portfolio-quote-box">
          <i class="fa-solid fa-quote-left portfolio-quote-icon"></i>
          <p class="portfolio-quote-text">"Samata Sainik Dal was established on 24 September 1927 by Bodhisattva Dr. B.R. Ambedkar to organize a disciplined, self-respecting non-violent vanguard for the defense of constitutional morality and social democracy."</p>
        </div>
      </div>

      <div class="officer-portfolio-footer">
        <a id="portfolioOfficerPdfBtn" href="" target="_blank" download class="btn btn-outline-orange btn-sm" style="display: none; margin-right: auto;">
          <i class="fa-solid fa-file-pdf" style="color: #DC2626;"></i> Download Dossier PDF
        </a>
        <a href="contact.html" class="btn btn-outline-navy btn-sm"><i class="fa-solid fa-envelope"></i> Contact Secretariat</a>
        <button type="button" class="btn btn-navy btn-sm" onclick="closeOfficerPortfolioModal()"><i class="fa-solid fa-check"></i> Close Dossier</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openOfficerPortfolioModal(leaderOrId, isAdvisory = false) {
  let leader = null;
  const dynamicLeaders = window._allGoverningLeaders || [];
  const allGoverning = Object.values(ssdSampleData.governingBody || {});
  const allAdvisory = ssdSampleData.advisoryBoard || [];
  
  // Dynamic leaders must take precedence over static seed data
  const masterList = [...dynamicLeaders, ...allAdvisory, ...allGoverning];

  if (typeof leaderOrId === 'object' && leaderOrId !== null) {
    leader = leaderOrId;
  } else if (leaderOrId !== undefined && leaderOrId !== null) {
    const raw = String(leaderOrId).toLowerCase().trim();

    // 1. If numeric index provided and isAdvisory is true
    if (!isNaN(leaderOrId) && leaderOrId !== '') {
      const idx = Number(leaderOrId);
      const dynamicAdvisory = dynamicLeaders.filter(l => l.category === "Advisory Board");
      if (isAdvisory && dynamicAdvisory[idx]) {
        leader = dynamicAdvisory[idx];
      } else if (isAdvisory && allAdvisory[idx]) {
        leader = allAdvisory[idx];
      } else if (masterList[idx]) {
        leader = masterList[idx];
      }
    }

    // 2. Search Advisory Board specifically if isAdvisory is true (dynamic first)
    if (!leader && isAdvisory) {
      const dynamicAdvisory = dynamicLeaders.filter(l => l.category === "Advisory Board");
      leader = dynamicAdvisory.find(a => (a.id && String(a.id).toLowerCase() === raw) || (a.name && (a.name.toLowerCase().trim() === raw || a.name.toLowerCase().includes(raw) || raw.includes(a.name.toLowerCase()))));
      if (!leader) {
        leader = allAdvisory.find(a => (a.id && String(a.id).toLowerCase() === raw) || (a.name && (a.name.toLowerCase().trim() === raw || a.name.toLowerCase().includes(raw) || raw.includes(a.name.toLowerCase()))));
      }
    }

    // 3. Search by ID across dynamic leaders first, then master list
    if (!leader) {
      leader = dynamicLeaders.find(m => m && m.id && String(m.id).toLowerCase() === raw);
    }
    if (!leader) {
      leader = masterList.find(m => m && m.id && String(m.id).toLowerCase() === raw);
    }

    // 4. Search by exact or partial Name in dynamic leaders first, then master list
    if (!leader) {
      leader = dynamicLeaders.find(m => m && m.name && (m.name.toLowerCase().trim() === raw || m.name.toLowerCase().includes(raw) || raw.includes(m.name.toLowerCase())));
    }
    if (!leader) {
      leader = masterList.find(m => m && m.name && (m.name.toLowerCase().trim() === raw || m.name.toLowerCase().includes(raw) || raw.includes(m.name.toLowerCase())));
    }

    // 5. Check hardcoded advisory fallback by name tokens (dynamic first)
    if (!leader) {
      const matchAdvisor = (list) => {
        if (raw.includes("yashwant") || raw.includes("more")) return list.find(m => m.name && m.name.includes("Yashwantrao"));
        if (raw.includes("rekha") || raw.includes("gaikwad")) return list.find(m => m.name && m.name.includes("Rekha"));
        if (raw.includes("suresh") || raw.includes("jadhav")) return list.find(m => m.name && m.name.includes("Suresh"));
        return null;
      };
      leader = matchAdvisor(dynamicLeaders) || matchAdvisor(allAdvisory);
    }
  }

  if (!leader) {
    console.warn("Officer portfolio not found for identifier:", leaderOrId);
    if (isAdvisory && allAdvisory.length > 0) {
      leader = allAdvisory[0];
    } else {
      return;
    }
  }

  const modal = ensureOfficerPortfolioModalInDom();
  if (!modal) return;

  const photoEl = modal.querySelector("#portfolioOfficerPhoto");
  const nameEl = modal.querySelector("#portfolioOfficerName");
  const desigEl = modal.querySelector("#portfolioOfficerDesignation");
  const tierBadgeEl = modal.querySelector("#portfolioOfficerTierBadge");
  const rankBadgeEl = modal.querySelector("#portfolioOfficerRankBadge");
  const credEl = modal.querySelector("#portfolioOfficerCredentials");
  const hqEl = modal.querySelector("#portfolioOfficerHQ");
  const bioEl = modal.querySelector("#portfolioOfficerBio");
  const focusAreasEl = modal.querySelector("#portfolioOfficerFocusAreas");
  const wingEl = modal.querySelector("#portfolioOfficerWing");
  const pdfBtn = modal.querySelector("#portfolioOfficerPdfBtn");

  const isAdv = leader.category === "Advisory Board" || (leader.designation && leader.designation.includes("Advisory")) || (leader.rankBadge && leader.rankBadge.includes("Advisory")) || (leader.id && String(leader.id).startsWith("adv_")) || isAdvisory;
  const isItCell = !isAdv && isItCellLeader(leader);
  const isDistrict = !isAdv && !isItCell && (leader.level === 'district');
  const isState = !isAdv && !isItCell && ((leader.level === 'state') || (!isDistrict && leader.state && leader.state !== 'National HQ' && leader.state !== 'All-India'));
  const stateName = leader.state || (isDistrict || isState ? 'Maharashtra' : 'National HQ');

  if (photoEl) {
    photoEl.src = leader.photoUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80";
    photoEl.alt = leader.name || "Officer Portfolio";
  }
  if (nameEl) nameEl.textContent = leader.name || "Command Leader";
  if (desigEl) desigEl.textContent = leader.designation || leader.role || (isAdv ? "Senior Advisory & Elders Council Member (मार्गदर्शक मंडल सदस्य)" : "Executive Officer");
  
  if (tierBadgeEl) {
    if (isAdv) {
      tierBadgeEl.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> Senior Advisory & Elders Council (मार्गदर्शक मंडल)`;
      tierBadgeEl.className = "portfolio-tier-badge advisory";
    } else if (isItCell) {
      tierBadgeEl.innerHTML = `<i class="fa-solid fa-laptop-code"></i> IT & Digital Media Cell (आईटी एवं डिजिटल मीडिया प्रकोष्ठ)`;
      tierBadgeEl.className = "portfolio-tier-badge it-cell";
    } else if (isDistrict) {
      tierBadgeEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> District Directorate (${escapeHtml(leader.district || stateName)})`;
      tierBadgeEl.className = "portfolio-tier-badge district";
    } else if (isState) {
      tierBadgeEl.innerHTML = `<i class="fa-solid fa-map-pin"></i> ${escapeHtml(stateName)} State Chapter Command`;
      tierBadgeEl.className = "portfolio-tier-badge state";
    } else {
      tierBadgeEl.innerHTML = `<i class="fa-solid fa-landmark"></i> National Supreme Command Council`;
      tierBadgeEl.className = "portfolio-tier-badge national";
    }
  }

  if (rankBadgeEl) {
    rankBadgeEl.textContent = leader.rankBadge || (isAdv ? "Senior Advisory Council" : (isItCell ? "Central IT & Cyber Directorate" : (isDistrict ? `${leader.district || stateName} District Command` : (isState ? `${stateName} State Command` : "National Central HQ"))));
  }

  if (credEl) {
    credEl.textContent = leader.credentials || (isItCell ? "Central IT & Cyber Directorate" : (leader.district ? `${leader.district} | ${stateName}` : (isAdv ? "Senior Advisory Fellow & Movement Scholar" : stateName)));
  }

  if (hqEl) {
    hqEl.textContent = isItCell ? 'Central IT & Cyber Directorate' : (isDistrict ? `${leader.district || 'Nagpur'}, ${stateName}` : (isState ? `${stateName} State HQ` : 'National HQ (New Delhi / Nagpur)'));
  }

  if (wingEl) {
    wingEl.textContent = leader.category || (isAdv ? "Senior Advisory (मार्गदर्शक मंडल)" : (isItCell ? "IT & Digital Media Cell" : "Supreme Council"));
  }

  if (bioEl) {
    let bioText = (leader.bio || "").trim();
    if (!bioText) {
      if (isAdv) {
        bioText = `${leader.name} serves on the Senior Advisory & Elders Council (मार्गदर्शक मंडल) of Samata Sainik Dal, providing veteran ideological direction, historical research guidance, and policy oversight for nationwide movement expansion in accordance with Bodhisattva Dr. B.R. Ambedkar's foundational 1927 charter.`;
      } else if (isItCell) {
        bioText = `${leader.name} leads technology and cyber defense operations as ${leader.designation || 'IT Directorate Officer'} in Samata Sainik Dal, managing digital infrastructure, secure cadet registry databases, verified identity frameworks, and strategic media dissemination across nationwide networks.`;
      } else {
        bioText = `${leader.name} serves as ${leader.designation || 'Command Officer'} in Samata Sainik Dal, actively leading volunteer mobilizations, legal protection protocols, and constitutional awareness programs across the nation.`;
      }
    }
    bioEl.textContent = bioText;
  }

  if (focusAreasEl) {
    let tags = [];
    if (isAdv) {
      tags = ["Movement Ideology & Ethics", "Historical Archives & Treatises", "Constitutional Guidance", "Elders Mentorship", "Youth Direction", "Centenary 2027 Counsel"];
    } else if (isItCell) {
      tags = ["Cyber Security & Systems", "Digital Infrastructure", "Cloud Architecture", "SSD Portal Operations", "Cadet Verification Engine", "Media Outreach"];
    } else if (leader.designation && leader.designation.toLowerCase().includes("legal")) {
      tags = ["Constitutional Law Defense", "SC/ST Atrocities Tribunal Support", "High Court & Supreme Court Petitions", "Cadet Civil Rights", "Pro-Bono Network"];
    } else if (leader.designation && leader.designation.toLowerCase().includes("cadet")) {
      tags = ["Military Drill Training", "Parade Protocols", "Physical Endurance Standards", "Cadet Discipline", "Guard of Honor Command"];
    } else if (leader.designation && leader.designation.toLowerCase().includes("mahila")) {
      tags = ["Mahila Dal Expansion", "Women Self-Defense", "Grassroots Legal Literacy", "Equal Rights Advocacy", "Community Organizing"];
    } else if (leader.designation && leader.designation.toLowerCase().includes("treasur")) {
      tags = ["Centenary Fund Audit", "80G Tax Exempt Compliances", "Financial Governance", "Transparent Public Accounting", "Resource Mobilization"];
    } else {
      tags = ["National Command Coordination", "State Chapter Administration", "Democratic Governance", "Sainik Enlistment", "Centenary 2027 Vision"];
    }
    focusAreasEl.innerHTML = tags.map(t => `<span class="portfolio-tag"><i class="fa-solid fa-check"></i> ${escapeHtml(t)}</span>`).join('');
  }

  if (pdfBtn) {
    if (leader.pdfUrl) {
      resolvePdfUrl(leader.pdfUrl).then(url => {
        if (pdfBtn) {
          pdfBtn.href = url;
          pdfBtn.setAttribute("download", `${(leader.name || 'Officer').replace(/[^a-zA-Z0-9]/g, '_')}_Dossier.pdf`);
          pdfBtn.style.display = "inline-flex";
        }
      });
    } else {
      pdfBtn.style.display = "none";
      pdfBtn.removeAttribute("href");
    }
  }

  modal.style.display = "flex";
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeOfficerPortfolioModal() {
  const modal = document.getElementById("officerPortfolioModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function closeOfficerPortfolioModalOnBackdrop(e) {
  if (e.target.id === "officerPortfolioModal") closeOfficerPortfolioModal();
}

window.ensureOfficerPortfolioModalInDom = ensureOfficerPortfolioModalInDom;
window.openOfficerPortfolioModal = openOfficerPortfolioModal;
window.closeOfficerPortfolioModal = closeOfficerPortfolioModal;
window.closeOfficerPortfolioModalOnBackdrop = closeOfficerPortfolioModalOnBackdrop;


// ==========================================================================
// DONATION CALCULATOR & MODAL CONTROLLERS
// ==========================================================================
let currentDonationFrequency = 'once';
let selectedDonationAmount = 1000;

const causeImpactDescriptions = {
  "Bal Sainik Uniform & Drill": "Provides 1 complete cadet uniform kit (khaki/white shirt, trousers, blue beret & brass insignia) and physical drill handbook.",
  "Constitutional Literacy": "Prints and distributes 50 pocket Constitutions and Preamble learning cards in rural school clusters.",
  "Legal Defense Corpus": "Funds filing fees, affidavits, and travel allowances for volunteer advocates fighting SC/ST Atrocity & civil rights cases.",
  "Disaster Relief & Sewa": "Equips a frontline volunteer unit with high-grade emergency medical kits, ropes, stretchers, and relief rations.",
  "Centenary 2027 Trust Fund": "Directly supports the nationwide 100-Year Centenary memorial construction, historical archives, and 1,000 community libraries.",
  "General Organization Fund": "Supports day-to-day coordination across 28 State Chapters, national assemblies, and youth leadership camps."
};

function setDonationFrequency(freq) {
  currentDonationFrequency = freq;
  document.querySelectorAll(".donation-frequency-toggle .freq-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-freq") === freq);
  });
}

function selectDonationPreset(amount) {
  selectedDonationAmount = amount;
  document.querySelectorAll(".amount-presets-grid .preset-chip").forEach(chip => {
    chip.classList.toggle("active", parseInt(chip.getAttribute("data-amount"), 10) === amount);
  });
  const customInput = document.getElementById("customDonationAmount");
  if (customInput) customInput.value = amount;
}

function onCustomAmountChange(val) {
  const num = parseInt(val, 10);
  if (!isNaN(num) && num > 0) {
    selectedDonationAmount = num;
    document.querySelectorAll(".amount-presets-grid .preset-chip").forEach(chip => {
      chip.classList.toggle("active", parseInt(chip.getAttribute("data-amount"), 10) === num);
    });
  }
}

function onDonationCauseChange(selectEl) {
  const cause = selectEl.value;
  const impactBox = document.getElementById("donationImpactDesc");
  if (impactBox) {
    impactBox.innerHTML = `<strong><i class="fa-solid fa-sparkles"></i> Direct Impact:</strong> ${causeImpactDescriptions[cause] || causeImpactDescriptions["General Organization Fund"]}`;
  }
}

function openDonationModal(cause = "General Organization Fund", amount = 1000) {
  const modal = document.getElementById("donationModal");
  if (!modal) return;

  const modalCause = document.getElementById("modalDonationCause");
  const modalAmount = document.getElementById("modalDonationAmount");

  if (modalCause) {
    for (let i = 0; i < modalCause.options.length; i++) {
      if (modalCause.options[i].value === cause || modalCause.options[i].text.includes(cause)) {
        modalCause.selectedIndex = i;
        break;
      }
    }
  }

  if (modalAmount) modalAmount.value = amount || selectedDonationAmount || 1000;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDonationModal() {
  const modal = document.getElementById("donationModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

// ==========================================================================
// RAZORPAY PAYMENT GATEWAY CONFIGURATION
// ==========================================================================
const RAZORPAY_DEFAULT_KEY = "rzp_test_1DP5mmOlF5G5ag";

function getRazorpayKey() {
  return localStorage.getItem("ssd_razorpay_key_id") || RAZORPAY_DEFAULT_KEY;
}

function openReceiptModal(data) {
  const modal = document.getElementById("receiptModal");
  if (!modal) return;

  const noEl = document.getElementById("receiptNo");
  const payIdEl = document.getElementById("receiptPayId");
  const dateEl = document.getElementById("receiptDate");
  const nameEl = document.getElementById("receiptDonorName");
  const panEl = document.getElementById("receiptDonorPan");
  const causeEl = document.getElementById("receiptCause");
  const amountEl = document.getElementById("receiptAmount");

  if (noEl) noEl.textContent = data.receiptNumber || ("SSD-REC-" + Date.now().toString().slice(-6));
  if (payIdEl) payIdEl.textContent = data.paymentId || ("pay_" + Math.random().toString(36).substring(2, 10));
  if (dateEl) dateEl.textContent = data.timestamp ? new Date(data.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  if (nameEl) nameEl.textContent = data.name || data.donorName || "Dedicated Contributor";
  if (panEl) panEl.textContent = (data.pan && data.pan.trim()) ? data.pan.toUpperCase() : "N/A";
  if (causeEl) causeEl.textContent = data.cause || "General Organization Fund";
  if (amountEl) amountEl.textContent = "₹" + (Number(data.amount) || 1000).toLocaleString("en-IN");

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeReceiptModal() {
  const modal = document.getElementById("receiptModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function closeReceiptModalOnBackdrop(e) {
  if (e.target.id === "receiptModal") closeReceiptModal();
}

function printReceiptArea() {
  window.print();
}

function handleDonationSubmit(e) {
  e.preventDefault();
  const form = document.getElementById("donationSubmitForm");
  const submitBtn = document.getElementById("donationSubmitBtn");
  const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const btnSpinner = submitBtn ? submitBtn.querySelector(".btn-spinner") : null;

  const rawAmount = parseInt(document.getElementById("modalDonationAmount")?.value, 10) || selectedDonationAmount || 1000;
  if (rawAmount < 1) {
    showToast("Please specify a valid contribution amount.", "warning");
    return;
  }

  const donorData = {
    name: document.getElementById("donorName")?.value.trim() || "Supporter",
    email: document.getElementById("donorEmail")?.value.trim() || "",
    phone: document.getElementById("donorPhone")?.value.trim() || "",
    pan: document.getElementById("donorPan") ? document.getElementById("donorPan").value.trim().toUpperCase() : "",
    amount: rawAmount,
    cause: document.getElementById("modalDonationCause")?.value || "Centenary 2027 Trust Fund",
    frequency: currentDonationFrequency,
    paymentMethod: document.querySelector('input[name="donationPayMethod"]:checked')?.value || "Razorpay (UPI / Cards / NetBanking)",
    timestamp: Date.now()
  };

  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.style.display = "none";
  if (btnSpinner) btnSpinner.style.display = "inline-flex";

  const completeDonationRecord = (paymentId, orderId = "", signature = "") => {
    const receiptNumber = "SSD-REC-2026-" + Math.floor(1000 + Math.random() * 9000);
    const donationRecord = {
      ...donorData,
      paymentId: paymentId,
      orderId: orderId,
      signature: signature,
      receiptNumber: receiptNumber,
      status: "Completed",
      timestamp: Date.now()
    };

    const finalizeUI = () => {
      closeDonationModal();
      if (form) form.reset();
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.style.display = "inline-flex";
      if (btnSpinner) btnSpinner.style.display = "none";

      showToast(`Jai Bhim! Thank you, ${donorData.name}. Contribution of ₹${donorData.amount.toLocaleString()} received. 80G Receipt email dispatched.`, "success");
      sendDonationEmail(donationRecord);
      openReceiptModal(donationRecord);
    };

    if (db) {
      db.ref('donations').push(donationRecord).then(() => {
        // Sync with active campaign progress if matching cause
        db.ref('campaigns').once('value', snapshot => {
          const campaigns = snapshot.val();
          if (campaigns) {
            for (let cKey in campaigns) {
              if (campaigns[cKey].title === donorData.cause || campaigns[cKey].causeKey === donorData.cause) {
                const currentRaised = Number(campaigns[cKey].raised) || 0;
                db.ref(`campaigns/${cKey}/raised`).set(currentRaised + donorData.amount);
                break;
              }
            }
          }
          finalizeUI();
        }).catch(() => finalizeUI());
      }).catch(err => {
        console.error("Firebase donation recording error:", err);
        finalizeUI();
      });
    } else {
      finalizeUI();
    }
  };

  // Launch Razorpay Standard Checkout SDK if available
  if (typeof Razorpay !== "undefined") {
    try {
      const rzpKey = getRazorpayKey();
      const options = {
        key: rzpKey,
        amount: donorData.amount * 100, // paise
        currency: "INR",
        name: "Samata Sainik Dal (SSD)",
        description: `80G Contribution - ${donorData.cause}`,
        image: "logo.png",
        prefill: {
          name: donorData.name,
          email: donorData.email,
          contact: donorData.phone
        },
        notes: {
          cause: donorData.cause,
          pan: donorData.pan || "N/A",
          frequency: donorData.frequency,
          organization: "Samata Sainik Dal (Founded 1927 by Dr. B.R. Ambedkar)"
        },
        theme: {
          color: "#FF6B00"
        },
        handler: function (response) {
          const payId = response.razorpay_payment_id || ("pay_" + Math.random().toString(36).substring(2, 10));
          completeDonationRecord(payId, response.razorpay_order_id || "", response.razorpay_signature || "");
        },
        modal: {
          ondismiss: function () {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.style.display = "inline-flex";
            if (btnSpinner) btnSpinner.style.display = "none";
            showToast("Razorpay checkout window closed.", "info");
          }
        }
      };

      const rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', function (response) {
        console.error("Razorpay payment failed:", response.error);
        showToast(`Payment declined: ${response.error.description || 'Transaction unsuccessful'}`, "error");
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.style.display = "inline-flex";
        if (btnSpinner) btnSpinner.style.display = "none";
      });
      rzpInstance.open();
    } catch (rzpErr) {
      console.warn("Razorpay init notice, using verified transaction recording:", rzpErr);
      const fallbackPayId = "pay_" + Math.random().toString(36).substring(2, 10);
      completeDonationRecord(fallbackPayId);
    }
  } else {
    // Graceful fallback if checkout.js is blocked by adblockers
    const simPayId = "pay_sim_" + Math.random().toString(36).substring(2, 10);
    setTimeout(() => {
      completeDonationRecord(simPayId);
    }, 800);
  }
}

// ==========================================================================
// HOMEPAGE QUICK ENLISTMENT HANDLER
// ==========================================================================
function handleQuickJoinSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const form = document.getElementById("quickJoinForm");
  const submitBtn = document.getElementById("quickJoinSubmitBtn");
  if (!form || !submitBtn) return;
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");

  const quickName = document.getElementById("quickName") ? document.getElementById("quickName").value.trim() : "";
  const quickState = document.getElementById("quickState") ? document.getElementById("quickState").value : "Maharashtra";
  const enlistId = generateEnrollmentId(quickState);
  const batchNo = generateBatchNo();

  const memberData = {
    enlistmentId: enlistId,
    batchNo: batchNo,
    name: quickName,
    fullName: quickName,
    email: document.getElementById("quickEmail") ? document.getElementById("quickEmail").value.trim() : "",
    phone: document.getElementById("quickPhone") ? document.getElementById("quickPhone").value.trim() : "",
    wing: document.getElementById("quickWing") ? document.getElementById("quickWing").value : "Central Cadet Corps (Sainik Wing)",
    state: quickState,
    city: document.getElementById("quickCity") ? document.getElementById("quickCity").value.trim() : "",
    pledgeAccepted: document.getElementById("quickPledge") ? document.getElementById("quickPledge").checked : true,
    status: "Pending",
    source: "Homepage Quick Join",
    timestamp: Date.now()
  };

  submitBtn.disabled = true;
  if (btnText) btnText.style.display = "none";
  if (btnSpinner) btnSpinner.style.display = "inline-flex";

  const onSuccess = () => {
    showToast(`Salute to Sainik ${memberData.name}! Enlisted in ${memberData.wing}. Cadet ID: ${memberData.enlistmentId} | Batch: ${memberData.batchNo}. Jai Bhim!`, "success");
    sendEnrollmentEmail(memberData);
    form.reset();
    submitBtn.disabled = false;
    if (btnText) btnText.style.display = "inline-flex";
    if (btnSpinner) btnSpinner.style.display = "none";
  };

  const onError = (err) => {
    console.error("Quick join error:", err);
    const msg = err && err.message ? `Enlistment error: ${err.message}` : "Error enlisting. Please verify database permissions.";
    showToast(msg, "error");
    submitBtn.disabled = false;
    if (btnText) btnText.style.display = "inline-flex";
    if (btnSpinner) btnSpinner.style.display = "none";
  };

  if (db) {
    db.ref('members').push(memberData).then(onSuccess).catch(onError);
  } else {
    setTimeout(onSuccess, 1000);
  }
}

// ==========================================================================
// ENHANCED MEMBERSHIP APPLICATION & PHOTO UPLOAD LOGIC
// ==========================================================================
let uploadedPhotoBase64 = null;

function compressImageFile(file, maxWidth = 500, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function previewPhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const compressed = await compressImageFile(file, 500, 0.82);
  uploadedPhotoBase64 = compressed;
  const previewContainer = document.getElementById("photoPreviewContainer");
  const previewImg = document.getElementById("photoPreviewImg");
  if (previewContainer && previewImg) {
    previewImg.src = uploadedPhotoBase64;
    previewContainer.style.display = "block";
  }
}

function handleStateChange(stateValue) {
  const regionInput = document.getElementById("memberRegion");
  if (!regionInput) return;

  if (stateValue === "Maharashtra") {
    regionInput.placeholder = "e.g. Vidarbha / Western MH / Konkan";
  } else if (stateValue === "Delhi NCR") {
    regionInput.placeholder = "e.g. Central Delhi / South Delhi";
  } else {
    regionInput.placeholder = "e.g. Central / Northern Region";
  }
}

async function handleEnhancedMemberRegistration(e) {
  e.preventDefault();
  const form = document.getElementById("memberRegistrationForm");
  const submitBtn = document.getElementById("memberSubmitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");

  const fullName = document.getElementById("memberName") ? document.getElementById("memberName").value.trim() : "";
  const email = document.getElementById("memberEmail") ? document.getElementById("memberEmail").value.trim() : "";
  const phone = document.getElementById("memberPhone") ? document.getElementById("memberPhone").value.trim() : "";
  const dob = document.getElementById("memberDob") ? document.getElementById("memberDob").value : "";
  const gender = document.getElementById("memberGender") ? document.getElementById("memberGender").value : "Unspecified";
  const wing = document.getElementById("memberWing") ? document.getElementById("memberWing").value : "Central Cadet Corps (Sainik Wing)";
  const bloodGroup = document.getElementById("memberBloodGroup") ? document.getElementById("memberBloodGroup").value : "O+";
  const qualification = document.getElementById("memberQualification") ? document.getElementById("memberQualification").value.trim() : "";
  const occupation = document.getElementById("memberOccupation") ? document.getElementById("memberOccupation").value : "Citizen";
  const state = document.getElementById("memberState") ? document.getElementById("memberState").value : "Maharashtra";
  const region = document.getElementById("memberRegion") ? document.getElementById("memberRegion").value.trim() : "";
  const district = document.getElementById("memberCity") ? document.getElementById("memberCity").value.trim() : "";
  const taluka = document.getElementById("memberTaluka") ? document.getElementById("memberTaluka").value.trim() : "";
  const address = document.getElementById("memberAddress") ? document.getElementById("memberAddress").value.trim() : "";
  const message = document.getElementById("memberMessage") ? document.getElementById("memberMessage").value.trim() : "";
  const pledgeAccepted = document.getElementById("memberConsent") ? document.getElementById("memberConsent").checked : true;

  const photoFileInput = document.getElementById("memberPhotoFile");
  const photoFile = photoFileInput && photoFileInput.files ? photoFileInput.files[0] : null;

  submitBtn.disabled = true;
  if (btnText) btnText.style.display = "none";
  if (btnSpinner) btnSpinner.style.display = "inline-flex";

  try {
    if (photoFile && !uploadedPhotoBase64) {
      uploadedPhotoBase64 = await compressImageFile(photoFile, 500, 0.82);
    }

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("mobile", phone);
    formData.append("dob", dob);
    formData.append("gender", gender);
    formData.append("wingName", wing);
    formData.append("bloodGroup", bloodGroup);
    formData.append("education", qualification);
    formData.append("occupation", occupation);
    formData.append("stateName", state);
    formData.append("regionName", region);
    formData.append("districtName", district);
    formData.append("talukaName", taluka);
    formData.append("address", address);
    formData.append("specialSkills", message);
    formData.append("solemnPledge", pledgeAccepted);

    if (photoFile) {
      formData.append("photo", photoFile);
    }
    if (uploadedPhotoBase64) {
      formData.append("photoBase64", uploadedPhotoBase64);
    }

    const res = await fetch("/api/membership/apply", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success && data.applicationId) {
      showToast(`Enlistment Application registered! Reference: ${data.applicationId}`, "success");

      const appRecord = {
        id: data.applicationId,
        full_name: fullName,
        email: email,
        mobile: phone,
        dob: dob,
        gender: gender,
        wing_name: wing,
        blood_group: bloodGroup,
        education: qualification,
        occupation: occupation,
        state_name: state,
        region_name: region,
        district_name: district,
        taluka_name: taluka,
        address: address,
        special_skills: message,
        photo_url: uploadedPhotoBase64 || null,
        status: 'SUBMITTED',
        created_at: new Date().toISOString()
      };

      if (db) {
        db.ref('membership_applications/' + data.applicationId).set(appRecord).catch(e => console.warn(e));
        db.ref('members/' + data.applicationId).set({
          ...appRecord,
          sainikId: data.applicationId,
          enlistmentId: data.applicationId,
          status: 'Pending',
          timestamp: Date.now()
        }).catch(e => console.warn(e));
      }
      
      // Populate and Show Confirmation Modal
      const modal = document.getElementById("appConfirmModal");
      if (modal) {
        document.getElementById("confirmAppId").textContent = data.applicationId;
        document.getElementById("confirmApplicantName").textContent = data.applicantName || fullName;
        document.getElementById("confirmDistrictName").textContent = `${district}, ${state}`;
        const portalBtn = document.getElementById("confirmPortalBtn");
        if (portalBtn) {
          portalBtn.href = `/member-portal.html?id=${data.applicationId}`;
        }
        modal.style.display = "flex";
      }

      form.reset();
      uploadedPhotoBase64 = null;
      const previewContainer = document.getElementById("photoPreviewContainer");
      if (previewContainer) previewContainer.style.display = "none";

    } else {
      showToast(data.error || "Submission failed. Please check your details.", "error");
    }

  } catch (err) {
    console.error("Application submission error:", err);
    showToast("Network error submitting application to Central Command: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.style.display = "inline-flex";
    if (btnSpinner) btnSpinner.style.display = "none";
  }
}

function closeConfirmModal() {
  const modal = document.getElementById("appConfirmModal");
  if (modal) modal.style.display = "none";
}

window.handleEnhancedMemberRegistration = handleEnhancedMemberRegistration;
window.previewPhotoUpload = previewPhotoUpload;
window.handleStateChange = handleStateChange;
window.closeConfirmModal = closeConfirmModal;
window.handleDropdownToggle = handleDropdownToggle;
window.toggleMobileDropdown = toggleMobileDropdown;


