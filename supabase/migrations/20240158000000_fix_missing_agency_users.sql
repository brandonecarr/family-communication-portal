-- Fix missing agency_users records for facility admins
-- This matches agencies with their admin_user_id and creates the agency_users record if missing

INSERT INTO agency_users (user_id, agency_id, role)
SELECT 
  a.admin_user_id,
  a.id,
  'agency_admin'::user_role
FROM agencies a
WHERE a.admin_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agency_users au 
    WHERE au.user_id = a.admin_user_id 
    AND au.agency_id = a.id
  );
