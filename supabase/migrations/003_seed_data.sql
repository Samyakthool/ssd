-- ==========================================================================
-- SAMATA SAINIK DAL (SSD) - CORE SEED DATA
-- Migration 003: Administrative Roles, Wings, Jurisdictions & Approval Workflows
-- ==========================================================================

-- 1. COMMAND ROLES
INSERT INTO roles (id, name, description, hierarchy_level) VALUES
('super_admin', 'Supreme Administrator', 'Complete unrestricted system access across all jurisdictions', 7),
('central_admin', 'Central Command Official', 'National executive authority, policy enforcement & final commissioning', 6),
('state_official', 'State Directorate Official', 'State-level oversight, unit coordination & intermediate review', 5),
('regional_official', 'Regional Commander', 'Regional division review, inspection & coordination', 4),
('district_official', 'District Dalpati / Officer', 'District application verification, assessment scoring & recommendation', 3),
('taluka_official', 'Taluka Executive Officer', 'Taluka/Sub-district level verification', 2),
('chapter_official', 'Local Chapter Commander', 'Grassroots branch verification and ground endorsement', 1),
('enlistment_officer', 'Enlistment Approval Officer', 'Authorized exclusively for candidate scrutiny, rubric scoring, and approvals', 4),
('finance_admin', 'Finance & Treasury Admin', 'Donations, 80G tax receipts, and financial audit management', 5),
('media_admin', 'Media & Gazette Admin', 'Press releases, gazette publishing, photo archives, and public communications', 4),
('member', 'Enlisted Sainik / Cadet', 'Standard verified member portal access and digital ID card retrieval', 0),
('applicant', 'Prospective Candidate', 'Applicant status tracking access', 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, hierarchy_level = EXCLUDED.hierarchy_level;

-- 2. ORGANIZATIONAL WINGS
INSERT INTO wings (id, name, tagline, description, icon, slug) VALUES
('cadet-corps', 'Central Cadet Corps (Sainik Wing)', 'Discipline & Self-Defense', 'Physical training, constitutional defense, drill camps, and ceremonial guard of honor for community memorials.', 'fa-person-military-pointing', 'cadet-corps'),
('mahila-dal', 'Mahila Samata Sainik Dal', 'Women Leadership & Dignity', 'Independent women cadre dedicated to legal awareness, self-defense, gender justice, and grassroots community leadership.', 'fa-venus-mars', 'mahila-dal'),
('legal-cell', 'Constitutional & Legal Cell', 'Advocacy for Civil Rights', 'Pro-bono legal assistance, filing public interest litigations (PILs), human rights monitoring, and police atrocity defense.', 'fa-scale-balanced', 'legal-cell'),
('youth-wing', 'Youth & Student Front', 'Intellectual Emancipation', 'Dr. Ambedkar study circles, civil services exam mentorship, digital skills training, and university student leadership summits.', 'fa-graduation-cap', 'youth-wing'),
('sewa-relief', 'Community Sewa & Relief Taskforce', 'Compassion in Action', 'Voluntary blood donor registry, emergency disaster rescue taskforce, free health diagnostic camps, and community libraries.', 'fa-hand-holding-heart', 'sewa-relief')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tagline = EXCLUDED.tagline, description = EXCLUDED.description;

-- 3. TERRITORIAL STATES
INSERT INTO states (id, name, hindi_name, marathi_name, code, headquarters, president_name, secretary_name, status, sort_order) VALUES
('state_mh', 'Maharashtra', 'महाराष्ट्र', 'महाराष्ट्र', 'MH', 'Deekshabhoomi, Nagpur & Mumbai', 'Commander Pramod R. Moon', 'Adv. Nitin V. Dongre', 'ACTIVE', 1),
('state_dl', 'Delhi NCR', 'दिल्ली एनसीआर', 'दिल्ली', 'DL', 'Central Secretariat, New Delhi', 'Col. (Retd.) V. A. Thorat', 'Dr. Sunita Gautam', 'ACTIVE', 2),
('state_up', 'Uttar Pradesh', 'उत्तर प्रदेश', 'उत्तर प्रदेश', 'UP', 'Dr. Ambedkar Bhawan, Lucknow', 'Ram Asrey Gautam', 'Adv. R. K. Singh', 'ACTIVE', 3),
('state_mp', 'Madhya Pradesh', 'मध्य प्रदेश', 'मध्य प्रदेश', 'MP', 'Mhow Central Memorial, Indore', 'Satish Meshram', 'Bhopal Singh', 'ACTIVE', 4),
('state_ka', 'Karnataka', 'कर्नाटक', 'कर्नाटक', 'KA', 'Buddha Vihara, Bengaluru', 'Venkatesh Murthy', 'Anand Rao', 'ACTIVE', 5),
('state_pb', 'Punjab', 'पंजाब', 'पंजाब', 'PB', 'Ambedkar Chowk, Jalandhar', 'Jaswant Singh Mall', 'Balbir Singh', 'ACTIVE', 6),
('state_tg', 'Telangana', 'तेलंगाना', 'तेलंगाना', 'TG', 'Ambedkar Bhavan, Hyderabad', 'Dr. P. Ravinder', 'K. Sudhakar', 'ACTIVE', 7),
('state_tn', 'Tamil Nadu', 'तमिलनाडु', 'तामिळनाडू', 'TN', 'Periyar-Ambedkar Thidal, Chennai', 'S. Thirumavalavan', 'M. Gunasekaran', 'ACTIVE', 8),
('state_br', 'Bihar', 'बिहार', 'बिहार', 'BR', 'Ambedkar Smarak, Patna', 'Rajesh Paswan', 'Dr. Arvind Kumar', 'ACTIVE', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, headquarters = EXCLUDED.headquarters;

-- 4. REGIONS (MAHARASHTRA)
INSERT INTO regions (id, state_id, name, headquarters, status) VALUES
('reg_vidarbha', 'state_mh', 'Vidarbha', 'Nagpur', 'ACTIVE'),
('reg_marathwada', 'state_mh', 'Marathwada', 'Chhatrapati Sambhajinagar', 'ACTIVE'),
('reg_konkan', 'state_mh', 'Konkan & MMR', 'Mumbai', 'ACTIVE'),
('reg_western_mh', 'state_mh', 'Western Maharashtra', 'Pune', 'ACTIVE'),
('reg_north_mh', 'state_mh', 'North Maharashtra (Khandesh)', 'Nashik', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. KEY DISTRICTS
INSERT INTO districts (id, state_id, region_id, name, commander_name, contact_phone, status) VALUES
('dist_nagpur', 'state_mh', 'reg_vidarbha', 'Nagpur', 'Dalpati Siddharth Meshram', '9822001927', 'ACTIVE'),
('dist_chandrapur', 'state_mh', 'reg_vidarbha', 'Chandrapur', 'Dalpati Ravi Tembhurne', '9822001928', 'ACTIVE'),
('dist_amravati', 'state_mh', 'reg_vidarbha', 'Amravati', 'Dalpati Vinod Dhabale', '9822001929', 'ACTIVE'),
('dist_mumbai_city', 'state_mh', 'reg_konkan', 'Mumbai City', 'Dalpati Ashok Kamble', '9820001927', 'ACTIVE'),
('dist_mumbai_sub', 'state_mh', 'reg_konkan', 'Mumbai Suburban', 'Dalpati Dilip Gaikwad', '9820001928', 'ACTIVE'),
('dist_thane', 'state_mh', 'reg_konkan', 'Thane', 'Dalpati Sanjay Bhalerao', '9820001929', 'ACTIVE'),
('dist_pune', 'state_mh', 'reg_western_mh', 'Pune', 'Dalpati Milind Surve', '9823001927', 'ACTIVE'),
('dist_kolhapur', 'state_mh', 'reg_western_mh', 'Kolhapur', 'Dalpati Prashant Salve', '9823001928', 'ACTIVE'),
('dist_sambhajinagar', 'state_mh', 'reg_marathwada', 'Chhatrapati Sambhajinagar', 'Dalpati Anand Waghmare', '9824001927', 'ACTIVE'),
('dist_nashik', 'state_mh', 'reg_north_mh', 'Nashik', 'Dalpati Rajesh Jagtap', '9825001927', 'ACTIVE'),
('dist_central_delhi', 'state_dl', NULL, 'Central Delhi', 'Commander R. K. Gautam', '9811001927', 'ACTIVE'),
('dist_lucknow', 'state_up', NULL, 'Lucknow', 'Commander S. P. Verma', '9415001927', 'ACTIVE'),
('dist_bengaluru_urb', 'state_ka', NULL, 'Bengaluru Urban', 'Commander B. M. Kumar', '9845001927', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, commander_name = EXCLUDED.commander_name;

-- 6. MULTI-LEVEL APPROVAL WORKFLOW
INSERT INTO approval_workflows (id, name, state_id, description, is_active) VALUES
('wf_national_default', 'Standard 6-Tier National Sainik Commissioning Workflow', NULL, 'Configurable multi-level verification from chapter up to Central Command', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO approval_workflow_steps (id, workflow_id, step_order, role_required, step_label, can_recommend, can_request_correction, can_reject, can_escalate, can_final_approve, is_optional) VALUES
('step_1_chapter', 'wf_national_default', 1, 'chapter_official', 'Local Chapter Scrutiny & Field Verification', true, true, true, false, false, false),
('step_2_taluka', 'wf_national_default', 2, 'taluka_official', 'Taluka Executive Endorsement', true, true, true, false, false, false),
('step_3_district', 'wf_national_default', 3, 'district_official', 'District Dalpati Recommendation & Assessment Rubric', true, true, true, true, false, false),
('step_4_region', 'wf_national_default', 4, 'regional_official', 'Regional Division Coordination', true, true, true, true, false, true),
('step_5_state', 'wf_national_default', 5, 'state_official', 'State Directorate Oversight & Endorsement', true, true, true, true, false, false),
('step_6_central', 'wf_national_default', 6, 'central_admin', 'Central Command Scrutiny & Final Sainik ID Commissioning', false, true, true, false, true, false)
ON CONFLICT (id) DO UPDATE SET step_label = EXCLUDED.step_label, role_required = EXCLUDED.role_required;
