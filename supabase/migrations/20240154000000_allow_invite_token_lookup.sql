-- Allow unauthenticated users to look up family_members by invite_token
-- This is needed for the accept-invite flow where users click the email link

DROP POLICY IF EXISTS "Allow invite token lookup" ON family_members;

CREATE POLICY "Allow invite token lookup" ON family_members
  FOR SELECT USING (
    invite_token IS NOT NULL 
    AND status = 'invited'
  );

-- Allow reading patient info for family members with valid invite tokens
DROP POLICY IF EXISTS "Allow patient lookup for invite" ON patients;

CREATE POLICY "Allow patient lookup for invite" ON patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM family_members 
      WHERE invite_token IS NOT NULL 
      AND status = 'invited'
    )
  );

-- Allow reading agency info for invite flow
DROP POLICY IF EXISTS "Allow agency lookup for invite" ON agencies;

CREATE POLICY "Allow agency lookup for invite" ON agencies
  FOR SELECT USING (
    id IN (
      SELECT agency_id FROM patients 
      WHERE id IN (
        SELECT patient_id FROM family_members 
        WHERE invite_token IS NOT NULL 
        AND status = 'invited'
      )
    )
  );
