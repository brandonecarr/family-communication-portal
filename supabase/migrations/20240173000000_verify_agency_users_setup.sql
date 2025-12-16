-- Verify agency_users table setup
-- Ensure RLS is disabled and the table is accessible

-- Disable RLS on agency_users (should already be disabled)
ALTER TABLE agency_users DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on users table to ensure super_admin check works
-- (The users table might have RLS that prevents the super_admin check)
-- First check if there are any policies and drop them
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Super admin can manage all users" ON users;
DROP POLICY IF EXISTS "Agency admins can view their agency users" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create indexes to speed up the RLS checks
CREATE INDEX IF NOT EXISTS idx_agency_users_user_agency ON agency_users(user_id, agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user_role ON agency_users(user_id, role);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_family_members_user_patient ON family_members(user_id, patient_id);
