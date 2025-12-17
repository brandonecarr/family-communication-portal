-- Add supply_request_id column to deliveries table to link deliveries to supply requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='deliveries' AND column_name='supply_request_id') THEN
    ALTER TABLE deliveries ADD COLUMN supply_request_id UUID REFERENCES supply_requests(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_deliveries_supply_request_id ON deliveries(supply_request_id);
  END IF;
END $$;
