-- CRITICAL FIX: Complete multi-tenant data isolation
-- This migration ensures ALL data is properly isolated by agency
-- Fixes data leaks where agency admins could see data from other facilities

-- =====================================================
-- VISITS TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own visits" ON visits;
DROP POLICY IF EXISTS "Admin can view all visits" ON visits;
DROP POLICY IF EXISTS "Users can view visits" ON visits;
DROP POLICY IF EXISTS "Admin can manage visits" ON visits;
DROP POLICY IF EXISTS "Agency users can view their visits" ON visits;
DROP POLICY IF EXISTS "Agency admins can manage their visits" ON visits;

CREATE POLICY "Agency users can view their visits" ON visits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = visits.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = visits.patient_id AND user_id IS NOT NULL)
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
-- DELIVERIES TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view their deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admin can view all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admin can manage deliveries" ON deliveries;
DROP POLICY IF EXISTS "Agency users can view their deliveries" ON deliveries;
DROP POLICY IF EXISTS "Agency admins can manage their deliveries" ON deliveries;

CREATE POLICY "Agency users can view their deliveries" ON deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = deliveries.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = deliveries.patient_id AND user_id IS NOT NULL)
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
-- SUPPLY_REQUESTS TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view their supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Users can view supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Users can create supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Admin can view all supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Admin can manage supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Agency users can view their supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Agency admins can manage their supply requests" ON supply_requests;

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
          OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id AND user_id IS NOT NULL)
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
-- MESSAGES TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Admin can update messages" ON messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON messages;
DROP POLICY IF EXISTS "Agency admins can manage messages" ON messages;

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
          OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id AND user_id IS NOT NULL)
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
-- FAMILY_MEMBERS TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage family members" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Agency users can view their family members" ON family_members;
DROP POLICY IF EXISTS "Agency admins can manage their family members" ON family_members;
DROP POLICY IF EXISTS "Allow family member lookup for invite" ON family_members;
DROP POLICY IF EXISTS "Allow family member self update" ON family_members;

CREATE POLICY "Agency users can view their family members" ON family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = family_members.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
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

CREATE POLICY "Allow family member lookup for invite" ON family_members
  FOR SELECT USING (
    invite_token IS NOT NULL 
    AND status = 'invited'
  );

CREATE POLICY "Allow family member self update" ON family_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (invite_token IS NOT NULL AND status = 'invited')
  );

-- =====================================================
-- VISIT_FEEDBACK TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Users can create visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Admin can manage visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Agency users can view their visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Agency admins can manage their visit_feedback" ON visit_feedback;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_feedback') THEN
    EXECUTE 'CREATE POLICY "Agency users can view their visit_feedback" ON visit_feedback
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
-- FEEDBACK TABLE - Fix data isolation (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their feedback" ON feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Users can submit feedback" ON feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Agency users can view their feedback" ON feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Agency admins can manage their feedback" ON feedback';
    
    EXECUTE 'CREATE POLICY "Agency users can view their feedback" ON feedback
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
-- CARE_TEAM_MEMBERS TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Users can view care team" ON care_team_members;
DROP POLICY IF EXISTS "Agency users can view their care team" ON care_team_members;
DROP POLICY IF EXISTS "Agency admins can manage their care team" ON care_team_members;

CREATE POLICY "Agency users can view their care team" ON care_team_members
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (
      SELECT fm.user_id FROM family_members fm
      JOIN patients p ON p.id = fm.patient_id
      WHERE p.agency_id = care_team_members.agency_id
      AND fm.user_id IS NOT NULL
    )
  );

CREATE POLICY "Agency admins can manage their care team" ON care_team_members
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- =====================================================
-- EDUCATION_MODULES TABLE - Fix data isolation
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view published modules" ON education_modules;
DROP POLICY IF EXISTS "Agency users can view their education modules" ON education_modules;
DROP POLICY IF EXISTS "Agency admins can manage their education modules" ON education_modules;

CREATE POLICY "Agency users can view their education modules" ON education_modules
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (
      SELECT fm.user_id FROM family_members fm
      JOIN patients p ON p.id = fm.patient_id
      WHERE p.agency_id = education_modules.agency_id
      AND fm.user_id IS NOT NULL
    )
  );

CREATE POLICY "Agency admins can manage their education modules" ON education_modules
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );
