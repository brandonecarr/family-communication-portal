-- Add missing columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email TEXT;

-- Update name column from first_name and last_name if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'first_name') THEN
    UPDATE patients SET name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') WHERE name IS NULL;
  END IF;
END $$;
