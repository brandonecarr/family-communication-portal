-- Fix RLS policies for the users table
-- Add INSERT and UPDATE policies that were missing

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Create SELECT policy
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create INSERT policy - allow users to insert their own record
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.uid() = id);

-- Create UPDATE policy - allow users to update their own record
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid()::text = user_id OR auth.uid() = id)
    WITH CHECK (auth.uid()::text = user_id OR auth.uid() = id);

-- Allow the trigger functions (which use SECURITY DEFINER) to work
-- by granting necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
