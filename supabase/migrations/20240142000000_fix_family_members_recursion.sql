-- Fix infinite recursion in family_members RLS policy
-- The issue is referencing family_members from within its own policy

DROP POLICY IF EXISTS "Agency users can view their family members" ON family_members;
DROP POLICY IF EXISTS "Agency admins can manage their family members" ON family_members;

CREATE POLICY "Agency users can view their family members" ON family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = family_members.patient_id 
      AND patients.agency_id = get_user_agency_id()
    )
    OR is_super_admin()
  );

CREATE POLICY "Agency admins can manage their family members" ON family_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = family_members.patient_id 
      AND patients.agency_id = get_user_agency_id()
      AND is_agency_admin(patients.agency_id)
    )
    OR is_super_admin()
  );
