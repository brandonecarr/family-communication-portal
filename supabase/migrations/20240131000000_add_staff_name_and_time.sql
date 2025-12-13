-- Add staff_name and scheduled_time columns to visits table if they don't exist

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'staff_name'
  ) THEN
    ALTER TABLE visits ADD COLUMN staff_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE visits ADD COLUMN scheduled_time TEXT;
  END IF;
END $$;
