-- CRITICAL FIX: Patient visibility - Final comprehensive fix
-- Problem: Patients are not visible to ANY facility
-- Root cause: RLS policies are too restrictive or functions return NULL

-- Step 1: Drop ALL existing patient policies to start fresh
DROP POLICY IF EXISTS "Users can view their own patient records" ON patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON patients;
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Admin can view all patients" ON patients;
DROP POLICY IF EXISTS "Admin can manage patients" ON patients;
DROP POLICY IF EXISTS "Super admin can manage all patients" ON patients;
DROP POLICY IF EXISTS "Agency users can view their patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can manage their patients" ON patients;
DROP POLICY IF EXISTS "Allow patient lookup for invite" ON patients;
DROP POLICY IF EXISTS "Agency admins can insert patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can update patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can delete patients" ON patients;

-- Step 2: Ensure RLS is enabled
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a robust get_user_agency_id function that ALWAYS works
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
DECLARE
  agency uuid;
BEGIN
  -- Direct query to agency_users (RLS is disabled on this table)
  SELECT au.agency_id INTO agency 
  FROM agency_users au
  WHERE au.user_id = auth.uid() 
  LIMIT 1;
  
  RETURN agency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 4: Create a robust is_super_admin function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Check user_metadata in JWT
  user_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Also check the users table as fallback
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: Create a robust is_agency_admin function
CREATE OR REPLACE FUNCTION is_agency_admin(check_agency_id uuid)
RETURNS boolean AS $$
BEGIN
  IF check_agency_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM agency_users au
    WHERE au.user_id = auth.uid() 
    AND au.agency_id = check_agency_id 
    AND au.role IN ('agency_admin', 'agency_staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 6: Create is_current_user_agency_admin function
CREATE OR REPLACE FUNCTION is_current_user_agency_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agency_users au
    WHERE au.user_id = auth.uid() 
    AND au.role = 'agency_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agency_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_agency_admin() TO authenticated;

-- Step 7: Create simple, working patient policies

-- SELECT: Agency users can view patients in their agency
-- This is the MAIN policy that allows viewing patients
CREATE POLICY "patients_select_policy" ON patients
  FOR SELECT USING (
    -- User belongs to the same agency as the patient
    agency_id = get_user_agency_id()
    -- OR user is a super admin
    OR is_super_admin()
    -- OR user is a family member of this patient
    OR EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.patient_id = patients.id 
      AND fm.user_id = auth.uid()
    )
  );

-- INSERT: Agency admins can create patients in their agency
CREATE POLICY "patients_insert_policy" ON patients
  FOR INSERT WITH CHECK (
    -- Patient's agency_id must match user's agency AND user must be admin
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    -- OR user is super admin
    OR is_super_admin()
  );

-- UPDATE: Agency admins can update patients in their agency
CREATE POLICY "patients_update_policy" ON patients
  FOR UPDATE USING (
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- DELETE: Agency admins can delete patients in their agency
CREATE POLICY "patients_delete_policy" ON patients
  FOR DELETE USING (
    (agency_id = get_user_agency_id() AND is_current_user_agency_admin())
    OR is_super_admin()
  );

-- Step 8: Allow patient lookup for family member invites
CREATE POLICY "patients_invite_lookup_policy" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.patient_id = patients.id
      AND fm.invite_token IS NOT NULL 
      AND fm.status = 'invited'
    )
  );
