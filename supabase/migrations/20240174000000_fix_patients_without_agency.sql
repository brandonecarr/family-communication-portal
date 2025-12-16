-- Fix any patients that don't have an agency_id set
-- This can happen if patients were created before the multi-tenant system was implemented

-- First, let's see if there are any patients without agency_id
-- and try to assign them to an agency based on their family members

-- Update patients without agency_id to use the agency from their family members
UPDATE patients p
SET agency_id = (
  SELECT DISTINCT pa.agency_id
  FROM family_members fm
  JOIN patients pa ON pa.id = fm.patient_id
  WHERE fm.patient_id = p.id
  AND pa.agency_id IS NOT NULL
  LIMIT 1
)
WHERE p.agency_id IS NULL
AND EXISTS (
  SELECT 1 FROM family_members fm
  JOIN patients pa ON pa.id = fm.patient_id
  WHERE fm.patient_id = p.id
  AND pa.agency_id IS NOT NULL
);

-- For any remaining patients without agency_id, try to assign based on the user who created them
-- (if we can determine that from the users table)

-- If there's only one agency, assign all orphan patients to it
DO $$
DECLARE
  single_agency_id uuid;
  agency_count int;
BEGIN
  SELECT COUNT(*) INTO agency_count FROM agencies;
  
  IF agency_count = 1 THEN
    SELECT id INTO single_agency_id FROM agencies LIMIT 1;
    
    UPDATE patients 
    SET agency_id = single_agency_id
    WHERE agency_id IS NULL;
    
    RAISE NOTICE 'Assigned % orphan patients to agency %', 
      (SELECT COUNT(*) FROM patients WHERE agency_id = single_agency_id), 
      single_agency_id;
  END IF;
END $$;

-- Log any remaining patients without agency_id
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM patients WHERE agency_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'There are still % patients without an agency_id. These will not be visible to any facility.', orphan_count;
  END IF;
END $$;
