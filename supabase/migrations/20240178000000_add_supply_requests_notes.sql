-- Add notes column to supply_requests if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supply_requests' AND column_name = 'notes'
  ) THEN
    ALTER TABLE supply_requests ADD COLUMN notes TEXT;
  END IF;
END $$;
