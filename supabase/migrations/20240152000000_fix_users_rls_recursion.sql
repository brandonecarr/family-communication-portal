-- Fix infinite recursion in users table RLS policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in same agency" ON public.users;

-- Create new SELECT policy that avoids recursion by using auth.jwt() instead of querying users table
CREATE POLICY "Users can view users in same agency" ON public.users
    FOR SELECT USING (
      -- Users can always view their own data
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
      -- Allow viewing other users if they share an agency (via agency_users table)
      OR EXISTS (
        SELECT 1 FROM agency_users au1
        JOIN agency_users au2 ON au1.agency_id = au2.agency_id
        WHERE au1.user_id = auth.uid()
        AND au2.user_id = public.users.id
      )
      -- Super admins can view all users - check via JWT claims to avoid recursion
      OR (auth.jwt() ->> 'role')::text = 'super_admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );
