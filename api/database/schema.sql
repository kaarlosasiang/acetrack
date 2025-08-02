-- School Organization Attendance API Database Schema

-- Student Organizations table
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10),
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    status ENUM('active', 'inactive', 'suspended', 'expired') DEFAULT 'active',
    subscription_start DATE,
    subscription_end DATE,
    is_owner BOOLEAN DEFAULT FALSE, -- For ACES organization
    logo VARCHAR(255), -- Logo file path
    banner VARCHAR(255), -- Banner file path
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_subscription (subscription_end),
    INDEX idx_is_owner (is_owner)
);

-- Academic Years table
CREATE TABLE academic_years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "2023-2024"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_current (is_current),
    INDEX idx_dates (start_date, end_date)
);

-- Academic Programs/Courses table
CREATE TABLE programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL, -- e.g., "Computer Science", "Business Administration"
    code VARCHAR(20), -- e.g., "CS", "BA"
    description TEXT,
    duration_years INT DEFAULT 4,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_code (code)
);

-- Class Sections table
CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    program_id INT NOT NULL,
    year_level INT NOT NULL, -- 1st year, 2nd year, etc.
    section_name VARCHAR(50) NOT NULL, -- A, B, C, etc.
    capacity INT DEFAULT 50,
    adviser_id INT, -- Teacher/Faculty member
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_section (organization_id, academic_year_id, program_id, year_level, section_name),
    INDEX idx_organization (organization_id),
    INDEX idx_academic_year (academic_year_id),
    INDEX idx_program (program_id)
);

-- Subscription Payments table
CREATE TABLE subscription_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method ENUM('cash', 'check', 'bank_transfer', 'other') NOT NULL,
    payment_date DATE NOT NULL,
    subscription_start DATE NOT NULL,
    subscription_end DATE NOT NULL,
    receipt_number VARCHAR(100),
    receipt_image VARCHAR(255), -- Receipt image file path
    notes TEXT,
    processed_by INT, -- Admin who processed the payment
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_subscription_period (subscription_start, subscription_end)
);

-- Event Types table
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL, -- e.g., "General Meeting", "Workshop", "Social Event"
    description TEXT,
    color VARCHAR(7), -- Hex color for UI (e.g., #FF5733)
    default_duration_minutes INT DEFAULT 120, -- Default event duration
    requires_attendance BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_type_name (organization_id, name),
    INDEX idx_organization (organization_id),
    INDEX idx_status (status)
);

-- Events table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    event_type_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    about TEXT, -- About this event section
    location VARCHAR(255),
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    max_attendees INT,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline DATETIME,
    created_by INT NOT NULL, -- User who created the event
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
    banner VARCHAR(255), -- Event banner image
    speakers JSON, -- Array of speakers with details
    topics JSON, -- Array of topics/tags
    attendance_code VARCHAR(10), -- Optional code for students to mark their own attendance
    qr_code_data TEXT, -- QR code data for attendance marking
    instructions TEXT, -- Special instructions for attendees
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_event_type (event_type_id),
    INDEX idx_start_datetime (start_datetime),
    INDEX idx_status (status),
    INDEX idx_attendance_code (attendance_code)
);

-- Event Registrations table (for events that require registration)
CREATE TABLE event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'waitlisted', 'cancelled') DEFAULT 'registered',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_registration (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- Users table (Students and Staff)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    student_id VARCHAR(50), -- School ID number
    section_id INT, -- Current section enrollment
    user_type ENUM('student', 'teacher', 'admin', 'staff') DEFAULT 'student',
    birth_date DATE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    parent_guardian_name VARCHAR(255),
    parent_guardian_phone VARCHAR(20),
    status ENUM('active', 'inactive', 'graduated', 'transferred', 'dropped') DEFAULT 'active',
    avatar VARCHAR(255),
    enrollment_date DATE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    UNIQUE KEY unique_email_organization (email, organization_id),
    UNIQUE KEY unique_student_id_organization (student_id, organization_id),
    INDEX idx_organization (organization_id),
    INDEX idx_email (email),
    INDEX idx_student_id (student_id),
    INDEX idx_section (section_id),
    INDEX idx_status (status),
    INDEX idx_user_type (user_type)
);

-- Add foreign key for section adviser
ALTER TABLE sections ADD FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL;

-- Roles table for RBAC
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON,
    is_system BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_name_organization (name, organization_id),
    INDEX idx_organization (organization_id),
    INDEX idx_name (name)
);

-- User roles junction table
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id)
);

-- Attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NOT NULL,
    section_id INT, -- Which section/class was attended
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
    attendance_type ENUM('regular', 'meeting', 'event', 'activity') DEFAULT 'regular',
    notes TEXT,
    location VARCHAR(255),
    marked_by INT, -- Who marked the attendance (teacher/admin)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_date_type (user_id, date, attendance_type),
    INDEX idx_user_organization (user_id, organization_id),
    INDEX idx_date (date),
    INDEX idx_section_date (section_id, date),
    INDEX idx_status (status)
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_token (token)
);

-- Activity logs table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    organization_id INT,
    action VARCHAR(255) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_organization (organization_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- Insert default system roles for school organizations
INSERT INTO roles (organization_id, name, description, is_system, permissions) VALUES
(NULL, 'super_admin', 'System Super Administrator', TRUE, '["*"]'),

-- Organization-specific roles for student organizations
(1, 'adviser', 'Organization Adviser - Faculty mentor with full oversight', TRUE, '["users.*", "attendance.*", "events.*", "reports.*", "roles.read", "payments.read", "organization.update"]'),
(1, 'co_adviser', 'Organization Co-Adviser - Assistant faculty mentor', TRUE, '["users.read", "users.update", "attendance.*", "events.*", "reports.read"]'),
(1, 'governor', 'Governor - Highest student leadership position', TRUE, '["users.*", "attendance.*", "events.*", "reports.*", "roles.read", "payments.create", "payments.update"]'),
(1, 'vice_governor', 'Vice Governor - Second highest student leadership', TRUE, '["users.read", "users.update", "attendance.*", "events.*", "reports.*"]'),
(1, 'secretary', 'Secretary - Records and documentation management', TRUE, '["users.read", "attendance.read", "attendance.create", "events.*", "reports.create"]'),
(1, 'treasurer', 'Treasurer - Financial management', TRUE, '["users.read", "payments.*", "reports.financial", "events.read"]'),
(1, 'auditor', 'Auditor - Financial oversight and compliance', TRUE, '["users.read", "payments.read", "reports.*", "attendance.read"]'),
(1, 'business_manager', 'Business Manager - External relations and partnerships', TRUE, '["users.read", "events.*", "payments.read", "reports.read"]'),
(1, 'pio', 'Public Information Officer - Communications and media', TRUE, '["users.read", "events.*", "reports.read"]'),
(1, 'student', 'Student Member - Basic member access', TRUE, '["attendance.own", "events.register", "profile.*"]');

-- Insert default organizations
INSERT INTO organizations (name, abbreviation, description, contact_email, status, is_owner) VALUES
('Association of Computing and Engineering Students (ACES)', 'ACES', 'The premier organization for computing and engineering students with lifetime access to all features.', 'admin@aces.edu', 'active', TRUE),
('System Administration', 'SYS', 'System administration organization', 'admin@system.local', 'active', FALSE);

-- Insert default super admin user (password: admin123)
INSERT INTO users (organization_id, first_name, last_name, email, password, user_type, status) VALUES
(2, 'Super', 'Admin', 'admin@system.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active');

-- Assign super admin role
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1);

-- Create indexes for performance
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_organization_date ON attendance(organization_id, date);
CREATE INDEX idx_users_organization_status ON users(organization_id, status);
CREATE INDEX idx_roles_organization_status ON roles(organization_id, status);
CREATE INDEX idx_sections_organization_year ON sections(organization_id, academic_year_id);

