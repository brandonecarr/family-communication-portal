-- Fix users table RLS policies to allow viewing other users for messaging

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- Create new SELECT policy that allows:
-- 1. Users to view their own data
-- 2. Authenticated users to view basic info of other users in the same agency
CREATE POLICY "Users can view users in same agency" ON public.users
    FOR SELECT USING (
      -- Users can always view their own data
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
      -- Allow viewing other users if they share an agency
      OR EXISTS (
        SELECT 1 FROM agency_users au1
        JOIN agency_users au2 ON au1.agency_id = au2.agency_id
        WHERE au1.user_id = auth.uid()
        AND au2.user_id = public.users.id
      )
      -- Super admins can view all users
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
      )
    );
