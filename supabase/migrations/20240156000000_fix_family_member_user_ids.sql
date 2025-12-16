-- Fix family members who completed onboarding but don't have user_id set
-- This matches family members to users by email address

UPDATE family_members fm
SET user_id = u.id
FROM users u
WHERE fm.email = u.email
  AND fm.user_id IS NULL
  AND u.role = 'family_member';

-- Also update status to active for family members who have a user_id but status is still 'invited'
UPDATE family_members
SET status = 'active'
WHERE user_id IS NOT NULL
  AND status = 'invited';
