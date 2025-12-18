-- Backfill full_name for users who don't have it set
-- This ensures all users have a full_name for display purposes

-- Update users table with full_name from auth.users metadata
UPDATE public.users u
SET 
  full_name = COALESCE(
    u.full_name, 
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    u.name,
    SPLIT_PART(u.email, '@', 1)
  )
FROM auth.users au
WHERE u.id = au.id
  AND (u.full_name IS NULL OR u.full_name = '');

-- Also update the name field if it's missing
UPDATE public.users u
SET 
  name = COALESCE(
    u.name, 
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    u.full_name,
    SPLIT_PART(u.email, '@', 1)
  )
FROM auth.users au
WHERE u.id = au.id
  AND (u.name IS NULL OR u.name = '');
