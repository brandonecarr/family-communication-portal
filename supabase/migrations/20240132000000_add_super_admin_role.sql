ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'standard';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS max_patients integer DEFAULT 100;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS max_staff integer DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);

DROP POLICY IF EXISTS "Super admin can manage all agencies" ON agencies;
CREATE POLICY "Super admin can manage all agencies" ON agencies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Agency users can view their agency" ON agencies;
CREATE POLICY "Agency users can view their agency" ON agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_users 
      WHERE agency_users.agency_id = agencies.id 
      AND agency_users.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admin can manage all users" ON users;
CREATE POLICY "Super admin can manage all users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "Super admin can manage all agency_users" ON agency_users;
CREATE POLICY "Super admin can manage all agency_users" ON agency_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admin can manage all patients" ON patients;
CREATE POLICY "Super admin can manage all patients" ON patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admin can manage all family_members" ON family_members;
CREATE POLICY "Super admin can manage all family_members" ON family_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );
