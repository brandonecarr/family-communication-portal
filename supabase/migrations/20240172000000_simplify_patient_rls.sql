-- Simplify patient RLS to ensure it works
-- The issue might be that the functions are too complex

-- Drop all existing patient policies
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;
DROP POLICY IF EXISTS "patients_invite_lookup" ON patients;
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;
DROP POLICY IF EXISTS "patients_invite_lookup_policy" ON patients;

-- Ensure RLS is enabled
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create a very simple SELECT policy
-- This policy allows users to see patients where:
-- 1. The patient's agency_id matches an agency_users record for the current user
-- 2. OR the user is a super_admin (checked via users table)
-- 3. OR the user is a family member of the patient
CREATE POLICY "patients_view" ON patients
  FOR SELECT USING (
    -- Direct join to agency_users to check if user belongs to patient's agency
    EXISTS (
      SELECT 1 FROM agency_users au 
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = patients.agency_id
    )
    -- OR user is super_admin
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
    -- OR user is a family member
    OR EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.patient_id = patients.id 
      AND fm.user_id = auth.uid()
    )
  );

-- Create INSERT policy - agency admins can create patients in their agency
CREATE POLICY "patients_create" ON patients
  FOR INSERT WITH CHECK (
    -- User must be an agency_admin for the patient's agency
    EXISTS (
      SELECT 1 FROM agency_users au 
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = patients.agency_id
      AND au.role = 'agency_admin'
    )
    -- OR user is super_admin
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Create UPDATE policy
CREATE POLICY "patients_modify" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_users au 
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = patients.agency_id
      AND au.role = 'agency_admin'
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Create DELETE policy
CREATE POLICY "patients_remove" ON patients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agency_users au 
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = patients.agency_id
      AND au.role = 'agency_admin'
    )
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Allow patient lookup for family member invites
CREATE POLICY "patients_invite" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.patient_id = patients.id
      AND fm.invite_token IS NOT NULL 
      AND fm.status = 'invited'
    )
  );
