-- Fix users RLS to allow viewing users in message threads
-- This is needed for the messaging system to work properly

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view users in same agency" ON public.users;

-- Create new SELECT policy that includes messaging participants
CREATE POLICY "Users can view users in same agency or threads" ON public.users
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
      -- Allow viewing users who are in the same message thread
      OR EXISTS (
        SELECT 1 FROM thread_participants tp1
        JOIN thread_participants tp2 ON tp1.thread_id = tp2.thread_id
        WHERE tp1.user_id = auth.uid()
        AND tp2.user_id = public.users.id
      )
      -- Super admins can view all users - check via JWT claims to avoid recursion
      OR (auth.jwt() ->> 'role')::text = 'super_admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );
