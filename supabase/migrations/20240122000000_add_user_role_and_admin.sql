-- Add role column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'family_member';
    END IF;
END $$;

-- Update existing admin user to have agency_admin role
UPDATE public.users 
SET role = 'agency_admin' 
WHERE email = 'admin@hospice.local';

-- If no public.users record exists for the admin, create one
INSERT INTO public.users (id, user_id, email, name, full_name, role, token_identifier, created_at)
SELECT 
    au.id,
    au.id::text,
    au.email,
    'Default Admin',
    'Default Admin',
    'agency_admin',
    au.id::text,
    NOW()
FROM auth.users au
WHERE au.email = 'admin@hospice.local'
AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.email = 'admin@hospice.local')
ON CONFLICT (id) DO UPDATE SET role = 'agency_admin';
