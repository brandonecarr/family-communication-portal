-- Add inventory tracking columns to supply_catalog_items
ALTER TABLE supply_catalog_items 
ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;

-- Create inventory_transactions table to track inventory changes
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES supply_catalog_items(id) ON DELETE CASCADE,
  supply_request_id UUID REFERENCES supply_requests(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'deduct', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  size TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_agency_id ON inventory_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_catalog_item_id ON inventory_transactions(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_supply_request_id ON inventory_transactions(supply_request_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_transactions
DROP POLICY IF EXISTS "Agency users can view their inventory transactions" ON inventory_transactions;
CREATE POLICY "Agency users can view their inventory transactions" ON inventory_transactions
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Agency admins can manage inventory transactions" ON inventory_transactions;
CREATE POLICY "Agency admins can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
    OR is_super_admin()
  );

-- Add size_quantities JSONB column for tracking inventory per size
ALTER TABLE supply_catalog_items 
ADD COLUMN IF NOT EXISTS size_quantities JSONB DEFAULT '{}';
