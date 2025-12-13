-- Delete test users from auth.users
-- This will cascade and clean up related data

DELETE FROM auth.users WHERE email = 'admin@hospice.local';

-- Note: To delete other specific users, add more DELETE statements:
-- DELETE FROM auth.users WHERE email = 'user@example.com';
