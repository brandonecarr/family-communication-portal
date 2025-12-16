-- Fix patient "Kathy Henderson" with null agency_id
-- Set it to the correct agency based on the family member's relationship

UPDATE patients 
SET agency_id = '18495d20-c0d3-44bb-a485-d90871af7dcf'
WHERE id = '5fd219e3-57ff-4a46-8c41-17dec0342f05'
AND agency_id IS NULL;
