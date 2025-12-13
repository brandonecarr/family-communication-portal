-- Seed data for development and testing

-- Insert sample patients
INSERT INTO patients (first_name, last_name, date_of_birth, status, admission_date, primary_diagnosis, address, phone, email, emergency_contact_name, emergency_contact_phone)
VALUES
  ('John', 'Smith', '1945-03-15', 'active', '2024-01-01', 'Heart failure', '123 Main St, Springfield', '555-0101', 'john.smith@email.com', 'Mary Smith', '555-0102'),
  ('Sarah', 'Johnson', '1950-07-22', 'active', '2024-01-05', 'Cancer', '456 Oak Ave, Springfield', '555-0201', 'sarah.johnson@email.com', 'Tom Johnson', '555-0202'),
  ('Robert', 'Williams', '1948-11-30', 'active', '2024-01-10', 'COPD', '789 Pine Rd, Springfield', '555-0301', 'robert.williams@email.com', 'Linda Williams', '555-0302')
ON CONFLICT DO NOTHING;

-- Insert sample visits
INSERT INTO visits (patient_id, staff_name, discipline, scheduled_date, scheduled_time, status, notes)
SELECT 
  p.id,
  'Nurse Johnson',
  'Nursing',
  CURRENT_DATE + INTERVAL '1 day',
  '10:00 AM',
  'scheduled',
  'Regular check-up'
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

INSERT INTO visits (patient_id, staff_name, discipline, scheduled_date, scheduled_time, status, notes)
SELECT 
  p.id,
  'Dr. Smith',
  'Physician',
  CURRENT_DATE + INTERVAL '2 days',
  '2:00 PM',
  'scheduled',
  'Follow-up appointment'
FROM patients p
WHERE p.first_name = 'Sarah'
LIMIT 1;

-- Insert sample messages
INSERT INTO messages (patient_id, sender_name, sender_type, recipient_name, subject, message, topic, read)
SELECT 
  p.id,
  'Care Team',
  'staff',
  'John Smith',
  'Welcome to our care',
  'Welcome to our family communication portal. We are here to support you.',
  'general',
  false
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

-- Insert sample deliveries
INSERT INTO deliveries (patient_id, item_name, carrier, tracking_number, status, estimated_delivery)
SELECT 
  p.id,
  'Medication delivery',
  'FedEx',
  'FX123456789',
  'in_transit',
  CURRENT_DATE + INTERVAL '1 day'
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

-- Insert sample education modules
INSERT INTO education_modules (title, description, content, category, duration_minutes, order_index, published)
VALUES
  ('Understanding Hospice Care', 'Learn about what hospice care means and how it can help', 'Hospice care focuses on comfort and quality of life...', 'Getting Started', 10, 1, true),
  ('Pain Management', 'Understanding pain management options', 'Pain management is a key component of hospice care...', 'Medical Care', 15, 2, true),
  ('Emotional Support', 'Resources for emotional and spiritual support', 'Emotional support is available for patients and families...', 'Support', 12, 3, true),
  ('End of Life Planning', 'Important considerations for end of life planning', 'Planning ahead can help ensure your wishes are honored...', 'Planning', 20, 4, true)
ON CONFLICT DO NOTHING;

-- Insert sample care team members
INSERT INTO care_team_members (patient_id, name, role, specialty, phone, email, description, active)
SELECT 
  p.id,
  'Dr. Emily Chen',
  'Physician',
  'Palliative Care',
  '555-1001',
  'dr.chen@hospice.com',
  'Primary physician overseeing care plan',
  true
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

INSERT INTO care_team_members (patient_id, name, role, specialty, phone, email, description, active)
SELECT 
  p.id,
  'Nurse Sarah Martinez',
  'Registered Nurse',
  'Home Health',
  '555-1002',
  'nurse.martinez@hospice.com',
  'Primary nurse for daily care',
  true
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

-- Insert sample supply requests
INSERT INTO supply_requests (patient_id, requested_by_name, items, status, priority, notes)
SELECT 
  p.id,
  'John Smith',
  '[{"item": "Gloves", "quantity": 2}, {"item": "Bandages", "quantity": 1}]'::jsonb,
  'pending',
  'normal',
  'Running low on supplies'
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

-- Insert sample feedback
INSERT INTO feedback (patient_id, submitted_by_name, rating, comment, category, status)
SELECT 
  p.id,
  'Mary Smith',
  5,
  'Excellent care and very compassionate staff',
  'general',
  'new'
FROM patients p
WHERE p.first_name = 'John'
LIMIT 1;

-- Insert sample bereavement campaign
INSERT INTO bereavement_campaigns (name, description, sequence, active)
VALUES
  ('Standard Bereavement Support', 'Standard 6-month bereavement support program', 
   '[
     {"step": 1, "delay_days": 7, "type": "email", "subject": "Our thoughts are with you", "content": "We extend our deepest sympathies..."},
     {"step": 2, "delay_days": 30, "type": "email", "subject": "Checking in", "content": "We wanted to check in and see how you are doing..."},
     {"step": 3, "delay_days": 90, "type": "email", "subject": "Support resources", "content": "Here are some resources that may help..."}
   ]'::jsonb,
   true)
ON CONFLICT DO NOTHING;

-- Insert sample integrations
INSERT INTO integrations (name, type, status, config)
VALUES
  ('Axxess', 'ehr', 'inactive', '{"api_url": "https://api.axxess.com", "sync_frequency": "hourly"}'::jsonb),
  ('PointClickCare', 'ehr', 'inactive', '{"api_url": "https://api.pointclickcare.com", "sync_frequency": "daily"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert sample notification preferences
INSERT INTO notification_preferences (notification_type, email_enabled, sms_enabled, push_enabled)
VALUES
  ('visit_scheduled', true, true, true),
  ('visit_completed', true, true, true),
  ('message_received', true, true, true),
  ('delivery_updated', true, true, false),
  ('supply_fulfilled', true, false, false)
ON CONFLICT DO NOTHING;

-- Insert sample branding config
INSERT INTO branding_config (organization_name, tagline, support_email, support_phone, primary_color, secondary_color, accent_color, background_color)
VALUES
  ('Your Hospice Agency', 'Compassionate care, always connected', 'support@youragency.com', '+1 (555) 123-4567', '#7A9B8E', '#D4876F', '#B8A9D4', '#FAF8F5')
ON CONFLICT DO NOTHING;

-- Insert sample onboarding progress
INSERT INTO onboarding_progress (steps_completed, current_step, completed)
VALUES
  ('[1, 2]'::jsonb, 3, false)
ON CONFLICT DO NOTHING;

-- Insert sample AI insights
INSERT INTO ai_insights (insight_type, title, description, impact, data, status)
VALUES
  ('optimization', 'Optimize Visit Scheduling', 'AI detected that scheduling visits between 2-4 PM increases completion rates by 15%', 'High', '{"completion_rate_increase": 15, "optimal_time": "2-4 PM"}'::jsonb, 'active'),
  ('engagement', 'Improve Message Response Time', 'Messages with quick responses (< 1 hour) have 23% higher satisfaction scores', 'High', '{"satisfaction_increase": 23, "target_response_time": "< 1 hour"}'::jsonb, 'active')
ON CONFLICT DO NOTHING;

-- Insert sample health metrics
INSERT INTO health_metrics (metric_name, metric_value, unit, status)
VALUES
  ('cpu_usage', 23, '%', 'healthy'),
  ('memory_usage', 45, '%', 'healthy'),
  ('disk_usage', 62, '%', 'healthy'),
  ('api_response_time', 145, 'ms', 'healthy'),
  ('database_performance', 98.5, '%', 'healthy'),
  ('error_rate', 0.02, '%', 'healthy')
ON CONFLICT DO NOTHING;

-- Insert sample reports
INSERT INTO reports (name, type, description, frequency, config)
VALUES
  ('Monthly Performance Report', 'performance', 'Comprehensive overview of agency performance metrics', 'Monthly', '{}'::jsonb),
  ('Family Engagement Report', 'engagement', 'Family portal usage and engagement analytics', 'Weekly', '{}'::jsonb),
  ('Message Queue Report', 'messages', 'Message handling and response time analytics', 'Daily', '{}'::jsonb),
  ('Supply & Delivery Report', 'supply', 'Supply request fulfillment and delivery tracking', 'Weekly', '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert sample analytics events
INSERT INTO analytics_events (event_type, patient_id, metadata)
SELECT 
  'page_view',
  p.id,
  '{"page": "/family/dashboard"}'::jsonb
FROM patients p
LIMIT 3;

INSERT INTO analytics_events (event_type, patient_id, metadata)
SELECT 
  'message_sent',
  p.id,
  '{"topic": "general"}'::jsonb
FROM patients p
LIMIT 2;
