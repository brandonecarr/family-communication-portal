CREATE OR REPLACE FUNCTION set_admin_job_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'agency_admin' AND (NEW.job_role IS NULL OR NEW.job_role = '') THEN
    NEW.job_role := 'Administrator';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_admin_job_role_trigger ON agency_users;
CREATE TRIGGER set_admin_job_role_trigger
  BEFORE INSERT OR UPDATE ON agency_users
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_job_role();

UPDATE agency_users 
SET job_role = 'Administrator' 
WHERE role = 'agency_admin' 
AND (job_role IS NULL OR job_role = '');
