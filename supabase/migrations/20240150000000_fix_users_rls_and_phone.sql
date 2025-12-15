-- Fix users table RLS policies and ensure phone column exists

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.users;
DROP POLICY IF EXISTS "Allow trigger insert" ON public.users;

-- Create comprehensive SELECT policy - users can view their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
    );

-- Create INSERT policy - allow authenticated users to insert their own record
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
    );

-- Create UPDATE policy - users can update their own record
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
    )
    WITH CHECK (
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
    );

-- Create DELETE policy - users can delete their own record
CREATE POLICY "Users can delete own data" ON public.users
    FOR DELETE USING (
      auth.uid() = id 
      OR auth.uid()::text = user_id
      OR auth.uid()::text = token_identifier
    );
