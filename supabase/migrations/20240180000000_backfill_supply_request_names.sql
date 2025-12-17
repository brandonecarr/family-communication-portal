-- Add requested_by column if it doesn't exist (for UUID lookups)
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id);

-- Add requested_by_name column if it doesn't exist
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS requested_by_name TEXT;

-- Backfill requested_by_name from users table for existing records
UPDATE supply_requests 
SET requested_by_name = users.name
FROM users
WHERE supply_requests.requested_by = users.id
  AND supply_requests.requested_by IS NOT NULL
  AND (supply_requests.requested_by_name IS NULL OR supply_requests.requested_by_name = '');
