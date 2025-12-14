-- Fix messaging RLS policies
-- Disable RLS on messaging tables as per project requirements
-- Application-level filtering handles data isolation

ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads in their agency" ON message_threads;
DROP POLICY IF EXISTS "Thread creators can update threads" ON message_threads;
DROP POLICY IF EXISTS "Users can view participants of their threads" ON thread_participants;
DROP POLICY IF EXISTS "Thread admins can add participants" ON thread_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON thread_participants;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON thread_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON thread_messages;
DROP POLICY IF EXISTS "Users can view read receipts for their threads" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can create their own read receipts" ON message_read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON message_read_receipts;
