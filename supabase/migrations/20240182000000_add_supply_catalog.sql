-- Create supply_categories table for agency-specific supply categories
CREATE TABLE IF NOT EXISTS supply_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

-- Create supply_catalog_items table for agency-specific supply items
CREATE TABLE IF NOT EXISTS supply_catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES supply_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'each',
  sizes TEXT[] DEFAULT NULL,
  requires_size BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supply_categories_agency_id ON supply_categories(agency_id);
CREATE INDEX IF NOT EXISTS idx_supply_categories_active ON supply_categories(agency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supply_catalog_items_agency_id ON supply_catalog_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_supply_catalog_items_category_id ON supply_catalog_items(category_id);
CREATE INDEX IF NOT EXISTS idx_supply_catalog_items_active ON supply_catalog_items(agency_id, is_active);

-- Enable RLS
ALTER TABLE supply_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_catalog_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supply_categories
DROP POLICY IF EXISTS "Agency users can view their supply categories" ON supply_categories;
CREATE POLICY "Agency users can view their supply categories" ON supply_categories
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM family_members fm JOIN patients p ON fm.patient_id = p.id WHERE fm.user_id = auth.uid())
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Agency admins can manage supply categories" ON supply_categories;
CREATE POLICY "Agency admins can manage supply categories" ON supply_categories
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR is_super_admin()
  );

-- RLS Policies for supply_catalog_items
DROP POLICY IF EXISTS "Agency users can view their supply items" ON supply_catalog_items;
CREATE POLICY "Agency users can view their supply items" ON supply_catalog_items
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR agency_id IN (SELECT agency_id FROM family_members fm JOIN patients p ON fm.patient_id = p.id WHERE fm.user_id = auth.uid())
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Agency admins can manage supply items" ON supply_catalog_items;
CREATE POLICY "Agency admins can manage supply items" ON supply_catalog_items
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR is_super_admin()
  );

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for supply_categories
DROP TRIGGER IF EXISTS update_supply_categories_updated_at ON supply_categories;
CREATE TRIGGER update_supply_categories_updated_at
  BEFORE UPDATE ON supply_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for supply_catalog_items
DROP TRIGGER IF EXISTS update_supply_catalog_items_updated_at ON supply_catalog_items;
CREATE TRIGGER update_supply_catalog_items_updated_at
  BEFORE UPDATE ON supply_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
