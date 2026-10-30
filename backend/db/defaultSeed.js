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
      imageUrl: "ssd-cadets-march.jpg",
      approvalStatus: "approved",
      is_published: true
    },
    "news_2": {
      id: "news_2",
      title: "Over 2,500 Cadets Graduate from State Physical Drill & Leadership Camp",
      excerpt: "Intensive residential camp at Deekshabhoomi ground concludes with ceremonial salute, flag drill, and constitutional law seminars.",
      date: "October 08, 2026",
      category: "Cadet Training",
      imageUrl: "ssd-cadets-march.jpg",
      approvalStatus: "approved",
      is_published: true
    },
    "news_3": {
      id: "news_3",
      title: "Annual Mahad Satyagraha & Water Rights Memorial March Announced",
      excerpt: "Sainiks from 20 states to assemble at Chavdar Tale on 25 December to commemorate the historic 1927 struggle for human dignity.",
      date: "September 29, 2026",
      category: "History & Memorial",
      imageUrl: "ssd-cadets-march.jpg",
      approvalStatus: "approved",
      is_published: true
    },
    "news_4": {
      id: "news_4",
      title: "Mahila Samata Sainik Dal National Convention Demands Strict Action on Atrocities",
      excerpt: "Over 3,000 women commanders and delegates pass unanimous resolutions on women's safety, legal defense cells, and educational scholarships.",
      date: "September 20, 2026",
      category: "Mahila Dal",
      imageUrl: "ssd-cadets-march.jpg",
      approvalStatus: "approved",
      is_published: true
    },
    "news_5": {
      id: "news_5",
      title: "SSD Legal Advisory Cell Files High Court Petitions for Rural Land Rights",
      excerpt: "Dedicated panel of advocate sainiks secures legal relief for 120 landless families under constitutional protections.",
      date: "September 12, 2026",
      category: "Legal Cell",
      imageUrl: "ssd-cadets-march.jpg",
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
      imageUrl: "ssd-cadets-march.jpg",
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
      imageUrl: "ssd-cadets-march.jpg",
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
      imageUrl: "dr-ambedkar-with-ssd-cadets.jpg",
      caption: "Historic Archival Record: Dr. Babasaheb Ambedkar with Uniformed Samata Sainik Dal Cadets",
      category: "Historical",
      approvalStatus: "approved"
    },
    "gal_2": {
      id: "gal_2",
      imageUrl: "ssd-cadets-march.jpg",
      caption: "Samata Sainik Dal Uniform Cadet Corps Ceremonial March Past - Deekshabhoomi",
      category: "Cadet Drills",
      approvalStatus: "approved"
    },
    "gal_3": {
      id: "gal_3",
      imageUrl: "dr-ambedkar-founder.jpg",
      caption: "Bodhisattva Dr. B.R. Ambedkar - Founder, Samata Sainik Dal (Est. 24 September 1927)",
      category: "Historical",
      approvalStatus: "approved"
    },
    "gal_4": {
      id: "gal_4",
      imageUrl: "dr-ambedkar-yeola-1935.jpg",
      caption: "Historic Archival Record: Dr. Babasaheb Ambedkar delivering historic address at Yeola, Nashik (13 October 1935)",
      category: "Historical",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
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
      photoUrl: "logo.png",
      approvalStatus: "approved",
      is_published: true
    }
  },

  // --------------------------------------------------------------------------
  // AIM & MOTTO (TRILINGUAL CANONICAL FORMULATION)
  // --------------------------------------------------------------------------
  aim_motto: {
    official_aim: {
      en: "To organize, educate, and discipline the oppressed and marginalized masses; to safeguard constitutional morality, civil liberties, and human dignity; to eliminate the caste system and social untouchability; and to establish an enlightened democratic society based on Liberty, Equality, and Fraternity as proclaimed by Bodhisattva Dr. B.R. Ambedkar.",
      mr: "शोषित, वंचित आणि बहुजन समाजाला संघटित, शिस्तबद्ध व सुशिक्षित करणे; भारतीय संविधानातील समता, स्वातंत्र्य, बंधुता आणि न्यायाचे मूल्य समाजात रुजवणे; जातिव्यवस्था व विषमतेचे उच्चाटन करून डॉ. बाबासाहेब आंबेडकरांच्या विचारानुसार प्रबुद्ध व समतावादी समाज निर्माण करणे.",
      hi: "शोषित, वंचित और कमजोर वर्गों को संगठित, अनुशासित और जागरूक करना; भारतीय संविधान के समानता, स्वतंत्रता और बंधुत्व के मूल्यों की रक्षा करना; सामाजिक असमानता का उन्मूलन कर डॉ. बाबासाहेब आंबेडकर के सपनों का समतामूलक और प्रबुद्ध समाज स्थापित करना।"
    },
    official_motto: {
      en: "Self-Respect, Discipline, Equality & Social Service",
      mr: "आत्मसन्मान, शिस्त, समानता आणि समाजसेवा",
      hi: "आत्मसम्मान, अनुशासन, समानता और समाजसेवा"
    },
    guiding_slogan: {
      en: "Educate, Agitate, Organize — Guard the Constitution",
      mr: "शिका, संघटित व्हा, संघर्ष करा — संविधानाचे रक्षण करा",
      hi: "शिक्षित बनो, संगठित रहो, संघर्ष करो — संविधान की रक्षा करो"
    },
    vision: {
      en: "An egalitarian, caste-free India where every individual enjoys equal civil rights, social justice, and constitutional protections without fear of tyranny or oppression.",
      mr: "एक समतामूलक, जातिमुक्त भारत जिथे प्रत्येक नागरिकाला कोणत्याही अन्याय, विषमता किंवा भीतीशिवाय समान नागरी हक्क, सामाजिक न्याय आणि संविधानात्मक संरक्षण प्राप्त होईल.",
      hi: "एक समतामूलक, जातिविहीन भारत जहां प्रत्येक नागरिक को बिना किसी भय या उत्पीड़न के समान नागरिक अधिकार, सामाजिक न्याय और संवैधानिक सुरक्षा प्राप्त हो।"
    },
    mission: {
      en: "Building a nationwide volunteer cadre of enlightened, disciplined sainiks dedicated to non-violent defense of human rights, legal literacy, relief during disasters, and educational emancipation.",
      mr: "मानवी हक्कांचे अहिंसक रक्षण, कायदेशीर साक्षरता, आपत्ती निवारण आणि शैक्षणिक प्रबोधनासाठी समर्पित अशा सुशिक्षित व शिस्तबद्ध सैनिकांचे देशव्यापी संघटन उभारणे.",
      hi: "मानवाधिकारों की अहिंसक रक्षा, विधिक साक्षरता, आपदा राहत और शैक्षणिक उत्थान के लिए समर्पित प्रबुद्ध, अनुशासित सैनिकों का राष्ट्रव्यापी कैडर तैयार करना।"
    },
    core_values: [
      {
        title_en: "Absolute Constitutional Morality",
        title_mr: "संविधाननिष्ठा व कायद्याचे राज्य",
        title_hi: "संवैधानिक निष्ठा और विधि का शासन",
        desc_en: "Uncompromising adherence to the Constitution of India, fundamental rights, and the rule of law as our supreme governing authority."
      },
      {
        title_en: "Disciplined Non-Violence",
        title_mr: "शिस्तबद्ध अहिंसा व स्वसंरक्षण",
        title_hi: "अनुशासित अहिंसा और आत्मरक्षा",
        desc_en: "Adherence to non-violent social defense, physical drill discipline, moral self-control, and rejection of sectarian fanaticism."
      },
      {
        title_en: "Casteless Fraternity",
        title_mr: "जातिमुक्त बंधुभाव",
        title_hi: "जातिविहीन बंधुत्व",
        desc_en: "Active rejection of caste divisions, untouchability, religious superstition, and gender hierarchy in thought and deed."
      },
      {
        title_en: "Selfless Public Service (Sewa)",
        title_mr: "निःस्वार्थ समाजसेवा",
        title_hi: "निःस्वार्थ समाजसेवा",
        desc_en: "Voluntary assistance during natural disasters, epidemics, medical emergencies, and community distress without distinction of background."
      },
      {
        title_en: "Educational & Cultural Awakening",
        title_mr: "शैक्षणिक व वैचारिक प्रबोधन",
        title_hi: "शैक्षणिक और वैचारिक जागरण",
        desc_en: "Promotion of scientific temper, rationalism, digital literacy, and widespread study of Dr. Ambedkar's foundational writings."
      }
    ],
    discipline_and_service: {
      en: "Samata Sainik Dal is not a political party; it is a permanent non-violent volunteer corps. Every Sainik is required to maintain sober, upright character, abstain from communal hatred, respect the chain of command, and report for duty in official uniform during assemblies, national drills, and civic emergencies.",
      mr: "समता सैनिक दल हा कोणताही राजकीय पक्ष नसून एक कायमस्वरूपी अहिंसक स्वयंसेवी दल आहे. प्रत्येक सैनिकाने सदाचारी चारित्र्य राखणे, जातीय द्वेष टाळणे, शिस्त पाळणे आणि राष्ट्रीय संचलन व सामाजिक आणीबाणीत गणवेशात तत्पर राहणे अनिवार्य आहे.",
      hi: "समता सैनिक दल कोई राजनीतिक दल नहीं, बल्कि एक स्थायी अहिंसक स्वयंसेवी कैडर है। प्रत्येक सैनिक का कर्तव्य है कि वह अनुशासन बनाए रखे, साम्प्रदायिकता से दूर रहे और नागरिक सेवा में सदैव तत्पर रहे।"
    }
  },

  // --------------------------------------------------------------------------
  // HISTORICAL ORGANIZATIONS & PREDECESSORS
  // --------------------------------------------------------------------------
  historical_organizations: [
    {
      id: "hist_org_1",
      title: "Bahishkrit Hitakarini Sabha (Volunteers Auxiliary)",
      foundingDate: "20 July 1924",
      location: "Damodar Hall, Parel, Bombay",
      keyFigures: "Dr. B.R. Ambedkar, Chhatrapati Shahu Maharaj patronage legacy, N.T. Jadhav, S.N. Shivtarkar",
      significance: "The foundational socio-educational institution founded with the motto 'Educate, Agitate, Organize'. It formed the earliest youth squads for running night schools, public libraries, and meeting defense, which served as direct organizational precursors to SSD.",
      verifiedSource: "Writings and Speeches of Dr. B.R. Ambedkar, Vol. 17, Part 1; Government of Maharashtra Gazetteers.",
      status: "Verified Historical Document",
      imageUrl: "ssd-cadets-march.jpg"
    },
    {
      id: "hist_org_2",
      title: "Mahad Satyagraha Social Defense Brigade",
      foundingDate: "19-20 March 1927",
      location: "Mahad, Kolaba (Raigad) District, Maharashtra",
      keyFigures: "Dr. B.R. Ambedkar, Subedar Major R.S. Ghadge, B.S. Moon (Dalpati), Surendranath Tipnis",
      significance: "First mass mobilization where unarmed volunteers asserted human rights to public drinking water at Chavadar Tale. Under Dr. Ambedkar's command, thousands of volunteers sustained brutal orthodox physical violence without resorting to counter-violence, proving the necessity of an organized, trained, permanent uniform defense force.",
      verifiedSource: "Dr. Babasaheb Ambedkar: Life and Mission by Dhananjay Keer, Chapter 6; Mahad Satyagraha Commemorative Records.",
      status: "Verified Historical Document",
      imageUrl: "ssd-cadets-march.jpg"
    },
    {
      id: "hist_org_3",
      title: "Samata Sainik Dal (Formal Foundation at Mahad Parishad)",
      foundingDate: "24-25 December 1927",
      location: "Mahad Satyagraha Ground, Maharashtra",
      keyFigures: "Bodhisattva Dr. B.R. Ambedkar, Commander B.S. Moon (Dalpati), Sahasrabuddhe, Devrao Naik",
      significance: "Formal inception of Samata Sainik Dal during the historic second Mahad Conference (famous for the burning of the Manusmriti on 25 Dec 1927). Established with khaki uniform, blue cap/beret, drill standards, and an oath to defend social equality with life and limb under peaceful discipline.",
      verifiedSource: "Bahishkrit Bharat issues of Dec 1927 & Jan 1928; SSD Foundation Charter (1927).",
      status: "Official Inception Charter",
      imageUrl: "ssd-cadets-march.jpg"
    },
    {
      id: "hist_org_4",
      title: "Independent Labour Party (ILP) Volunteer Corps",
      foundingDate: "August 1936",
      location: "Bombay Presidency",
      keyFigures: "Dr. B.R. Ambedkar, Comrade Shamrao Parulekar, SSD Cadre Commanders",
      significance: "SSD volunteers served as the disciplined ground marshals for the historic 1938 General Workers' Strike against the Industrial Disputes Bill and the Konkan anti-Khoti agricultural tenant marches, uniting caste emancipation with working-class labor rights.",
      verifiedSource: "Janata Official Organ archives (1936-1938); Labour Movement in Western India by V.B. Karnik.",
      status: "Verified Historical Document",
      imageUrl: "ssd-cadets-march.jpg"
    },
    {
      id: "hist_org_5",
      title: "Deekshabhoomi Historic Dhamma Deeksha Security Command",
      foundingDate: "14 October 1956",
      location: "Nagpur, Maharashtra",
      keyFigures: "Dr. B.R. Ambedkar, Wamanrao Godbole, Dalpati B.S. Moon, 5,000 SSD Volunteers",
      significance: "When over 500,000 citizens embraced Buddhism on Ashok Vijayadashami, Samata Sainik Dal was solely entrusted with maintaining security, crowd safety, sanitation, and state liaison. The historic event was completed with impeccable peace and discipline, praised by national media.",
      verifiedSource: "The Great Conversion (1956) Nagpur Municipal & Police Archives; Samata Sainik Dal Commemorative Gazette.",
      status: "Verified Historical Document",
      imageUrl: "ssd-cadets-march.jpg"
    }
  ],

  // --------------------------------------------------------------------------
  // HISTORICAL TIMELINE ENTRIES
  // --------------------------------------------------------------------------
  historical_timeline: [
    {
      id: "time_1",
      year: "1924",
      dateFormatted: "20 July 1924",
      title: "Establishment of Bahishkrit Hitakarini Sabha",
      location: "Damodar Hall, Bombay",
      summary: "Dr. B.R. Ambedkar convenes social workers to launch Bahishkrit Hitakarini Sabha, creating early student hostels and volunteer defense groups under the motto 'Educate, Agitate, Organize'.",
      period: "Pre-Foundation Era"
    },
    {
      id: "time_2",
      year: "1927",
      dateFormatted: "19–20 March 1927",
      title: "First Mahad Satyagraha at Chavadar Tale",
      location: "Mahad, Maharashtra",
      summary: "First non-violent mass assertion of fundamental civil rights to drink public water. Dr. Ambedkar's volunteers maintain strict discipline under violent orthodox attacks, revealing the urgent necessity of a dedicated volunteer defense corps.",
      period: "Satyagraha Awakening"
    },
    {
      id: "time_3",
      year: "1927",
      dateFormatted: "24–25 December 1927",
      title: "Foundation of Samata Sainik Dal & Manusmriti Dahan",
      location: "Mahad Satyagraha Pandal, Raigad",
      summary: "Formal establishment of Samata Sainik Dal. Khaki uniforms, drill handbooks, and Sainik vows are promulgated. The symbol of caste inequality, Manusmriti, is publicly consigned to flames under volunteer guard.",
      period: "Formal Foundation"
    },
    {
      id: "time_4",
      year: "1930",
      dateFormatted: "02 March 1930",
      title: "Kalaram Temple Entry Satyagraha & Nashik Command",
      location: "Nashik, Maharashtra",
      summary: "Over five years of non-violent resistance at Nashik. SSD volunteers form defensive rings around satyagrahis against stone-pelting, establishing SSD's reputation for heroic non-violent endurance.",
      period: "Civil Rights Battles"
    },
    {
      id: "time_5",
      year: "1935",
      dateFormatted: "13 October 1935",
      title: "Historic Yeola Assembly & Renunciation Declaration",
      location: "Yeola, Nashik",
      summary: "Dr. B.R. Ambedkar proclaims: 'I was born a Hindu, but I will not die a Hindu.' SSD platoons protect the massive conference and oversee security across central railway corridors.",
      period: "Religious Freedom"
    },
    {
      id: "time_6",
      year: "1942",
      dateFormatted: "17–20 July 1942",
      title: "All India Scheduled Castes Federation (AISCF) Rally",
      location: "Nagpur, Central Provinces",
      summary: "75,000 delegates attend the AISCF conference. Over 2,000 uniform SSD cadets perform the ceremonial Guard of Honor to Dr. Ambedkar, who was then Member of the Viceroy's Executive Council.",
      period: "National Expansion"
    },
    {
      id: "time_7",
      year: "1956",
      dateFormatted: "14 October 1956",
      title: "Historic Buddhist Conversion Security Command",
      location: "Deekshabhoomi, Nagpur",
      summary: "SSD volunteers take full charge of security and crowd management as half a million citizens embrace Buddhism. Dr. Ambedkar personally commends SSD commanders for their matchless discipline.",
      period: "The Great Conversion"
    },
    {
      id: "time_8",
      year: "2026–2027",
      dateFormatted: "Centenary Preparations",
      location: "Nagpur Headquarters & Nationwide",
      summary: "Launch of the Centenary Digital Command Portal, state cadet rosters, constitutional literacy campaigns, and nationwide march pasts preparing for SSD's 100-Year Milestone (1927–2027).",
      period: "Centenary Era"
    }
  ],

  // --------------------------------------------------------------------------
  // CONSTITUTION & OFFICIAL DOCUMENTS
  // --------------------------------------------------------------------------
  constitution: {
    title: "The Constitution and General Regulations of Samata Sainik Dal",
    marathi_title: "समता सैनिक दल विधान व नियमावली",
    version: "2.4 (Centenary Revised Edition)",
    effectiveDate: "25 December 1927 (Re-affirmed October 2026)",
    approvingAuthority: "National Supreme Command & Central Directorate, Nagpur",
    sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    pdfUrl: "SSD_System_Architecture_and_Workflow.pdf",
    chapters: [
      {
        number: "I",
        title_en: "Name, Jurisdiction & Emblem",
        title_mr: "नाव, कार्यक्षेत्र व अधिकृत बोधचिन्ह",
        content_en: "1. The organization shall be named 'SAMATA SAINIK DAL' (Social Equality Volunteers Corps), abbreviated as SSD.\n2. Its territorial jurisdiction extends across all States and Union Territories of India and associated overseas diaspora branches.\n3. The emblem features the Ashoka Chakra, five-pointed stars of Liberty, Equality, and Fraternity, flanked by the protective shield and baton of non-violent social defense."
      },
      {
        number: "II",
        title_en: "Fundamental Aims, Creed & The Sainik Pledge",
        title_mr: "उद्देश, ध्येय आणि सैनिक शपथ",
        content_en: "1. The fundamental creed of the Dal is the establishment of social democracy based on Liberty, Equality, Fraternity, and Justice.\n2. Every cadet, on formal commissioning, shall take the solemn Sainik Pledge in the presence of the Dal flag:\n   'I solemnly pledge that I will defend social equality, eradicate untouchability and caste pride, protect the honor of the weak, remain obedient to the commands of the Dal, and uphold the Constitution of India at all costs.'"
      },
      {
        number: "III",
        title_en: "Uniform Regulations, Ranks & Drill Protocol",
        title_mr: "गणवेश नियमावली, पदश्रेणी आणि संचलन पद्धती",
        content_en: "1. The authorized uniform of the Dal consists of khaki shirt/tunic, khaki trousers, blue beret with official brass emblem, black belt with brass buckle, and black boots.\n2. Cadet ranks progress strictly through merit, discipline, and tenure: Bal Sainik, Sainik (Cadet), Naik, Havaldar, Dalpati (District Officer), and Supreme Commander.\n3. Drill manuals shall strictly follow non-violent ceremonial march past and flag salutation procedures."
      },
      {
        number: "IV",
        title_en: "Supreme Command & Central Executive Directorate",
        title_mr: "सर्वोच्च कमांड आणि केंद्रीय कार्यकारी परिषद",
        content_en: "1. The supreme governing and administrative authority of the Dal is vested in the National Executive Council headquartered at Nagpur.\n2. The Council consists of the National President, National General Secretary, National Commander (Dalpati), and Zonal Directors.\n3. No policy or constitutional amendment shall be valid without the concurrence of a two-thirds majority of the National Executive Council."
      },
      {
        number: "V",
        title_en: "Cadre Wings & Specialized Directorates",
        title_mr: "विभाग आणि विशेष कार्यगट",
        content_en: "1. Central Cadet Corps (Sainik Wing) for physical drill and civic defense.\n2. Mahila Samata Sainik Dal for women empowerment, self-defense, and legal rights.\n3. Constitutional & Legal Advisory Cell for pro-bono defense of civil liberties.\n4. Youth & Student Front for campus literacy and ideological training.\n5. Community Sewa & Relief Force for humanitarian emergency assistance."
      },
      {
        number: "VI",
        title_en: "Financial Transparency & Democratic Integrity",
        title_mr: "आर्थिक पारदर्शकता आणि संस्थात्मक नीतिमत्ता",
        content_en: "1. The Dal shall accept no corporate patronage that compromises its independence or democratic principles.\n2. All accounts shall be audited annually by a certified Chartered Accountant and published openly for cadre scrutiny.\n3. Misappropriation of Dal assets or commercial exploitation of the Dal emblem shall result in immediate summary dismissal and legal prosecution."
      }
    ],
    amendment_history: [
      {
        date: "25 December 1927",
        amendment: "Adoption of original foundational charter at Mahad Parishad under Dr. B.R. Ambedkar.",
        authorizedBy: "Founding Plenary Assembly"
      },
      {
        date: "14 October 1956",
        amendment: "Incorporation of Buddhist ethical tenets (Panchasheel) and Deekshabhoomi permanent defense mandate.",
        authorizedBy: "Dr. B.R. Ambedkar & Central Council"
      },
      {
        date: "14 April 2026",
        amendment: "Centenary Modernization Amendment: Digital Command ID issuance, Trilingual verification, and cyber governance.",
        authorizedBy: "National Executive Council, Nagpur"
      }
    ]
  },

  // --------------------------------------------------------------------------
  // DIGITAL LIBRARY CATEGORIES & RESOURCES
  // --------------------------------------------------------------------------
  library_categories: [
    { id: "cat_const", name: "SSD Constitution and Official Documents", slug: "constitution-official", icon: "fa-book-bookmark", sort_order: 1, is_active: true, description: "Official charters, statutory bylaws, and constitutional regulations of Samata Sainik Dal" },
    { id: "cat_hist", name: "Historical Documents and Archives", slug: "historical-archives", icon: "fa-timeline", sort_order: 2, is_active: true, description: "Primary archival records, 1927 Mahad Satyagraha dispatches, and founding documents" },
    { id: "cat_books", name: "Books and E-books", slug: "books-ebooks", icon: "fa-book-open", sort_order: 3, is_active: true, description: "Published volumes, historical monographs, treatises, and digitized literature" },
    { id: "cat_research", name: "Research Papers and Publications", slug: "research-papers", icon: "fa-file-lines", sort_order: 4, is_active: true, description: "Peer-reviewed papers, sociological studies, and Dal historical research analyses" },
    { id: "cat_speeches", name: "Speeches and Lectures", slug: "speeches-lectures", icon: "fa-microphone", sort_order: 5, is_active: true, description: "Historic addresses of Dr. B. R. Ambedkar and keynote national rally transcripts" },
    { id: "cat_circulars", name: "Circulars and Notices", slug: "circulars-notices", icon: "fa-bullhorn", sort_order: 6, is_active: true, description: "Official executive orders, national directives, and organizational notifications" },
    { id: "cat_training", name: "Training and Educational Materials", slug: "training-educational", icon: "fa-shield-halved", sort_order: 7, is_active: true, description: "Parade drill manuals, command field handbooks, and cadre leadership modules" },
    { id: "cat_awareness", name: "Social Awareness Resources", slug: "social-awareness", icon: "fa-hand-holding-heart", sort_order: 8, is_active: true, description: "Educational leaflets, constitutional rights guides, and anti-caste campaign materials" },
    { id: "cat_photos", name: "Photographs and Historical Images", slug: "photographs-images", icon: "fa-images", sort_order: 9, is_active: true, description: "Rare historical photographs, rally archives, and uniform reference galleries" },
    { id: "cat_multimedia", name: "Audio and Video Resources", slug: "audio-video", icon: "fa-photo-film", sort_order: 10, is_active: true, description: "Archival sound recordings, centenary documentaries, and parade training footage" },
    { id: "cat_reports", name: "Reports and Documentation", slug: "reports-documentation", icon: "fa-clipboard-check", sort_order: 11, is_active: true, description: "Annual state convention reports, relief force documentation, and audit filings" },
    { id: "cat_other", name: "Other Resources", slug: "other-resources", icon: "fa-box-archive", sort_order: 12, is_active: true, description: "Miscellaneous historical publications, reference bulletins, and external papers" }
  ],

  library_resources: [
    {
      id: "lib_res_1",
      title: "The Constitution of Samata Sainik Dal (Official 1927 Charter & 2026 Revisions)",
      author: "National Executive Council",
      year: "2026",
      language: "English / Marathi / Hindi",
      category: "constitution",
      format: "PDF Document",
      size: "2.4 MB",
      accessLevel: "public",
      description: "Official authorized charter detailing cadet oaths, uniform specifications, command structure, and organizational regulations.",
      downloadUrl: "SSD_System_Architecture_and_Workflow.pdf",
      coverUrl: "logo.png",
      featured: true,
      downloadsCount: 1420
    },
    {
      id: "lib_res_2",
      title: "Annihilation of Caste (Undelivered Presidential Address, 1936)",
      author: "Dr. B.R. Ambedkar",
      year: "1936",
      language: "English",
      category: "speeches",
      format: "Annotated Edition",
      size: "3.8 MB",
      accessLevel: "public",
      description: "The seminal masterwork on democratic equality, critique of caste hierarchy, and the moral foundation of a casteless society.",
      downloadUrl: "SSD_System_Architecture_and_Workflow.pdf",
      coverUrl: "logo.png",
      featured: true,
      downloadsCount: 4890
    },
    {
      id: "lib_res_3",
      title: "Mahad Satyagraha: The Awakening of Human Dignity (1927–2027)",
      author: "Central Archives Research Desk",
      year: "2026",
      language: "Marathi / English",
      category: "history",
      format: "Archival Monograph",
      size: "5.1 MB",
      accessLevel: "public",
      description: "Comprehensive historical documentation of the 1927 Chavadar Tale water satyagraha, with contemporary photographs and court proceedings.",
      downloadUrl: "SSD_System_Architecture_and_Workflow.pdf",
      coverUrl: "logo.png",
      featured: true,
      downloadsCount: 2310
    },
    {
      id: "lib_res_4",
      title: "Sainik Drill Handbook & Ceremonial Parade Protocol",
      author: "Chief Drill Instructor Directorate",
      year: "2025",
      language: "Hindi / Marathi",
      category: "training",
      format: "Illustrated Manual",
      size: "4.2 MB",
      accessLevel: "member",
      description: "Standard operating procedures for morning parades, lathi drills, guard of honor, flag hoisting ceremonies, and salute standards.",
      downloadUrl: "SSD_System_Architecture_and_Workflow.pdf",
      coverUrl: "logo.png",
      featured: false,
      downloadsCount: 980
    },
    {
      id: "lib_res_5",
      title: "States and Minorities: What are Their Rights and How to Secure Them",
      author: "Dr. B.R. Ambedkar",
      year: "1947",
      language: "English",
      category: "speeches",
      format: "Constitutional Draft",
      size: "1.9 MB",
      accessLevel: "public",
      description: "Constitutional memorandum submitted to the Constituent Assembly outlining fundamental rights, minority safeguards, and state socialism.",
      downloadUrl: "SSD_System_Architecture_and_Workflow.pdf",
      coverUrl: "logo.png",
      featured: true,
      downloadsCount: 3120
    },
    {
      id: "lib_res_6",
      title: "Historical Photographs Archive: Yeola Assembly (13 October 1935)",
      author: "SSD Central Historical Cell",
      year: "1935 (Restored 2026)",
      language: "Photographic Record",
      category: "archives",
      format: "High-Res Plate",
      size: "8.5 MB",
      accessLevel: "public",
      description: "High-resolution historical photograph of Dr. Babasaheb Ambedkar delivering his epoch-making address renouncing Hinduism at Yeola, Nashik.",
      downloadUrl: "Dr._Babasaheb_Ambedkar_delivering_speech_about_renouncing_Hinduism_at_Yeola,_Nashik_on_13_Oct,_1935.jpg_01.jpg",
      coverUrl: "Dr._Babasaheb_Ambedkar_delivering_speech_about_renouncing_Hinduism_at_Yeola,_Nashik_on_13_Oct,_1935.jpg_01.jpg",
      featured: true,
      downloadsCount: 5670
    }
  ],

  // --------------------------------------------------------------------------
  // TERMS & CONDITIONS (OFFICIAL 20-SECTION SPECIFICATION)
  // --------------------------------------------------------------------------
  terms_conditions: {
    title: "Official Terms of Service & Platform Governance",
    effectiveDate: "25 October 2026",
    version: "1.0",
    sections: [
      {
        number: 1,
        title: "Acceptance of Terms",
        content: "By accessing or utilizing the public website, digital library, or membership portal of Samata Sainik Dal (SSD), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not accept these terms, you must discontinue use of the platform immediately."
      },
      {
        number: 2,
        title: "Website Purpose and Scope",
        content: "This platform is operated by Samata Sainik Dal (founded 1927 by Bodhisattva Dr. B.R. Ambedkar) as an official digital command, historical archive, educational library, and cadet enlistment portal. The platform exists solely for civic, educational, historical, and community welfare purposes."
      },
      {
        number: 3,
        title: "Eligibility and Account Registration",
        content: "Membership is open to all citizens who affirm allegiance to the Constitution of India, reject caste discrimination, and pledge to uphold social democracy. Registered accounts are non-transferable, and applicants must provide genuine, verifiable personal identification."
      },
      {
        number: 4,
        title: "Membership Applications and Verification",
        content: "Submission of an enlistment form does not confer automatic membership. All applications undergo multi-tier administrative verification across local, district, and state scrutinies before commission by Central Command."
      },
      {
        number: 5,
        title: "Membership Approval and Organizational Decisions",
        content: "The National Executive Council reserves the sole prerogative to approve, defer, recommend correction for, or reject any membership application in accordance with organizational bylaws and cadet fitness standards."
      },
      {
        number: 6,
        title: "Account Security and User Responsibilities",
        content: "Users and commissioned officers are responsible for maintaining the confidentiality of their session tokens, passwords, and multi-factor authentication credentials. Any unauthorized access under your credentials must be reported to Central Command immediately."
      },
      {
        number: 7,
        title: "Accuracy of Submitted Information",
        content: "Applicants certify that all information, photographs, government IDs, and statements submitted are accurate and genuine. Providing forged documents or false statements results in immediate disqualification and potential legal action under Indian law."
      },
      {
        number: 8,
        title: "Acceptable Use Policy",
        content: "Users shall not exploit the platform to transmit unlawful, defamatory, communal, obscene, or threatening material, nor attempt to breach server defenses, inject malicious code, or scrape confidential roster data."
      },
      {
        number: 9,
        title: "Intellectual Property and Copyright",
        content: "All trademarks, emblems, organizational mottos, historical monographs, digital ID designs, and codebases are the intellectual property of Samata Sainik Dal. Archival writings of Dr. B.R. Ambedkar are shared in compliance with public educational fair use."
      },
      {
        number: 10,
        title: "Digital Library Access and Permitted Use",
        content: "Library resources designated as public may be viewed and downloaded for personal, educational, and research purposes. Commercial resale, mass redistribution, or unauthorized alteration of archival PDFs without written permission is strictly prohibited."
      },
      {
        number: 11,
        title: "Uploaded Content and User Submissions",
        content: "By submitting messages, grievance petitions, or testimonials, users grant SSD a non-exclusive license to review, archive, and publish verified testimonials in furtherance of community awareness."
      },
      {
        number: 12,
        title: "Website Availability and Maintenance",
        content: "While we endeavor to provide continuous availability, SSD does not guarantee uninterrupted service and reserves the right to suspend or restrict access during scheduled server maintenance or critical cyber upgrades."
      },
      {
        number: 13,
        title: "External Links and Third-Party Services",
        content: "The platform may contain links to external historical references, government portals, or social media networks. SSD assumes no responsibility for third-party privacy policies or external content."
      },
      {
        number: 14,
        title: "Contributions and Payments",
        content: "All voluntary financial contributions and institutional support funds are non-refundable, strictly accounted for, and audited according to non-profit governance standards."
      },
      {
        number: 15,
        title: "Privacy and Personal Data Protection",
        content: "Member data is collected and processed in strict conformity with our Privacy Policy and the Digital Personal Data Protection Act, 2023 (DPDP Act). We do not monetize, rent, or sell user records to commercial third parties."
      },
      {
        number: 16,
        title: "Suspension and Termination of Accounts",
        content: "Central Command reserves the right to suspend or revoke membership accounts, credentials, and digital IDs of any individual found violating the Sainik oath, engaging in anti-social behavior, or breaching organizational discipline."
      },
      {
        number: 17,
        title: "Limitation of Liability",
        content: "To the maximum extent permitted by applicable Indian law, Samata Sainik Dal and its officers shall not be liable for any indirect, incidental, or consequential damages resulting from platform usage or inability to access services."
      },
      {
        number: 18,
        title: "Changes to These Terms",
        content: "SSD reserves the right to amend these Terms of Service. Notice of material updates will be published with updated revision timestamps. Continued platform use signifies acceptance of updated terms."
      },
      {
        number: 19,
        title: "Grievance Redressal and Jurisdiction",
        content: "Any legal disputes or grievances shall be addressed to the Grievance Redressal Officer at Central Command HQ, Nagpur, and shall fall within the exclusive jurisdiction of the competent courts of Nagpur, Maharashtra."
      },
      {
        number: 20,
        title: "Effective Date and Version History",
        content: "This version (v1.0) is effective as of 25 October 2026. Historical versions are archived and accessible upon formal written request to Central Command Directorate."
      }
    ]
  },

  // --------------------------------------------------------------------------
  // PRIVACY POLICY (DPDP & IT ACT 2000 COMPLIANT)
  // --------------------------------------------------------------------------
  privacy_policy: {
    title: "Official Privacy Policy & Data Protection Charter",
    effectiveDate: "25 October 2026",
    version: "1.0",
    sections: [
      {
        title: "1. Information We Collect",
        content: "We collect information provided directly by you during cadet enlistment, grievance registration, or newsletter subscription, including full name, father/guardian name, date of birth, gender, contact number, email address, residential address, state, district, wing preference, educational background, blood group, and passport-size portrait photograph."
      },
      {
        title: "2. Lawful Purpose and Legal Basis",
        content: "Your data is collected exclusively for legitimate organizational purposes: maintaining the national Sainik roster, issuing verifiable digital ID cards, processing verification checks, coordinating regional disaster relief, and notifying cadets of upcoming drills and assemblies."
      },
      {
        title: "3. Access Controls & Role-Based Security",
        content: "Access to cadet dossiers is strictly segregated across 7 clearance tiers (L1 Chapter Official to L7 Supreme Commander). District officials can only view records within their geographic jurisdiction. Data in transit is secured using TLS 1.3 encryption, and passwords are hash-protected using Argon2id/Bcrypt algorithms."
      },
      {
        title: "4. Data Retention and Archival",
        content: "Active cadet records are retained throughout active service tenure. Non-approved or rejected applications are purged or anonymized after statutory audit periods. Members may request correction or deletion through our grievance portal."
      },
      {
        title: "5. Third-Party Disclosures",
        content: "We do not sell, license, or commercially exploit member data. Information is disclosed to external authorities only when compelled by valid legal subpoenas from competent Indian courts or law enforcement agencies."
      },
      {
        title: "6. Data Protection Officer (DPO) Contact",
        content: "For privacy inquiries, rectification requests, or grievance escalations, contact the Data Protection Officer, Samata Sainik Dal Central Directorate, Nagpur, Maharashtra (Email: privacy@samatasainikdal.org / grievance@ssd.org)."
      }
    ]
  },

  // --------------------------------------------------------------------------
  // HOMEPAGE CMS DYNAMIC SECTIONS
  // --------------------------------------------------------------------------
  cms_homepage: {
    hero: {
      headline: "Samata Sainik Dal",
      tagline: "Discipline • Patience • Continuity",
      subheadline: "",
      primaryCtaText: "Explore SSD",
      primaryCtaLink: "#about-ssd",
      secondaryCtaText: "Become a Sainik",
      secondaryCtaLink: "membership.html",
      tertiaryCtaText: "Explore Digital Library",
      tertiaryCtaLink: "library.html",
      bgImage: "ssd-cadets-march.jpg"
    },
    aimMottoHighlight: {
      aimShort: "To organize, educate, and discipline the oppressed masses to safeguard constitutional morality, eliminate caste barriers, and establish an enlightened democratic fraternity.",
      mottoShort: "Self-Respect, Discipline, Equality & Social Service (आत्मसन्मान, शिस्त, समानता व समाजसेवा)"
    }
  }
};


