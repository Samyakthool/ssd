-- ==========================================================================
-- SAMATA SAINIK DAL (SSD) - DIGITAL LIBRARY & ARCHIVES SCHEMA MIGRATION
-- Migration 005: Categories, Resources, Document Versions & Audit Logs
-- ==========================================================================

-- 1. LIBRARY CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS library_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'fa-book-bookmark',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. LIBRARY RESOURCES TABLE
CREATE TABLE IF NOT EXISTS library_resources (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    category_id VARCHAR(64) REFERENCES library_categories(id) ON DELETE RESTRICT,
    resource_type VARCHAR(50) DEFAULT 'document', -- document, book, speech, circular, photo, multimedia, report, other
    language VARCHAR(50) DEFAULT 'English',
    author VARCHAR(255) DEFAULT 'Samata Sainik Dal Central Directorate',
    publisher VARCHAR(255) DEFAULT 'Samata Sainik Dal Press',
    publication_date DATE,
    year VARCHAR(20),
    document_number VARCHAR(100),
    version VARCHAR(50) DEFAULT '1.0',
    tags JSONB DEFAULT '[]',
    storage_path VARCHAR(500),
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    thumbnail_path VARCHAR(500),
    cover_image VARCHAR(500),
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size_bytes BIGINT DEFAULT 0,
    file_size_formatted VARCHAR(50) DEFAULT '0 B',
    sha256_checksum VARCHAR(64),
    access_level VARCHAR(30) DEFAULT 'public', -- public, member, restricted, admin
    status VARCHAR(30) DEFAULT 'draft',        -- draft, in_review, correction_required, approved, published, rejected, unpublished, archived
    is_featured BOOLEAN DEFAULT FALSE,
    historical_period VARCHAR(100),
    provenance VARCHAR(255) DEFAULT 'Central Archives, Nagpur',
    related_entity VARCHAR(255),
    copyright_holder VARCHAR(255) DEFAULT 'Samata Sainik Dal (SSD)',
    usage_permissions VARCHAR(255) DEFAULT 'Public Archival and Educational Use',
    reference_url VARCHAR(500),
    reviewer_notes TEXT,
    official_doc_type VARCHAR(100),
    official_doc_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    approval_date DATE,
    effective_date DATE,
    superseded_ref VARCHAR(100),
    current_version_id VARCHAR(64),
    downloads_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    uploaded_by VARCHAR(64),
    reviewed_by VARCHAR(64),
    approved_by VARCHAR(64),
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. LIBRARY DOCUMENT VERSIONS TABLE (VERSION CONTROL)
CREATE TABLE IF NOT EXISTS library_document_versions (
    id VARCHAR(64) PRIMARY KEY,
    resource_id VARCHAR(64) REFERENCES library_resources(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT DEFAULT 0,
    file_size_formatted VARCHAR(50),
    sha256_checksum VARCHAR(64),
    change_summary TEXT,
    is_current BOOLEAN DEFAULT TRUE,
    is_superseded BOOLEAN DEFAULT FALSE,
    approval_date DATE,
    effective_date DATE,
    uploaded_by VARCHAR(64),
    approved_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. LIBRARY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS library_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    resource_id VARCHAR(64),
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE & SEARCH
CREATE INDEX IF NOT EXISTS idx_lib_resources_category ON library_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_lib_resources_status ON library_resources(status);
CREATE INDEX IF NOT EXISTS idx_lib_resources_access ON library_resources(access_level);
CREATE INDEX IF NOT EXISTS idx_lib_resources_year ON library_resources(year);
CREATE INDEX IF NOT EXISTS idx_lib_resources_featured ON library_resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_lib_versions_resource ON library_document_versions(resource_id);
CREATE INDEX IF NOT EXISTS idx_lib_audit_resource ON library_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_lib_audit_created ON library_audit_logs(created_at);
