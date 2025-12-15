-- Add invite_token column to family_members table for invitation flow

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='invite_token') THEN
    ALTER TABLE family_members ADD COLUMN invite_token TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='invite_sent_at') THEN
    ALTER TABLE family_members ADD COLUMN invite_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='invite_expires_at') THEN
    ALTER TABLE family_members ADD COLUMN invite_expires_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_family_members_invite_token ON family_members(invite_token);
