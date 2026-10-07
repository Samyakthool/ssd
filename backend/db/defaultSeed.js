// ==========================================================================
// SAMATA SAINIK DAL (SSD) - CANONICAL DEFAULT SEED DATASET
// Shared Baseline for Embedded Database, API Fallbacks & Live Boot
// ==========================================================================

export const defaultSeedData = {
  stats: {
    members: 100000,
    states: 28,
    events: 5200,
    yearsActive: 99
  },
  news: {
    "news_1": {
      id: "news_1",
      title: "National SSD Centenary (1927–2027) Coordination Council Established at Nagpur",
      excerpt: "Central Command announces nationwide 100-Year commemorative march pasts, constitutional literacy yatras, and youth cadet enlistment drives.",
      date: "October 14, 2026",
      category: "Centenary",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "news_2": {
      id: "news_2",
      title: "Over 2,500 Cadets Graduate from State Physical Drill & Leadership Camp",
      excerpt: "Intensive residential camp at Deekshabhoomi ground concludes with ceremonial salute, flag drill, and constitutional law seminars.",
      date: "October 08, 2026",
      category: "Cadet Training",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "news_3": {
      id: "news_3",
      title: "Annual Mahad Satyagraha & Water Rights Memorial March Announced",
      excerpt: "Sainiks from 20 states to assemble at Chavdar Tale on 25 December to commemorate the historic 1927 struggle for human dignity.",
      date: "September 29, 2026",
      category: "History & Memorial",
      imageUrl: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "news_4": {
      id: "news_4",
      title: "Mahila Samata Sainik Dal National Convention Demands Strict Action on Atrocities",
      excerpt: "Over 3,000 women commanders and delegates pass unanimous resolutions on women's safety, legal defense cells, and educational scholarships.",
      date: "September 20, 2026",
      category: "Mahila Dal",
      imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "news_5": {
      id: "news_5",
      title: "SSD Legal Advisory Cell Files High Court Petitions for Rural Land Rights",
      excerpt: "Dedicated panel of advocate sainiks secures legal relief for 120 landless families under constitutional protections.",
      date: "September 12, 2026",
      category: "Legal Cell",
      imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "approved",
      is_published: true
    }
  },
  events: {
    "event_1": {
      id: "event_1",
      title: "99th SSD Foundation Day National Parade & Salute",
      date: "Sept 24, 2026",
      event_date: "2026-09-24",
      location: "Nagpur & Mumbai Central Command",
      description: "Ceremonial flag hoisting, march past by all Cadet Wings, and state address commemorating Dr. B.R. Ambedkar's founding vision.",
      status: "upcoming",
      approvalStatus: "approved"
    },
    "event_2": {
      id: "event_2",
      title: "National Constitution Day March & Public Conclave",
      date: "Nov 26, 2026",
      event_date: "2026-11-26",
      location: "Central Secretariat, New Delhi",
      description: "Mass rally upholding Constitutional Morality, Fundamental Rights, and the Preamble across Delhi NCR.",
      status: "upcoming",
      approvalStatus: "approved"
    },
    "event_3": {
      id: "event_3",
      title: "Manusmriti Dahan Din & Social Equality Seminar",
      date: "Dec 25, 2026",
      event_date: "2026-12-25",
      location: "Chavdar Tale, Mahad, Maharashtra",
      description: "Annual national gathering paying homage to the historic 1927 Mahad struggle led by Babasaheb Ambedkar.",
      status: "upcoming",
      approvalStatus: "approved"
    }
  },
  campaigns: {
    "camp_1": {
      id: "camp_1",
      title: "National Constitutional Literacy Yatra & Mass Preamble Campaign",
      category: "Constitutional Awareness",
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80",
      description: "Distributing 1 Million illustrated copies of the Indian Constitution in rural villages, organizing preamble assemblies, and establishing legal guidance clinics.",
      targetAmount: 5000000,
      raisedAmount: 3850000,
      volunteersCount: "12,400+",
      districtsCount: "180+",
      causeKey: "Constitutional Literacy Yatra",
      approvalStatus: "approved"
    },
    "camp_2": {
      id: "camp_2",
      title: "SSD Centenary (1927–2027) National Headquarters & Archives",
      category: "Centenary Heritage",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      description: "Construction of the central Babasaheb Ambedkar Sainik Academy, digital historical museum, research library, and residential drill grounds.",
      targetAmount: 25000000,
      raisedAmount: 14200000,
      volunteersCount: "45,000+",
      districtsCount: "250+",
      causeKey: "Centenary Headquarters Fund",
      approvalStatus: "approved"
    }
  },
  gallery: {
    "gal_1": {
      id: "gal_1",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80",
      caption: "SSD Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi Nagpur",
      category: "Cadet Drills",
      approvalStatus: "approved"
    },
    "gal_2": {
      id: "gal_2",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
      caption: "Mahila Samata Sainik Dal Volunteers at National Equality Rally",
      category: "Mahila Dal",
      approvalStatus: "approved"
    }
  },
  leadership: {
    "lead_1": {
      id: "lead_1",
      name: "Dr. Siddharth M. Meshram",
      designation: "National President (राष्ट्रीय अध्यक्ष)",
      category: "Supreme Council",
      level: "national",
      state: "National HQ",
      rankBadge: "National Command",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      bio: "Eminent Constitutional scholar and veteran Ambedkarite leader with 40+ years in social transformation; overseeing national policy and the Centenary 2027 vision.",
      credentials: "Ph.D. Constitutional Law | Nagpur HQ",
      order: 1,
      approvalStatus: "approved"
    },
    "lead_2": {
      id: "lead_2",
      name: "Commander Ravindra K. Gautam",
      designation: "National General Secretary (राष्ट्रीय महासचिव)",
      category: "Executive Council",
      level: "national",
      state: "National HQ",
      rankBadge: "Executive Council",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bio: "Former NCC Gold Medalist and grassroots organizer; coordinates operations across 28 State Chapters and directs the national cadet syllabus.",
      credentials: "M.A. Public Admin | New Delhi Secretariat",
      order: 2,
      approvalStatus: "approved"
    },
    "lead_3": {
      id: "lead_3",
      name: "Col. (Retd.) Vijay Anand Thorat",
      designation: "Chief Cadet Commander (मुख्य सैनिक दलनायक)",
      category: "Cadet Directorate",
      level: "national",
      state: "National HQ",
      rankBadge: "Drill & Defense",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      bio: "Indian Armed Forces Veteran; leads cadet drill curriculum, ceremonial parade standards, emergency disaster rescue wings, and physical fitness camps.",
      credentials: "Ex-Indian Army | Central Cadet Directorate",
      order: 3,
      approvalStatus: "approved"
    },
    "lead_4": {
      id: "lead_4",
      name: "Smt. Anuradha Tai Kamble",
      designation: "National Convener, Mahila Dal (राष्ट्रीय संयोजिका)",
      category: "Mahila Dal",
      level: "national",
      state: "National HQ",
      rankBadge: "Mahila Front",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Social activist and educator; leading women's frontline self-defense wings, legal crisis support networks, and Savitribai Phule girls' educational scholarships.",
      credentials: "M.S.W., LL.B. | Mumbai State HQ",
      order: 4,
      approvalStatus: "approved"
    },
    "lead_5": {
      id: "lead_5",
      name: "Senior Adv. B. P. Sonwane",
      designation: "Chairman, National Legal Cell (अध्यक्ष, विधिक प्रकोष्ठ)",
      category: "Legal Cell",
      level: "national",
      state: "National HQ",
      rankBadge: "Supreme Court Panel",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "Senior Advocate with extensive experience in the Supreme Court of India; spearheading pro-bono defense, SC/ST Act enforcement, and constitutional litigation.",
      credentials: "LL.M. Constitutional Law | Supreme Court of India",
      order: 5,
      approvalStatus: "approved"
    },
    "lead_6": {
      id: "lead_6",
      name: "Prof. Mahendra V. Khobragade",
      designation: "National Treasurer & Comptroller (राष्ट्रीय कोषाध्यक्ष)",
      category: "Finance & Audit",
      level: "national",
      state: "National HQ",
      rankBadge: "Finance & Audit",
      photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      bio: "Chartered Accountant and academician; ensures 100% organizational transparency, public audit compliance, 80G tax exemptions, and Centenary 2027 trust governance.",
      credentials: "FCA, M.Com | Central Audit Bureau",
      order: 6,
      approvalStatus: "approved"
    },
    "lead_it_1": {
      id: "lead_it_1",
      name: "Er. Aniket S. Meshram",
      designation: "National Head, IT & Digital Media Cell (राष्ट्रीय आईटी प्रमुख)",
      category: "IT & Digital Media Cell",
      level: "it_cell",
      state: "National HQ",
      rankBadge: "IT & Cyber Directorate",
      photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      bio: "Cloud & Cyber Systems Architect; oversees centralized portal databases, digital member IDs, automated enrollment systems, and nationwide digital infrastructure.",
      credentials: "B.Tech Computer Science | Nagpur Central IT Cell",
      order: 7,
      approvalStatus: "approved"
    },
    "lead_7": {
      id: "lead_7",
      name: "Prof. Yashwantrao More",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
      bio: "Senior Ambedkarite Historian, author of multiple research treatises on Dr. Ambedkar's social movements and Satyagrahas.",
      credentials: "Author & Senior Historian | Pune",
      order: 20,
      approvalStatus: "approved"
    },
    "lead_8": {
      id: "lead_8",
      name: "Adv. Rekha Gaikwad",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
      bio: "Human Rights Defender and Constitutional scholar actively engaged in social justice and women empowerment initiatives.",
      credentials: "Advocate & Scholar | Mumbai",
      order: 21,
      approvalStatus: "approved"
    },
    "lead_9": {
      id: "lead_9",
      name: "Commander Suresh Jadhav",
      designation: "Senior Advisory Member",
      category: "Advisory Board",
      level: "national",
      state: "National HQ",
      rankBadge: "Advisory Council",
      photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
      bio: "Veteran organizer of the historic 1956 Deekshabhoomi Dhamma Deeksha volunteer corps; mentor to youth training battalions.",
      credentials: "1956 Deeksha Veteran | Nagpur",
      order: 22,
      approvalStatus: "approved"
    }
  },
  testimonials: {
    "test_1": {
      id: "test_1",
      name: "Commander Ashok R. Gaikwad",
      designation: "State Commander, Maharashtra State SSD",
      category: "leadership",
      cadetId: "SSD-MH-1989-0042",
      state: "Nagpur & Mumbai, Maharashtra",
      tenure: "35 Years Active Service",
      highlight: "Discipline in khaki is not militarism; it is moral readiness to protect the constitutional dignity of our people.",
      quote: "Serving in Samata Sainik Dal for 35 years has taught me the true meaning of Babasaheb's mission. When we put on the uniform and march in unison, caste barriers dissolve. Whether conducting flood rescues in Kolhapur or guarding peaceful assembly at Chaityabhoomi, our cadres stand fearless in defense of constitutional brotherhood.",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_2": {
      id: "test_2",
      name: "Sunita Tai Kamble",
      designation: "Chief Organizer, Mahila Samata Sainik Dal",
      category: "mahila",
      cadetId: "SSD-MSSD-2004-0118",
      state: "Amravati, Vidarbha",
      tenure: "20 Years Active Service",
      highlight: "Babasaheb envisioned women leading the vanguard of social democracy, not standing behind.",
      quote: "Through Mahila Samata Sainik Dal, we have trained more than 8,500 young women across rural Vidarbha in lathi drill, self-defense, and legal literacy. When rural women know their constitutional rights and have the courage to walk with head held high, entire communities transform.",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_3": {
      id: "test_3",
      name: "Adv. Rajesh V. Gautam",
      designation: "National Convener, SSD Legal Defense Cell",
      category: "legal",
      cadetId: "SSD-LEG-2011-0089",
      state: "Supreme Court Bar, New Delhi",
      tenure: "13 Years Pro-Bono Counsel",
      highlight: "We transform constitutional guarantees from ink on parchment into an impenetrable shield in courtrooms.",
      quote: "Our pro-bono legal wing intervenes across district courts and high courts whenever marginalized citizens face institutional apathy or atrocities. We fight without charging a single rupee because Babasaheb gave us the Constitution as our supreme weapon. SSD ensures no citizen is left defenseless.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_4": {
      id: "test_4",
      name: "Dr. Siddharth M. Meshram",
      designation: "Director of Field Medicine & Sewa Relief",
      category: "relief",
      cadetId: "SSD-MED-2015-0302",
      state: "Wardha & Chandrapur, MH",
      tenure: "9 Years Disaster Relief",
      highlight: "In disaster zones and medical crises, an SSD volunteer arrives first and leaves last.",
      quote: "During regional floods and epidemics, our volunteer doctors and trained youth cadets establish emergency medical outposts within hours. We run a 24/7 volunteer blood donor brigade that has answered over 12,000 emergency requests. For us, humanitarian relief is pure constitutional brotherhood in action.",
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_5": {
      id: "test_5",
      name: "Pradeep Kumar Boudh",
      designation: "Regional Commander, Northern Zone",
      category: "leadership",
      cadetId: "SSD-UP-1998-0055",
      state: "Lucknow, Uttar Pradesh",
      tenure: "26 Years Active Service",
      highlight: "The uniform gives our youth pride, discipline, and a collective purpose beyond caste divisions.",
      quote: "Across Uttar Pradesh and North India, rural youth often lack positive mentorship. When they attend our drill parades, study Dr. Ambedkar's writings, and march in centenary rallies, their entire perspective transforms. They become vigilant protectors of peace, democracy, and community harmony.",
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_6": {
      id: "test_6",
      name: "Priyanka B. Tayade",
      designation: "Chief Drill Instructor & Bal Sainik Mentor",
      category: "youth",
      cadetId: "SSD-YW-2018-0412",
      state: "Pune, Maharashtra",
      tenure: "6 Years Youth Leadership",
      highlight: "Teaching children the Preamble before dogma is how we build a casteless, democratic India.",
      quote: "I enlisted as a Bal Sainik at age ten. Today, I train collegiate youth to lead weekly Constitution reading circles in schools, slums, and rural bastis. Watching a 12-year-old recite the Preamble with glowing pride and saluting the national flag gives me absolute conviction in our movement's future.",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    },
    "test_7": {
      id: "test_7",
      name: "Bhimrao Jadhav",
      designation: "Veteran Sainik & Centenary Task Force",
      category: "leadership",
      cadetId: "SSD-KA-1981-0007",
      state: "Belagavi, Karnataka",
      tenure: "43 Years Lifelong Service",
      highlight: "For over four decades, our khaki uniform has stood as a guardian of Dr. Ambedkar's vision.",
      quote: "I took my first pledge in 1981 under veteran leaders who stood side-by-side with Babasaheb. As we approach the historic Centenary of Samata Sainik Dal (1927–2027), seeing modern youth, software engineers, and scholars enlist with equal fervor proves that our movement is timeless and unbreakable.",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&q=80",
      approvalStatus: "approved",
      is_published: true
    }
  }
};

