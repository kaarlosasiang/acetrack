-- AceTrack Attendance System Database Schema
-- Generated for MySQL/MariaDB

-- Create database
CREATE DATABASE IF NOT EXISTS acetrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE acetrack;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_picture VARCHAR(255),
    role ENUM('admin', 'organization_admin', 'member') DEFAULT 'member',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_email_verification_token (email_verification_token),
    INDEX idx_password_reset_token (password_reset_token)
);

-- Organizations table
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type ENUM('club', 'society', 'department', 'committee', 'association') NOT NULL,
    logo VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    website VARCHAR(255),
    admin_user_id INT NOT NULL,
    qr_code VARCHAR(255),
    status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_name (name)
);

-- Organization members table (many-to-many relationship)
CREATE TABLE organization_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member', 'officer') DEFAULT 'member',
    join_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_org_user (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Events table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    max_attendees INT,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline DATETIME,
    qr_code VARCHAR(255),
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_event_date (event_date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_event_datetime (event_date, start_time)
);

-- Event registrations table
CREATE TABLE event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'cancelled', 'waitlisted') DEFAULT 'registered',
    notes TEXT,
    
    UNIQUE KEY unique_event_user (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- Attendance records table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
    check_in_method ENUM('qr_code', 'manual', 'facial_recognition') DEFAULT 'qr_code',
    notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_event_user_attendance (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_check_in_time (check_in_time),
    INDEX idx_event_date_status (event_id, status)
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    plan_type ENUM('basic', 'premium', 'enterprise') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'expired', 'cancelled', 'pending') DEFAULT 'pending',
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(100),
    receipt_file VARCHAR(255),
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    auto_renewal BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_organization (organization_id),
    INDEX idx_status (status),
    INDEX idx_plan_type (plan_type),
    INDEX idx_end_date (end_date),
    INDEX idx_verified_by (verified_by)
);

-- Files table (for document and image management)
CREATE TABLE files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    uploaded_by INT NOT NULL,
    upload_type ENUM('profile_picture', 'organization_logo', 'receipt', 'document', 'other') DEFAULT 'other',
    entity_id INT NULL, -- ID of the related entity (user, organization, etc.)
    entity_type VARCHAR(50) NULL, -- Type of related entity
    status ENUM('active', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_upload_type (upload_type),
    INDEX idx_entity (entity_id, entity_type),
    INDEX idx_status (status),
    INDEX idx_filename (filename)
);

-- Security logs table (for audit trails and security monitoring)
CREATE TABLE security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(200),
    method VARCHAR(10),
    status_code INT,
    details JSON,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_action (action),
    INDEX idx_risk_level (risk_level),
    INDEX idx_created_at (created_at),
    INDEX idx_status_code (status_code)
);

-- JWT token blacklist table (for token revocation)
CREATE TABLE jwt_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL, -- JWT ID claim
    user_id INT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(200),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_token_jti (token_jti),
    INDEX idx_user (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Rate limiting table (for API rate limiting)
CREATE TABLE rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    requests_count INT DEFAULT 1,
    window_start TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_ip_endpoint_window (ip_address, endpoint, window_start),
    INDEX idx_ip_address (ip_address),
    INDEX idx_endpoint (endpoint),
    INDEX idx_window_start (window_start)
);

-- Email logs table (for tracking email communications)
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    user_id INT NULL,
    organization_id INT NULL,
    event_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    INDEX idx_recipient (recipient_email),
    INDEX idx_status (status),
    INDEX idx_template (template_name),
    INDEX idx_sent_at (sent_at),
    INDEX idx_user (user_id),
    INDEX idx_organization (organization_id),
    INDEX idx_event (event_id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified, status) VALUES
('System', 'Administrator', 'admin@acetrack.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE, 'active');

-- Create indexes for performance optimization
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
CREATE INDEX idx_events_date_status ON events(event_date, status);
CREATE INDEX idx_attendance_checkin_time ON attendance(check_in_time);
CREATE INDEX idx_subscriptions_dates ON subscriptions(start_date, end_date);

-- Create views for common queries
CREATE VIEW active_organizations AS
SELECT o.*, u.first_name as admin_first_name, u.last_name as admin_last_name, u.email as admin_email
FROM organizations o
JOIN users u ON o.admin_user_id = u.id
WHERE o.status = 'active';

CREATE VIEW upcoming_events AS
SELECT e.*, o.name as organization_name
FROM events e
JOIN organizations o ON e.organization_id = o.id
WHERE e.event_date >= CURDATE() AND e.status IN ('published', 'ongoing');

CREATE VIEW organization_member_counts AS
SELECT 
    o.id,
    o.name,
    COUNT(om.id) as total_members,
    COUNT(CASE WHEN om.status = 'active' THEN 1 END) as active_members
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name;

-- Insert sample data for testing (optional)
/*
-- Sample organizations
INSERT INTO organizations (name, description, type, admin_user_id, contact_email, status) VALUES
('Computer Science Club', 'A club for CS students and enthusiasts', 'club', 1, 'cs.club@university.edu', 'active'),
('Student Council', 'University student representative body', 'committee', 1, 'student.council@university.edu', 'active');

-- Sample events
INSERT INTO events (organization_id, title, description, event_date, start_time, end_time, location, created_by, status) VALUES
(1, 'Coding Workshop', 'Learn Python programming basics', '2024-01-15', '14:00:00', '16:00:00', 'Room 101', 1, 'published'),
(2, 'Monthly Meeting', 'Regular student council meeting', '2024-01-20', '18:00:00', '19:30:00', 'Conference Room', 1, 'published');
*/