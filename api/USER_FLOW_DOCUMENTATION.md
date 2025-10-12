# AceTrack API - Complete User Flow Documentation

This document provides a comprehensive guide to the entire user journey in the AceTrack attendance tracking system, from initial registration to complete organization and event management.

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Registration & Authentication](#user-registration--authentication)
3. [Organization Creation](#organization-creation)
4. [Subscription Management](#subscription-management)
5. [Event Management](#event-management)
6. [Organization Member Management](#organization-member-management)
7. [Complete API Reference](#complete-api-reference)
8. [Error Handling](#error-handling)
9. [Security Considerations](#security-considerations)

---

## 🎯 Overview

The AceTrack system follows a simplified workflow where users can complete organization setup and subscription in one step:

```
User Registration → Organization & Subscription Setup → Admin Verification → Event Creation → Member Management
```

### Key Roles

- **User**: Basic authenticated user
- **Org Admin**: Organization administrator with management permissions
- **Admin**: System administrator with full access

---

## 🔐 User Registration & Authentication

### Step 1: User Registration

**Endpoint**: `POST /api/v1/auth/register`

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe" // Optional
}
```

**Response**:

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

**Process**:

1. User provides registration details
2. System creates account with `role: "user"`
3. Email verification token sent
4. JWT tokens issued for immediate use
5. User can proceed but some features require email verification

### Step 2: Email Verification (Optional but Recommended)

**Endpoint**: `POST /api/v1/auth/verify-email`

**Request Body**:

```json
{
  "token": "email_verification_token"
}
```

### Step 3: User Login

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

---

## 🏢 Organization & Subscription Setup

### Step 4: Create Organization with Subscription

**Endpoint**: `POST /api/v1/organizations`

**Headers**:

```
Authorization: Bearer {access_token}
```

**Request Body**:

```json
{
  "name": "Awesome Student Organization",
  "description": "A student organization focused on academic excellence",
  "address": "123 University Ave, Campus City",
  "contactEmail": "contact@awesomeorg.com",
  "contactPhone": "+1234567890",
  "website": "https://awesomeorg.com",
  "subscription": {
    "duration": "1year",
    "startDate": "2025-10-13T00:00:00.000Z",
    "paymentAmount": 500.0,
    "paymentMethod": "bank_transfer",
    "notes": "Annual subscription for academic year 2025-2026"
  }
}
```

**Duration Options**:

- `"6months"`: 6-month subscription
- `"1year"`: 1-year subscription
- `"2years"`: 2-year subscription

**Response**:

```json
{
  "success": true,
  "message": "Organization and subscription created successfully",
  "data": {
    "organization": {
      "id": "org_id",
      "name": "Awesome Student Organization",
      "description": "A student organization focused on academic excellence",
      "adminUserId": "user_id",
      "memberCount": 1,
      "isActive": true,
      "createdAt": "2025-10-13T00:00:00.000Z"
    },
    "subscription": {
      "id": "subscription_id",
      "organizationId": "org_id",
      "duration": "1year",
      "startDate": "2025-10-13T00:00:00.000Z",
      "endDate": "2026-10-13T00:00:00.000Z",
      "status": "pending",
      "paymentAmount": 500.0,
      "paymentMethod": "bank_transfer"
    }
  }
}
```

**Process**:

1. Authenticated user creates organization and subscription in one step
2. User automatically becomes organization admin (`org_admin` role)
3. Organization starts with 1 member (the creator)
4. Subscription end date is auto-calculated based on duration
5. Subscription status starts as `pending` (requires admin verification)
6. Organization cannot create events until subscription is `active`

---

## 💳 Subscription Management

### Step 5: Admin Verification (System Admin Only)

**Endpoint**: `POST /api/v1/subscriptions/verify`

**Headers**:

```
Authorization: Bearer {admin_access_token}
```

**Request Body**:

```json
{
  "subscriptionId": "subscription_id",
  "verified": true,
  "notes": "Payment verified via bank transfer"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Subscription verified successfully",
  "data": {
    "subscription": {
      "id": "subscription_id",
      "status": "active",
      "verifiedBy": "admin_id",
      "verifiedAt": "2025-10-13T01:00:00.000Z"
    }
  }
}
```

**Process**:

1. System admin reviews subscription and payment proof
2. Admin approves or rejects subscription
3. If approved: status changes to `active`
4. If rejected: status changes to `cancelled`
5. Only active subscriptions allow event creation

---

## 📅 Event Management

### Step 6: Create Events

**Endpoint**: `POST /api/v1/events`

**Headers**:

```
Authorization: Bearer {org_admin_access_token}
```

**Request Body**:

```json
{
  "title": "Weekly General Assembly",
  "description": "Regular meeting for all organization members",
  "startDateTime": "2025-10-20T14:00:00.000Z",
  "endDateTime": "2025-10-20T16:00:00.000Z",
  "location": "Conference Room A",
  "maxAttendees": 50,
  "category": "meeting",
  "isPublic": false,
  "requiresApproval": false,
  "tags": ["weekly", "assembly", "mandatory"]
}
```

**Response**:

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "event": {
      "id": "event_id",
      "title": "Weekly General Assembly",
      "organizationId": "org_id",
      "createdBy": "org_admin_id",
      "status": "draft",
      "startDateTime": "2025-10-20T14:00:00.000Z",
      "endDateTime": "2025-10-20T16:00:00.000Z",
      "attendeeCount": 0,
      "maxAttendees": 50
    }
  }
}
```

### Step 7: Publish Event

**Endpoint**: `PUT /api/v1/events/{event_id}`

**Request Body**:

```json
{
  "status": "published"
}
```

**Event Status Workflow**:

```
draft → published → ongoing → completed
```

### Step 8: Event Attendance Tracking

**Check-in Endpoint**: `POST /api/v1/events/{event_id}/checkin`

**Request Body**:

```json
{
  "userId": "member_user_id",
  "checkInMethod": "qr_code",
  "location": "Conference Room A"
}
```

**Check-out Endpoint**: `POST /api/v1/events/{event_id}/checkout`

**Request Body**:

```json
{
  "userId": "member_user_id"
}
```

---

## 👥 Organization Member Management

### Step 9: Add Members to Organization

#### Option A: Direct Addition (Org Admin)

**Endpoint**: `POST /api/v1/organization-members`

**Headers**:

```
Authorization: Bearer {org_admin_access_token}
```

**Request Body**:

```json
{
  "userId": "target_user_id",
  "organizationId": "org_id",
  "role": "member"
}
```

#### Option B: Join Request Workflow

**Step 9a: User Requests to Join**

**Endpoint**: `POST /api/v1/organization-members/join-request`

**Headers**:

```
Authorization: Bearer {user_access_token}
```

**Request Body**:

```json
{
  "organizationId": "org_id",
  "message": "I would like to join this organization to participate in events"
}
```

**Step 9b: Org Admin Approves Request**

**Endpoint**: `POST /api/v1/organization-members/approve`

**Headers**:

```
Authorization: Bearer {org_admin_access_token}
```

**Request Body**:

```json
{
  "membershipId": "membership_request_id",
  "action": "approve",
  "role": "member"
}
```

### Member Roles

- **member**: Basic organization member, can attend events
- **officer**: Organization officer, can help manage events
- **org_admin**: Organization administrator, full management access

### Step 10: Get Organization Members

**Endpoint**: `GET /api/v1/organization-members?organizationId={org_id}`

**Response**:

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "member_id",
        "userId": {
          "id": "user_id",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com"
        },
        "role": "member",
        "status": "active",
        "joinedAt": "2025-10-13T02:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

## 📚 Complete API Reference

### Authentication Endpoints

| Method | Endpoint                    | Description        | Auth Required |
| ------ | --------------------------- | ------------------ | ------------- |
| POST   | `/api/v1/auth/register`     | User registration  | No            |
| POST   | `/api/v1/auth/login`        | User login         | No            |
| POST   | `/api/v1/auth/refresh`      | Refresh tokens     | Yes           |
| POST   | `/api/v1/auth/logout`       | User logout        | Yes           |
| POST   | `/api/v1/auth/verify-email` | Email verification | No            |
| GET    | `/api/v1/auth/profile`      | Get user profile   | Yes           |

### Organization Endpoints

| Method | Endpoint                     | Description         | Auth Required | Role      |
| ------ | ---------------------------- | ------------------- | ------------- | --------- |
| POST   | `/api/v1/organizations`      | Create organization | Yes           | User      |
| GET    | `/api/v1/organizations`      | List organizations  | Yes           | Any       |
| GET    | `/api/v1/organizations/{id}` | Get organization    | Yes           | Any       |
| PUT    | `/api/v1/organizations/{id}` | Update organization | Yes           | Org Admin |
| DELETE | `/api/v1/organizations/{id}` | Delete organization | Yes           | Org Admin |

### Subscription Endpoints

| Method | Endpoint                       | Description         | Auth Required | Role            |
| ------ | ------------------------------ | ------------------- | ------------- | --------------- |
| POST   | `/api/v1/subscriptions`        | Create subscription | Yes           | Org Admin       |
| GET    | `/api/v1/subscriptions`        | List subscriptions  | Yes           | Org Admin/Admin |
| GET    | `/api/v1/subscriptions/{id}`   | Get subscription    | Yes           | Org Admin/Admin |
| PUT    | `/api/v1/subscriptions/{id}`   | Update subscription | Yes           | Org Admin/Admin |
| POST   | `/api/v1/subscriptions/verify` | Verify subscription | Yes           | Admin           |
| DELETE | `/api/v1/subscriptions/{id}`   | Cancel subscription | Yes           | Org Admin/Admin |

### Event Endpoints

| Method | Endpoint                       | Description          | Auth Required | Role      |
| ------ | ------------------------------ | -------------------- | ------------- | --------- |
| POST   | `/api/v1/events`               | Create event         | Yes           | Org Admin |
| GET    | `/api/v1/events`               | List events          | Yes           | Any       |
| GET    | `/api/v1/events/{id}`          | Get event            | Yes           | Any       |
| PUT    | `/api/v1/events/{id}`          | Update event         | Yes           | Org Admin |
| DELETE | `/api/v1/events/{id}`          | Delete event         | Yes           | Org Admin |
| POST   | `/api/v1/events/{id}/checkin`  | Check-in to event    | Yes           | Member    |
| POST   | `/api/v1/events/{id}/checkout` | Check-out from event | Yes           | Member    |

### Organization Member Endpoints

| Method | Endpoint                                      | Description        | Auth Required | Role      |
| ------ | --------------------------------------------- | ------------------ | ------------- | --------- |
| POST   | `/api/v1/organization-members`                | Add member         | Yes           | Org Admin |
| POST   | `/api/v1/organization-members/join-request`   | Request to join    | Yes           | User      |
| POST   | `/api/v1/organization-members/approve`        | Approve request    | Yes           | Org Admin |
| GET    | `/api/v1/organization-members`                | List members       | Yes           | Org Admin |
| GET    | `/api/v1/organization-members/my-memberships` | User's memberships | Yes           | User      |
| PUT    | `/api/v1/organization-members/{id}`           | Update member      | Yes           | Org Admin |
| DELETE | `/api/v1/organization-members/{id}`           | Remove member      | Yes           | Org Admin |

---

## ⚠️ Error Handling

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Scenarios

1. **Authentication Errors**:
   - Invalid credentials
   - Expired tokens
   - Missing authorization header

2. **Authorization Errors**:
   - Insufficient role permissions
   - Accessing resources not owned by user

3. **Validation Errors**:
   - Missing required fields
   - Invalid data formats
   - Business rule violations

4. **Business Logic Errors**:
   - Creating events without active subscription
   - Duplicate organization names
   - Invalid event status transitions

---

## 🔒 Security Considerations

### Authentication

- JWT tokens with expiration
- Refresh token rotation
- Password hashing with bcrypt
- Email verification for account security

### Authorization

- Role-based access control (RBAC)
- Resource ownership validation
- Organization-scoped permissions

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting

### Security Headers

- CORS configuration
- Helmet.js security headers
- HTTPS enforcement (production)

---

## 🚀 Quick Start Example

Here's a complete example of the user flow:

### 1. Register User

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Create Organization with Subscription

```bash
curl -X POST http://localhost:4000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "name": "Tech Club",
    "description": "University Technology Club",
    "subscription": {
      "duration": "1year",
      "startDate": "2025-10-13T00:00:00.000Z",
      "paymentAmount": 500,
      "paymentMethod": "bank_transfer"
    }
  }'
```

### 3. Verify Subscription (requires admin token)

```bash
curl -X POST http://localhost:4000/api/v1/subscriptions/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "subscriptionId": "{subscription_id}",
    "verified": true
  }'
```

### 4. Create Event (after subscription approval)

```bash
curl -X POST http://localhost:4000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "title": "Tech Workshop",
    "startDateTime": "2025-10-20T14:00:00.000Z",
    "endDateTime": "2025-10-20T16:00:00.000Z",
    "location": "Lab 1"
  }'
```

---

## 📞 Support

For questions or issues regarding the AceTrack API:

- **API Base URL**: `http://localhost:4000/api/v1`
- **Health Check**: `http://localhost:4000/health`
- **Environment**: Development

---

_This documentation covers the complete user flow in the AceTrack attendance tracking system. The workflow ensures proper organization management, subscription handling, and event coordination with appropriate security and authorization controls._
