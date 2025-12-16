-- CRITICAL FIX: RLS circular dependency
-- The get_user_agency_id() function queries agency_users table
-- But agency_users RLS policies depend on get_user_agency_id()
-- This creates a circular dependency that breaks everything

-- Fix: Make get_user_agency_id() bypass RLS by using SECURITY DEFINER
-- and querying the table directly without RLS checks

CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
DECLARE
  agency uuid;
BEGIN
  -- Use a direct query that bypasses RLS
  -- SECURITY DEFINER means this runs with the privileges of the function owner (postgres)
  SELECT au.agency_id INTO agency 
  FROM agency_users au
  WHERE au.user_id = auth.uid() 
  LIMIT 1;
  
  RETURN agency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;

-- Also fix is_agency_admin to properly bypass RLS
CREATE OR REPLACE FUNCTION is_agency_admin(check_agency_id uuid)
RETURNS boolean AS $$
BEGIN
  IF check_agency_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct query bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM agency_users au
    WHERE au.user_id = auth.uid() 
    AND au.agency_id = check_agency_id 
    AND au.role IN ('agency_admin', 'agency_staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_agency_admin(uuid) TO authenticated;

-- Also create a simpler version that checks if user is admin of their own agency
CREATE OR REPLACE FUNCTION is_current_user_agency_admin()
RETURNS boolean AS $$
DECLARE
  user_agency uuid;
BEGIN
  SELECT au.agency_id INTO user_agency 
  FROM agency_users au
  WHERE au.user_id = auth.uid() 
  AND au.role = 'agency_admin'
  LIMIT 1;
  
  RETURN user_agency IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_current_user_agency_admin() TO authenticated;

-- Now recreate the patient policies with the fixed functions
DROP POLICY IF EXISTS "Agency users can view their patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can manage their patients" ON patients;
DROP POLICY IF EXISTS "Allow patient lookup for invite" ON patients;

-- SELECT policy: Users can see patients from their agency
CREATE POLICY "Agency users can view their patients" ON patients
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id AND user_id IS NOT NULL)
  );

-- INSERT policy: Agency admins can create patients in their agency
CREATE POLICY "Agency admins can insert patients" ON patients
  FOR INSERT WITH CHECK (
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- UPDATE policy: Agency admins can update patients in their agency
CREATE POLICY "Agency admins can update patients" ON patients
  FOR UPDATE USING (
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- DELETE policy: Agency admins can delete patients in their agency
CREATE POLICY "Agency admins can delete patients" ON patients
  FOR DELETE USING (
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- Allow patient lookup for family member invites (read-only, limited scope)
CREATE POLICY "Allow patient lookup for invite" ON patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM family_members 
      WHERE invite_token IS NOT NULL 
      AND status = 'invited'
    )
  );
