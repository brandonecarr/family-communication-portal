-- Disable RLS on agency_users table
-- The service client with service_role key should bypass RLS anyway
-- But we're disabling it to ensure data access works correctly
-- Application-level filtering handles data isolation

ALTER TABLE agency_users DISABLE ROW LEVEL SECURITY;
