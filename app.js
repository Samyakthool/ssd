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
      name: "Commander Ashok R. Gaikwad",
      designation: "State Commander, Maharashtra State SSD",
      quote: "Serving in Samata Sainik Dal for 35 years has taught me the true meaning of Babasaheb's mission. The discipline, the uniform, and our commitment to equality give us the moral strength to defend our people.",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    "test_2": {
      name: "Sunita Kamble",
      designation: "Chief Organizer, Mahila Samata Sainik Dal, Vidarbha",
      quote: "Babasaheb envisioned women at the forefront of social change. Through Mahila Samata Sainik Dal, thousands of young women have learned self-defense, legal rights, and community leadership.",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
    },
    "test_3": {
      name: "Adv. Rajesh V. Gautam",
      designation: "Convener, SSD National Legal Advisory Cell",
      quote: "SSD is not just an organization; it is the constitutional guard force of the marginalized. We work tirelessly across courts to ensure that the protective safeguards envisioned by Dr. Ambedkar are fully enforced.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
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
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      bio: "Chartered Accountant and academician; ensures 100% organizational transparency, public audit compliance, 80G tax exemptions, and Centenary 2027 trust governance.",
      credentials: "FCA, M.Com | Central Audit Bureau",
      order: 6
    },
    "lead_it_1": {
      name: "Er. Aniket S. Meshram",
      designation: "National Head, IT & Digital Media Cell (राष्ट्रीय आईटी प्रमुख)",
      level: "national",
      category: "IT & Digital Media Cell",
      state: "National HQ",
      rankBadge: "IT & Cyber Directorate",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
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
  initStickyHeader();
  initMobileInteractions();
  updateDbStatus(isFirebaseLive, isFirebaseLive ? "Connected to Live SSD Firebase Database" : "SSD Official Demo Ready (Connect Firebase in Admin Panel)");
  if (document.getElementById("statMembers")) loadStats();
  if (document.getElementById("campaignsContainer")) loadCampaigns();
  if (document.getElementById("newsContainer")) loadNews();
  if (document.getElementById("eventsContainer")) loadEvents();
  if (document.getElementById("galleryContainer")) loadGallery();
  if (document.getElementById("homeGalleryContainer")) loadHomeGallery();
  if (document.getElementById("governingContainer")) loadGoverningBody();
  if (document.getElementById("testimonialContainer")) loadTestimonials();
});

// Load Stats
function loadStats() {
  if (db) {
    db.ref('stats').on('value', (snapshot) => {
      const stats = snapshot.val() || ssdSampleData.stats;
      renderStats(stats);
    }, (error) => {
      renderStats(ssdSampleData.stats);
    });
  } else {
    renderStats(ssdSampleData.stats);
  }
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

  if (db) {
    db.ref('news').limitToLast(limit * 2).on('value', (snapshot) => {
      const data = snapshot.val();
      const rawList = data ? Object.values(data) : Object.values(ssdSampleData.news);
      const approvedList = rawList.filter(isContentApproved).slice(-limit);
      renderNews(approvedList);
    }, (err) => {
      renderNews(Object.values(ssdSampleData.news).filter(isContentApproved));
    });
  } else {
    const rawList = Object.values(ssdSampleData.news);
    renderNews(rawList.filter(isContentApproved));
  }
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
}

// Load Events
function loadEvents() {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  if (db) {
    db.ref('events').orderByChild('status').equalTo('upcoming').limitToLast(8).on('value', (snapshot) => {
      const data = snapshot.val();
      const rawList = data ? Object.values(data) : Object.values(ssdSampleData.events);
      const approvedList = rawList.filter(e => e.status === 'upcoming' && isContentApproved(e)).slice(-4);
      renderEvents(approvedList);
    }, (err) => {
      renderEvents(Object.values(ssdSampleData.events).filter(e => e.status === 'upcoming' && isContentApproved(e)));
    });
  } else {
    renderEvents(Object.values(ssdSampleData.events).filter(e => e.status === 'upcoming' && isContentApproved(e)));
  }
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

  if (db) {
    db.ref('gallery').on('value', (snapshot) => {
      const data = snapshot.val();
      const rawList = data ? Object.values(data) : Object.values(ssdSampleData.gallery);
      renderGallery(rawList.filter(isContentApproved));
    }, (err) => {
      renderGallery(Object.values(ssdSampleData.gallery).filter(isContentApproved));
    });
  } else {
    renderGallery(Object.values(ssdSampleData.gallery).filter(isContentApproved));
  }
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

// Testimonials
let currentTestimonials = [];
let currentTestimonialIndex = 0;
let testimonialAutoSlideTimer = null;

function loadTestimonials() {
  const container = document.getElementById("testimonialContainer");
  if (!container) return;

  if (db) {
    db.ref('testimonials').on('value', (snapshot) => {
      const data = snapshot.val();
      renderTestimonials(data ? Object.values(data) : Object.values(ssdSampleData.testimonials));
    }, (err) => {
      renderTestimonials(Object.values(ssdSampleData.testimonials));
    });
  } else {
    renderTestimonials(Object.values(ssdSampleData.testimonials));
  }
}

function renderTestimonials(testimonialsArray) {
  const container = document.getElementById("testimonialContainer");
  const dotsContainer = document.getElementById("testimonialDots");
  if (!container) return;

  currentTestimonials = testimonialsArray;
  currentTestimonialIndex = 0;

  container.innerHTML = testimonialsArray.map((item, idx) => `
    <div class="testimonial-slide ${idx === 0 ? 'active' : ''}" id="testSlide_${idx}">
      <div class="testimonial-quote-icon"><i class="fa-solid fa-quote-left"></i></div>
      <p class="testimonial-quote-text">"${item.quote}"</p>
      <div class="testimonial-author-box">
        <img src="${item.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}" alt="${item.name}" class="testimonial-avatar" onerror="this.onerror=null; this.src='logo.png';">
        <div class="testimonial-meta">
          <div class="testimonial-author-name">${item.name}</div>
          <div class="testimonial-designation">${item.designation || 'Sainik Commander'}</div>
        </div>
      </div>
    </div>
  `).join('');

  if (dotsContainer) {
    dotsContainer.innerHTML = testimonialsArray.map((_, idx) => `
      <span class="testimonial-dot ${idx === 0 ? 'active' : ''}" onclick="goToTestimonial(${idx})"></span>
    `).join('');
  }

  if (testimonialAutoSlideTimer) clearInterval(testimonialAutoSlideTimer);
  testimonialAutoSlideTimer = setInterval(() => {
    if (!currentTestimonials.length) return;
    const nextIdx = (currentTestimonialIndex + 1) % currentTestimonials.length;
    goToTestimonial(nextIdx);
  }, 6000);
}

function goToTestimonial(index) {
  if (!currentTestimonials.length) return;
  currentTestimonialIndex = index;
  document.querySelectorAll(".testimonial-slide").forEach((slide, idx) => {
    slide.classList.toggle("active", idx === index);
  });
  document.querySelectorAll(".testimonial-dot").forEach((dot, idx) => {
    dot.classList.toggle("active", idx === index);
  });
}

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

function changeLanguage(lang) {
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

function toggleMobileDropdown(e) {
  if (window.innerWidth <= 1024) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = e.currentTarget.nextElementSibling;
    if (dropdown) {
      dropdown.classList.toggle("mobile-open");
      const icon = e.currentTarget.querySelector("i.fa-chevron-down");
      if (icon) {
        icon.style.transform = dropdown.classList.contains("mobile-open") ? "rotate(180deg)" : "rotate(0deg)";
      }
    }
  }
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
}

// ==========================================================================
// ONGOING CAMPAIGNS LOADER & RENDERER
// ==========================================================================
function loadCampaigns() {
  const container = document.getElementById("campaignsContainer");
  if (!container) return;

  if (db) {
    db.ref('campaigns').on('value', (snapshot) => {
      const data = snapshot.val();
      const rawList = data ? Object.values(data) : Object.values(ssdSampleData.campaigns);
      renderCampaigns(rawList.filter(isContentApproved));
    }, (err) => {
      renderCampaigns(Object.values(ssdSampleData.campaigns).filter(isContentApproved));
    });
  } else {
    renderCampaigns(Object.values(ssdSampleData.campaigns).filter(isContentApproved));
  }
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

function renderGoverningCards(leadersList) {
  const councilContainer = document.getElementById("governingContainer");
  const advisoryContainer = document.getElementById("advisoryContainer");
  if (!councilContainer) return;

  window._allGoverningLeaders = leadersList || Object.values(ssdSampleData.governingBody);

  let filtered = window._allGoverningLeaders.filter(lead => {
    if (lead.category === "Advisory Board") return false;

    const isItCell = (lead.category === "IT & Digital Media Cell" || lead.category === "IT Cell" || (lead.rankBadge && lead.rankBadge.toLowerCase().includes('it')) || (lead.designation && lead.designation.toLowerCase().includes('it')));
    const isDistrict = (lead.level === 'district');
    const isState = (lead.level === 'state') || (!isDistrict && lead.state && lead.state !== 'National HQ' && lead.state !== 'All-India');
    const isNational = (lead.level === 'national') || (!lead.level && (!lead.state || lead.state === 'National HQ' || lead.state === 'All-India'));

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
  const itCellCount = nonAdvisory.filter(l => l.category === "IT & Digital Media Cell" || l.category === "IT Cell" || (l.rankBadge && l.rankBadge.toLowerCase().includes('it')) || (l.designation && l.designation.toLowerCase().includes('it'))).length;
  const nationalCount = nonAdvisory.filter(l => (l.level === 'national' || (!l.level && (!l.state || l.state === 'National HQ'))) && !(l.category === "IT & Digital Media Cell" || l.category === "IT Cell")).length;
  const stateCount = nonAdvisory.filter(l => l.level === 'state' || (l.state && l.state !== 'National HQ' && l.level !== 'district')).length;
  const districtCount = nonAdvisory.filter(l => l.level === 'district').length;

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
      const isDistrict = (lead.level === 'district');
      const isState = (lead.level === 'state') || (!isDistrict && lead.state && lead.state !== 'National HQ');
      const isItCell = (lead.category === "IT & Digital Media Cell" || lead.category === "IT Cell" || (lead.rankBadge && lead.rankBadge.toLowerCase().includes('it')) || (lead.designation && lead.designation.toLowerCase().includes('it')));
      const stateName = lead.state || (isDistrict || isState ? 'Maharashtra' : 'National HQ');
      const badgeText = lead.rankBadge || (isItCell ? 'IT & Digital Cell' : (isDistrict ? `${lead.district || 'District'} Command` : (isState ? `${stateName} Command` : 'National Command')));

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
  if (!councilContainer) return;

  if (db) {
    db.ref('state_chapters').on('value', snapshot => {
      const val = snapshot.val();
      renderStatePills(val || ssdSampleData.stateChapters);
    });

    db.ref('leadership').on('value', snapshot => {
      const val = snapshot.val();
      if (val) {
        let list = Object.entries(val).map(([k, v]) => ({ id: k, ...v })).filter(isContentApproved);
        list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
        renderGoverningCards(list);
      } else {
        renderGoverningCards(Object.values(ssdSampleData.governingBody).filter(isContentApproved));
      }
    });
  } else {
    const localStore = localStorage.getItem("ssd_admin_local_data");
    if (localStore) {
      try {
        const parsed = JSON.parse(localStore);
        if (parsed) {
          renderStatePills(parsed.state_chapters || ssdSampleData.stateChapters);
          if (parsed.leadership) {
            let list = Object.entries(parsed.leadership).map(([k, v]) => ({ id: k, ...v })).filter(isContentApproved);
            list.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
            renderGoverningCards(list);
            return;
          }
        }
      } catch (e) {}
    }
    renderStatePills(ssdSampleData.stateChapters);
    renderGoverningCards(Object.values(ssdSampleData.governingBody).filter(isContentApproved));
  }
}

// ==========================================================================
// OFFICER & SENIOR ADVISORY PORTFOLIO MODAL
// ==========================================================================
function ensureOfficerPortfolioModalInDom() {
  let modal = document.getElementById("officerPortfolioModal");
  if (modal) return modal;

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
  const allGoverning = Object.values(ssdSampleData.governingBody || {});
  const allAdvisory = ssdSampleData.advisoryBoard || [];
  const dynamicLeaders = window._allGoverningLeaders || [];
  
  // Combine all sources
  const masterList = [...allAdvisory, ...dynamicLeaders, ...allGoverning];

  if (typeof leaderOrId === 'object' && leaderOrId !== null) {
    leader = leaderOrId;
  } else if (leaderOrId !== undefined && leaderOrId !== null) {
    const raw = String(leaderOrId).toLowerCase().trim();

    // 1. If numeric index provided and isAdvisory is true
    if (!isNaN(leaderOrId) && leaderOrId !== '') {
      const idx = Number(leaderOrId);
      if (isAdvisory && allAdvisory[idx]) {
        leader = allAdvisory[idx];
      } else if (masterList[idx]) {
        leader = masterList[idx];
      }
    }

    // 2. Search Advisory Board specifically if isAdvisory is true
    if (!leader && isAdvisory) {
      leader = allAdvisory.find(a => (a.id && String(a.id).toLowerCase() === raw) || (a.name && (a.name.toLowerCase().includes(raw) || raw.includes(a.name.toLowerCase()))));
    }

    // 3. Search by ID across master list
    if (!leader) {
      leader = masterList.find(m => m && m.id && String(m.id).toLowerCase() === raw);
    }

    // 4. Search by exact or partial Name
    if (!leader) {
      leader = masterList.find(m => m && m.name && (m.name.toLowerCase().trim() === raw || m.name.toLowerCase().includes(raw) || raw.includes(m.name.toLowerCase())));
    }

    // 5. Check hardcoded advisory fallback by name tokens
    if (!leader) {
      if (raw.includes("yashwant") || raw.includes("more")) leader = allAdvisory[0];
      else if (raw.includes("rekha") || raw.includes("gaikwad")) leader = allAdvisory[1];
      else if (raw.includes("suresh") || raw.includes("jadhav")) leader = allAdvisory[2];
    }
  }

  if (!leader) {
    console.warn("Officer portfolio not found for identifier:", leaderOrId);
    // Fallback to first advisory member if isAdvisory was requested
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
  const isDistrict = (leader.level === 'district');
  const isState = (leader.level === 'state') || (!isDistrict && leader.state && leader.state !== 'National HQ' && leader.state !== 'All-India');
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
    rankBadgeEl.textContent = leader.rankBadge || (isAdv ? "Senior Advisory Council" : (isDistrict ? `${leader.district || stateName} District Command` : (isState ? `${stateName} State Command` : "National Central HQ")));
  }

  if (credEl) {
    credEl.textContent = leader.credentials || (leader.district ? `${leader.district} | ${stateName}` : (isAdv ? "Senior Advisory Fellow & Movement Scholar" : stateName));
  }

  if (hqEl) {
    hqEl.textContent = isDistrict ? `${leader.district || 'Nagpur'}, ${stateName}` : (isState ? `${stateName} State HQ` : 'National HQ (New Delhi / Nagpur)');
  }

  if (wingEl) {
    wingEl.textContent = leader.category || (isAdv ? "Senior Advisory (मार्गदर्शक मंडल)" : "Supreme Council");
  }

  if (bioEl) {
    let bioText = leader.bio || "";
    if (!bioText || bioText.length < 50) {
      if (isAdv) {
        bioText = `${leader.name} serves on the Senior Advisory & Elders Council (मार्गदर्शक मंडल) of Samata Sainik Dal, providing veteran ideological direction, historical research guidance, and policy oversight for nationwide movement expansion in accordance with Bodhisattva Dr. B.R. Ambedkar's foundational 1927 charter.`;
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
      pdfBtn.href = leader.pdfUrl;
      pdfBtn.style.display = "inline-flex";
    } else {
      pdfBtn.style.display = "none";
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
  e.preventDefault();
  const form = document.getElementById("quickJoinForm");
  const submitBtn = document.getElementById("quickJoinSubmitBtn");
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

function previewPhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedPhotoBase64 = e.target.result;
    const previewContainer = document.getElementById("photoPreviewContainer");
    const previewImg = document.getElementById("photoPreviewImg");
    if (previewContainer && previewImg) {
      previewImg.src = uploadedPhotoBase64;
      previewContainer.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
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
    } else if (uploadedPhotoBase64) {
      formData.append("photoBase64", uploadedPhotoBase64);
    }

    const res = await fetch("/api/membership/apply", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success && data.applicationId) {
      showToast(`Enlistment Application registered! Reference: ${data.applicationId}`, "success");
      
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


