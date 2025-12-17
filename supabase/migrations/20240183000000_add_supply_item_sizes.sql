-- Add sizes and requires_size columns to supply_catalog_items
ALTER TABLE supply_catalog_items 
ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requires_size BOOLEAN DEFAULT false;
