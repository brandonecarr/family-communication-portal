-- Add missing columns to existing tables

-- Add progress column to module_progress if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='module_progress' AND column_name='progress') THEN
    ALTER TABLE module_progress ADD COLUMN progress INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add attachments column to messages if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='messages' AND column_name='attachments') THEN
    ALTER TABLE messages ADD COLUMN attachments TEXT[];
  END IF;
END $$;

-- Add read column to messages if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='messages' AND column_name='read') THEN
    ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add missing columns to deliveries
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='deliveries' AND column_name='tracking_url') THEN
    ALTER TABLE deliveries ADD COLUMN tracking_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='deliveries' AND column_name='estimated_delivery') THEN
    ALTER TABLE deliveries ADD COLUMN estimated_delivery TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='deliveries' AND column_name='last_update') THEN
    ALTER TABLE deliveries ADD COLUMN last_update TEXT;
  END IF;
END $$;

-- Add missing columns to visits
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visits' AND column_name='date') THEN
    ALTER TABLE visits ADD COLUMN date DATE;
    UPDATE visits SET date = scheduled_date WHERE date IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visits' AND column_name='time_window_start') THEN
    ALTER TABLE visits ADD COLUMN time_window_start TEXT;
    UPDATE visits SET time_window_start = scheduled_time_start::TEXT WHERE time_window_start IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visits' AND column_name='time_window_end') THEN
    ALTER TABLE visits ADD COLUMN time_window_end TEXT;
    UPDATE visits SET time_window_end = scheduled_time_end::TEXT WHERE time_window_end IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='visits' AND column_name='staff_id') THEN
    ALTER TABLE visits ADD COLUMN staff_id UUID REFERENCES care_team_members(id);
    UPDATE visits SET staff_id = care_team_member_id WHERE staff_id IS NULL;
  END IF;
END $$;

-- Add missing columns to family_members
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='name') THEN
    ALTER TABLE family_members ADD COLUMN name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='email') THEN
    ALTER TABLE family_members ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='family_members' AND column_name='phone') THEN
    ALTER TABLE family_members ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Add missing columns to patients
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patients' AND column_name='name') THEN
    ALTER TABLE patients ADD COLUMN name TEXT;
    UPDATE patients SET name = first_name || ' ' || last_name WHERE name IS NULL;
  END IF;
END $$;

-- Add missing columns to care_team_members
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='care_team_members' AND column_name='name') THEN
    ALTER TABLE care_team_members ADD COLUMN name TEXT;
    UPDATE care_team_members SET name = first_name || ' ' || last_name WHERE name IS NULL;
  END IF;
END $$;

-- Create family invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'family_member',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload attachments'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'attachments');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow public to view attachments'
  ) THEN
    CREATE POLICY "Allow public to view attachments"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'attachments');
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_id ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module_id ON module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_patient_id ON family_invitations(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);
CREATE INDEX IF NOT EXISTS idx_deliveries_patient_id ON deliveries(patient_id);

-- Update education_modules to add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='education_modules' AND column_name='thumbnail') THEN
    ALTER TABLE education_modules ADD COLUMN thumbnail TEXT;
    UPDATE education_modules SET thumbnail = thumbnail_url WHERE thumbnail IS NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='education_modules' AND column_name='content_url') THEN
    ALTER TABLE education_modules ADD COLUMN content_url TEXT;
  END IF;
END $$;

