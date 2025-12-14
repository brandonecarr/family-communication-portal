-- Create team_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  invited_by_name TEXT,
  status TEXT DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for agency_id
CREATE INDEX IF NOT EXISTS idx_team_invitations_agency_id ON team_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Disable RLS on team_invitations (application-level filtering handles data isolation)
ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;
