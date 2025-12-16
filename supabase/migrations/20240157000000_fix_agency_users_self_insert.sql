-- Fix agency_users RLS to allow users to insert their own record
-- This is needed for facility admin onboarding

-- Drop existing policies
DROP POLICY IF EXISTS "Agency users can view their agency users" ON agency_users;
DROP POLICY IF EXISTS "Agency admins can manage their agency users" ON agency_users;

-- Allow users to view agency_users records for their agency OR their own record
CREATE POLICY "Agency users can view their agency users" ON agency_users
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR user_id = auth.uid()
    OR is_super_admin()
  );

-- Allow users to insert their own agency_users record (for onboarding)
CREATE POLICY "Users can insert their own agency_users record" ON agency_users
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- Allow agency admins to update/delete agency_users in their agency
CREATE POLICY "Agency admins can update agency users" ON agency_users
  FOR UPDATE USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

CREATE POLICY "Agency admins can delete agency users" ON agency_users
  FOR DELETE USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );
