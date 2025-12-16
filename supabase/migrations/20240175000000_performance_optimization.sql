-- =====================================================
-- PERFORMANCE OPTIMIZATION FOR SCALE
-- =====================================================
-- This migration adds comprehensive indexing and optimizations
-- to ensure the system stays fast as data grows

-- =====================================================
-- PATIENTS TABLE OPTIMIZATION
-- =====================================================

-- Index for patient lookups by agency (most common query)
CREATE INDEX IF NOT EXISTS idx_patients_agency_id ON patients(agency_id);

-- Index for patient status filtering
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- Composite index for agency + status (common filter combination)
CREATE INDEX IF NOT EXISTS idx_patients_agency_status ON patients(agency_id, status);

-- Index for patient name searches
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);

-- Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- Full-text search index for patient names
CREATE INDEX IF NOT EXISTS idx_patients_fulltext ON patients 
  USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

-- =====================================================
-- MESSAGES TABLE OPTIMIZATION
-- =====================================================

-- Index for patient messages (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON messages(patient_id);

-- Index for message ordering
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Composite index for patient + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_patient_created ON messages(patient_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read) WHERE read = false;

-- Index for sender lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Composite index for patient + read status
CREATE INDEX IF NOT EXISTS idx_messages_patient_read ON messages(patient_id, read);

-- =====================================================
-- VISITS TABLE OPTIMIZATION
-- =====================================================

-- Index for patient visits
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);

-- Index for visit date ordering
CREATE INDEX IF NOT EXISTS idx_visits_scheduled_date ON visits(scheduled_date DESC);

-- Composite index for patient + scheduled date
CREATE INDEX IF NOT EXISTS idx_visits_patient_scheduled ON visits(patient_id, scheduled_date DESC);

-- Index for visit status (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
    CREATE INDEX IF NOT EXISTS idx_visits_patient_status ON visits(patient_id, status);
  END IF;
END $$;

-- Index for staff assignments (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'staff_id') THEN
    CREATE INDEX IF NOT EXISTS idx_visits_staff_id ON visits(staff_id);
  END IF;
END $$;

-- =====================================================
-- FAMILY_MEMBERS TABLE OPTIMIZATION
-- =====================================================

-- Index for patient family members
CREATE INDEX IF NOT EXISTS idx_family_members_patient_id ON family_members(patient_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

-- Index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_family_members_invite_token ON family_members(invite_token) 
  WHERE invite_token IS NOT NULL;

-- Index for family member status (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'family_members' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);
    CREATE INDEX IF NOT EXISTS idx_family_members_patient_status ON family_members(patient_id, status);
  END IF;
END $$;

-- =====================================================
-- DELIVERIES TABLE OPTIMIZATION
-- =====================================================

-- Index for patient deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_patient_id ON deliveries(patient_id);

-- Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);

-- Composite index for patient + created_at
CREATE INDEX IF NOT EXISTS idx_deliveries_patient_created ON deliveries(patient_id, created_at DESC);

-- Index for delivery status (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_deliveries_patient_status ON deliveries(patient_id, status);
  END IF;
END $$;

-- =====================================================
-- SUPPLY_REQUESTS TABLE OPTIMIZATION
-- =====================================================

-- Index for patient supply requests
CREATE INDEX IF NOT EXISTS idx_supply_requests_patient_id ON supply_requests(patient_id);

-- Index for requested_by
CREATE INDEX IF NOT EXISTS idx_supply_requests_requested_by ON supply_requests(requested_by);

-- Index for created_at ordering
CREATE INDEX IF NOT EXISTS idx_supply_requests_created_at ON supply_requests(created_at DESC);

-- Index for request status (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supply_requests' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON supply_requests(status);
    CREATE INDEX IF NOT EXISTS idx_supply_requests_patient_status ON supply_requests(patient_id, status);
  END IF;
END $$;

-- =====================================================
-- AGENCY_USERS TABLE OPTIMIZATION
-- =====================================================

-- These indexes already exist from previous migrations, but ensuring they're present
CREATE INDEX IF NOT EXISTS idx_agency_users_user_id ON agency_users(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user_agency ON agency_users(user_id, agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user_role ON agency_users(user_id, role);

-- =====================================================
-- USERS TABLE OPTIMIZATION
-- =====================================================

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- TEAM_INVITATIONS TABLE OPTIMIZATION
-- =====================================================

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- Index for agency invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_agency_id ON team_invitations(agency_id);

-- Index for invitation status
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Composite index for email + status
CREATE INDEX IF NOT EXISTS idx_team_invitations_email_status ON team_invitations(email, status);

-- =====================================================
-- FACILITY_INVITES TABLE OPTIMIZATION
-- =====================================================

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_facility_invites_email ON facility_invites(email);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_facility_invites_token ON facility_invites(token);

-- Index for status (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facility_invites' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_facility_invites_status ON facility_invites(status);
    CREATE INDEX IF NOT EXISTS idx_facility_invites_email_status ON facility_invites(email, status);
  END IF;
END $$;

-- =====================================================
-- EDUCATION_MODULES TABLE OPTIMIZATION
-- =====================================================

-- Index for agency modules
CREATE INDEX IF NOT EXISTS idx_education_modules_agency_id ON education_modules(agency_id);

-- Index for category
CREATE INDEX IF NOT EXISTS idx_education_modules_category ON education_modules(category);

-- Composite index for agency + category
CREATE INDEX IF NOT EXISTS idx_education_modules_agency_category ON education_modules(agency_id, category);

-- =====================================================
-- CARE_TEAM_MEMBERS TABLE OPTIMIZATION
-- =====================================================

-- Index for agency care team
CREATE INDEX IF NOT EXISTS idx_care_team_members_agency_id ON care_team_members(agency_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_care_team_members_user_id ON care_team_members(user_id);

-- =====================================================
-- VISIT_FEEDBACK TABLE OPTIMIZATION
-- =====================================================

-- Check if visit_feedback table exists before creating indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_feedback') THEN
    -- Index for visit feedback
    CREATE INDEX IF NOT EXISTS idx_visit_feedback_visit_id ON visit_feedback(visit_id);
    
    -- Index for submitted_by
    CREATE INDEX IF NOT EXISTS idx_visit_feedback_submitted_by ON visit_feedback(submitted_by);
    
    -- Index for rating (for analytics)
    CREATE INDEX IF NOT EXISTS idx_visit_feedback_rating ON visit_feedback(rating);
    
    -- Index for created_at
    CREATE INDEX IF NOT EXISTS idx_visit_feedback_created_at ON visit_feedback(created_at DESC);
  END IF;
END $$;

-- =====================================================
-- INTERNAL_MESSAGES TABLE OPTIMIZATION
-- =====================================================

-- Check if internal_messages table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_messages') THEN
    -- Index for sender
    CREATE INDEX IF NOT EXISTS idx_internal_messages_sender_id ON internal_messages(sender_id);
    
    -- Index for recipient
    CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient_id ON internal_messages(recipient_id);
    
    -- Index for read status
    CREATE INDEX IF NOT EXISTS idx_internal_messages_read ON internal_messages(read) WHERE read = false;
    
    -- Index for created_at
    CREATE INDEX IF NOT EXISTS idx_internal_messages_created_at ON internal_messages(created_at DESC);
    
    -- Composite index for recipient + read
    CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient_read ON internal_messages(recipient_id, read);
  END IF;
END $$;

-- =====================================================
-- VACUUM AND ANALYZE
-- =====================================================

-- Update table statistics for query planner
ANALYZE patients;
ANALYZE messages;
ANALYZE visits;
ANALYZE family_members;
ANALYZE deliveries;
ANALYZE supply_requests;
ANALYZE agency_users;
ANALYZE users;
ANALYZE team_invitations;
ANALYZE facility_invites;
ANALYZE education_modules;
ANALYZE care_team_members;

-- =====================================================
-- AUTOVACUUM TUNING FOR HIGH-TRAFFIC TABLES
-- =====================================================

-- Messages table will have high insert/update volume
ALTER TABLE messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Visits table
ALTER TABLE visits SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Patients table
ALTER TABLE patients SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
