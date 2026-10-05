-- ==========================================================================
-- SAMATA SAINIK DAL (SSD) - AUTHORITATIVE PRODUCTION DATABASE SCHEMA
-- Migration 001: Core Relational Schema with Constraints, Foreign Keys & Indexes
-- ==========================================================================

-- Enable standard cryptographic UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy_level INT NOT NULL DEFAULT 1 CHECK (hierarchy_level >= 0 AND hierarchy_level <= 7),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USERS (OFFICIALS & ADMINISTRATORS)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id),
    department VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(100),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TERRITORIAL JURISDICTION HIERARCHY
CREATE TABLE IF NOT EXISTS states (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hindi_name VARCHAR(100),
    marathi_name VARCHAR(100),
    code VARCHAR(10) UNIQUE NOT NULL,
    headquarters VARCHAR(255),
    president_name VARCHAR(255),
    secretary_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(50) PRIMARY KEY,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    headquarters VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(50) PRIMARY KEY,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    region_id VARCHAR(50) REFERENCES regions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    commander_name VARCHAR(255),
    contact_phone VARCHAR(30),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS talukas (
    id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    commander_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    members_count INT DEFAULT 0 CHECK (members_count >= 0),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. USER JURISDICTIONS (MULTI-TIER SCOPING)
CREATE TABLE IF NOT EXISTS user_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id),
    state_id VARCHAR(50) REFERENCES states(id),
    region_id VARCHAR(50) REFERENCES regions(id),
    district_id VARCHAR(50) REFERENCES districts(id),
    taluka_id VARCHAR(50) REFERENCES talukas(id),
    chapter_id VARCHAR(64) REFERENCES chapters(id),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. ORGANIZATIONAL WINGS
CREATE TABLE IF NOT EXISTS wings (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    icon VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 8. APPROVAL WORKFLOW CONFIGURATION
CREATE TABLE IF NOT EXISTS approval_workflows (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state_id VARCHAR(50) REFERENCES states(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order INT NOT NULL CHECK (step_order >= 1),
    role_required VARCHAR(50) NOT NULL REFERENCES roles(id),
    step_label VARCHAR(100) NOT NULL,
    can_recommend BOOLEAN DEFAULT TRUE,
    can_request_correction BOOLEAN DEFAULT TRUE,
    can_reject BOOLEAN DEFAULT TRUE,
    can_escalate BOOLEAN DEFAULT TRUE,
    can_final_approve BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. MEMBERSHIP APPLICATIONS
CREATE TABLE IF NOT EXISTS membership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(50) UNIQUE NOT NULL, -- Public non-sequential identifier, e.g. SSD-2026-8F42K7
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    mobile VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    state_id VARCHAR(50) REFERENCES states(id),
    state_name VARCHAR(100) NOT NULL,
    region_id VARCHAR(50) REFERENCES regions(id),
    region_name VARCHAR(100),
    district_id VARCHAR(50) REFERENCES districts(id),
    district_name VARCHAR(100) NOT NULL,
    taluka_id VARCHAR(50) REFERENCES talukas(id),
    taluka_name VARCHAR(100),
    village_city VARCHAR(150),
    education VARCHAR(150),
    occupation VARCHAR(150),
    blood_group VARCHAR(10),
    wing_id VARCHAR(50) REFERENCES wings(id),
    wing_name VARCHAR(150) NOT NULL,
    photo_url TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    special_skills TEXT,
    solemn_pledge_accepted BOOLEAN NOT NULL DEFAULT TRUE CHECK (solemn_pledge_accepted = TRUE),
    
    -- Workflow Status Check
    status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'SUBMITTED',
            'UNDER_REVIEW',
            'CORRECTION_REQUIRED',
            'RECOMMENDED',
            'ESCALATED',
            'REJECTED',
            'FINAL_APPROVED',
            'ACTIVE',
            'SUSPENDED',
            'EXPIRED'
        )
    ),
    workflow_id VARCHAR(64) REFERENCES approval_workflows(id),
    current_step_id VARCHAR(64) REFERENCES approval_workflow_steps(id),
    current_step_order INT DEFAULT 1 CHECK (current_step_order >= 1),
    assigned_role VARCHAR(50),
    
    correction_remarks TEXT,
    rejection_reason TEXT,
    escalation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. APPROVAL ACTIONS & HISTORY (IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
    step_id VARCHAR(64) REFERENCES approval_workflow_steps(id),
    official_id UUID REFERENCES users(id),
    official_name VARCHAR(255) NOT NULL,
    official_role VARCHAR(50) NOT NULL,
    jurisdiction_summary VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. ACTIVE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sainik_id VARCHAR(64) UNIQUE NOT NULL, -- e.g. SSD-MH-NGP-001245
    application_id UUID UNIQUE REFERENCES membership_applications(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    photo_url TEXT,
    state_name VARCHAR(100) NOT NULL,
    region_name VARCHAR(100),
    district_name VARCHAR(100) NOT NULL,
    taluka_name VARCHAR(100),
    chapter_name VARCHAR(150),
    wing_name VARCHAR(150) NOT NULL,
    designation VARCHAR(150) DEFAULT 'Cadet Sainik',
    batch_no VARCHAR(50) DEFAULT 'BATCH-2026/Q3',
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'RETIRED')),
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. MEMBER DOCUMENTS (SECURE PRIVATE STORAGE)
CREATE TABLE IF NOT EXISTS member_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- AADHAAR, VOTER_ID, RESIDENCE_CERT, BLOOD_CERT
    document_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. DONATIONS & TREASURY
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) UNIQUE NOT NULL,
    payment_id VARCHAR(100) UNIQUE,
    signature VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR',
    donor_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    pan VARCHAR(20),
    address TEXT,
    cause VARCHAR(150) DEFAULT 'General Fund',
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    receipt_number VARCHAR(100) UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(100) UNIQUE NOT NULL, -- SSD-REC-2026-000001
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    donor_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    cause VARCHAR(150) NOT NULL,
    payment_id VARCHAR(100) NOT NULL,
    pan VARCHAR(20),
    is_80g_eligible BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. EVENTS & REGISTRATIONS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    status VARCHAR(30) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED')),
    registration_required BOOLEAN DEFAULT FALSE,
    participant_limit INT DEFAULT 0 CHECK (participant_limit >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    sainik_id VARCHAR(64),
    attended BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. NEWS & GAZETTE CMS
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    author_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. PHOTO & VIDEO GALLERY
CREATE TABLE IF NOT EXISTS gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    caption TEXT,
    category VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    is_historical BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. GOVERNING BODY & LEADERSHIP ROSTER
CREATE TABLE IF NOT EXISTS leadership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(50) DEFAULT 'national',
    state_name VARCHAR(100),
    district_name VARCHAR(100),
    rank_badge VARCHAR(100),
    photo_url TEXT,
    bio TEXT,
    credentials VARCHAR(255),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    state_name VARCHAR(100),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'RESPONDED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. AUDIT LOGS (IMMUTABLE APPEND-ONLY)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(64),
    jurisdiction_summary VARCHAR(255),
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 20. SECURITY EVENTS (THREAT DETECTION & INCIDENT AUDIT)
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- FAILED_LOGIN, BRUTE_FORCE, UNAUTHORIZED_JURISDICTION, TAMPER_ATTEMPT
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    actor_identifier VARCHAR(255),
    ip_address VARCHAR(50),
    endpoint VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 21. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(64),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================================
-- PERFORMANCE INDEXES
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_jurisdictions_user_id ON user_jurisdictions(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_app_no ON membership_applications(application_no);
CREATE INDEX IF NOT EXISTS idx_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_state_district ON membership_applications(state_id, district_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_app_id ON approval_history(application_id);
CREATE INDEX IF NOT EXISTS idx_members_sainik_id ON members(sainik_id);
CREATE INDEX IF NOT EXISTS idx_members_qr_token ON members(qr_token);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON donations(order_id);
CREATE INDEX IF NOT EXISTS idx_donations_payment_id ON donations(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
