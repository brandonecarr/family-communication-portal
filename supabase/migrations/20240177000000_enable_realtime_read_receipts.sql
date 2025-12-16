ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;

ALTER TABLE message_read_receipts REPLICA IDENTITY FULL;
