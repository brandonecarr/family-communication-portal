-- Debug and fix agency lookup issues
-- This migration ensures the get_user_agency_id function works correctly

-- First, let's make sure agency_users table has RLS disabled
ALTER TABLE agency_users DISABLE ROW LEVEL SECURITY;

-- Recreate the get_user_agency_id function with better error handling
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
DECLARE
  agency uuid;
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- If no user is logged in, return NULL
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Query agency_users table directly (RLS is disabled on this table)
  SELECT au.agency_id INTO agency 
  FROM agency_users au
  WHERE au.user_id = current_user_id 
  LIMIT 1;
  
  RETURN agency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO anon;

-- Recreate is_super_admin with better logic
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
DECLARE
  jwt_role text;
  db_role text;
BEGIN
  -- First check JWT metadata
  jwt_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  IF jwt_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Fallback: check users table
  SELECT role INTO db_role FROM users WHERE id = auth.uid();
  IF db_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;

-- Recreate is_current_user_agency_admin
CREATE OR REPLACE FUNCTION is_current_user_agency_admin()
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM agency_users au
    WHERE au.user_id = current_user_id 
    AND au.role = 'agency_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_current_user_agency_admin() TO authenticated;

-- Recreate is_agency_admin
CREATE OR REPLACE FUNCTION is_agency_admin(check_agency_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL OR check_agency_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM agency_users au
    WHERE au.user_id = current_user_id 
    AND au.agency_id = check_agency_id 
    AND au.role IN ('agency_admin', 'agency_staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_agency_admin(uuid) TO authenticated;

-- Now let's simplify the patient SELECT policy to be more permissive for debugging
-- Drop all existing patient policies
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;
DROP POLICY IF EXISTS "patients_invite_lookup_policy" ON patients;
DROP POLICY IF EXISTS "Agency users can view their patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can insert patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can update patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can delete patients" ON patients;
DROP POLICY IF EXISTS "Allow patient lookup for invite" ON patients;

-- Ensure RLS is enabled
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create a simple SELECT policy that checks agency_id
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    -- Check if user's agency matches patient's agency
    (get_user_agency_id() IS NOT NULL AND agency_id = get_user_agency_id())
    -- OR user is super admin
    OR is_super_admin()
    -- OR user is a family member of this patient
    OR EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.patient_id = patients.id 
      AND fm.user_id = auth.uid()
    )
  );

-- Create INSERT policy
CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    (get_user_agency_id() IS NOT NULL AND agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- Create UPDATE policy
CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    (get_user_agency_id() IS NOT NULL AND agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- Create DELETE policy
CREATE POLICY "patients_delete" ON patients
  FOR DELETE USING (
    (get_user_agency_id() IS NOT NULL AND agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- Allow patient lookup for family member invites
CREATE POLICY "patients_invite_lookup" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.patient_id = patients.id
      AND fm.invite_token IS NOT NULL 
      AND fm.status = 'invited'
    )
  );
