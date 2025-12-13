-- Fix multi-tenant data isolation
-- CRITICAL: Each facility must only see their own data

-- Helper function to get user's agency_id from agency_users table
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
  SELECT agency_id FROM agency_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin',
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is agency_admin for a specific agency
CREATE OR REPLACE FUNCTION is_agency_admin(check_agency_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = check_agency_id 
    AND role IN ('agency_admin', 'agency_staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- PATIENTS TABLE - Agency isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Admin can manage patients" ON patients;
DROP POLICY IF EXISTS "Super admin can manage all patients" ON patients;
DROP POLICY IF EXISTS "Agency users can view their patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can manage their patients" ON patients;

CREATE POLICY "Agency users can view their patients" ON patients
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id)
  );

CREATE POLICY "Agency admins can manage their patients" ON patients
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- =====================================================
-- VISITS TABLE - Agency isolation via patient
-- =====================================================
DROP POLICY IF EXISTS "Users can view visits" ON visits;
DROP POLICY IF EXISTS "Admin can manage visits" ON visits;

CREATE POLICY "Agency users can view their visits" ON visits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = visits.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = visits.patient_id)
  );

CREATE POLICY "Agency admins can manage their visits" ON visits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = visits.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );

-- =====================================================
-- MESSAGES TABLE - Agency isolation via patient
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Admin can update messages" ON messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = messages.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      patient_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM patients 
        WHERE patients.id = messages.patient_id 
        AND (
          patients.agency_id = get_user_agency_id()
          OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id)
        )
      )
    )
  );

CREATE POLICY "Agency admins can manage messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = messages.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );

-- =====================================================
-- DELIVERIES TABLE - Agency isolation via patient
-- =====================================================
DROP POLICY IF EXISTS "Users can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admin can manage deliveries" ON deliveries;

CREATE POLICY "Agency users can view their deliveries" ON deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = deliveries.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = deliveries.patient_id)
  );

CREATE POLICY "Agency admins can manage their deliveries" ON deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = deliveries.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );

-- =====================================================
-- SUPPLY_REQUESTS TABLE - Agency isolation via patient
-- =====================================================
DROP POLICY IF EXISTS "Users can view supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Users can create supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Admin can manage supply requests" ON supply_requests;

CREATE POLICY "Agency users can view their supply requests" ON supply_requests
  FOR SELECT USING (
    auth.uid() = requested_by
    OR EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = supply_requests.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can create supply requests" ON supply_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by
    AND (
      patient_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM patients 
        WHERE patients.id = supply_requests.patient_id 
        AND (
          patients.agency_id = get_user_agency_id()
          OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id)
        )
      )
    )
  );

CREATE POLICY "Agency admins can manage their supply requests" ON supply_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = supply_requests.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );

-- =====================================================
-- FAMILY_MEMBERS TABLE - Agency isolation via patient
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage family members" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Super admin can manage all family_members" ON family_members;

CREATE POLICY "Agency users can view their family members" ON family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = family_members.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
    OR patient_id IN (SELECT patient_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Agency admins can manage their family members" ON family_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = family_members.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );

-- =====================================================
-- CARE_TEAM_MEMBERS TABLE - Agency isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view care team" ON care_team_members;

CREATE POLICY "Agency users can view their care team" ON care_team_members
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (
      SELECT fm.user_id FROM family_members fm
      JOIN patients p ON p.id = fm.patient_id
      WHERE p.agency_id = care_team_members.agency_id
    )
  );

CREATE POLICY "Agency admins can manage their care team" ON care_team_members
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- =====================================================
-- EDUCATION_MODULES TABLE - Agency isolation
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view published modules" ON education_modules;

-- Add published column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='education_modules' AND column_name='published') THEN
    ALTER TABLE education_modules ADD COLUMN published BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

CREATE POLICY "Agency users can view their education modules" ON education_modules
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (
      SELECT fm.user_id FROM family_members fm
      JOIN patients p ON p.id = fm.patient_id
      WHERE p.agency_id = education_modules.agency_id
    )
  );

CREATE POLICY "Agency admins can manage their education modules" ON education_modules
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- =====================================================
-- FEEDBACK TABLE - Agency isolation via visit/patient
-- (Only if table exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can submit feedback" ON feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their feedback" ON feedback';
    
    EXECUTE 'CREATE POLICY "Users can view feedback" ON feedback
      FOR SELECT USING (
        auth.uid() = submitted_by
        OR EXISTS (
          SELECT 1 FROM visits v
          JOIN patients p ON p.id = v.patient_id
          WHERE v.id = feedback.visit_id 
          AND p.agency_id = get_user_agency_id()
        )
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Users can submit feedback" ON feedback
      FOR INSERT WITH CHECK (auth.uid() = submitted_by)';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their feedback" ON feedback
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM visits v
          JOIN patients p ON p.id = v.patient_id
          WHERE v.id = feedback.visit_id 
          AND p.agency_id = get_user_agency_id()
          AND is_agency_admin(p.agency_id)
        )
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- VISIT_FEEDBACK TABLE - Agency isolation via visit/patient
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_feedback') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view visit_feedback" ON visit_feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create visit_feedback" ON visit_feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Admin can manage visit_feedback" ON visit_feedback';
    
    EXECUTE 'CREATE POLICY "Users can view visit_feedback" ON visit_feedback
      FOR SELECT USING (
        auth.uid() = submitted_by
        OR EXISTS (
          SELECT 1 FROM visits v
          JOIN patients p ON p.id = v.patient_id
          WHERE v.id = visit_feedback.visit_id 
          AND p.agency_id = get_user_agency_id()
        )
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Users can create visit_feedback" ON visit_feedback
      FOR INSERT WITH CHECK (auth.uid() = submitted_by)';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their visit_feedback" ON visit_feedback
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM visits v
          JOIN patients p ON p.id = v.patient_id
          WHERE v.id = visit_feedback.visit_id 
          AND p.agency_id = get_user_agency_id()
          AND is_agency_admin(p.agency_id)
        )
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- BEREAVEMENT_CAMPAIGNS TABLE - Agency isolation
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bereavement_campaigns') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view bereavement campaigns" ON bereavement_campaigns';
    
    EXECUTE 'CREATE POLICY "Agency users can view their bereavement campaigns" ON bereavement_campaigns
      FOR SELECT USING (
        agency_id = get_user_agency_id()
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their bereavement campaigns" ON bereavement_campaigns
      FOR ALL USING (
        (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- AGENCY_USERS TABLE - Agency isolation
-- =====================================================
DROP POLICY IF EXISTS "Super admin can manage all agency_users" ON agency_users;

CREATE POLICY "Agency users can view their agency users" ON agency_users
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR user_id = auth.uid()
    OR is_super_admin()
  );

CREATE POLICY "Agency admins can manage their agency users" ON agency_users
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- =====================================================
-- INTEGRATIONS TABLE - Agency isolation
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    EXECUTE 'CREATE POLICY "Agency users can view their integrations" ON integrations
      FOR SELECT USING (
        agency_id = get_user_agency_id()
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their integrations" ON integrations
      FOR ALL USING (
        (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- API_KEYS TABLE - Agency isolation
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    EXECUTE 'CREATE POLICY "Agency users can view their api keys" ON api_keys
      FOR SELECT USING (
        agency_id = get_user_agency_id()
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their api keys" ON api_keys
      FOR ALL USING (
        (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- BRANDING_CONFIG TABLE - Agency isolation
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branding_config') THEN
    EXECUTE 'CREATE POLICY "Agency users can view their branding" ON branding_config
      FOR SELECT USING (
        agency_id = get_user_agency_id()
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their branding" ON branding_config
      FOR ALL USING (
        (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
        OR is_super_admin()
      )';
  END IF;
END $$;

-- =====================================================
-- TEAM_INVITATIONS TABLE - Agency isolation
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations') THEN
    EXECUTE 'CREATE POLICY "Agency users can view their team invitations" ON team_invitations
      FOR SELECT USING (
        agency_id = get_user_agency_id()
        OR email = (auth.jwt() ->> ''email'')::text
        OR is_super_admin()
      )';
    
    EXECUTE 'CREATE POLICY "Agency admins can manage their team invitations" ON team_invitations
      FOR ALL USING (
        (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
        OR is_super_admin()
      )';
  END IF;
END $$;
