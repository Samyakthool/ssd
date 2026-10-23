-- ==========================================================================
-- 004: NEW SAINIK ENLISTMENT QUESTIONNAIRE & APPLICANT ORGANIZATIONS
-- ==========================================================================

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

CREATE INDEX IF NOT EXISTS idx_questionnaires_application_id ON enlistment_questionnaires(application_id);
CREATE INDEX IF NOT EXISTS idx_applicant_orgs_application_id ON applicant_organizations(application_id);
