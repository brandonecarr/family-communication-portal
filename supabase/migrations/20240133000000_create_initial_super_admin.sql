UPDATE public.users 
SET role = 'super_admin' 
WHERE email = 'admin@hospice.local';

UPDATE public.users 
SET role = 'super_admin' 
WHERE id IN (
  SELECT id FROM public.users 
  WHERE role = 'agency_admin' 
  ORDER BY created_at ASC 
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE role = 'super_admin'
);
