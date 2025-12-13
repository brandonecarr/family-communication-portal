-- Fix admin RLS check to also check user metadata
-- This ensures admins can access data even if the users table entry is delayed

-- Drop and recreate messages policies with improved admin check
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Admin can update messages" ON messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON messages;

CREATE POLICY "Users can view their own messages" ON messages 
  FOR SELECT USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin'
    )
    OR (auth.jwt() ->> 'role')::text = 'agency_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Users can insert messages" ON messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admin can update messages" ON messages 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Admin can delete messages" ON messages 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

-- Also update visits policies
DROP POLICY IF EXISTS "Users can view visits" ON visits;
DROP POLICY IF EXISTS "Admin can manage visits" ON visits;

CREATE POLICY "Users can view visits" ON visits 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = visits.patient_id)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Admin can manage visits" ON visits 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

-- Update patients policies
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Admin can manage patients" ON patients;
DROP POLICY IF EXISTS "Users can view their own patient records" ON patients;

CREATE POLICY "Users can view patients" ON patients 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Admin can manage patients" ON patients 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

-- Update deliveries policies
DROP POLICY IF EXISTS "Users can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admin can manage deliveries" ON deliveries;

CREATE POLICY "Users can view deliveries" ON deliveries 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = deliveries.patient_id)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Admin can manage deliveries" ON deliveries 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

-- Update supply_requests policies
DROP POLICY IF EXISTS "Users can view supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Users can create supply requests" ON supply_requests;
DROP POLICY IF EXISTS "Admin can manage supply requests" ON supply_requests;

CREATE POLICY "Users can view supply requests" ON supply_requests 
  FOR SELECT USING (
    auth.uid() = requested_by
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Users can create supply requests" ON supply_requests 
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admin can manage supply requests" ON supply_requests 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

-- Update visit_feedback policies
DROP POLICY IF EXISTS "Users can view visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Users can create visit_feedback" ON visit_feedback;
DROP POLICY IF EXISTS "Admin can manage visit_feedback" ON visit_feedback;

CREATE POLICY "Users can view visit_feedback" ON visit_feedback 
  FOR SELECT USING (
    auth.uid() = submitted_by
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Users can create visit_feedback" ON visit_feedback 
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admin can manage visit_feedback" ON visit_feedback 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );
