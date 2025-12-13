CREATE TYPE user_role AS ENUM ('family_admin', 'family_member', 'agency_admin', 'agency_staff');
CREATE TYPE visit_status AS ENUM ('scheduled', 'en_route', 'in_progress', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE delivery_status AS ENUM ('ordered', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception');
CREATE TYPE supply_request_status AS ENUM ('pending', 'approved', 'fulfilled', 'cancelled');
CREATE TYPE patient_status AS ENUM ('active', 'discharged', 'deceased');

CREATE TABLE IF NOT EXISTS agencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#7A9B8E',
    secondary_color text DEFAULT '#D4876F',
    accent_color text DEFAULT '#B8A9D4',
    custom_domain text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agency_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, agency_id)
);

CREATE TABLE IF NOT EXISTS patients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    status patient_status DEFAULT 'active',
    admission_date date,
    address text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    relationship text,
    is_primary_contact boolean DEFAULT false,
    preferred_language text DEFAULT 'en',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, patient_id)
);

CREATE TABLE IF NOT EXISTS care_team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL,
    discipline text,
    photo_url text,
    phone text,
    email text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_care_team (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    care_team_member_id uuid REFERENCES care_team_members(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    UNIQUE(patient_id, care_team_member_id)
);

CREATE TABLE IF NOT EXISTS visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    care_team_member_id uuid REFERENCES care_team_members(id) ON DELETE CASCADE,
    scheduled_date date NOT NULL,
    scheduled_time_start time,
    scheduled_time_end time,
    status visit_status DEFAULT 'scheduled',
    discipline text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type text NOT NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    subject text,
    body text NOT NULL,
    topic_tag text,
    status message_status DEFAULT 'sent',
    priority message_priority DEFAULT 'normal',
    parent_message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text,
    file_size integer,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    carrier text,
    tracking_number text,
    status delivery_status DEFAULT 'ordered',
    estimated_delivery_date date,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supply_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    items jsonb NOT NULL,
    status supply_request_status DEFAULT 'pending',
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    fulfilled_at timestamptz,
    delivery_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS education_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    content text,
    thumbnail_url text,
    estimated_minutes integer,
    language text DEFAULT 'en',
    category text,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS module_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id uuid REFERENCES education_modules(id) ON DELETE CASCADE,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, module_id)
);

CREATE TABLE IF NOT EXISTS visit_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id uuid REFERENCES visits(id) ON DELETE CASCADE,
    submitted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    flagged_for_followup boolean DEFAULT false,
    followed_up_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    followed_up_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    language text DEFAULT 'en',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bereavement_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    sequence jsonb NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bereavement_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES bereavement_campaigns(id) ON DELETE CASCADE,
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
    enrolled_at timestamptz DEFAULT now(),
    current_step integer DEFAULT 0,
    completed boolean DEFAULT false
);

CREATE INDEX idx_agency_users_user_id ON agency_users(user_id);
CREATE INDEX idx_agency_users_agency_id ON agency_users(agency_id);
CREATE INDEX idx_patients_agency_id ON patients(agency_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_patient_id ON family_members(patient_id);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_scheduled_date ON visits(scheduled_date);
CREATE INDEX idx_messages_patient_id ON messages(patient_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_deliveries_patient_id ON deliveries(patient_id);
CREATE INDEX idx_supply_requests_patient_id ON supply_requests(patient_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
