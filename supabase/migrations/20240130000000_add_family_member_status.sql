DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='status') THEN
    ALTER TABLE family_members ADD COLUMN status TEXT DEFAULT 'invited';
  END IF;
END $$;
