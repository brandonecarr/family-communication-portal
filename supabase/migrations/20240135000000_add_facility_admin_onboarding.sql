-- Add onboarding status to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id);

-- Add onboarding status to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_password_setup boolean DEFAULT false;

-- Create facility_invites table for tracking admin invitations
CREATE TABLE IF NOT EXISTS facility_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'agency_admin',
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_facility_invites_token ON facility_invites(token);
CREATE INDEX IF NOT EXISTS idx_facility_invites_email ON facility_invites(email);

-- RLS for facility_invites
ALTER TABLE facility_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage facility invites" ON facility_invites;
CREATE POLICY "Super admin can manage facility invites" ON facility_invites
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
  );

DROP POLICY IF EXISTS "Users can view their own invites" ON facility_invites;
CREATE POLICY "Users can view their own invites" ON facility_invites
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')::text
  );
