-- Debug and fix missing user names
-- This migration will:
-- 1. Show which users are missing names
-- 2. Update users table with names from auth.users metadata

-- First, let's see what we have
DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Checking users table for missing names...';
  
  FOR user_record IN 
    SELECT u.id, u.email, u.full_name, u.name, au.raw_user_meta_data
    FROM public.users u
    JOIN auth.users au ON u.id = au.id
    WHERE u.full_name IS NULL OR u.name IS NULL
  LOOP
    RAISE NOTICE 'User % (%) - full_name: %, name: %, metadata: %', 
      user_record.id, 
      user_record.email, 
      user_record.full_name, 
      user_record.name,
      user_record.raw_user_meta_data;
  END LOOP;
END $$;

-- Update users table with names from auth.users metadata
UPDATE public.users u
SET 
  full_name = COALESCE(
    u.full_name, 
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name'
  ),
  name = COALESCE(
    u.name, 
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(u.email, '@', 1)
  )
FROM auth.users au
WHERE u.id = au.id
  AND (u.full_name IS NULL OR u.name IS NULL);

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.users
  WHERE full_name IS NOT NULL AND name IS NOT NULL;
  
  RAISE NOTICE 'Updated users. Total users with names: %', updated_count;
END $$;
