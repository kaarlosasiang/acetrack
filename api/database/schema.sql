-- Multi-Organization Student Attendance Tracking System - MySQL Schema
-- This schema replaces the existing structure with simplified, focused entities

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS scan_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
SET FOREIGN_KEY_CHECKS = 1;

-- Organizations table (simplified multi-tenant structure)
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    logo VARCHAR(255), -- Logo file path
    
    -- Subscription management
    is_default_tenant BOOLEAN DEFAULT FALSE, -- For ACES organization
    subscription_start DATE,
    subscription_end DATE,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_subscription (subscription_end),
    INDEX idx_default_tenant (is_default_tenant)
);

-- Roles table (simplified role structure per organization)
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name ENUM('super_admin', 'org_admin', 'staff', 'viewer', 'student') NOT NULL,
    description TEXT,
    
    -- Permissions as JSON for flexibility
    permissions JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_per_org (organization_id, name),
    INDEX idx_organization (organization_id)
);

-- Users table (students and staff)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    
    -- Basic info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Student-specific fields
    student_id VARCHAR(50), -- Student ID number
    course VARCHAR(100), -- Course/Program name
    year_level INT, -- 1, 2, 3, 4, etc.
    
    -- Status and approval
    user_type ENUM('student', 'staff') DEFAULT 'student',
    status ENUM('pending', 'active', 'inactive', 'suspended') DEFAULT 'pending',
    approved_by INT, -- ID of org admin who approved
    approved_at TIMESTAMP NULL,
    
    -- QR Code for attendance
    qr_code_static VARCHAR(255) UNIQUE, -- Static QR code identifier
    qr_last_generated TIMESTAMP NULL, -- For dynamic QR tracking
    
    -- Profile
    avatar VARCHAR(255),
    birth_date DATE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Metadata
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_organization (organization_id),
    INDEX idx_email (email),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status),
    INDEX idx_user_type (user_type),
    INDEX idx_qr_code (qr_code_static),
    INDEX idx_course_year (course, year_level)
);

-- User roles assignment
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id)
);

-- Events table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    
    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    about TEXT, -- Detailed about section
    location VARCHAR(255),
    banner VARCHAR(255), -- Event banner image
    
    -- Event timing
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    
    -- Event metadata
    speakers JSON, -- Array of speaker objects {name, title, bio, photo}
    topics JSON, -- Array of topics/tags
    
    -- Event management
    created_by INT NOT NULL, -- Org Admin who created
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
    max_attendees INT,
    
    -- Attendance tracking
    attendance_required BOOLEAN DEFAULT TRUE,
    check_in_window_minutes INT DEFAULT 30, -- Minutes before start time when check-in opens
    check_out_window_minutes INT DEFAULT 60, -- Minutes after end time when check-out closes
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_organization (organization_id),
    INDEX idx_start_datetime (start_datetime),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Core attendance data
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    organization_id INT NOT NULL,
    
    -- Attendance tracking
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    scanned_by INT, -- Staff member who scanned
    
    -- Status tracking
    status ENUM('checked_in', 'checked_out', 'incomplete', 'absent') DEFAULT 'absent',
    duration_minutes INT DEFAULT 0, -- Calculated attendance duration
    
    -- Additional data
    notes TEXT,
    ip_address VARCHAR(45), -- For security tracking
    device_info VARCHAR(255), -- Device used for scanning
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    UNIQUE KEY unique_student_event (student_id, event_id),
    
    -- Indexes
    INDEX idx_student (student_id),
    INDEX idx_event (event_id),
    INDEX idx_organization (organization_id),
    INDEX idx_status (status),
    INDEX idx_check_in_time (check_in_time),
    INDEX idx_scanned_by (scanned_by)
);

-- Password reset tokens
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL, -- Hashed version for security
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_token (token),
    INDEX idx_user (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT, -- NULL for organization-wide notifications
    
    -- Notification details
    type ENUM('event_alert', 'registration_approval', 'attendance_result', 'subscription_expiry', 'system_announcement') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Notification data
    data JSON, -- Additional notification data (event_id, etc.)
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Delivery
    sent_via ENUM('in_app', 'email', 'sms') DEFAULT 'in_app',
    sent_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_organization (organization_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Scan logs for security and auditing
CREATE TABLE scan_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    
    -- Scan attempt details
    scanned_by INT, -- Staff member attempting scan
    student_id INT, -- Student being scanned (if valid)
    event_id INT, -- Event context
    
    -- QR Code data
    qr_code_data TEXT NOT NULL, -- The actual QR code content
    qr_type ENUM('static', 'dynamic') NOT NULL,
    
    -- Scan result
    scan_result ENUM('success', 'invalid_qr', 'expired_qr', 'student_not_found', 'event_not_active', 'already_checked_in', 'already_checked_out', 'permission_denied', 'rate_limited') NOT NULL,
    scan_action ENUM('check_in', 'check_out') NOT NULL,
    
    -- Security data
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info VARCHAR(255),
    
    -- Rate limiting
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    
    -- Indexes for performance and security analysis
    INDEX idx_organization (organization_id),
    INDEX idx_scanned_by (scanned_by),
    INDEX idx_student (student_id),
    INDEX idx_event (event_id),
    INDEX idx_scan_result (scan_result),
    INDEX idx_scan_timestamp (scan_timestamp),
    INDEX idx_ip_address (ip_address),
    INDEX idx_rate_limiting (scanned_by, scan_timestamp) -- For rate limiting queries
);

-- Insert default ACES organization
INSERT INTO organizations (name, abbreviation, contact_email, is_default_tenant, status) VALUES 
('Association of Computing and Engineering Students', 'ACES', 'admin@aces.edu', TRUE, 'active');

-- Create default roles for ACES organization
INSERT INTO roles (organization_id, name, description, permissions) VALUES 
(1, 'super_admin', 'System Super Administrator', '["*"]'),
(1, 'org_admin', 'Organization Administrator', '["users.approve", "events.create", "events.manage", "staff.assign", "reports.view", "notifications.send"]'),
(1, 'staff', 'Staff Member', '["attendance.scan", "students.view", "events.view"]'),
(1, 'viewer', 'Read-only Viewer', '["events.view", "attendance.view_own"]'),
(1, 'student', 'Student', '["profile.update", "events.view", "attendance.view_own"]');

-- Create default super admin user
INSERT INTO users (organization_id, first_name, last_name, email, password, user_type, status, qr_code_static) VALUES 
(1, 'Super', 'Admin', 'admin@aces.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', 'active', UUID());

-- Assign super_admin role to the default user
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES 
(1, 1, 1);

-- Create triggers for automatic QR code generation
DELIMITER //
CREATE TRIGGER before_user_insert 
BEFORE INSERT ON users 
FOR EACH ROW 
BEGIN 
    IF NEW.qr_code_static IS NULL THEN
        SET NEW.qr_code_static = UUID();
    END IF;
END//
DELIMITER ;

-- Create trigger for attendance duration calculation
DELIMITER //
CREATE TRIGGER after_attendance_update 
BEFORE UPDATE ON attendance 
FOR EACH ROW 
BEGIN 
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        SET NEW.duration_minutes = TIMESTAMPDIFF(MINUTE, NEW.check_in_time, NEW.check_out_time);
        
        IF NEW.check_out_time > NEW.check_in_time THEN
            SET NEW.status = 'checked_out';
        END IF;
    ELSEIF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NULL THEN
        SET NEW.status = 'checked_in';
    END IF;
END//
DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_attendance_stats ON attendance (organization_id, status, check_in_time);
CREATE INDEX idx_user_approval ON users (organization_id, status, approved_at);
CREATE INDEX idx_event_timing ON events (organization_id, start_datetime, end_datetime, status);

-- Create views for common queries
CREATE VIEW active_students AS
SELECT u.*, o.name as organization_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.user_type = 'student' AND u.status = 'active';

CREATE VIEW event_attendance_summary AS
SELECT 
    e.id as event_id,
    e.title as event_title,
    e.organization_id,
    COUNT(a.id) as total_attendees,
    COUNT(CASE WHEN a.status = 'checked_out' THEN 1 END) as completed_attendance,
    COUNT(CASE WHEN a.status = 'checked_in' THEN 1 END) as incomplete_attendance,
    AVG(a.duration_minutes) as avg_duration_minutes
FROM events e
LEFT JOIN attendance a ON e.id = a.event_id
GROUP BY e.id, e.title, e.organization_id;

COMMIT;
