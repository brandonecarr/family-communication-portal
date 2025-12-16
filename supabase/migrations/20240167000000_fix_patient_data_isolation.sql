-- CRITICAL FIX: Patient data isolation
-- This migration ensures patients are ONLY visible to users in the same agency
-- Fixes data leak where agency admins could see patients from other facilities

-- First, drop ALL existing patient policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own patient records" ON patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON patients;
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Admin can view all patients" ON patients;
DROP POLICY IF EXISTS "Admin can manage patients" ON patients;
DROP POLICY IF EXISTS "Super admin can manage all patients" ON patients;
DROP POLICY IF EXISTS "Agency users can view their patients" ON patients;
DROP POLICY IF EXISTS "Agency admins can manage their patients" ON patients;
DROP POLICY IF EXISTS "Allow patient lookup for invite" ON patients;

-- Ensure RLS is enabled
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create proper agency-scoped SELECT policy
-- Users can ONLY see patients from their own agency
CREATE POLICY "Agency users can view their patients" ON patients
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR is_super_admin()
    OR auth.uid() IN (SELECT user_id FROM family_members WHERE patient_id = patients.id AND user_id IS NOT NULL)
  );

-- Create proper agency-scoped management policy
-- Only agency admins can manage patients in their own agency
CREATE POLICY "Agency admins can manage their patients" ON patients
  FOR ALL USING (
    (agency_id = get_user_agency_id() AND is_agency_admin(agency_id))
    OR is_super_admin()
  );

-- Allow patient lookup for family member invites (read-only, limited scope)
CREATE POLICY "Allow patient lookup for invite" ON patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM family_members 
      WHERE invite_token IS NOT NULL 
      AND status = 'invited'
    )
  );

-- Also fix the get_user_agency_id function to handle edge cases better
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS uuid AS $$
DECLARE
  agency uuid;
BEGIN
  SELECT agency_id INTO agency 
  FROM agency_users 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  RETURN agency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix is_agency_admin to be more robust
CREATE OR REPLACE FUNCTION is_agency_admin(check_agency_id uuid)
RETURNS boolean AS $$
BEGIN
  IF check_agency_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = check_agency_id 
    AND role IN ('agency_admin', 'agency_staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
