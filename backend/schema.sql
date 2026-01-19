-- Production Backend Database Schema
-- Data Science Club Portal
-- Generated: 2026-01-18

-- Drop existing tables if they exist (for clean migration)
-- WARNING: This will delete all data. Backup first!
DROP TABLE IF EXISTS used_nonces;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS qr_sessions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS study_materials;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

-- Users table with enhanced security
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- UUID as string for SQLite
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT CHECK(role IN ('STUDENT', 'ADMIN')), -- NULL until approved
    is_active INTEGER DEFAULT 0 NOT NULL, -- Boolean (0=false, 1=true)
    created_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    last_login_at TEXT,
    
    CHECK (email GLOB '*@*.*')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Approval requests for signup workflow
CREATE TABLE approval_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT')) NOT NULL,
    requested_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    expires_at TEXT NOT NULL,
    decided_at TEXT,
    decided_by TEXT REFERENCES users(id),
    approved_role TEXT CHECK(approved_role IN ('STUDENT', 'ADMIN')),
    rejection_reason TEXT,
    
    UNIQUE(user_id) -- Only one pending request per user
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_expires ON approval_requests(expires_at);
CREATE INDEX idx_approval_requests_user ON approval_requests(user_id);

-- Events table
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    is_deleted INTEGER DEFAULT 0 NOT NULL,
    deleted_at TEXT,
    notes TEXT -- Admin notes/resources
);

CREATE INDEX idx_events_scheduled ON events(scheduled_at);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_active ON events(is_deleted) WHERE is_deleted = 0;

-- QR Sessions table (critical for anti-cheat)
CREATE TABLE qr_sessions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    session_token TEXT UNIQUE NOT NULL,
    token_signature TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    expires_at TEXT NOT NULL,
    is_revoked INTEGER DEFAULT 0 NOT NULL,
    revoked_at TEXT,
    nonce TEXT UNIQUE NOT NULL,
    
    CHECK (expires_at > created_at)
);

CREATE INDEX idx_qr_sessions_token ON qr_sessions(session_token);
CREATE INDEX idx_qr_sessions_expiry ON qr_sessions(expires_at);
CREATE INDEX idx_qr_sessions_event ON qr_sessions(event_id);
CREATE INDEX idx_qr_sessions_nonce ON qr_sessions(nonce);
CREATE INDEX idx_qr_sessions_active ON qr_sessions(is_revoked, expires_at) WHERE is_revoked = 0;

-- Attendance records
CREATE TABLE attendance_records (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    qr_session_id TEXT NOT NULL REFERENCES qr_sessions(id),
    marked_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    
    UNIQUE(event_id, user_id) -- One attendance per user per event
);

CREATE INDEX idx_attendance_event ON attendance_records(event_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_marked_at ON attendance_records(marked_at);

-- Used nonces (replay attack prevention)
CREATE TABLE used_nonces (
    nonce TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    used_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    
    UNIQUE(nonce, user_id)
);

CREATE INDEX idx_used_nonces_expiry ON used_nonces(used_at);

-- Audit logs (comprehensive logging)
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Nullable for system actions
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    meta_data TEXT, -- JSON string (renamed from 'metadata' to avoid SQLAlchemy conflict)
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    notification_data TEXT, -- JSON string (renamed to avoid conflicts)
    is_read INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL,
    read_at TEXT
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Study materials (keeping existing structure)
CREATE TABLE study_materials (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    uploaded_at TEXT DEFAULT (datetime('now', 'utc')) NOT NULL
);

CREATE INDEX idx_materials_event ON study_materials(event_id);

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now', 'utc')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_events_updated_at 
AFTER UPDATE ON events
BEGIN
    UPDATE events SET updated_at = datetime('now', 'utc')
    WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW v_active_users AS
SELECT id, email, full_name, role, created_at, last_login_at
FROM users
WHERE is_active = 1 AND role IS NOT NULL;

CREATE VIEW v_pending_approvals AS
SELECT 
    ar.id as approval_id,
    ar.requested_at,
    ar.expires_at,
    ar.status,
    u.id as user_id,
    u.email,
    u.full_name,
    CAST((julianday(ar.expires_at) - julianday('now', 'utc')) * 86400 AS INTEGER) as seconds_remaining
FROM approval_requests ar
JOIN users u ON ar.user_id = u.id
WHERE ar.status = 'pending';

CREATE VIEW v_event_attendance_summary AS
SELECT 
    e.id as event_id,
    e.title,
    e.scheduled_at,
    e.is_deleted,
    COUNT(DISTINCT ar.user_id) as attendance_count,
    (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1) as total_students,
    ROUND(COUNT(DISTINCT ar.user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = 1), 2) as attendance_rate
FROM events e
LEFT JOIN attendance_records ar ON e.id = ar.event_id
GROUP BY e.id, e.title, e.scheduled_at, e.is_deleted;

-- Stored procedures (SQLite doesn't support them, but here's the logic)
-- These should be implemented in the application layer

-- Procedure: timeout_expired_approvals()
-- Run every 30 seconds via background job
-- UPDATE approval_requests 
-- SET status = 'timeout', decided_at = datetime('now', 'utc')
-- WHERE status = 'pending' AND expires_at < datetime('now', 'utc');

-- Procedure: cleanup_old_nonces()
-- Run every hour
-- DELETE FROM used_nonces 
-- WHERE used_at < datetime('now', 'utc', '-1 hour');

-- Procedure: cleanup_old_audit_logs()
-- Run monthly (optional, for archiving)
-- Archive to cold storage, then:
-- DELETE FROM audit_logs 
-- WHERE created_at < datetime('now', 'utc', '-6 months');

-- Insert initial admin user (will be overridden by application if ADMIN_EMAIL/PASSWORD are set)
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (id, email, full_name, hashed_password, role, is_active, created_at)
VALUES (
    'admin-default-uuid',
    'admin@dsclub.com',
    'Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5yvLx1RqQqRqW', -- bcrypt hash of 'Admin@123'
    'ADMIN',
    1,
    datetime('now', 'utc')
);

-- Verification queries (run after migration)
-- SELECT 'Users:', COUNT(*) FROM users;
-- SELECT 'Events:', COUNT(*) FROM events;
-- SELECT 'Pending Approvals:', COUNT(*) FROM approval_requests WHERE status = 'pending';
-- SELECT 'Active QR Sessions:', COUNT(*) FROM qr_sessions WHERE is_revoked = 0 AND expires_at > datetime('now', 'utc');
-- SELECT 'Total Attendance:', COUNT(*) FROM attendance_records;
-- SELECT 'Audit Logs:', COUNT(*) FROM audit_logs;
