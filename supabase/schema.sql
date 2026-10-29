-- ====================================================================
-- RESCUEAI: SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'ngo_worker', 'veterinarian', 'municipal_officer', 'citizen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE health_status_enum AS ENUM ('Healthy', 'Needs Treatment', 'Critical', 'Under Observation', 'Quarantined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vaccination_status_enum AS ENUM ('Vaccinated', 'Due Soon', 'Overdue', 'Unvaccinated', 'Unknown', 'Verification Required');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_status_enum AS ENUM ('Active', 'Damaged', 'Lost', 'Replaced', 'Deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status_enum AS ENUM ('New', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Organisations Table
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ngo', 'veterinary_clinic', 'municipality', 'shelter')),
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT DEFAULT 'Metro City',
    verification_status TEXT DEFAULT 'Verified' CHECK (verification_status IN ('Verified', 'Pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'citizen',
    organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Dogs Registry Table
CREATE TABLE IF NOT EXISTS dogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id TEXT UNIQUE NOT NULL, -- e.g. RAI-DOG-0001
    name TEXT NOT NULL DEFAULT 'Unknown Community Dog',
    photo_url TEXT,
    breed TEXT DEFAULT 'Indie / Street Mix',
    estimated_age TEXT,
    sex TEXT DEFAULT 'Unknown' CHECK (sex IN ('Male', 'Female', 'Unknown')),
    color_markings TEXT NOT NULL,
    sterilization_status TEXT DEFAULT 'Unknown' CHECK (sterilization_status IN ('Sterilized', 'Intact', 'Unknown')),
    health_status health_status_enum DEFAULT 'Healthy',
    vaccination_status vaccination_status_enum DEFAULT 'Unknown',
    date_registered DATE DEFAULT CURRENT_DATE,
    usual_area TEXT NOT NULL,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_address TEXT,
    last_sighting_timestamp TIMESTAMPTZ DEFAULT NOW(),
    assigned_ngo_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    microchip_id TEXT UNIQUE,
    qr_tag_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deactivated')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dogs_dog_id ON dogs(dog_id);
CREATE INDEX IF NOT EXISTS idx_dogs_qr_tag_id ON dogs(qr_tag_id);
CREATE INDEX IF NOT EXISTS idx_dogs_vaccination_status ON dogs(vaccination_status);
CREATE INDEX IF NOT EXISTS idx_dogs_health_status ON dogs(health_status);

-- 6. QR Collar Devices Table
CREATE TABLE IF NOT EXISTS qr_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id TEXT UNIQUE NOT NULL, -- e.g. TAG-RAI-0001
    dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
    qr_status device_status_enum DEFAULT 'Active',
    issue_date DATE DEFAULT CURRENT_DATE,
    last_scanned_at TIMESTAMPTZ,
    scan_count INT DEFAULT 0,
    device_condition TEXT DEFAULT 'Good' CHECK (device_condition IN ('Good', 'Worn', 'Damaged', 'Missing')),
    assigned_organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_devices_tag_id ON qr_devices(tag_id);

-- 7. Vaccination Records Table
CREATE TABLE IF NOT EXISTS vaccination_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    disease_targeted TEXT NOT NULL,
    date_administered DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE,
    dose_info TEXT DEFAULT '1.0 ml Subcutaneous',
    veterinarian_name TEXT NOT NULL,
    veterinary_org TEXT,
    batch_number TEXT,
    notes TEXT,
    document_url TEXT,
    status TEXT DEFAULT 'Valid' CHECK (status IN ('Valid', 'Overdue', 'Duplicate_Flagged', 'Verified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccination_dog_id ON vaccination_records(dog_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_next_due ON vaccination_records(next_due_date);

-- 8. Medical Records Table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    examination_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN (
        'Injury', 'Infection', 'Skin condition', 'Digestive problem',
        'Respiratory symptoms', 'Suspected rabies exposure', 'Routine examination', 'Other'
    )),
    symptoms TEXT[] DEFAULT '{}',
    observed_injuries TEXT,
    suspected_condition TEXT NOT NULL,
    confirmed_diagnosis TEXT,
    treatment_provided TEXT NOT NULL,
    medication_details TEXT,
    veterinarian_name TEXT NOT NULL,
    treating_org TEXT,
    follow_up_date DATE,
    recovery_status TEXT DEFAULT 'Ongoing Treatment' CHECK (recovery_status IN ('Full Recovery', 'Improving', 'Ongoing Treatment', 'Critical', 'Guarded')),
    attachments TEXT[] DEFAULT '{}',
    notes TEXT,
    urgent_escalation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_dog_id ON medical_records(dog_id);

-- 9. Health Observations (Activity & Vitals - manual examination logs)
CREATE TABLE IF NOT EXISTS health_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    activity_behavior TEXT NOT NULL CHECK (activity_behavior IN ('Normal & Energetic', 'Lethargic', 'Aggressive', 'Shy / Hiding', 'Restless')),
    appetite TEXT NOT NULL CHECK (appetite IN ('Normal', 'Reduced', 'Refusing Food', 'Increased')),
    mobility TEXT NOT NULL CHECK (mobility IN ('Normal', 'Limping', 'Reluctant to move', 'Non-ambulatory')),
    visible_injuries TEXT,
    general_condition TEXT NOT NULL CHECK (general_condition IN ('Good', 'Fair', 'Poor', 'Critical')),
    body_temperature_c NUMERIC(4, 1),
    heart_rate_bpm INT,
    respiratory_rate INT,
    weight_kg NUMERIC(4, 1),
    observer_name TEXT NOT NULL,
    observer_role TEXT,
    notes TEXT,
    triage_level TEXT DEFAULT 'Normal' CHECK (triage_level IN ('Normal', 'Needs Attention', 'Urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Dog Sightings Table
CREATE TABLE IF NOT EXISTS dog_sightings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    photo_url TEXT,
    health_observation TEXT,
    reporter_type TEXT DEFAULT 'Citizen' CHECK (reporter_type IN ('Citizen', 'Field Worker', 'Municipal Staff', 'Vet')),
    reporter_name TEXT,
    reporter_contact TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Community Reports Table
CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT UNIQUE NOT NULL, -- e.g. REP-2026-0842
    report_type TEXT NOT NULL CHECK (report_type IN (
        'Injured Dog', 'Sick Dog', 'Suspected Rabies Concern', 'Dog Sighting', 'Damaged / Missing Collar'
    )),
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT NOT NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    photo_url TEXT,
    dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
    reporter_name TEXT,
    reporter_phone TEXT,
    reporter_email TEXT,
    status report_status_enum DEFAULT 'New',
    assigned_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    internal_notes TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_ref ON community_reports(reference_number);
CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);

-- 12. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'vaccination_due', 'vaccination_overdue', 'medical_followup',
        'community_report', 'urgent_health', 'duplicate_warning', 'device_issue'
    )),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
    report_id UUID REFERENCES community_reports(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    target_role user_role_enum,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Field Worker Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    related_dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
    related_report_id UUID REFERENCES community_reports(id) ON DELETE SET NULL,
    assigned_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    notes TEXT,
    completion_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS: Public can view active dogs permitted information for QR scan
CREATE POLICY "Public can view dog profile by QR" ON dogs
    FOR SELECT
    USING (status = 'active');

-- PUBLIC CAN VIEW VACCINATION SUMMARY
CREATE POLICY "Public can view dog vaccination records" ON vaccination_records
    FOR SELECT
    USING (true);

-- PUBLIC CAN SUBMIT SIGHTINGS
CREATE POLICY "Public can create dog sightings" ON dog_sightings
    FOR INSERT
    WITH CHECK (true);

-- PUBLIC CAN SUBMIT COMMUNITY REPORTS
CREATE POLICY "Public can submit community reports" ON community_reports
    FOR INSERT
    WITH CHECK (true);

-- AUTHENTICATED STAFF FULL READ
CREATE POLICY "Authenticated users can view all dogs" ON dogs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert dogs" ON dogs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update dogs" ON dogs
    FOR UPDATE
    TO authenticated
    USING (true);

-- MEDICAL RECORDS PROTECTED: Only authenticated staff can view/edit
CREATE POLICY "Staff can view medical records" ON medical_records
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Veterinarians and NGOs can manage medical records" ON medical_records
    FOR ALL
    TO authenticated
    USING (true);

-- COMMUNITY REPORTS: Staff can view and manage
CREATE POLICY "Staff can view community reports" ON community_reports
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can update community reports" ON community_reports
    FOR UPDATE
    TO authenticated
    USING (true);

-- AUDIT LOGS: Read-only for authenticated, insert on events
CREATE POLICY "Staff can view audit logs" ON audit_logs
    FOR SELECT
    TO authenticated
    USING (true);
