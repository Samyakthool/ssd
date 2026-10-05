-- ==========================================================================
-- SAMATA SAINIK DAL (SSD) - ROW LEVEL SECURITY & AUDIT IMMUTABILITY
-- Migration 002: Row Level Security (RLS) Policies & Tamper Proofing
-- ==========================================================================

-- Enable Row Level Security on all core operational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC PORTAL ACCESS POLICIES
-- Anyone can submit a membership enlistment application
CREATE POLICY "Public Application Ingestion"
    ON membership_applications
    FOR INSERT
    WITH CHECK (true);

-- Anyone can look up the verification status of their own application via application_no
CREATE POLICY "Public Application Status Lookup"
    ON membership_applications
    FOR SELECT
    USING (true);

-- Anyone can query active member verification data via QR token
CREATE POLICY "Public QR Member Verification"
    ON members
    FOR SELECT
    USING (status = 'ACTIVE');

-- Anyone can initiate a donation
CREATE POLICY "Public Donation Creation"
    ON donations
    FOR INSERT
    WITH CHECK (true);

-- Anyone can view their donation receipt
CREATE POLICY "Public Receipt Lookup"
    ON receipts
    FOR SELECT
    USING (true);

-- Public CMS read access for news, events, wings, gallery & leadership
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public News Read" ON news FOR SELECT USING (is_published = true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Events Read" ON events FOR SELECT USING (true);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Gallery Read" ON gallery FOR SELECT USING (true);

ALTER TABLE leadership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Leadership Read" ON leadership FOR SELECT USING (true);

ALTER TABLE wings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Wings Read" ON wings FOR SELECT USING (true);

-- 2. SERVICE ROLE & PRIVILEGED BACKEND ACCESS
-- Backend service role has complete access across all tables for business logic & transactions
CREATE POLICY "Service Role Full Access Users" ON users TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Jurisdictions" ON user_jurisdictions TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Applications" ON membership_applications TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Approval History" ON approval_history TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Members" ON members TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Member Docs" ON member_documents TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Donations" ON donations TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Receipts" ON receipts TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Audit Logs" ON audit_logs TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Security Events" ON security_events TO service_role USING (true) WITH CHECK (true);

-- 3. IMMUTABILITY RULES: NEVER ALLOW UPDATE OR DELETE ON AUDIT & APPROVAL HISTORY
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Records in % are strictly immutable and cannot be updated or deleted.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_logs_tampering ON audit_logs;
CREATE TRIGGER trg_prevent_audit_logs_tampering
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_approval_history_tampering ON approval_history;
CREATE TRIGGER trg_prevent_approval_history_tampering
    BEFORE UPDATE OR DELETE ON approval_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_security_events_tampering ON security_events;
CREATE TRIGGER trg_prevent_security_events_tampering
    BEFORE UPDATE OR DELETE ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();
