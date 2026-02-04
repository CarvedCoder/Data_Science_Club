-- =============================================================================
-- Supabase PostgreSQL Schema for DS Club Portal
-- Run this in Supabase SQL Editor to initialize the database
-- =============================================================================

-- WARNING: This will DROP all existing tables and data!
-- Make sure to backup any important data before running this script.

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS used_nonces CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS qr_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'timeout');
CREATE TYPE event_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role,  -- NULL until approved
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ,
    
    -- Profile fields
    section VARCHAR(50),
    branch VARCHAR(100),
    year VARCHAR(20),
    bio TEXT,
    skills TEXT  -- Stored as comma-separated values
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- APPROVAL REQUESTS TABLE
-- =============================================================================

CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status approval_status DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id),
    approved_role VARCHAR(20),
    rejection_reason TEXT,
    
    UNIQUE(user_id)  -- Only one pending request per user
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_expires ON approval_requests(expires_at);
CREATE INDEX idx_approval_requests_user ON approval_requests(user_id);

-- =============================================================================
-- EVENTS TABLE
-- =============================================================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_events_scheduled ON events(scheduled_at);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_active ON events(is_deleted) WHERE is_deleted = FALSE;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- QR SESSIONS TABLE (Anti-cheat attendance)
-- =============================================================================

CREATE TABLE qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    session_token VARCHAR(512) UNIQUE NOT NULL,
    token_signature VARCHAR(512) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    revoked_at TIMESTAMPTZ,
    nonce VARCHAR(64) UNIQUE NOT NULL,
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_qr_sessions_token ON qr_sessions(session_token);
CREATE INDEX idx_qr_sessions_expiry ON qr_sessions(expires_at);
CREATE INDEX idx_qr_sessions_event ON qr_sessions(event_id);
CREATE INDEX idx_qr_sessions_nonce ON qr_sessions(nonce);
CREATE INDEX idx_qr_sessions_active ON qr_sessions(is_revoked, expires_at) WHERE is_revoked = FALSE;

-- =============================================================================
-- ATTENDANCE RECORDS TABLE
-- =============================================================================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    user_id UUID NOT NULL REFERENCES users(id),
    qr_session_id UUID NOT NULL REFERENCES qr_sessions(id),
    marked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(45),  -- IPv6 compatible
    user_agent TEXT,
    
    UNIQUE(event_id, user_id)  -- One attendance per user per event
);

CREATE INDEX idx_attendance_event ON attendance_records(event_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_marked_at ON attendance_records(marked_at);

-- =============================================================================
-- USED NONCES TABLE (Replay attack prevention)
-- =============================================================================

CREATE TABLE used_nonces (
    nonce VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    PRIMARY KEY (nonce, user_id)
);

CREATE INDEX idx_used_nonces_expiry ON used_nonces(used_at);

-- =============================================================================
-- STUDY MATERIALS TABLE
-- =============================================================================

CREATE TABLE study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_materials_event ON study_materials(event_id);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- Nullable for system actions
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    meta_data JSONB,  -- Native JSON support in PostgreSQL
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_data JSONB,  -- Native JSON support
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- =============================================================================
-- ROW LEVEL SECURITY (Optional - Enable if using Supabase Auth)
-- =============================================================================

-- Enable RLS on tables (uncomment if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CLEANUP FUNCTION (for expired nonces)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM used_nonces WHERE used_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- You can schedule this with pg_cron or call it periodically from the backend

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
