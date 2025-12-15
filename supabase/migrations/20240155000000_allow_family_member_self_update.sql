-- Allow family members to update their own record during onboarding
-- This is needed when they complete the accept-invite flow

DROP POLICY IF EXISTS "Family members can update own record" ON family_members;

CREATE POLICY "Family members can update own record" ON family_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      invite_token IS NOT NULL 
      AND status = 'invited'
      AND (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR email = auth.jwt() ->> 'email'
      )
    )
  );

-- Also allow the update via service role by ensuring the policy doesn't block it
-- The service role bypasses RLS, but we need to ensure the client-side update works
