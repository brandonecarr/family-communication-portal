-- Add RLS policies for family_members table

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage family members" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;

CREATE POLICY "Admin can manage family members" ON family_members 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );

CREATE POLICY "Users can view family members" ON family_members 
  FOR SELECT USING (
    user_id = auth.uid()
    OR patient_id IN (SELECT patient_id FROM family_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agency_admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
  );
