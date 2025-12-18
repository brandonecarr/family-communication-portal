-- Create role_permissions table to store customizable permissions per agency
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  admin_enabled BOOLEAN NOT NULL DEFAULT true,
  staff_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, permission_name)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_agency_id ON public.role_permissions(agency_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency admins can view role permissions" ON public.role_permissions;
CREATE POLICY "Agency admins can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Agency admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_users 
      WHERE user_id = auth.uid() AND role = 'agency_admin'
    )
  );

CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();

GRANT ALL ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
