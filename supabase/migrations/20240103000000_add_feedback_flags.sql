-- Add flagged and resolved columns to visit_feedback if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visit_feedback' AND column_name='flagged') THEN
    ALTER TABLE visit_feedback ADD COLUMN flagged BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visit_feedback' AND column_name='resolved') THEN
    ALTER TABLE visit_feedback ADD COLUMN resolved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_feedback_flagged ON visit_feedback(flagged);
CREATE INDEX IF NOT EXISTS idx_visit_feedback_resolved ON visit_feedback(resolved);
CREATE INDEX IF NOT EXISTS idx_visit_feedback_rating ON visit_feedback(rating);
