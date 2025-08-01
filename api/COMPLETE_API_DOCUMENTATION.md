# School Organization Attendance API - Complete Documentation

## **Introduction**

Welcome to the **AceTrack Attendance API**. This comprehensive API is designed for managing student organizations, attendance tracking, event management, and administrative tasks. It supports multi-tenancy, customizable roles, and secure JWT-based authentication.

The system is built for the **Association of Computing and Engineering Students (ACES)** and other student organizations.

---

## **Table of Contents**
1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Organization Management](#organization-management)
4. [User Management](#user-management)
5. [Role Management & Permissions](#role-management--permissions)
6. [Academic Structure](#academic-structure)
7. [Attendance Management](#attendance-management)
8. [Event Management](#event-management)
9. [Payment & Subscription Management](#payment--subscription-management)
10. [Dashboard & Analytics](#dashboard--analytics)
11. [File Management](#file-management)
12. [Error Handling](#error-handling)
13. [Security](#security)
14. [Complete API Reference](#complete-api-reference)

---

## **API Overview**

### Base URL
```
https://your-domain.com/api
```

### Required Headers
- `Content-Type: application/json`
- `Authorization: Bearer {access_token}` (for protected routes)
- `X-Organization-ID: {organization_id}` (for super admin operations)

### Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": {},
  "pagination": {} // For paginated responses
}
```

---

## **Authentication**

### **User Registration**
Register a new user for an organization.

**Endpoint:**
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Smith",
  "email": "john.doe@example.com",
  "password": "securepassword123",
  "phone": "+1234567890",
  "student_id": "2024-00001",
  "organization_id": 1,
  "section_id": 5,
  "birth_date": "2000-01-15",
  "address": "123 Main St, City, State",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1234567891",
  "parent_guardian_name": "Robert Doe",
  "parent_guardian_phone": "+1234567892",
  "enrollment_date": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "student_id": "2024-00001",
    "user_type": "student",
    "status": "active",
    "roles": ["student"]
  }
}
```

### **User Login**
**Endpoint:**
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "organization_id": 1,
      "organization_name": "Association of Computing and Engineering Students (ACES)",
      "roles": ["student"],
      "user_type": "student"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "abc123def456...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### **Refresh Token**
**Endpoint:**
```
POST /api/auth/refresh
```

### **Logout**
**Endpoint:**
```
POST /api/auth/logout
```

---

## **Organization Management**

### **Get Organizations (Super Admin Only)**
**Endpoint:**
```
GET /api/organizations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Association of Computing and Engineering Students (ACES)",
      "abbreviation": "ACES",
      "description": "The premier organization for computing and engineering students",
      "contact_email": "admin@aces.edu",
      "contact_phone": "+1234567890",
      "status": "active",
      "subscription_start": null,
      "subscription_end": null,
      "is_owner": true,
      "logo": "/uploads/organizations/aces-logo.png",
      "banner": "/uploads/organizations/aces-banner.jpg",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **Create Organization (Super Admin Only)**
**Endpoint:**
```
POST /api/organizations
```

**Request Body:**
```json
{
  "name": "Computer Science Students Association",
  "abbreviation": "CSSA",
  "description": "Organization for computer science students",
  "contact_email": "admin@cssa.edu",
  "contact_phone": "+1234567891",
  "logo": "base64_encoded_image_or_file_upload",
  "banner": "base64_encoded_image_or_file_upload"
}
```

---

## **User Management**

### **Get Users by Organization**
**Endpoint:**
```
GET /api/users?organization_id={id}
```

**Query Parameters:**
- `organization_id`: Filter users by organization
- `user_type`: Filter by user type (student, teacher, admin, staff)
- `status`: Filter by status (active, inactive, graduated, transferred, dropped)
- `section_id`: Filter by section
- `search`: Search by name, email, or student_id
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "middle_name": "Smith",
      "email": "john.doe@example.com",
      "student_id": "2024-00001",
      "user_type": "student",
      "status": "active",
      "section": {
        "id": 5,
        "section_name": "A",
        "year_level": 1,
        "program_name": "Computer Science"
      },
      "avatar": "/uploads/avatars/123.jpg",
      "enrollment_date": "2024-01-15",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 250,
    "total_pages": 25
  }
}
```

### **Get Current User Profile**
**Endpoint:**
```
GET /api/profile
```

### **Get User Attendance Dashboard**
**Endpoint:**
```
GET /api/users/attendance-dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_info": {
      "id": 123,
      "name": "John Doe",
      "student_id": "2024-00001",
      "section": "CS-1A",
      "avatar": "/uploads/avatars/123.jpg"
    },
    "attendance_summary": {
      "total_days": 30,
      "present_days": 28,
      "absent_days": 2,
      "late_days": 3,
      "attendance_rate": 93.33
    },
    "recent_attendance": [
      {
        "date": "2024-08-01",
        "status": "present",
        "time_in": "08:30:00",
        "time_out": "17:00:00",
        "type": "regular"
      }
    ],
    "upcoming_events": [
      {
        "id": 15,
        "title": "Annual Tech Conference",
        "start_datetime": "2024-08-15T09:00:00Z",
        "location": "Main Auditorium",
        "event_type": "Conference",
        "banner": "/uploads/events/15-banner.jpg"
      }
    ],
    "attended_events": [
      {
        "id": 12,
        "title": "Workshop on AI",
        "date": "2024-07-20",
        "attended": true,
        "attendance_status": "present"
      }
    ]
  }
}
```

---

## **Role Management & Permissions**

### **Available Permissions**

Here are all available permissions that can be assigned to roles:

#### **User Management Permissions**
- `users.read` - View users
- `users.create` - Create new users
- `users.update` - Update user information
- `users.delete` - Delete users
- `users.assign_roles` - Assign roles to users

#### **Attendance Permissions**
- `attendance.own` - View own attendance records
- `attendance.read` - View all attendance records
- `attendance.create` - Mark attendance for others
- `attendance.update` - Update attendance records
- `attendance.delete` - Delete attendance records
- `attendance.reports` - Generate attendance reports

#### **Event Permissions**
- `events.read` - View events
- `events.create` - Create events
- `events.update` - Update events
- `events.delete` - Delete events
- `events.manage_attendance` - Manage event attendance
- `events.register` - Register for events

#### **Organization Permissions**
- `organizations.read` - View organization details
- `organizations.update` - Update organization information
- `organizations.manage_settings` - Manage organization settings

#### **Academic Permissions**
- `programs.read` - View academic programs
- `programs.create` - Create academic programs
- `programs.update` - Update academic programs
- `programs.delete` - Delete academic programs
- `sections.read` - View sections
- `sections.create` - Create sections
- `sections.update` - Update sections
- `sections.delete` - Delete sections

#### **Role Management Permissions**
- `roles.read` - View roles
- `roles.create` - Create custom roles
- `roles.update` - Update roles
- `roles.delete` - Delete custom roles

#### **Payment Permissions**
- `payments.read` - View payment records
- `payments.create` - Record payments
- `payments.update` - Update payment records
- `payments.delete` - Delete payment records

#### **Report Permissions**
- `reports.attendance` - Generate attendance reports
- `reports.events` - Generate event reports
- `reports.users` - Generate user reports
- `reports.payments` - Generate payment reports

### **Get Roles**
**Endpoint:**
```
GET /api/roles
```

### **Create Custom Role**
**Endpoint:**
```
POST /api/roles
```

**Request Body:**
```json
{
  "name": "Event Coordinator",
  "description": "Manages events and event attendance",
  "permissions": [
    "events.read",
    "events.create",
    "events.update",
    "events.manage_attendance",
    "users.read",
    "attendance.read"
  ]
}
```

### **Default System Roles**
- **super_admin**: All permissions (`*`)
- **org_admin**: Full organization management
- **teacher**: Student and attendance management
- **staff**: Limited administrative access
- **student**: Own profile and attendance access

---

## **Academic Structure**

### **Programs**
**Endpoints:**
```
GET /api/programs
POST /api/programs
PUT /api/programs/{id}
DELETE /api/programs/{id}
```

**Create Program Example:**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "description": "Bachelor of Science in Computer Science",
  "duration_years": 4
}
```

### **Sections**
**Endpoints:**
```
GET /api/sections
POST /api/sections
PUT /api/sections/{id}
DELETE /api/sections/{id}
```

**Create Section Example:**
```json
{
  "academic_year_id": 1,
  "program_id": 1,
  "year_level": 1,
  "section_name": "A",
  "capacity": 40,
  "adviser_id": 15
}
```

---

## **Attendance Management**

### **Get Attendance Records**
**Endpoint:**
```
GET /api/attendance
```

**Query Parameters:**
- `user_id`: Filter by specific user
- `date_from`: Start date filter
- `date_to`: End date filter
- `status`: Filter by attendance status
- `type`: Filter by attendance type
- `section_id`: Filter by section

### **Check In**
**Endpoint:**
```
POST /api/attendance/checkin
```

**Request Body:**
```json
{
  "location": "Room 301",
  "notes": "Regular class attendance"
}
```

### **Mark Event Attendance**
**Endpoint:**
```
POST /api/attendance/mark-event
```

**Request Body:**
```json
{
  "event_id": 15,
  "user_id": 123,
  "status": "present",
  "notes": "Attended full session"
}
```

---

## **Event Management**

### **Event Types**
Event types help categorize different kinds of events. Here are the default types:

#### **Default Event Types:**
1. **General Meeting** - Regular organizational meetings
2. **Workshop** - Educational workshops and training
3. **Seminar** - Academic seminars and lectures
4. **Conference** - Large-scale conferences
5. **Social Event** - Social gatherings and networking
6. **Competition** - Academic or skill competitions
7. **Training** - Skill development sessions
8. **Orientation** - New member orientations

### **Get Event Types**
**Endpoint:**
```
GET /api/event-types
```

### **Create Event Type**
**Endpoint:**
```
POST /api/event-types
```

**Request Body:**
```json
{
  "name": "Hackathon",
  "description": "Coding competitions and hackathons",
  "color": "#ff6b35",
  "default_duration_minutes": 1440,
  "requires_attendance": true
}
```

### **Enhanced Event Management**

### **Create Event**
**Endpoint:**
```
POST /api/events
```

**Request Body:**
```json
{
  "event_type_id": 1,
  "title": "Annual Tech Conference 2024",
  "description": "Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge technologies.",
  "about": "This conference brings together students, professionals, and industry experts to share knowledge and network.",
  "location": "Main Auditorium, University Campus",
  "start_datetime": "2024-09-15T09:00:00",
  "end_datetime": "2024-09-15T17:00:00",
  "max_attendees": 500,
  "registration_required": true,
  "registration_deadline": "2024-09-10T23:59:59",
  "banner": "base64_encoded_image",
  "speakers": [
    {
      "name": "Dr. Jane Smith",
      "title": "AI Research Director",
      "company": "Tech Corp",
      "bio": "Leading AI researcher with 15+ years experience",
      "photo": "base64_encoded_image"
    }
  ],
  "topics": [
    "Artificial Intelligence",
    "Machine Learning",
    "Data Science",
    "Cloud Computing"
  ],
  "instructions": "Please bring your student ID and arrive 30 minutes early for registration.",
  "created_by": 1
}
```

### **Get Events**
**Endpoint:**
```
GET /api/events
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "title": "Annual Tech Conference 2024",
      "description": "Join us for the biggest tech conference...",
      "about": "This conference brings together...",
      "location": "Main Auditorium",
      "start_datetime": "2024-09-15T09:00:00Z",
      "end_datetime": "2024-09-15T17:00:00Z",
      "banner": "/uploads/events/15-banner.jpg",
      "event_type": {
        "name": "Conference",
        "color": "#9b59b6"
      },
      "speakers": [
        {
          "name": "Dr. Jane Smith",
          "title": "AI Research Director",
          "company": "Tech Corp",
          "photo": "/uploads/speakers/jane-smith.jpg"
        }
      ],
      "topics": ["AI", "ML", "Data Science"],
      "registration_required": true,
      "max_attendees": 500,
      "registered_count": 247,
      "attendance_code": "TECH24",
      "status": "published"
    }
  ]
}
```

### **Register for Event**
**Endpoint:**
```
POST /api/events/{id}/register
```

### **Mark Event Attendance by Code**
**Endpoint:**
```
POST /api/events/attend-by-code
```

**Request Body:**
```json
{
  "attendance_code": "TECH24"
}
```

---

## **Payment & Subscription Management**

### **Record Payment**
**Endpoint:**
```
POST /api/payments
```

**Request Body:**
```json
{
  "organization_id": 2,
  "amount": 150.00,
  "currency": "USD",
  "payment_method": "cash",
  "payment_date": "2024-08-01",
  "subscription_start": "2024-08-01",
  "subscription_end": "2025-07-31",
  "receipt_number": "RCP-2024-001",
  "receipt_image": "base64_encoded_receipt_image",
  "notes": "Annual subscription payment for academic year 2024-2025"
}
```

### **Get Payment Records**
**Endpoint:**
```
GET /api/payments
```

**Query Parameters:**
- `organization_id`: Filter by organization
- `payment_method`: Filter by payment method
- `date_from`: Start date filter
- `date_to`: End date filter
- `status`: Filter by payment status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "organization_id": 2,
      "organization_name": "Computer Science Students Org",
      "amount": 150.00,
      "currency": "USD",
      "payment_method": "cash",
      "payment_date": "2024-08-01",
      "subscription_start": "2024-08-01",
      "subscription_end": "2025-07-31",
      "receipt_number": "RCP-2024-001",
      "receipt_image": "/uploads/receipts/1-receipt.jpg",
      "status": "confirmed",
      "processed_by": {
        "id": 1,
        "name": "Admin User"
      },
      "created_at": "2024-08-01T10:00:00Z"
    }
  ]
}
```

---

## **Dashboard & Analytics**

### **Organization Dashboard**
**Endpoint:**
```
GET /api/dashboard/organization
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_students": 450,
      "active_students": 420,
      "total_events": 25,
      "upcoming_events": 5,
      "attendance_rate": 89.5
    },
    "recent_activities": [
      {
        "type": "event_created",
        "description": "New event 'Tech Conference' created",
        "timestamp": "2024-08-01T10:00:00Z"
      }
    ],
    "attendance_trends": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
      "data": [85.2, 87.1, 89.3, 88.7, 89.5]
    }
  }
}
```

### **Student Dashboard**
**Endpoint:**
```
GET /api/dashboard/student
```

---

## **File Management**

### **Upload File**
**Endpoint:**
```
POST /api/files/upload
```

**Request:**
- Content-Type: `multipart/form-data`
- Fields: `file`, `type` (avatar, banner, logo, receipt, event_banner)

### **Supported File Types:**
- **Images**: JPG, JPEG, PNG, GIF (max 5MB)
- **Documents**: PDF (max 10MB for receipts)

---

## **Error Handling**

### **Standard Error Response**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required", "Email must be valid"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

### **HTTP Status Codes**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

---

## **Security**

### **JWT Token Structure**
```json
{
  "user_id": 123,
  "organization_id": 1,
  "email": "user@example.com",
  "roles": ["student"],
  "exp": 1628097600,
  "iat": 1628094000
}
```

### **Rate Limiting**
- Authentication endpoints: 10 requests per minute
- General API endpoints: 100 requests per minute
- File upload endpoints: 20 requests per minute

---

## **Complete API Reference**

### **Authentication Endpoints**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/verify-token
```

### **Organization Management**
```
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/{id}
PUT    /api/organizations/{id}
DELETE /api/organizations/{id}
POST   /api/organizations/{id}/upload-logo
POST   /api/organizations/{id}/upload-banner
```

### **User Management**
```
GET    /api/users
POST   /api/users
GET    /api/users/{id}
PUT    /api/users/{id}
DELETE /api/users/{id}
GET    /api/profile
PUT    /api/profile
POST   /api/users/{id}/upload-avatar
GET    /api/users/attendance-dashboard
```

### **Role Management**
```
GET    /api/roles
POST   /api/roles
GET    /api/roles/{id}
PUT    /api/roles/{id}
DELETE /api/roles/{id}
GET    /api/permissions
```

### **Academic Structure**
```
GET    /api/programs
POST   /api/programs
PUT    /api/programs/{id}
DELETE /api/programs/{id}

GET    /api/sections
POST   /api/sections
PUT    /api/sections/{id}
DELETE /api/sections/{id}

GET    /api/academic-years
POST   /api/academic-years
PUT    /api/academic-years/{id}
DELETE /api/academic-years/{id}
```

### **Attendance Management**
```
GET    /api/attendance
POST   /api/attendance/checkin
POST   /api/attendance/checkout
GET    /api/attendance/my
GET    /api/attendance/report
GET    /api/attendance/user/{id}
POST   /api/attendance/mark-event
GET    /api/attendance/today-status
```

### **Event Management**
```
GET    /api/events
POST   /api/events
GET    /api/events/{id}
PUT    /api/events/{id}
DELETE /api/events/{id}
POST   /api/events/{id}/register
POST   /api/events/attend-by-code
GET    /api/events/{id}/attendance
GET    /api/events/{id}/registrations

GET    /api/event-types
POST   /api/event-types
PUT    /api/event-types/{id}
DELETE /api/event-types/{id}
```

### **Payment Management**
```
GET    /api/payments
POST   /api/payments
GET    /api/payments/{id}
PUT    /api/payments/{id}
DELETE /api/payments/{id}
POST   /api/payments/{id}/upload-receipt
```

### **Dashboard & Reports**
```
GET    /api/dashboard/organization
GET    /api/dashboard/student
GET    /api/reports/attendance
GET    /api/reports/events
GET    /api/reports/users
GET    /api/reports/payments
```

### **File Management**
```
POST   /api/files/upload
GET    /api/files/{id}
DELETE /api/files/{id}
```

---

## **Default Organization: ACES**

The system comes with a default organization:

**Association of Computing and Engineering Students (ACES)**
- **Status**: Owner organization (永久免费)
- **Features**: Full access to all system features
- **Subscription**: Unlimited (no expiration)
- **Students**: Unlimited
- **Special Privileges**: Can use all features forever

---

**End of Documentation**

For support, contact: support@acetrack.edu

