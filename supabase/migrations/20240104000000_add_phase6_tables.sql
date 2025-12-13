-- Create bereavement_campaigns table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bereavement_campaigns') THEN
    CREATE TABLE bereavement_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      email_count INTEGER DEFAULT 0,
      duration_days INTEGER DEFAULT 30,
      enrolled_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Create bereavement_enrollments table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bereavement_enrollments') THEN
    CREATE TABLE bereavement_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES bereavement_campaigns(id) ON DELETE CASCADE,
      family_member_id UUID NOT NULL,
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status TEXT DEFAULT 'active'
    );
  END IF;
END $$;

-- Create bereavement_emails table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bereavement_emails') THEN
    CREATE TABLE bereavement_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES bereavement_campaigns(id) ON DELETE CASCADE,
      sequence_number INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      send_after_days INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Create integrations table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    CREATE TABLE integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'disconnected',
      config JSONB,
      last_sync TIMESTAMPTZ,
      records_synced INTEGER DEFAULT 0,
      sync_frequency TEXT DEFAULT 'manual',
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Create audit_logs table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      user_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      description TEXT,
      changes JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bereavement_campaigns_status ON bereavement_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bereavement_enrollments_campaign_id ON bereavement_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bereavement_enrollments_family_member_id ON bereavement_enrollments(family_member_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
