// ==========================================================================
// SAMATA SAINIK DAL (SSD) - MIGRATION & SEEDING ENGINE
// ==========================================================================

import bcrypt from 'bcryptjs';
import { query, initDb, embeddedStore, saveEmbeddedStore } from './index.js';

export async function runMigration() {
  console.log('🚀 [Migration] Initializing SSD Database Schema and Seed Data...');
  await initDb();

  // Helper password hasher
  const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

  // 1. SEED ROLES
  const roles = [
    { id: 'super_admin', name: 'Super Administrator', description: 'Complete unrestricted system access', hierarchy_level: 7 },
    { id: 'central_admin', name: 'Central Command Official', description: 'National executive and final approval authority', hierarchy_level: 6 },
    { id: 'state_official', name: 'State Directorate Official', description: 'State-level oversight and intermediate review', hierarchy_level: 5 },
    { id: 'regional_official', name: 'Regional Commander', description: 'Regional division review and coordination', hierarchy_level: 4 },
    { id: 'district_official', name: 'District Dalpati / Officer', description: 'District verification and recommendation', hierarchy_level: 3 },
    { id: 'taluka_official', name: 'Taluka Executive Officer', description: 'Taluka/Sub-district level verification', hierarchy_level: 2 },
    { id: 'chapter_official', name: 'Local Chapter Commander', description: 'Grassroots chapter verification', hierarchy_level: 1 },
    { id: 'enlistment_officer', name: 'Enlistment Approval Officer', description: 'Authorized exclusively for enlistment scrutiny, assessment rubric scoring, and member approvals', hierarchy_level: 4 },
    { id: 'finance_admin', name: 'Finance & Treasury Admin', description: 'Donation, 80G tax receipt, and financial audit management', hierarchy_level: 5 },
    { id: 'media_admin', name: 'Media & Gazette Admin', description: 'News, events, press releases, and photo archives', hierarchy_level: 4 },
    { id: 'member', name: 'Enlisted Sainik / Cadet', description: 'Standard verified member portal access', hierarchy_level: 0 }
  ];

  for (const r of roles) {
    embeddedStore.roles.set(r.id, r);
  }

  // 2. SEED WINGS
  const wings = [
    { id: 'wing_cadet', name: 'Central Cadet Corps (Sainik Wing)', slug: 'cadet-corps', tagline: 'Discipline, Drill & Social Defense', icon: 'fa-shield' },
    { id: 'wing_mahila', name: 'Mahila Samata Sainik Dal (Women Wing)', slug: 'mahila-dal', tagline: 'Self-Defense, Equality & Leadership', icon: 'fa-venus' },
    { id: 'wing_legal', name: 'Constitutional Rights & Legal Cell', slug: 'legal-cell', tagline: 'Pro-Bono Constitutional Counsel', icon: 'fa-scale-balanced' },
    { id: 'wing_youth', name: 'Youth & Student Front', slug: 'youth-wing', tagline: 'Student Rights & Intellectual Mobilization', icon: 'fa-graduation-cap' },
    { id: 'wing_sewa', name: 'Community Sewa & Relief Force', slug: 'sewa-relief', tagline: 'Disaster Relief, Health Camps & Blood Donation', icon: 'fa-hand-holding-heart' }
  ];

  for (const w of wings) {
    embeddedStore.wings.set(w.id, w);
  }

  // 3. SEED STATES, REGIONS, DISTRICTS, CHAPTERS
  const states = [
    { id: 'state_mh', name: 'Maharashtra', hindi_name: 'महाराष्ट्र', marathi_name: 'महाराष्ट्र', code: 'MH', headquarters: 'Nagpur & Mumbai Directorate', president_name: 'Commander Pramod R. Moon', secretary_name: 'Adv. Nitin V. Dongre', status: 'ACTIVE', sort_order: 1 },
    { id: 'state_dl', name: 'Delhi NCR', hindi_name: 'दिल्ली एनसीआर', marathi_name: 'दिल्ली', code: 'DL', headquarters: 'Central Secretariat, New Delhi', president_name: 'Col. (Retd.) V. A. Thorat', secretary_name: 'Dr. Sunita Gautam', status: 'ACTIVE', sort_order: 2 },
    { id: 'state_up', name: 'Uttar Pradesh', hindi_name: 'उत्तर प्रदेश', marathi_name: 'उत्तर प्रदेश', code: 'UP', headquarters: 'Lucknow State HQ', president_name: 'Commander Rameshwar Prasad', secretary_name: 'Adv. V. K. Anand', status: 'ACTIVE', sort_order: 3 },
    { id: 'state_mp', name: 'Madhya Pradesh', hindi_name: 'मध्य प्रदेश', marathi_name: 'मध्य प्रदेश', code: 'MP', headquarters: 'Bhopal Directorate', president_name: 'Dr. B. K. Thorat', secretary_name: 'Sainik Anand Rao', status: 'ACTIVE', sort_order: 4 },
    { id: 'state_br', name: 'Bihar', hindi_name: 'बिहार', marathi_name: 'बिहार', code: 'BR', headquarters: 'Patna Command', president_name: 'Dharmendra Kumar Paswan', secretary_name: 'Rajesh Kumar Baitha', status: 'ACTIVE', sort_order: 5 },
    { id: 'state_ka', name: 'Karnataka', hindi_name: 'कर्नाटक', marathi_name: 'कर्नाटक', code: 'KA', headquarters: 'Bengaluru Command', president_name: 'Sainik Mallikarjun Swamy', secretary_name: 'Adv. Suresh Babu', status: 'ACTIVE', sort_order: 6 },
    { id: 'state_rj', name: 'Rajasthan', hindi_name: 'राजस्थान', marathi_name: 'राजस्थान', code: 'RJ', headquarters: 'Jaipur Command', president_name: 'Commander Sumer Singh', secretary_name: 'Adv. P. R. Bairwa', status: 'ACTIVE', sort_order: 7 },
    { id: 'state_pb', name: 'Punjab', hindi_name: 'पंजाब', marathi_name: 'पंजाब', code: 'PB', headquarters: 'Jalandhar Command', president_name: 'Sainik Jaswant Singh', secretary_name: 'Harpreet Singh', status: 'ACTIVE', sort_order: 8 }
  ];

  for (const s of states) {
    embeddedStore.states.set(s.id, s);
  }

  // Regions (Maharashtra)
  const regions = [
    { id: 'reg_mh_vidarbha', state_id: 'state_mh', name: 'Vidarbha', headquarters: 'Nagpur Central HQ', status: 'ACTIVE' },
    { id: 'reg_mh_western', state_id: 'state_mh', name: 'Western Maharashtra', headquarters: 'Pune Command', status: 'ACTIVE' },
    { id: 'reg_mh_konkan', state_id: 'state_mh', name: 'Konkan & Mumbai Metropolitan', headquarters: 'Mumbai Directorate', status: 'ACTIVE' },
    { id: 'reg_mh_marathwada', state_id: 'state_mh', name: 'Marathwada', headquarters: 'Chhatrapati Sambhaji Nagar Command', status: 'ACTIVE' },
    { id: 'reg_mh_north', state_id: 'state_mh', name: 'North Maharashtra (Khandesh)', headquarters: 'Nashik Command', status: 'ACTIVE' }
  ];

  for (const rg of regions) {
    embeddedStore.regions.set(rg.id, rg);
  }

  // Districts (Maharashtra Sample)
  const districts = [
    { id: 'dist_mh_nagpur', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', name: 'Nagpur', commander_name: 'Sainik Rajesh T. Shinde', contact_phone: '+91 98223 41927', status: 'ACTIVE' },
    { id: 'dist_mh_mumbai', state_id: 'state_mh', region_id: 'reg_mh_konkan', name: 'Mumbai City', commander_name: 'Adv. Amit S. Bansode', contact_phone: '+91 98201 22334', status: 'ACTIVE' },
    { id: 'dist_mh_pune', state_id: 'state_mh', region_id: 'reg_mh_western', name: 'Pune', commander_name: 'Prof. Sanjay B. Gaikwad', contact_phone: '+91 94220 55667', status: 'ACTIVE' },
    { id: 'dist_mh_amravati', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', name: 'Amravati', commander_name: 'Smt. Pratibha D. Wankhede', contact_phone: '+91 98901 33445', status: 'ACTIVE' },
    { id: 'dist_mh_thane', state_id: 'state_mh', region_id: 'reg_mh_konkan', name: 'Thane', commander_name: 'Commander Sunil K. More', contact_phone: '+91 98210 66778', status: 'ACTIVE' },
    { id: 'dist_mh_nashik', state_id: 'state_mh', region_id: 'reg_mh_north', name: 'Nashik', commander_name: 'Sainik Deepak R. Bhalerao', contact_phone: '+91 94239 88990', status: 'ACTIVE' },
    { id: 'dist_dl_central', state_id: 'state_dl', region_id: null, name: 'Central Delhi', commander_name: 'Sainik Anand Gautam', contact_phone: '+91 98110 11223', status: 'ACTIVE' },
    { id: 'dist_up_lucknow', state_id: 'state_up', region_id: null, name: 'Lucknow', commander_name: 'Sainik Suresh Kumar', contact_phone: '+91 94150 33445', status: 'ACTIVE' }
  ];

  for (const d of districts) {
    embeddedStore.districts.set(d.id, d);
  }

  // Talukas (Sample Sub-districts)
  const talukas = [
    { id: 'taluka_mh_nagpur_urban', district_id: 'dist_mh_nagpur', name: 'Nagpur Urban', commander_name: 'Sainik Chandrashekhar Wankhede', status: 'ACTIVE' },
    { id: 'taluka_mh_nagpur_rural', district_id: 'dist_mh_nagpur', name: 'Nagpur Rural', commander_name: 'Sainik Pravin Meshram', status: 'ACTIVE' },
    { id: 'taluka_mh_haveli', district_id: 'dist_mh_pune', name: 'Haveli', commander_name: 'Sainik Rahul Kamble', status: 'ACTIVE' },
    { id: 'taluka_mh_pune_city', district_id: 'dist_mh_pune', name: 'Pune City', commander_name: 'Sainik Vishal Gaikwad', status: 'ACTIVE' }
  ];

  for (const t of talukas) {
    embeddedStore.talukas.set(t.id, t);
  }

  // Chapters
  const chapters = [
    { id: 'chap_nagpur_deekshabhoomi', name: 'Deekshabhoomi Central Chapter', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', district_id: 'dist_mh_nagpur', taluka_id: null, location_address: 'Deekshabhoomi Complex, Wardha Road, Nagpur', commander_name: 'Rajesh Shinde', secretary_name: 'Nitin Meshram', contact_phone: '+91 98223 41927', contact_email: 'nagpur.central@ssd.org', members_count: 1450, status: 'ACTIVE' },
    { id: 'chap_mumbai_chaityabhoomi', name: 'Chaityabhoomi Dadar Chapter', state_id: 'state_mh', region_id: 'reg_mh_konkan', district_id: 'dist_mh_mumbai', taluka_id: null, location_address: 'Shivaji Park, Dadar West, Mumbai', commander_name: 'Amit Bansode', secretary_name: 'Vijay Kamble', contact_phone: '+91 98201 22334', contact_email: 'mumbai.dadar@ssd.org', members_count: 980, status: 'ACTIVE' },
    { id: 'chap_pune_koregaon', name: 'Koregaon Bhima Memorial Chapter', state_id: 'state_mh', region_id: 'reg_mh_western', district_id: 'dist_mh_pune', taluka_id: null, location_address: 'Jaystambh Premises, Perne, Pune', commander_name: 'Sanjay Gaikwad', secretary_name: 'Pramod Thorat', contact_phone: '+91 94220 55667', contact_email: 'pune.koregaon@ssd.org', members_count: 720, status: 'ACTIVE' }
  ];

  for (const ch of chapters) {
    embeddedStore.chapters.set(ch.id, ch);
  }

  // 4. APPROVAL WORKFLOWS & STEPS CONFIGURATION
  const defaultWorkflow = {
    id: 'wf_national_standard',
    name: 'National Standard 4-Tier Approval Workflow',
    state_id: null,
    description: 'District Review & Recommendation -> Regional Review -> State Directorate Review -> Central Command Final Approval',
    is_active: true,
    created_at: new Date().toISOString()
  };
  embeddedStore.approval_workflows.set(defaultWorkflow.id, defaultWorkflow);

  const workflowSteps = [
    {
      id: 'step_1_district',
      workflow_id: 'wf_national_standard',
      step_order: 1,
      role_required: 'district_official',
      step_label: 'District Executive Review',
      can_recommend: true,
      can_request_correction: true,
      can_reject: true,
      can_escalate: true,
      can_final_approve: false,
      is_optional: false
    },
    {
      id: 'step_2_regional',
      workflow_id: 'wf_national_standard',
      step_order: 2,
      role_required: 'regional_official',
      step_label: 'Regional Command Verification',
      can_recommend: true,
      can_request_correction: true,
      can_reject: true,
      can_escalate: true,
      can_final_approve: false,
      is_optional: true
    },
    {
      id: 'step_3_state',
      workflow_id: 'wf_national_standard',
      step_order: 3,
      role_required: 'state_official',
      step_label: 'State Directorate Review',
      can_recommend: true,
      can_request_correction: true,
      can_reject: true,
      can_escalate: true,
      can_final_approve: false,
      is_optional: false
    },
    {
      id: 'step_4_central',
      workflow_id: 'wf_national_standard',
      step_order: 4,
      role_required: 'central_admin',
      step_label: 'Central Command Final Commission & ID Issuance',
      can_recommend: false,
      can_request_correction: true,
      can_reject: true,
      can_escalate: false,
      can_final_approve: true,
      is_optional: false
    }
  ];

  for (const st of workflowSteps) {
    embeddedStore.approval_workflow_steps.set(st.id, st);
  }

  // 5. SEED USERS & JURISDICTIONS
  const users = [
    {
      id: 'usr_super_admin',
      email: 'admin@ssd.org',
      password_hash: hashPassword('SSD1927'),
      full_name: 'National Commander-in-Chief (Super Admin)',
      phone: '+91 98223 00001',
      role_id: 'super_admin',
      department: 'Supreme Command Council',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_central_secretary',
      email: 'secretary@ssd.org',
      password_hash: hashPassword('EXEC1927'),
      full_name: 'Commander Ravindra K. Gautam',
      phone: '+91 98223 00002',
      role_id: 'central_admin',
      department: 'National Executive Secretariat',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_state_mh',
      email: 'state.mh@ssd.org',
      password_hash: hashPassword('MH1927'),
      full_name: 'Commander Pramod R. Moon (State President)',
      phone: '+91 98223 00003',
      role_id: 'state_official',
      department: 'Maharashtra State Directorate',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_region_vidarbha',
      email: 'region.vidarbha@ssd.org',
      password_hash: hashPassword('VIDARBHA1927'),
      full_name: 'Commander Vilas R. Meshram (Regional Officer)',
      phone: '+91 98223 00004',
      role_id: 'regional_official',
      department: 'Vidarbha Regional Command',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_district_nagpur',
      email: 'district.nagpur@ssd.org',
      password_hash: hashPassword('NAGPUR1927'),
      full_name: 'Sainik Rajesh T. Shinde (Nagpur District Dalpati)',
      phone: '+91 98223 41927',
      role_id: 'district_official',
      department: 'Nagpur District Directorate',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_district_pune',
      email: 'district.pune@ssd.org',
      password_hash: hashPassword('PUNE1927'),
      full_name: 'Prof. Sanjay B. Gaikwad (Pune District Officer)',
      phone: '+91 94220 55667',
      role_id: 'district_official',
      department: 'Pune District Directorate',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_finance_admin',
      email: 'finance@ssd.org',
      password_hash: hashPassword('TREASURY1927'),
      full_name: 'Prof. Mahendra Khobragade (National Treasurer)',
      phone: '+91 98223 00005',
      role_id: 'finance_admin',
      department: 'National Treasury & 80G Audit Bureau',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_media_admin',
      email: 'media@ssd.org',
      password_hash: hashPassword('MEDIA1927'),
      full_name: 'Samyak Thool (Chief Media Officer & IT Cell)',
      phone: '+91 98223 00006',
      role_id: 'media_admin',
      department: 'Central IT & Public Communications Cell',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_enlistment_officer',
      email: 'approvals@ssd.org',
      password_hash: hashPassword('APPROVE1927'),
      full_name: 'Commander Surendra G. Meshram (Enlistment Officer)',
      phone: '+91 98223 00007',
      role_id: 'enlistment_officer',
      department: 'National Enlistment & Scrutiny Board',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_taluka_nagpur',
      email: 'taluka.nagpur@ssd.org',
      password_hash: hashPassword('TALUKA1927'),
      full_name: 'Sainik Chandrashekhar Wankhede (Taluka Executive Officer)',
      phone: '+91 98223 00008',
      role_id: 'taluka_official',
      department: 'Nagpur Urban Taluka Directorate',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr_taluka_haveli',
      email: 'taluka.haveli@ssd.org',
      password_hash: hashPassword('HAVELI1927'),
      full_name: 'Sainik Rahul Kamble (Haveli Taluka Officer)',
      phone: '+91 94220 00009',
      role_id: 'taluka_official',
      department: 'Haveli (Pune) Taluka Directorate',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    }
  ];

  for (const u of users) {
    embeddedStore.users.set(u.id, u);
  }

  // User Jurisdictions
  const jurisdictions = [
    { id: 'jur_super', user_id: 'usr_super_admin', role_id: 'super_admin', state_id: null, region_id: null, district_id: null, is_primary: true },
    { id: 'jur_central', user_id: 'usr_central_secretary', role_id: 'central_admin', state_id: null, region_id: null, district_id: null, is_primary: true },
    { id: 'jur_enlistment', user_id: 'usr_enlistment_officer', role_id: 'enlistment_officer', state_id: null, region_id: null, district_id: null, is_primary: true },
    { id: 'jur_state_mh', user_id: 'usr_state_mh', role_id: 'state_official', state_id: 'state_mh', region_id: null, district_id: null, is_primary: true },
    { id: 'jur_reg_vid', user_id: 'usr_region_vidarbha', role_id: 'regional_official', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', district_id: null, is_primary: true },
    { id: 'jur_dist_ngp', user_id: 'usr_district_nagpur', role_id: 'district_official', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', district_id: 'dist_mh_nagpur', is_primary: true },
    { id: 'jur_dist_pun', user_id: 'usr_district_pune', role_id: 'district_official', state_id: 'state_mh', region_id: 'reg_mh_western', district_id: 'dist_mh_pune', is_primary: true },
    { id: 'jur_tal_ngp', user_id: 'usr_taluka_nagpur', role_id: 'taluka_official', state_id: 'state_mh', region_id: 'reg_mh_vidarbha', district_id: 'dist_mh_nagpur', taluka_id: 'taluka_mh_nagpur_urban', is_primary: true },
    { id: 'jur_tal_pun', user_id: 'usr_taluka_haveli', role_id: 'taluka_official', state_id: 'state_mh', region_id: 'reg_mh_western', district_id: 'dist_mh_pune', taluka_id: 'taluka_mh_haveli', is_primary: true },
    { id: 'jur_fin', user_id: 'usr_finance_admin', role_id: 'finance_admin', state_id: null, region_id: null, district_id: null, is_primary: true },
    { id: 'jur_med', user_id: 'usr_media_admin', role_id: 'media_admin', state_id: null, region_id: null, district_id: null, is_primary: true }
  ];

  for (const j of jurisdictions) {
    embeddedStore.user_jurisdictions.set(j.id, j);
  }

  // 6. SEED MEMBERSHIP APPLICATIONS (Only when SEED_DEMO_DATA=true)
  if (process.env.SEED_DEMO_DATA === 'true') {
    const sampleApps = [
    {
      id: 'SSD-2026-8F42K7',
      full_name: 'Aniket M. Meshram',
      dob: '1998-04-14',
      gender: 'Male',
      mobile: '+91 98223 14141',
      email: 'aniket.meshram@example.com',
      address: 'Plot 42, Siddharth Nagar, Hingna Road',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_vidarbha',
      region_name: 'Vidarbha',
      district_id: 'dist_mh_nagpur',
      district_name: 'Nagpur',
      taluka_id: null,
      taluka_name: 'Nagpur Urban',
      village_city: 'Nagpur',
      education: 'B.Tech Computer Science',
      occupation: 'Software Engineer',
      blood_group: 'O+',
      wing_id: 'wing_cadet',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'NCC C-Certificate Holder, First Aid Trained',
      solemn_pledge_accepted: true,
      status: 'SUBMITTED',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_1_district',
      current_step_order: 1,
      assigned_role: 'district_official',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'SSD-2026-9B11P3',
      full_name: 'Adv. Pooja V. Kamble',
      dob: '1995-12-06',
      gender: 'Female',
      mobile: '+91 98223 55678',
      email: 'pooja.kamble@example.com',
      address: 'B-12, Panchsheel Colony, Wardha Road',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_vidarbha',
      region_name: 'Vidarbha',
      district_id: 'dist_mh_nagpur',
      district_name: 'Nagpur',
      taluka_id: null,
      taluka_name: 'Nagpur Urban',
      village_city: 'Nagpur',
      education: 'LL.M. Constitutional Law',
      occupation: 'High Court Advocate',
      blood_group: 'B+',
      wing_id: 'wing_legal',
      wing_name: 'Constitutional Rights & Legal Cell',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Human Rights Litigation & Legal Aid Volunteer',
      solemn_pledge_accepted: true,
      status: 'RECOMMENDED',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_3_state',
      current_step_order: 3,
      assigned_role: 'state_official',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 'SSD-2026-7C33X9',
      full_name: 'Sainik Rahul S. Wankhede',
      dob: '2001-08-15',
      gender: 'Male',
      mobile: '+91 94220 99887',
      email: 'rahul.wankhede@example.com',
      address: 'Lane 4, Ambedkar Chowk, Kothrud',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_western',
      region_name: 'Western Maharashtra',
      district_id: 'dist_mh_pune',
      district_name: 'Pune',
      taluka_id: null,
      taluka_name: 'Haveli',
      village_city: 'Pune',
      education: 'M.A. Political Science',
      occupation: 'Student / Youth Scholar',
      blood_group: 'A+',
      wing_id: 'wing_youth',
      wing_name: 'Youth & Student Front',
      photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Youth Public Speaking & Constitutional Quizzes',
      solemn_pledge_accepted: true,
      status: 'CORRECTION_REQUIRED',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_1_district',
      current_step_order: 1,
      assigned_role: 'district_official',
      correction_remarks: 'Please upload a clearer passport-size photograph with white background.',
      created_at: new Date(Date.now() - 3600000 * 72).toISOString()
    },
    {
      id: 'SSD-2026-5K29R1',
      full_name: 'Priya R. Dongre',
      dob: '2001-08-15',
      gender: 'Female',
      mobile: '+91 98223 88888',
      email: 'priya.dongre@example.com',
      address: '74, Dr. Ambedkar Marg, Pune',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_western',
      region_name: 'Western Maharashtra',
      district_id: 'dist_mh_pune',
      district_name: 'Pune',
      taluka_id: null,
      taluka_name: 'Haveli',
      village_city: 'Pune',
      education: 'B.A. Sociology',
      occupation: 'Social Worker',
      blood_group: 'B+',
      wing_id: 'wing_mahila',
      wing_name: 'Mahila Samata Sainik Dal (Women Wing)',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Self-Defense Trainer & Legal Aid Counselor',
      solemn_pledge_accepted: true,
      status: 'SUBMITTED',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_1_district',
      current_step_order: 1,
      assigned_role: 'district_official',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'SSD-2026-4W18T2',
      full_name: 'Amit S. Bansode',
      dob: '1997-01-26',
      gender: 'Male',
      mobile: '+91 98201 22334',
      email: 'amit.bansode@example.com',
      address: 'Chaityabhoomi Complex, Dadar West',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_konkan',
      region_name: 'Konkan & Mumbai Metropolitan',
      district_id: 'dist_mh_mumbai',
      district_name: 'Mumbai City',
      taluka_id: null,
      taluka_name: 'Dadar',
      village_city: 'Mumbai',
      education: 'M.Com, NCC Senior Division',
      occupation: 'Logistics Coordinator',
      blood_group: 'O+',
      wing_id: 'wing_cadet',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Parade Commander & Disaster Relief Volunteer',
      solemn_pledge_accepted: true,
      status: 'RECOMMENDED',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_3_state',
      current_step_order: 3,
      assigned_role: 'state_official',
      created_at: new Date(Date.now() - 3600000 * 36).toISOString()
    },
    {
      id: 'SSD-LEGACY-2012-01',
      full_name: 'Dnyaneshwar M. Dongre',
      dob: '1984-06-12',
      gender: 'Male',
      mobile: '+91 98224 88771',
      email: 'dnyaneshwar.dongre@example.com',
      address: 'Near Dikshabhoomi Ward, Nagpur',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_vidarbha',
      region_name: 'Vidarbha',
      district_id: 'dist_mh_nagpur',
      district_name: 'Nagpur',
      taluka_id: null,
      taluka_name: 'Nagpur Urban',
      village_city: 'Nagpur',
      education: 'B.A. Political Science',
      occupation: 'Social Worker & Veteran Volunteer',
      blood_group: 'B+',
      wing_id: 'wing_cadet',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Historical Archival Coordinator',
      solemn_pledge_accepted: true,
      membership_type: 'LEGACY',
      original_joining_date: '2012-08-15',
      joining_date_precision: 'EXACT',
      portal_registration_date: new Date(Date.now() - 3600000 * 12).toISOString(),
      joining_date_verified: true,
      joining_date_verified_by: 'usr_central_secretary',
      joining_date_verified_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      joining_date_verification_notes: 'Verified against 2012 Dikshabhoomi Camp Register',
      batch_id: null,
      batch_code: null,
      batch_assignment_status: 'PENDING',
      status: 'BATCH_PENDING',
      existing_sainik_id: 'SSD-MH-OLD-4412',
      current_designation: 'Senior Area Coordinator',
      previous_responsibilities: 'Mahad Satyagraha Camp Coordinator 2014-2019',
      recommending_official: 'Commander Ashok Gaikwad (State Commander)',
      historical_notes: 'Joined during 85th SSD Foundation Day Assembly, August 2012.',
      verification_tier: 'STATE',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_3_state',
      current_step_order: 3,
      assigned_role: 'central_admin',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'SSD-LEGACY-2015-02',
      full_name: 'Shankar Rao Jadhav',
      dob: '1978-04-10',
      gender: 'Male',
      mobile: '+91 94221 66554',
      email: 'shankar.jadhav@example.com',
      address: 'Ambedkar Chowk, Pune',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_western',
      region_name: 'Western Maharashtra',
      district_id: 'dist_mh_pune',
      district_name: 'Pune',
      taluka_id: null,
      taluka_name: 'Haveli',
      village_city: 'Pune',
      education: 'Higher Secondary',
      occupation: 'Small Business Owner',
      blood_group: 'A+',
      wing_id: 'wing_cadet',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Drill Sergeant',
      solemn_pledge_accepted: true,
      membership_type: 'LEGACY',
      original_joining_date: '2015-01-01',
      joining_date_precision: 'APPROXIMATE_UNKNOWN',
      portal_registration_date: new Date(Date.now() - 3600000 * 8).toISOString(),
      joining_date_verified: false,
      batch_id: null,
      batch_code: null,
      batch_assignment_status: 'PENDING',
      status: 'DATE_VERIFICATION_PENDING',
      existing_sainik_id: 'SSD-PN-2015-OLD',
      current_designation: 'Shakha Nayak',
      previous_responsibilities: 'Pune District Drill Squad 2016',
      recommending_official: 'Adv. Suresh Meshram',
      historical_notes: 'Exact joining date requires senior officer verification; joined around early 2015.',
      verification_tier: 'DISTRICT',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_1_district',
      current_step_order: 1,
      assigned_role: 'district_official',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'SSD-LEGACY-2018-03',
      full_name: 'Rohit P. Kamble',
      dob: '1990-11-20',
      gender: 'Male',
      mobile: '+91 97654 32110',
      email: 'rohit.kamble@example.com',
      address: 'Ramabai Nagar, Ghatkopar, Mumbai',
      state_id: 'state_mh',
      state_name: 'Maharashtra',
      region_id: 'reg_mh_konkan',
      region_name: 'Konkan & Mumbai Metropolitan',
      district_id: 'dist_mh_mumbai',
      district_name: 'Mumbai City',
      taluka_id: null,
      taluka_name: 'Ghatkopar',
      village_city: 'Mumbai',
      education: 'B.Sc IT',
      occupation: 'IT Technician',
      blood_group: 'AB+',
      wing_id: 'wing_youth',
      wing_name: 'Youth & Student Front',
      photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
      documents_json: [],
      special_skills: 'Digital Communications',
      solemn_pledge_accepted: true,
      membership_type: 'LEGACY',
      original_joining_date: '2018-10-14',
      joining_date_precision: 'EXACT',
      portal_registration_date: new Date(Date.now() - 3600000 * 4).toISOString(),
      joining_date_verified: false,
      batch_id: null,
      batch_code: null,
      batch_assignment_status: 'PENDING',
      status: 'LEGACY_SUBMITTED',
      existing_sainik_id: null,
      current_designation: 'Youth Cadre Member',
      previous_responsibilities: 'Dhamma Chakra Pravartan Din Volunteer 2018-2022',
      recommending_official: 'Commander Ashok Gaikwad',
      historical_notes: 'Joined on Dhammachakra Pravartan Din 2018 at Nagpur Deekshabhoomi.',
      verification_tier: 'LOCAL',
      workflow_id: 'wf_national_standard',
      current_step_id: 'step_1_district',
      current_step_order: 1,
      assigned_role: 'district_official',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  for (const app of sampleApps) {
    embeddedStore.membership_applications.set(app.id, app);
    
    // Add initial approval action
    const actionId = 'act_' + app.id + '_sub';
    embeddedStore.approval_actions.set(actionId, {
      id: actionId,
      application_id: app.id,
      step_id: app.current_step_id || 'step_1_district',
      official_id: null,
      official_name: 'Applicant Self-Service',
      official_role: 'Applicant',
      jurisdiction_summary: `${app.district_name}, ${app.state_name}`,
      action: 'SUBMIT',
      previous_status: null,
      new_status: app.status || 'SUBMITTED',
      remarks: app.membership_type === 'LEGACY' 
        ? 'Legacy Sainik registration submitted for multi-tier historical verification.'
        : 'Application submitted successfully through online portal.',
      created_at: app.created_at
    });
  }

  // 7. SEED VERIFIED ACTIVE MEMBERS (INCLUDING LEGACY VETERANS)
  const activeMembers = [
    {
      id: 'mem_1',
      sainik_id: 'SSD-MH-2026-001245',
      application_id: 'SSD-2026-PREV01',
      full_name: 'Cadet Rameshwar S. Meshram',
      email: 'rameshwar.meshram@example.com',
      mobile: '+91 98223 41927',
      dob: '1996-03-24',
      gender: 'Male',
      blood_group: 'O+',
      photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      state_name: 'Maharashtra',
      region_name: 'Vidarbha',
      district_name: 'Nagpur',
      taluka_name: 'Nagpur Urban',
      chapter_name: 'Deekshabhoomi Central Chapter',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      designation: 'Cadet Platoon Leader',
      batch_no: 'SSD-BATCH-2026',
      batch_id: 'batch_2026',
      membership_type: 'NEW',
      original_joining_date: '2026-01-15',
      portal_registration_date: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      joining_date_verified: true,
      status: 'ACTIVE',
      qr_token: 'qr_tok_ssd_mh_2026_001245_ver',
      approved_by: 'usr_central_secretary',
      approved_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
    },
    {
      id: 'mem_2',
      sainik_id: 'SSD-DL-2026-001246',
      application_id: 'SSD-2026-PREV02',
      full_name: 'Adv. Sunita Gautam',
      email: 'sunita.gautam@example.com',
      mobile: '+91 94231 55678',
      dob: '1993-07-19',
      gender: 'Female',
      blood_group: 'B+',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      state_name: 'Delhi NCR',
      region_name: 'Delhi Command',
      district_name: 'Central Delhi',
      taluka_name: 'New Delhi',
      chapter_name: 'Central Secretariat Chapter',
      wing_name: 'Constitutional Rights & Legal Cell',
      designation: 'Senior Legal Advisor',
      batch_no: 'SSD-BATCH-2026',
      batch_id: 'batch_2026',
      membership_type: 'NEW',
      original_joining_date: '2026-02-10',
      portal_registration_date: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
      joining_date_verified: true,
      status: 'ACTIVE',
      qr_token: 'qr_tok_ssd_dl_2026_001246_ver',
      approved_by: 'usr_central_secretary',
      approved_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString()
    },
    {
      id: 'mem_legacy_1',
      sainik_id: 'SSD-MH-1989-0042',
      application_id: 'SSD-LEGACY-1989-01',
      full_name: 'Commander Ashok R. Gaikwad',
      email: 'ashok.gaikwad@example.com',
      mobile: '+91 98220 19890',
      dob: '1968-05-14',
      gender: 'Male',
      blood_group: 'O+',
      photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      state_name: 'Maharashtra',
      region_name: 'Vidarbha',
      district_name: 'Nagpur',
      taluka_name: 'Nagpur Urban',
      chapter_name: 'Deekshabhoomi Central Unit',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      designation: 'State Commander, Maharashtra State SSD',
      batch_no: 'SSD-BATCH-1989',
      batch_id: 'batch_1989',
      membership_type: 'LEGACY',
      original_joining_date: '1989-10-14',
      joining_date_precision: 'EXACT',
      portal_registration_date: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
      joining_date_verified: true,
      joining_date_verified_by: 'usr_super_admin',
      joining_date_verified_at: new Date(Date.now() - 3600000 * 24 * 59).toISOString(),
      existing_sainik_id: 'SSD-MH-1989-LEGACY',
      historical_notes: 'Active for 35+ years since 1989. Certified veteran commander.',
      status: 'ACTIVE',
      qr_token: 'qr_tok_ssd_mh_1989_0042_ver',
      approved_by: 'usr_super_admin',
      approved_at: new Date(Date.now() - 3600000 * 24 * 59).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24 * 60).toISOString()
    }
  ];

  for (const m of activeMembers) {
    embeddedStore.members.set(m.id, m);
    if (m.sainik_id) embeddedStore.members.set(m.sainik_id, m);
  }

  // 7B. SEED BATCH CONFIGURATION & HISTORICAL BATCHES
  const defaultBatchConfig = {
    id: 'default_config',
    format_template: 'SSD-BATCH-{YEAR}',
    allowed_formats: [
      'SSD-BATCH-{YEAR}',
      'SSD-{YEAR}-B{SEQ}',
      'SSD-{STATE}-{YEAR}-B{SEQ}'
    ],
    allocation_rule: 'JOINING_YEAR_NATIONAL',
    period_type: 'YEARLY',
    default_scope: 'NATIONAL',
    require_date_verification: true,
    updated_at: new Date().toISOString()
  };
  embeddedStore.batch_config.set('default_config', defaultBatchConfig);

  const initialBatches = [
    { id: 'batch_1956', batch_code: 'SSD-BATCH-1956', batch_name: 'Historic Deekshabhoomi Dhamma Deeksha Batch (1956)', year: 1956, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 1, status: 'ARCHIVED' },
    { id: 'batch_1970', batch_code: 'SSD-BATCH-1970', batch_name: 'Movement Resurgence Batch (1970)', year: 1970, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_1980', batch_code: 'SSD-BATCH-1980', batch_name: 'Namantar Andolan Vanguard Batch (1980)', year: 1980, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_1989', batch_code: 'SSD-BATCH-1989', batch_name: 'Diamond Jubilee Cadre Batch (1989)', year: 1989, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 1, status: 'ACTIVE' },
    { id: 'batch_2000', batch_code: 'SSD-BATCH-2000', batch_name: 'Millennium Social Defense Batch (2000)', year: 2000, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_2010', batch_code: 'SSD-BATCH-2010', batch_name: 'Constitutional Awareness Brigade (2010)', year: 2010, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_2012', batch_code: 'SSD-BATCH-2012', batch_name: '85th Foundation Year Cadre (2012)', year: 2012, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 1, status: 'ACTIVE' },
    { id: 'batch_2015', batch_code: 'SSD-BATCH-2015', batch_name: 'Nashik Centenary Road Cadre (2015)', year: 2015, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_2020', batch_code: 'SSD-BATCH-2020', batch_name: 'COVID Community Sewa Frontline Batch (2020)', year: 2020, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_2024', batch_code: 'SSD-BATCH-2024', batch_name: 'Centenary Precursor Corps (2024)', year: 2024, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 0, status: 'ACTIVE' },
    { id: 'batch_2026', batch_code: 'SSD-BATCH-2026', batch_name: 'Digital Command Inaugural Batch (2026)', year: 2026, scope: 'NATIONAL', allocation_rule: 'JOINING_YEAR_NATIONAL', format_template: 'SSD-BATCH-{YEAR}', total_members: 2, status: 'ACTIVE' }
  ];

  for (const b of initialBatches) {
    embeddedStore.batches.set(b.id, {
      ...b,
      created_at: new Date(Date.now() - 3600000 * 24 * 365).toISOString(),
      created_by: 'usr_super_admin'
    });
  }

  // 8. SEED DONATIONS & RECEIPTS
  const donations = [
    {
      id: 'don_1',
      order_id: 'order_SSD1001',
      payment_id: 'pay_live_001_meshram',
      signature: 'sig_verified_mock_hash_001',
      amount: 5000,
      currency: 'INR',
      donor_name: 'Prakashrao R. Kamble',
      email: 'prakash.kamble@example.com',
      phone: '+91 98223 99881',
      pan: 'ABCDE1234F',
      address: 'Nagpur, Maharashtra',
      cause: 'Centenary Headquarters Fund',
      status: 'COMPLETED',
      receipt_number: 'SSD-REC-2026-000089',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'don_2',
      order_id: 'order_SSD1002',
      payment_id: 'pay_live_002_wankhede',
      signature: 'sig_verified_mock_hash_002',
      amount: 2500,
      currency: 'INR',
      donor_name: 'Anand M. Wankhede',
      email: 'anand.wankhede@example.com',
      phone: '+91 94220 11223',
      pan: 'XYZPK9876Q',
      address: 'Pune, Maharashtra',
      cause: 'Constitutional Literacy Yatra',
      status: 'COMPLETED',
      receipt_number: 'SSD-REC-2026-000090',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  for (const d of donations) {
    embeddedStore.donations.set(d.id, d);
    embeddedStore.receipts.set(d.receipt_number, {
      id: 'rec_' + d.id,
      receipt_number: d.receipt_number,
      donation_id: d.id,
      donor_name: d.donor_name,
      amount: d.amount,
      cause: d.cause,
      payment_id: d.payment_id,
      pan: d.pan,
      is_80g_eligible: true,
      issued_at: d.created_at
    });
  }
  }

  // 9. SEED EVENTS
  const events = [
    {
      id: 'event_1',
      title: '99th SSD Foundation Day National Parade & Salute',
      slug: '99th-foundation-day-parade',
      description: 'Ceremonial flag hoisting, march past by all Cadet Wings, and state address commemorating Dr. B.R. Ambedkar founding vision.',
      event_date: '2026-09-24',
      event_time: '08:00 AM IST',
      location: 'Nagpur & Mumbai Central Command Grounds',
      state_name: 'Maharashtra',
      district_name: 'Nagpur',
      wing_name: 'Central Cadet Corps (Sainik Wing)',
      organizer: 'National Executive Directorate',
      banner_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
      status: 'UPCOMING',
      registration_required: true,
      participant_limit: 5000,
      created_at: new Date().toISOString()
    },
    {
      id: 'event_2',
      title: 'National Constitution Day March & Public Conclave',
      slug: 'national-constitution-day-march-2026',
      description: 'Mass rally upholding Constitutional Morality, Fundamental Rights, and the Preamble across Delhi NCR.',
      event_date: '2026-11-26',
      event_time: '09:30 AM IST',
      location: 'Central Secretariat Grounds, New Delhi',
      state_name: 'Delhi NCR',
      district_name: 'Central Delhi',
      wing_name: 'Constitutional Rights & Legal Cell',
      organizer: 'Delhi NCR Command',
      banner_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
      status: 'UPCOMING',
      registration_required: true,
      participant_limit: 10000,
      created_at: new Date().toISOString()
    }
  ];

  for (const e of events) {
    embeddedStore.events.set(e.id, e);
  }

  // 10. SEED NEWS
  const news = [
    {
      id: 'news_1',
      title: 'National SSD Centenary (1927–2027) Coordination Council Established at Nagpur',
      slug: 'centenary-coordination-council-nagpur',
      excerpt: 'Central Command announces nationwide 100-Year commemorative march pasts, constitutional literacy yatras, and youth cadet enlistment drives.',
      content: 'On the eve of the centenary milestone, the National Executive Committee of Samata Sainik Dal convened at Nagpur HQ to finalize the roadmap for 2027.',
      category: 'Centenary',
      image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      is_published: true,
      author_name: 'National Executive Secretariat',
      published_at: '2026-10-14T10:00:00Z',
      created_at: new Date().toISOString()
    },
    {
      id: 'news_2',
      title: 'Over 2,500 Cadets Graduate from State Physical Drill & Leadership Camp',
      slug: 'state-cadet-drill-graduation-nagpur',
      excerpt: 'Intensive residential camp at Deekshabhoomi ground concludes with ceremonial salute, flag drill, and constitutional law seminars.',
      content: 'The 10-day physical training and social defense camp saw participation from 36 districts across Maharashtra.',
      category: 'Cadet Training',
      image_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
      is_published: true,
      author_name: 'Cadet Training Directorate',
      published_at: '2026-10-08T14:30:00Z',
      created_at: new Date().toISOString()
    }
  ];

  for (const n of news) {
    embeddedStore.news.set(n.id, n);
  }

  // 11. SEED SYSTEM SETTINGS
  embeddedStore.system_settings.set('razorpay_config', {
    key: 'razorpay_config',
    value: { key_id: 'rzp_test_1DP5mmOlF5G5ag', mode: 'sandbox' },
    description: 'Active Razorpay Gateway API Key configuration'
  });

  embeddedStore.system_settings.set('org_config', {
    key: 'org_config',
    value: {
      name: 'Samata Sainik Dal (SSD)',
      tagline: 'समता सैनिक दल (स्थापना: १९२७) | Founded by Dr. B.R. Ambedkar',
      founder: 'Dr. B.R. Ambedkar',
      helpline: '1800-24-1927',
      email: 'samyak.ssd@gmail.com',
      hq: 'Central Command HQ, Deekshabhoomi Road, Nagpur - 440010'
    },
    description: 'Central Organizational Metadata'
  });

  // Save to persistence
  saveEmbeddedStore();
  console.log('✅ [Migration] Database migration & seeding completed successfully with full relational integrity.');
}

// Auto-run if called directly
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigration().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
