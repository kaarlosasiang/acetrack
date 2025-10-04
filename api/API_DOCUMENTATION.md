# AceTrack Attendance System - API Documentation

## Overview

The AceTrack Attendance System is a comprehensive multi-tenant API for managing organizations, events, and member attendance. This documentation provides detailed information about all available endpoints, authentication, request/response formats, and usage examples.

## Base URL

```
http://localhost:8888/acetrack/backend/public
```

## Authentication

The API uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header for protected endpoints:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Flow

1. **Register/Login** to get access token
2. **Include token** in subsequent requests
3. **Refresh token** when needed
4. **Logout** to blacklist token

## Content Types

- **Request**: `application/json`
- **Response**: `application/json`

## Security Features

- **CSRF Protection**: Required for state-changing operations (POST, PUT, DELETE)
- **Rate Limiting**: Applied per IP and endpoint
- **Token Blacklisting**: Proper logout implementation
- **Input Sanitization**: All inputs are sanitized for security

## Rate Limits

| Endpoint Type | Method | Limit |
|---------------|--------|-------|
| Authentication | POST | 5 per 15 minutes |
| Registration | POST | 3 per hour |
| Password Reset | POST | 5 per hour |
| File Upload | POST | 20 per hour |
| Email Operations | POST | 10 per hour |
| API Mutations | POST/PUT/DELETE | 100 per hour |
| API Reads | GET | 300 per hour |

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`  
**Authentication**: Not required

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123",
  "password_confirmation": "SecurePassword123",
  "phone_number": "+1234567890",
  "course": "Computer Science",
  "year_level": "4th"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "status": "pending"
    },
    "email_sent": true
  }
}
```

### Login User

Authenticate and receive access token.

**Endpoint**: `POST /auth/login`  
**Authentication**: Not required

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "status": "active"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
}
```

### Logout User

Invalidate the current session token.

**Endpoint**: `POST /auth/logout`  
**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Forgot Password

Request password reset token.

**Endpoint**: `POST /auth/forgot-password`  
**Authentication**: Not required

**Request Body**:
```json
{
  "email": "john.doe@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

### Reset Password

Reset password using token.

**Endpoint**: `POST /auth/reset-password`  
**Authentication**: Not required

**Request Body**:
```json
{
  "token": "password_reset_token_here",
  "password": "NewSecurePassword123",
  "password_confirmation": "NewSecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

---

## Organization Management

### Get Organization Info

Get current organization details.

**Endpoint**: `GET /api/org/info`  
**Authentication**: Required (Member)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Organization details retrieved successfully",
  "data": {
    "id": 1,
    "name": "Tech Student Club",
    "description": "A club for technology enthusiasts",
    "logo_url": "/uploads/logo.png",
    "member_count": 150,
    "status": "active",
    "created_at": "2024-01-01 10:00:00"
  }
}
```

### Update Organization

Update organization information.

**Endpoint**: `PUT /api/org/info`  
**Authentication**: Required (Admin)  
**CSRF**: Required

**Request Body**:
```json
{
  "name": "Updated Tech Student Club",
  "description": "An updated description for the club"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Organization updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Tech Student Club",
    "description": "An updated description for the club",
    "updated_at": "2024-01-02 14:30:00"
  }
}
```

### Generate Membership QR Code

Generate QR code for membership registration.

**Endpoint**: `POST /api/org/generate-qr`  
**Authentication**: Required (Admin)  
**CSRF**: Required

**Request Body**:
```json
{
  "expires_in_days": 7
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Membership QR code generated successfully",
  "data": {
    "organization_id": 1,
    "organization_name": "Tech Student Club",
    "qr_token": "abc123def456...",
    "qr_url": "http://localhost:8888/acetrack/backend/public/scan/abc123def456...",
    "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expires_at": "2024-01-09 14:30:00",
    "expires_in_days": 7,
    "instructions": "Share this QR code with potential members..."
  }
}
```

---

## Event Management

### List Events

Get paginated list of events.

**Endpoint**: `GET /api/events`  
**Authentication**: Required  
**Query Parameters**:
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (`draft`, `published`, `cancelled`)
- `search` (string): Search by name or description

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "id": 1,
        "name": "Tech Workshop 2024",
        "description": "Annual technology workshop",
        "start_datetime": "2024-03-15 14:00:00",
        "end_datetime": "2024-03-15 18:00:00",
        "location": "Main Auditorium",
        "status": "published",
        "banner_url": "/uploads/event_banner.jpg",
        "qr_code_active": true,
        "registered_count": 85,
        "checked_in_count": 45
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### Create Event

Create a new event.

**Endpoint**: `POST /api/events`  
**Authentication**: Required (Admin/Sub-Admin)  
**CSRF**: Required

**Request Body**:
```json
{
  "name": "New Tech Meetup",
  "description": "Monthly tech meetup for developers",
  "start_datetime": "2024-04-20 15:00:00",
  "end_datetime": "2024-04-20 19:00:00",
  "location": "Conference Room A",
  "max_attendees": 100,
  "status": "draft"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 2,
    "name": "New Tech Meetup",
    "description": "Monthly tech meetup for developers",
    "start_datetime": "2024-04-20 15:00:00",
    "end_datetime": "2024-04-20 19:00:00",
    "location": "Conference Room A",
    "max_attendees": 100,
    "status": "draft",
    "created_at": "2024-01-02 16:45:00"
  }
}
```

### Generate Event QR Code

Generate QR code for event attendance.

**Endpoint**: `POST /api/events/{id}/qr`  
**Authentication**: Required (Admin/Sub-Admin)  
**CSRF**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "event_id": 1,
    "qr_token": "def789ghi012...",
    "qr_url": "http://localhost:8888/acetrack/backend/public/scan/def789ghi012...",
    "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expires_at": "2024-03-15 19:00:00",
    "event_name": "Tech Workshop 2024",
    "event_datetime": "2024-03-15 14:00:00"
  }
}
```

---

## Attendance Management

### Member Check-in

Check in to an event (member action).

**Endpoint**: `POST /api/attendance/check-in`  
**Authentication**: Required  
**CSRF**: Required

**Request Body**:
```json
{
  "event_id": 1,
  "qr_token": "optional_qr_token"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance_id": 123,
    "event_id": 1,
    "user_id": 1,
    "check_in_time": "2024-03-15 14:15:00",
    "status": "checked_in",
    "event_name": "Tech Workshop 2024"
  }
}
```

### Member Check-out

Check out from an event.

**Endpoint**: `POST /api/attendance/check-out`  
**Authentication**: Required  
**CSRF**: Required

**Request Body**:
```json
{
  "event_id": 1
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Check-out successful",
  "data": {
    "attendance_id": 123,
    "check_out_time": "2024-03-15 17:45:00",
    "total_duration": "3 hours 30 minutes",
    "status": "completed"
  }
}
```

### Get Attendance Report

Get attendance report for an event (admin only).

**Endpoint**: `GET /api/attendance/report/{event_id}`  
**Authentication**: Required (Admin)  
**Query Parameters**:
- `export` (string): Export format (`csv`, `excel`)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Attendance report generated successfully",
  "data": {
    "event": {
      "id": 1,
      "name": "Tech Workshop 2024",
      "date": "2024-03-15"
    },
    "statistics": {
      "total_registered": 100,
      "total_checked_in": 85,
      "total_checked_out": 78,
      "attendance_rate": 85,
      "completion_rate": 91.76
    },
    "attendances": [
      {
        "user_id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "check_in_time": "2024-03-15 14:15:00",
        "check_out_time": "2024-03-15 17:45:00",
        "duration": "3h 30m",
        "status": "completed"
      }
    ]
  }
}
```

---

## QR Code Scanning

### Scan QR Code

Process QR code scan (public endpoint).

**Endpoint**: `GET /api/qr/scan/{token}`  
**Authentication**: Optional

**Response** (200 OK) - Event Attendance:
```json
{
  "success": true,
  "message": "QR code scanned successfully - ready for check_in",
  "data": {
    "type": "event_attendance",
    "status": "ready",
    "action": "check_in",
    "event": {
      "id": 1,
      "name": "Tech Workshop 2024",
      "description": "Annual technology workshop",
      "start_datetime": "2024-03-15 14:00:00",
      "end_datetime": "2024-03-15 18:00:00",
      "location": "Main Auditorium"
    },
    "organization_id": 1,
    "next_steps": {
      "endpoint": "/attendance/check_in",
      "method": "POST",
      "required_data": {"event_id": 1},
      "requires_auth": true
    },
    "message": "Ready for check_in. Please authenticate if not already logged in."
  }
}
```

**Response** (200 OK) - Membership Registration:
```json
{
  "success": true,
  "message": "QR code scanned successfully - ready for membership registration",
  "data": {
    "type": "membership_registration",
    "status": "ready",
    "organization": {
      "id": 1,
      "name": "Tech Student Club",
      "description": "A club for technology enthusiasts",
      "logo_url": "/uploads/logo.png",
      "member_count": 150
    },
    "next_steps": {
      "endpoint": "/organization-member/join",
      "method": "POST",
      "required_data": {"organization_id": 1},
      "requires_auth": true
    },
    "message": "Ready to join organization. Please authenticate if not already logged in."
  }
}
```

---

## File Management

### Upload File

Upload a file (image, document, etc.).

**Endpoint**: `POST /api/file/upload`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`  
**CSRF**: Required

**Request Body** (Form Data):
- `file`: File to upload
- `file_type`: Type of file (`image`, `document`, `avatar`, `banner`)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "uploaded_file_abc123.jpg",
    "original_name": "my_photo.jpg",
    "url": "/uploads/uploaded_file_abc123.jpg",
    "size": 245760,
    "mime_type": "image/jpeg",
    "file_type": "image"
  }
}
```

### Serve File

Access uploaded files.

**Endpoint**: `GET /uploads/{filename}`  
**Authentication**: Optional (depends on file)

**Response**: File content with appropriate headers

---

## Subscription Management

### Get Current Subscription

Get organization's current subscription status.

**Endpoint**: `GET /api/org/subscription`  
**Authentication**: Required (Admin)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Active subscription found",
  "data": {
    "current_subscription": {
      "id": 1,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "active",
      "amount": 299.99
    },
    "is_active": true,
    "status": "active",
    "days_until_expiry": 300
  }
}
```

### Renew Subscription

Submit subscription renewal.

**Endpoint**: `POST /api/org/subscription/renew`  
**Authentication**: Required (Admin)  
**CSRF**: Required

**Request Body**:
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "amount": 299.99,
  "receipt_reference": "TXN123456789"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Subscription renewal submitted successfully",
  "data": {
    "subscription": {
      "id": 2,
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "amount": 299.99,
      "status": "pending_verification"
    },
    "status": "pending_verification",
    "message": "Subscription created and pending verification by system administrators."
  }
}
```

---

## Super Admin Endpoints

### Get Subscription Statistics

Get system-wide subscription statistics.

**Endpoint**: `GET /api/admin/subscriptions/stats`  
**Authentication**: Required (Super Admin)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Subscription statistics retrieved successfully",
  "data": {
    "summary": {
      "active_count": 45,
      "pending_count": 8,
      "expired_count": 12,
      "rejected_count": 2,
      "total_active_revenue": 13497.55
    },
    "expiring_soon": [
      {
        "id": 1,
        "organization_name": "Tech Club",
        "end_date": "2024-02-15",
        "days_remaining": 10
      }
    ],
    "recently_expired": []
  }
}
```

### Verify Subscription

Approve a pending subscription.

**Endpoint**: `POST /api/admin/subscriptions/{id}/verify`  
**Authentication**: Required (Super Admin)  
**CSRF**: Required

**Request Body**:
```json
{
  "notes": "Subscription approved after receipt verification"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Subscription verified successfully"
}
```

---

## Security Endpoints

### Get CSRF Token

Get CSRF token for secure forms.

**Endpoint**: `GET /api/csrf-token`  
**Authentication**: Not required

**Response** (200 OK):
```json
{
  "success": true,
  "csrf_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "error_type",
  "message": "Human-readable error message",
  "details": {
    "field_name": ["Field-specific error messages"]
  }
}
```

### Common HTTP Status Codes

| Code | Description | When It Occurs |
|------|-------------|----------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "rate_limit": {
    "max_attempts": 100,
    "attempts_used": 100,
    "attempts_remaining": 0,
    "reset_time": "2024-01-02 17:30:00"
  }
}
```

### CSRF Error Response

When CSRF token is missing or invalid:

```json
{
  "success": false,
  "error": "CSRF token validation failed",
  "message": "Invalid or missing CSRF token. Please refresh and try again.",
  "csrf_token": "new_csrf_token_here"
}
```

---

## Best Practices

### Authentication
1. Always include the `Authorization` header with `Bearer <token>` for protected endpoints
2. Handle token expiration gracefully and refresh when needed
3. Properly logout users to blacklist tokens

### CSRF Protection
1. Get CSRF token from `/api/csrf-token` endpoint
2. Include token in `X-CSRF-Token` header or `_csrf_token` field
3. CSRF is required for all POST, PUT, DELETE operations (except login/register)

### Rate Limiting
1. Monitor rate limit headers in responses
2. Implement exponential backoff when limits are hit
3. Cache frequently accessed data to reduce API calls

### Error Handling
1. Always check the `success` field in responses
2. Display user-friendly error messages from the `message` field
3. Handle field validation errors from the `details` object

### File Uploads
1. Check file size limits (5MB default)
2. Only upload allowed file types
3. Handle upload progress for large files

---

## SDKs and Tools

### Postman Collection

A Postman collection is available with all endpoints pre-configured. Import the collection and set up your environment variables:

- `base_url`: `http://localhost:8888/acetrack/backend/public`
- `access_token`: Your JWT token after login
- `csrf_token`: CSRF token for secure operations

### cURL Examples

#### Login
```bash
curl -X POST http://localhost:8888/acetrack/backend/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Get Events
```bash
curl -X GET http://localhost:8888/acetrack/backend/public/api/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create Event
```bash
curl -X POST http://localhost:8888/acetrack/backend/public/api/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"name":"New Event","description":"Event description","start_datetime":"2024-05-01 14:00:00","end_datetime":"2024-05-01 18:00:00","location":"Venue"}'
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Authentication system with JWT
- Organization management
- Event management with QR codes
- Attendance tracking
- File upload system
- Email notifications
- Subscription management
- Security features (CSRF, rate limiting, token blacklisting)
- Comprehensive error handling

---

## Support

For API support and questions:
- Check this documentation first
- Review error messages carefully
- Ensure proper authentication and CSRF tokens
- Verify rate limits haven't been exceeded
- Check network connectivity and server status

---

*This documentation is automatically updated with each API version. Last updated: January 2024*