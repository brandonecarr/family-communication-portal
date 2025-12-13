-- Fix RLS policies for users table to allow signup flow
-- The issue is that during signup, the trigger creates the user before
-- the action can insert, and the action's insert then fails due to RLS

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.users;
DROP POLICY IF EXISTS "Allow trigger insert" ON public.users;

-- SELECT policy - users can view their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id OR auth.uid()::text = user_id);

-- INSERT policy - allow authenticated users to insert their own record
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid()::text = user_id);

-- UPDATE policy - users can update their own record
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id OR auth.uid()::text = user_id)
    WITH CHECK (auth.uid() = id OR auth.uid()::text = user_id);

-- DELETE policy - users can delete their own record
CREATE POLICY "Users can delete own data" ON public.users
    FOR DELETE USING (auth.uid() = id OR auth.uid()::text = user_id);
