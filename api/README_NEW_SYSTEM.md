# Multi-Organization Student Attendance Tracking System

## Overview
This system has been completely refactored to focus on **multi-organization student attendance tracking** with QR code scanning, role-based access control, and comprehensive security features.

## Key Changes from Previous System

### 🏗️ **Simplified Architecture**
- Removed complex academic structures (programs, sections, academic years)
- Focused on core entities: Organizations, Users, Events, Attendance
- Streamlined role system with 5 predefined roles
- QR code-based attendance with both static and dynamic options

### 🔐 **Enhanced Security**
- Rate limiting for QR code scanning
- Comprehensive scan attempt logging
- Secure password reset with hashed tokens
- JWT-based dynamic QR codes with 60-second expiry

### 👥 **User Management**
- Student self-registration with admin approval workflow
- Simplified user types: `student` and `staff`
- Course and year level tracking for students
- Automatic QR code generation for each student

## Database Schema

### Core Tables
1. **organizations** - Multi-tenant structure with subscription management
2. **users** - Students and staff with approval workflow
3. **roles** - Simplified RBAC with predefined roles
4. **events** - Simplified event management
5. **attendance** - Check-in/check-out tracking with duration calculation
6. **scan_logs** - Security audit trail for all scan attempts
7. **password_resets** - Secure password recovery
8. **notifications** - In-app notification system

## Role System

### Available Roles
1. **super_admin** - System-wide access, can manage all organizations
2. **org_admin** - Organization administrator, can approve students and create events
3. **staff** - Can scan QR codes for attendance
4. **viewer** - Read-only access to events and attendance
5. **student** - Can view own attendance and generate QR codes

### Role Permissions
- **Super Admin**: All permissions (`*`)
- **Org Admin**: `users.approve`, `events.create`, `events.manage`, `staff.assign`, `reports.view`
- **Staff**: `attendance.scan`, `students.view`, `events.view`
- **Viewer**: `events.view`, `attendance.view_own`
- **Student**: `profile.update`, `events.view`, `attendance.view_own`

## API Endpoints

### 🔐 Authentication
```
POST /api/auth/login                    # User login
POST /api/auth/register                 # Student self-registration
POST /api/auth/refresh                  # Refresh access token
POST /api/auth/logout                   # User logout
POST /api/auth/forgot-password          # Request password reset
POST /api/auth/reset-password           # Reset password with token
```

### 🏢 Organizations (Super Admin Only)
```
GET    /api/organizations               # List all organizations
POST   /api/organizations               # Create new organization
GET    /api/organizations/{id}          # Get organization details
PUT    /api/organizations/{id}          # Update organization
DELETE /api/organizations/{id}          # Delete organization
```

### 👥 User Management
```
GET    /api/users                       # List users (Org Admin, Staff)
POST   /api/users                       # Create user (Org Admin)
GET    /api/users/{id}                  # Get user details
PUT    /api/users/{id}                  # Update user (Org Admin, Staff)
DELETE /api/users/{id}                  # Delete user (Org Admin)
POST   /api/users/{id}/approve          # Approve student registration (Org Admin)
```

### 🎉 Event Management
```
GET    /api/events                      # List events
POST   /api/events                      # Create event (Org Admin)
GET    /api/events/{id}                 # Get event details
PUT    /api/events/{id}                 # Update event (Org Admin)
DELETE /api/events/{id}                 # Delete event (Org Admin)
```

### 📱 QR Code & Attendance
```
POST   /api/qr/scan                     # Scan QR code for attendance (Staff)
GET    /api/qr/my-qr                    # Get student's static QR code (Student)
POST   /api/qr/generate-dynamic         # Generate dynamic QR code (Student)

GET    /api/attendance                  # View attendance records (Org Admin, Staff)
GET    /api/attendance/my               # Student's own attendance (Student)
GET    /api/attendance/event/{id}       # Event attendance report (Org Admin, Staff)
```

### 🔔 Notifications
```
GET    /api/notifications               # Get user notifications
POST   /api/notifications/{id}/read     # Mark notification as read
```

### 📊 Dashboards
```
GET    /api/dashboard/student           # Student dashboard (Student)
GET    /api/dashboard/admin             # Admin dashboard (Org Admin)
GET    /api/dashboard/super-admin       # Super admin dashboard (Super Admin)
```

### 👤 Profile
```
GET    /api/profile                     # Get current user profile
PUT    /api/profile                     # Update profile
```

## Usage Workflow

### 1. Student Registration
```json
POST /api/auth/register
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "organization_id": 1,
  "course": "Computer Science",
  "year_level": 2,
  "phone": "+1234567890",
  "student_id": "2024-001"
}
```

### 2. Admin Approves Student
```json
POST /api/users/123/approve
# (Org Admin only)
```

### 3. Create Event
```json
POST /api/events
{
  "title": "Tech Conference 2024",
  "description": "Annual technology conference",
  "location": "Main Auditorium",
  "start_datetime": "2024-09-15T09:00:00",
  "end_datetime": "2024-09-15T17:00:00",
  "speakers": [
    {
      "name": "Dr. Jane Smith",
      "title": "AI Researcher",
      "bio": "Expert in machine learning"
    }
  ],
  "topics": ["AI", "Machine Learning", "Technology"]
}
```

### 4. Student Gets QR Code
```json
GET /api/qr/my-qr
# Returns static QR code

POST /api/qr/generate-dynamic
# Returns JWT-based QR code (expires in 60 seconds)
```

### 5. Staff Scans QR Code
```json
POST /api/qr/scan
{
  "qr_code_data": "student-qr-code-data",
  "event_id": 15,
  "action": "check_in"  // or "check_out"
}
```

## Security Features

### 🔒 QR Code Security
- **Static QR codes**: Permanent UUID-based codes for each student
- **Dynamic QR codes**: JWT tokens with 60-second expiry
- **Rate limiting**: Max 10 scan attempts per minute per staff member
- **Comprehensive logging**: All scan attempts logged with results

### 🛡️ Password Security
- **Secure reset tokens**: SHA-256 hashed with 15-30 minute expiry
- **One-time use**: Tokens invalidated after use
- **IP and User Agent tracking**: Security audit trail

### 📊 Audit Trail
- **Scan logs**: Every QR scan attempt with detailed metadata
- **Activity logs**: User actions and system events
- **Rate limiting logs**: Failed attempts and security violations

## Organization Types

### ACES (Default Tenant)
- **Special privileges**: No subscription limits
- **Permanent access**: Never expires
- **Owner organization**: Cannot be deleted
- **Full feature access**: All functionality available

### Regular Organizations
- **Subscription-based**: Start and end dates
- **Limited access**: Features blocked after expiry
- **Read-only mode**: After subscription expires
- **Managed by Super Admin**: Creation and management

## Installation

### 1. Database Setup
```sql
-- Use the new schema
mysql -u root -p < database/new_schema.sql
```

### 2. Configuration
```php
// Update config/config.php
define('DB_NAME', 'your_database_name');
// ... other database settings
```

### 3. Default Credentials
- **Super Admin**: admin@aces.edu / (set in database)
- **Default Organization**: ACES (pre-created)

## Migration from Old System

### Data Migration Required
1. **Organizations**: Map from old `organizations` table
2. **Users**: Update schema, add QR codes, set approval status
3. **Events**: Simplify structure, remove event types
4. **Attendance**: Restructure for event-based tracking
5. **Roles**: Replace with new role system

### Breaking Changes
- Removed: Academic years, programs, sections, event types
- Changed: Role system completely restructured
- Added: QR codes, scan logs, password resets, notifications
- Modified: Attendance structure for event-based tracking

## Development Notes

### New Models Created
- `ScanLog`: Security and audit logging
- `PasswordReset`: Secure password recovery
- `Notification`: In-app notifications

### Updated Models
- `User`: Simplified with QR codes and approval workflow
- `Event`: Streamlined structure with JSON fields
- `Attendance`: Event-based check-in/check-out system

### New Controllers
- `QRScanController`: Handles all QR code operations
- Additional methods in `AuthController` for password reset

## Future Enhancements

### Phase 2 Features
1. **Mobile App Integration**: React Native app for students
2. **Real-time Notifications**: WebSocket implementation
3. **Advanced Analytics**: Attendance trends and insights
4. **Email Integration**: Automated notifications via email
5. **Bulk Operations**: Mass student import/export
6. **API Rate Limiting**: Advanced security measures
7. **File Uploads**: Profile pictures and event banners

### Performance Optimizations
1. **Database Indexing**: Optimized queries for large datasets
2. **Caching Layer**: Redis for frequently accessed data
3. **API Response Pagination**: Handle large result sets
4. **Background Jobs**: Async processing for heavy operations

---

This refactored system provides a focused, secure, and scalable solution for multi-organization student attendance tracking with modern security practices and streamlined workflows.
