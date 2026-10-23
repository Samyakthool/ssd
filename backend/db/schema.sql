-- ==========================================================================
-- SAMATA SAINIK DAL (SSD) - PRODUCTION DATABASE SCHEMA (POSTGRESQL)
-- ==========================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1, -- 1: chapter, 2: taluka, 3: district, 4: regional, 5: state, 6: central, 7: super_admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (ADMINS & OFFICIALS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role_id VARCHAR(50) REFERENCES roles(id),
    department VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, INACTIVE
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. JURISDICTION HIERARCHY TABLES
CREATE TABLE IF NOT EXISTS states (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hindi_name VARCHAR(100),
    marathi_name VARCHAR(100),
    code VARCHAR(10) UNIQUE NOT NULL,
    headquarters VARCHAR(255),
    president_name VARCHAR(255),
    secretary_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(50) PRIMARY KEY,
    state_id VARCHAR(50) REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    headquarters VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(50) PRIMARY KEY,
    state_id VARCHAR(50) REFERENCES states(id) ON DELETE CASCADE,
    region_id VARCHAR(50) REFERENCES regions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    commander_name VARCHAR(255),
    contact_phone VARCHAR(30),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS talukas (
    id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    commander_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapters (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id VARCHAR(50) REFERENCES states(id),
    region_id VARCHAR(50) REFERENCES regions(id),
    district_id VARCHAR(50) REFERENCES districts(id),
    taluka_id VARCHAR(50) REFERENCES talukas(id),
    location_address TEXT,
    commander_name VARCHAR(255),
    secretary_name VARCHAR(255),
    contact_phone VARCHAR(30),
    contact_email VARCHAR(255),
    members_count INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. USER JURISDICTIONS (RBAC MAPPING)
CREATE TABLE IF NOT EXISTS user_jurisdictions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) REFERENCES roles(id),
    state_id VARCHAR(50) REFERENCES states(id),
    region_id VARCHAR(50) REFERENCES regions(id),
    district_id VARCHAR(50) REFERENCES districts(id),
    taluka_id VARCHAR(50) REFERENCES talukas(id),
    chapter_id VARCHAR(64) REFERENCES chapters(id),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORGANIZATIONAL WINGS
CREATE TABLE IF NOT EXISTS wings (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    icon VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 6. APPROVAL WORKFLOW CONFIGURATION
CREATE TABLE IF NOT EXISTS approval_workflows (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state_id VARCHAR(50) REFERENCES states(id), -- NULL means Default National Workflow
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    role_required VARCHAR(50) REFERENCES roles(id),
    step_label VARCHAR(100) NOT NULL,
    can_recommend BOOLEAN DEFAULT TRUE,
    can_request_correction BOOLEAN DEFAULT TRUE,
    can_reject BOOLEAN DEFAULT TRUE,
    can_escalate BOOLEAN DEFAULT TRUE,
    can_final_approve BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. MEMBERSHIP APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS membership_applications (
    id VARCHAR(64) PRIMARY KEY, -- e.g. SSD-2026-8F42K7
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    mobile VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    state_id VARCHAR(50) REFERENCES states(id),
    state_name VARCHAR(100),
    region_id VARCHAR(50) REFERENCES regions(id),
    region_name VARCHAR(100),
    district_id VARCHAR(50) REFERENCES districts(id),
    district_name VARCHAR(100),
    taluka_id VARCHAR(50) REFERENCES talukas(id),
    taluka_name VARCHAR(100),
    village_city VARCHAR(150),
    education VARCHAR(150),
    occupation VARCHAR(150),
    blood_group VARCHAR(10),
    wing_id VARCHAR(50) REFERENCES wings(id),
    wing_name VARCHAR(150),
    photo_url TEXT,
    documents_json JSONB DEFAULT '[]'::jsonb,
    special_skills TEXT,
    solemn_pledge_accepted BOOLEAN DEFAULT TRUE,
    
    -- Workflow state
    status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED', 
    -- SUBMITTED, UNDER_REVIEW, CORRECTION_REQUIRED, RECOMMENDED, ESCALATED, REJECTED, FINAL_APPROVED, ACTIVE, SUSPENDED, EXPIRED
    workflow_id VARCHAR(64) REFERENCES approval_workflows(id),
    current_step_id VARCHAR(64) REFERENCES approval_workflow_steps(id),
    current_step_order INT DEFAULT 1,
    assigned_role VARCHAR(50),
    
    -- Legacy & Historical Registration
    membership_type VARCHAR(30) NOT NULL DEFAULT 'NEW', -- 'NEW' or 'LEGACY'
    original_joining_date DATE,
    verified_joining_year INT,
    joining_date_precision VARCHAR(30) DEFAULT 'EXACT', -- EXACT, YEAR_MONTH, YEAR_ONLY, APPROXIMATE_UNKNOWN
    portal_registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    joining_date_verified BOOLEAN DEFAULT FALSE,
    joining_date_verified_by VARCHAR(100),
    joining_date_verified_at TIMESTAMP WITH TIME ZONE,
    joining_date_verification_notes TEXT,
    sainik_id VARCHAR(64) UNIQUE,
    sainik_id_generated_at TIMESTAMP WITH TIME ZONE,
    batch_id VARCHAR(100),
    batch_code VARCHAR(100),
    batch_assignment_status VARCHAR(50) DEFAULT 'PENDING',
    batch_assigned_by VARCHAR(100),
    batch_assigned_at TIMESTAMP WITH TIME ZONE,
    legacy_verification_status VARCHAR(50) DEFAULT 'NOT_APPLICABLE',
    existing_sainik_id VARCHAR(100),
    current_designation VARCHAR(100),
    previous_responsibilities TEXT,
    recommending_official TEXT,
    historical_notes TEXT,
    verification_tier VARCHAR(50) DEFAULT 'LOCAL',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7B. NEW SAINIK ENLISTMENT QUESTIONNAIRE
CREATE TABLE IF NOT EXISTS enlistment_questionnaires (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) UNIQUE REFERENCES membership_applications(id) ON DELETE CASCADE,
    q1_aim TEXT,
    q2_motto TEXT,
    q3_reasons TEXT,
    q4_responsibilities TEXT,
    q5_history_principles TEXT,
    q6_social_service_participation VARCHAR(100),
    q6a_social_service_details TEXT,
    q7_ssd_role_nation_building TEXT,
    q8_areas_of_interest JSONB DEFAULT '[]'::jsonb,
    q9_community_contribution TEXT,
    q10_civic_political_participation VARCHAR(100),
    q10a_civic_political_details TEXT,
    q11_held_leadership_role VARCHAR(50),
    q12_currently_involved_other_org VARCHAR(50),
    q12a_other_org_name VARCHAR(255),
    q12a_other_org_type VARCHAR(100),
    q12a_other_org_role VARCHAR(150),
    q14_previous_experience_skills TEXT,
    q15_organized_public_events VARCHAR(50),
    q15a_public_events_details TEXT,
    q16_preferred_wings JSONB DEFAULT '[]'::jsonb,
    q17_time_commitment VARCHAR(100),
    q18_skills_contribution JSONB DEFAULT '[]'::jsonb,
    q19_additional_info TEXT,
    declaration_accepted BOOLEAN DEFAULT FALSE,
    declaration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    internal_review_remarks TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7C. APPLICANT ORGANIZATIONS (REPEATABLE RELATIONAL STRUCTURED RECORDS)
CREATE TABLE IF NOT EXISTS applicant_organizations (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) REFERENCES membership_applications(id) ON DELETE CASCADE,
    question_ref VARCHAR(20) DEFAULT 'Q13',
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(100) NOT NULL,
    role_designation VARCHAR(150),
    start_year VARCHAR(50),
    end_year VARCHAR(50),
    responsibilities TEXT,
    contributions TEXT,
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. APPROVAL ACTIONS & IMMUTABLE AUDIT TRAIL FOR APPLICATIONS
CREATE TABLE IF NOT EXISTS approval_actions (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) REFERENCES membership_applications(id) ON DELETE CASCADE,
    step_id VARCHAR(64) REFERENCES approval_workflow_steps(id),
    official_id VARCHAR(64) REFERENCES users(id),
    official_name VARCHAR(255) NOT NULL,
    official_role VARCHAR(50) NOT NULL,
    jurisdiction_summary VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- SUBMIT, UNDER_REVIEW, RECOMMEND, REQUEST_CORRECTION, RESUBMIT, ESCALATE, REJECT, FINAL_APPROVE
    previous_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ACTIVE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(64) PRIMARY KEY,
    sainik_id VARCHAR(64) UNIQUE NOT NULL, -- e.g. SSD-MH-2026-001245
    application_id VARCHAR(64) UNIQUE REFERENCES membership_applications(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    photo_url TEXT,
    state_name VARCHAR(100),
    region_name VARCHAR(100),
    district_name VARCHAR(100),
    taluka_name VARCHAR(100),
    chapter_name VARCHAR(150),
    wing_name VARCHAR(150),
    designation VARCHAR(150) DEFAULT 'Cadet Sainik',
    batch_no VARCHAR(50) DEFAULT 'BATCH-2026/Q3',
    batch_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, RETIRED
    membership_type VARCHAR(30) NOT NULL DEFAULT 'NEW', -- 'NEW' or 'LEGACY'
    original_joining_date DATE,
    verified_joining_year INT,
    joining_date_precision VARCHAR(30) DEFAULT 'EXACT',
    portal_registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    joining_date_verified BOOLEAN DEFAULT FALSE,
    joining_date_verified_by VARCHAR(100),
    joining_date_verified_at TIMESTAMP WITH TIME ZONE,
    sainik_id_generated_at TIMESTAMP WITH TIME ZONE,
    existing_sainik_id VARCHAR(100),
    historical_notes TEXT,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    approved_by VARCHAR(64) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9B. TRANSACTION-SAFE SAINIK ID SEQUENTIAL COUNTERS TABLE
CREATE TABLE IF NOT EXISTS sainik_id_counters (
    joining_year INT PRIMARY KEY,
    last_sequence INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9B. BATCH MANAGEMENT TABLES
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(64) PRIMARY KEY,
    batch_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. SSD-BATCH-2012, SSD-MH-2012-B001
    batch_name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    start_date DATE,
    end_date DATE,
    scope VARCHAR(50) DEFAULT 'NATIONAL', -- 'NATIONAL' or 'STATE'
    state_id VARCHAR(50) REFERENCES states(id),
    state_name VARCHAR(100),
    allocation_rule VARCHAR(100) DEFAULT 'JOINING_YEAR_NATIONAL',
    format_template VARCHAR(100) DEFAULT 'SSD-BATCH-{YEAR}',
    total_members INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED', 'LOCKED'
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_history (
    id VARCHAR(64) PRIMARY KEY,
    member_id VARCHAR(64),
    application_id VARCHAR(64),
    previous_batch_code VARCHAR(100),
    new_batch_code VARCHAR(100) NOT NULL,
    assigned_by VARCHAR(64) NOT NULL,
    assigned_by_name VARCHAR(255) NOT NULL,
    assigned_by_role VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    ip_address VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS batch_config (
    id VARCHAR(64) PRIMARY KEY,
    format_template VARCHAR(100) NOT NULL DEFAULT 'SSD-BATCH-{YEAR}',
    allowed_formats JSONB DEFAULT '["SSD-BATCH-{YEAR}", "SSD-{YEAR}-B{SEQ}", "SSD-{STATE}-{YEAR}-B{SEQ}"]'::jsonb,
    allocation_rule VARCHAR(100) NOT NULL DEFAULT 'JOINING_YEAR_NATIONAL',
    period_type VARCHAR(50) NOT NULL DEFAULT 'YEARLY',
    default_scope VARCHAR(50) NOT NULL DEFAULT 'NATIONAL',
    require_date_verification BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. DONATIONS & PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS donations (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    payment_id VARCHAR(100) UNIQUE,
    signature VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    donor_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    pan VARCHAR(20),
    address TEXT,
    cause VARCHAR(150) DEFAULT 'General Fund',
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, REFUNDED
    receipt_number VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    id VARCHAR(64) PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. SSD-REC-2026-000001
    donation_id VARCHAR(64) REFERENCES donations(id) ON DELETE CASCADE,
    donor_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    cause VARCHAR(150) NOT NULL,
    payment_id VARCHAR(100) NOT NULL,
    pan VARCHAR(20),
    is_80g_eligible BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. EVENTS & REGISTRATIONS
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time VARCHAR(50),
    location VARCHAR(255) NOT NULL,
    state_name VARCHAR(100),
    district_name VARCHAR(100),
    wing_name VARCHAR(150),
    organizer VARCHAR(255),
    banner_url TEXT,
    status VARCHAR(30) DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, COMPLETED, CANCELLED
    registration_required BOOLEAN DEFAULT FALSE,
    participant_limit INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    sainik_id VARCHAR(64),
    attended BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. NEWS & GAZETTE CMS
CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    author_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. MEDIA & GALLERY
CREATE TABLE IF NOT EXISTS gallery (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255),
    caption TEXT,
    category VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    is_historical BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. GOVERNING BODY & LEADERSHIP ROSTER
CREATE TABLE IF NOT EXISTS leadership (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Supreme Council, Executive Council, Cadet Directorate, Mahila Dal, Legal Cell, Advisory Board, IT Cell
    level VARCHAR(50) DEFAULT 'national', -- national, state, district
    state_name VARCHAR(100),
    district_name VARCHAR(100),
    rank_badge VARCHAR(100),
    photo_url TEXT,
    bio TEXT,
    credentials VARCHAR(255),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    state_name VARCHAR(100),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'UNREAD', -- UNREAD, READ, RESPONDED, ARCHIVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. SYSTEM AUDIT LOGS (IMMUTABLE)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(64),
    jurisdiction_summary VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_jurisdictions_user_id ON user_jurisdictions(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_state ON membership_applications(state_id);
CREATE INDEX IF NOT EXISTS idx_applications_district ON membership_applications(district_id);
CREATE INDEX IF NOT EXISTS idx_members_sainik_id ON members(sainik_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_app_id ON approval_actions(application_id);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON donations(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questionnaires_application_id ON enlistment_questionnaires(application_id);
CREATE INDEX IF NOT EXISTS idx_applicant_orgs_application_id ON applicant_organizations(application_id);
