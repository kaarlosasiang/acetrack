# AceTrack API - Quick Reference Guide

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or pnpm

### Installation & Setup

```bash
# Clone repository
git clone <repository-url>
cd acetrack/api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=4000
API_PREFIX=/api
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/acetrack
MONGODB_DB_NAME=acetrack

# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📡 API Endpoints Quick Reference

### Base URL: `http://localhost:4000/api/v1`

### Authentication

```bash
# Register
POST /auth/register
Body: { email, password, firstName, lastName }

# Login
POST /auth/login
Body: { email, password }

# Refresh Token
POST /auth/refresh
Body: { refreshToken }

# Get Profile
GET /auth/profile
Header: Authorization: Bearer {token}
```

### Organizations

```bash
# Create Organization with Subscription
POST /organizations
Header: Authorization: Bearer {token}
Body: {
  name, description, address?, contactEmail?, contactPhone?,
  subscription: { duration, paymentAmount, paymentMethod?, startDate? }
}

# List Organizations
GET /organizations?page=1&limit=10&search=tech
Header: Authorization: Bearer {token}

# Get Organization
GET /organizations/{id}
Header: Authorization: Bearer {token}

# Update Organization
PUT /organizations/{id}
Header: Authorization: Bearer {token}
Body: { name?, description?, address? }
```

### Subscriptions

```bash
# Create Subscription
POST /subscriptions
Header: Authorization: Bearer {token}
Body: { organizationId, duration, startDate, paymentAmount }

# List Subscriptions
GET /subscriptions?organizationId={id}&status=active
Header: Authorization: Bearer {token}

# Verify Subscription (Admin only)
POST /subscriptions/verify
Header: Authorization: Bearer {admin_token}
Body: { subscriptionId, verified: true, notes? }
```

### Events

```bash
# Create Event
POST /events
Header: Authorization: Bearer {token}
Body: { title, startDateTime, endDateTime, location?, maxAttendees? }

# List Events
GET /events?organizationId={id}&status=published
Header: Authorization: Bearer {token}

# Update Event
PUT /events/{id}
Header: Authorization: Bearer {token}
Body: { title?, status?, startDateTime? }

# Event Check-in
POST /events/{id}/checkin
Header: Authorization: Bearer {token}
Body: { userId }
```

### Organization Members

```bash
# Add Member
POST /organization-members
Header: Authorization: Bearer {token}
Body: { userId, organizationId, role }

# Join Request
POST /organization-members/join-request
Header: Authorization: Bearer {token}
Body: { organizationId, message? }

# Approve Request
POST /organization-members/approve
Header: Authorization: Bearer {token}
Body: { membershipId, action: "approve"|"reject", role? }

# List Members
GET /organization-members?organizationId={id}
Header: Authorization: Bearer {token}
```

---

## 🔑 Common Request/Response Examples

### Successful Response Format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": {
    "items": [
      /* array of items */
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

---

## 🛠️ Development Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run test         # Run tests (if configured)

# Database
npm run db:seed      # Seed database (if script exists)
npm run db:migrate   # Run migrations (if configured)

# Production
npm run build        # Build for production
npm start           # Start production server
```

---

## 🔐 Authentication Flow

### 1. User Registration Flow

```bash
# Step 1: Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Password123!", "firstName": "John", "lastName": "Doe"}'

# Response includes access token - user can proceed immediately
# Email verification is optional but recommended
```

### 2. Organization & Subscription Setup Flow

```bash
# Step 2: Create Organization with Subscription (requires authentication)
curl -X POST http://localhost:4000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "name": "Tech Club",
    "description": "University Technology Club",
    "subscription": {
      "duration": "1year",
      "paymentAmount": 500,
      "paymentMethod": "bank_transfer"
    }
  }'

# User automatically becomes org_admin
# Subscription created with pending status
```

### 3. Subscription Verification Flow

```bash
# Step 3: Admin verifies subscription
curl -X POST http://localhost:4000/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{"organizationId": "{org_id}", "duration": "1year", "startDate": "2025-10-13T00:00:00.000Z", "paymentAmount": 500}'

# Subscription status starts as 'pending'
# Admin verification required to activate
```

---

## 📊 Data Models Quick Reference

### User Roles

- `user`: Basic user, can join organizations
- `org_admin`: Organization administrator, can manage their organization
- `admin`: System administrator, full access

### Subscription Durations

- `6months`: 6-month subscription
- `1year`: 1-year subscription
- `2years`: 2-year subscription

### Event Status Flow

```
draft → published → ongoing → completed
         ↓
     cancelled
```

### Subscription Status Flow

```
pending → active → expired
    ↓
cancelled
```

### Organization Member Roles

- `member`: Basic member, can attend events
- `officer`: Organization officer, can help manage events
- `org_admin`: Organization admin, full management access

---

## 🚨 Common Issues & Solutions

### Authentication Issues

```bash
# Issue: "Unauthorized" error
# Solution: Check if token is included and valid
curl -H "Authorization: Bearer {token}" ...

# Issue: Token expired
# Solution: Use refresh token to get new access token
curl -X POST /api/v1/auth/refresh -d '{"refreshToken": "{refresh_token}"}'
```

### Permission Issues

```bash
# Issue: "Insufficient permissions"
# Solution: Check user role and organization ownership
# Only org_admins can manage their organizations
# Only admins can verify subscriptions
```

### Subscription Issues

```bash
# Issue: Cannot create events
# Solution: Ensure organization has active subscription
GET /api/v1/subscriptions?organizationId={id}&status=active

# Issue: Subscription stuck in pending
# Solution: Admin needs to verify the subscription
POST /api/v1/subscriptions/verify
```

---

## 🧪 Testing with cURL

### Complete Flow Test

```bash
# 1. Register user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!", "firstName": "Test", "lastName": "User"}'

# Save the access token from response

# 2. Create organization with subscription
curl -X POST http://localhost:4000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "name": "Test Organization",
    "description": "Test Description",
    "subscription": {
      "duration": "1year",
      "startDate": "2025-10-13T00:00:00.000Z",
      "paymentAmount": 500,
      "paymentMethod": "bank_transfer"
    }
  }'

# Save the organization ID and subscription ID from response

# 3. Verify subscription (requires admin token)
curl -X POST http://localhost:4000/api/v1/subscriptions/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"subscriptionId": "{subscription_id}", "verified": true}'

# 4. Create event
curl -X POST http://localhost:4000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{"title": "Test Event", "startDateTime": "2025-10-20T14:00:00.000Z", "endDateTime": "2025-10-20T16:00:00.000Z"}'
```

---

## 📝 Additional Resources

### Documentation Files

- `USER_FLOW_DOCUMENTATION.md` - Complete user flow guide
- `TECHNICAL_IMPLEMENTATION_GUIDE.md` - Technical architecture details
- `API_DOCUMENTATION.md` - Detailed API documentation
- `README.md` - Project overview and setup

### Health Check

- URL: `http://localhost:4000/health`
- Returns server status, database connectivity, and system info

### Logging

- Development: Console output
- Production: File logging in `logs/` directory
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`

---

_This quick reference guide provides essential information for developers working with the AceTrack API. For detailed documentation, refer to the comprehensive guides mentioned above._
