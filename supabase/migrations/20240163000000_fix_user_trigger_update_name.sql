CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    role,
    token_identifier,
    needs_password_setup,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'family_member'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'needs_password_setup')::boolean, false),
    false,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    name = COALESCE(EXCLUDED.name, public.users.name),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    role = COALESCE(EXCLUDED.role, public.users.role),
    needs_password_setup = COALESCE(EXCLUDED.needs_password_setup, public.users.needs_password_setup),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE public.users u
SET 
  full_name = COALESCE(u.full_name, au.raw_user_meta_data->>'full_name'),
  name = COALESCE(u.name, au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name')
FROM auth.users au
WHERE u.id = au.id
  AND (u.full_name IS NULL OR u.name IS NULL)
  AND (au.raw_user_meta_data->>'full_name' IS NOT NULL OR au.raw_user_meta_data->>'name' IS NOT NULL);
