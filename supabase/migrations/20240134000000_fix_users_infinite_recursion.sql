-- Fix infinite recursion in users table RLS policies
-- The issue is that policies checking "SELECT FROM users" trigger other policies on users table

-- Drop all existing users policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;
DROP POLICY IF EXISTS "Super admin can manage all users" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Simple non-recursive policies using auth.uid() directly
-- SELECT: Users can see their own data, or use JWT role for super admin
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (
      auth.uid() = id 
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );

-- INSERT: Users can insert their own record during signup
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (
      auth.uid() = id
    );

-- UPDATE: Users can update their own data, or super admin via JWT
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (
      auth.uid() = id 
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    )
    WITH CHECK (
      auth.uid() = id 
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );

-- DELETE: Users can delete their own data, or super admin via JWT
CREATE POLICY "Users can delete own data" ON public.users
    FOR DELETE USING (
      auth.uid() = id 
      OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin'
    );
