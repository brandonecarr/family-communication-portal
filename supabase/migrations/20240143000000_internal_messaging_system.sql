-- Internal Messaging System Migration
-- Supports 1-to-1 and group messaging with automatic archiving

-- Create message_type enum
DO $$ BEGIN
  CREATE TYPE message_category AS ENUM ('internal', 'family');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create conversation threads table for group messaging
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  category message_category NOT NULL DEFAULT 'family',
  subject TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create thread participants table
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(thread_id, user_id)
);

-- Create thread messages table
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Create message read receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES thread_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_threads_agency_id ON message_threads(agency_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_category ON message_threads(category);
CREATE INDEX IF NOT EXISTS idx_message_threads_archived_at ON message_threads(archived_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON thread_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Users can view threads they participate in" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = message_threads.id 
      AND thread_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = message_threads.agency_id 
      AND au.role IN ('agency_admin', 'super_admin')
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can create threads in their agency" ON message_threads
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = message_threads.agency_id
    )
  );

CREATE POLICY "Thread creators can update threads" ON message_threads
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM agency_users au
      WHERE au.user_id = auth.uid() 
      AND au.agency_id = message_threads.agency_id 
      AND au.role IN ('agency_admin', 'super_admin')
    )
    OR is_super_admin()
  );

-- RLS Policies for thread_participants
CREATE POLICY "Users can view participants of their threads" ON thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants tp 
      WHERE tp.thread_id = thread_participants.thread_id 
      AND tp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM message_threads mt
      JOIN agency_users au ON au.agency_id = mt.agency_id
      WHERE mt.id = thread_participants.thread_id
      AND au.user_id = auth.uid()
      AND au.role IN ('agency_admin', 'super_admin')
    )
    OR is_super_admin()
  );

CREATE POLICY "Thread admins can add participants" ON thread_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM thread_participants tp 
      WHERE tp.thread_id = thread_participants.thread_id 
      AND tp.user_id = auth.uid()
      AND tp.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = thread_participants.thread_id
      AND mt.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation" ON thread_participants
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for thread_messages
CREATE POLICY "Users can view messages in their threads" ON thread_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = thread_messages.thread_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages" ON thread_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM thread_participants 
      WHERE thread_participants.thread_id = thread_messages.thread_id 
      AND thread_participants.user_id = auth.uid()
    )
  );

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for their threads" ON message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM thread_messages tm
      JOIN thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_read_receipts.message_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own read receipts" ON message_read_receipts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read receipts" ON message_read_receipts
  FOR UPDATE USING (user_id = auth.uid());

-- Function to auto-archive threads after 30 days of inactivity
CREATE OR REPLACE FUNCTION archive_old_threads()
RETURNS void AS $$
BEGIN
  UPDATE message_threads
  SET archived_at = NOW()
  WHERE archived_at IS NULL
  AND last_message_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_message_at
DROP TRIGGER IF EXISTS trigger_update_thread_last_message ON thread_messages;
CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();
