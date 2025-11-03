# API Routes Documentation

## Base URL
All API routes are prefixed with `/api/v1`

## Available Endpoints

### Health Check
- `GET /health` - Check API health status (no prefix)

### API Info
- `GET /api/v1` - Get API information and available endpoints

### CSRF Token
- `GET /csrf-token` - Get CSRF token (root-level, for frontend compatibility)

---

## Authentication Routes (`/api/v1/auth`)

### Public Routes
- `GET /api/v1/auth/csrf-token` - Get CSRF token
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/forgot-password` - Send password reset email
- `POST /api/v1/auth/reset-password/:token` - Reset password with token
- `GET /api/v1/auth/verify-email/:token` - Verify email with token

### Protected Routes
- `GET /api/v1/auth/profile` - Get current user profile

---

## Event Routes (`/api/v1/events`)

### Public Routes
- `GET /api/v1/events/public` - Get public events (published events only)

### Protected Routes
- `POST /api/v1/events` - Create a new event
- `GET /api/v1/events` - Get events with pagination and filtering
- `GET /api/v1/events/stats` - Get event statistics
- `POST /api/v1/events/restore` - Restore deleted event
- `GET /api/v1/events/upcoming/:organizationId` - Get upcoming events for an organization
- `GET /api/v1/events/:id` - Get event by ID
- `PUT /api/v1/events/:id` - Update event
- `PATCH /api/v1/events/:id/status` - Update event status
- `DELETE /api/v1/events/:id` - Delete event (soft delete by default, permanent if ?permanently=true)
- `GET /api/v1/events/organizations/:organizationId/events` - Get events for a specific organization

---

## Organization Routes (`/api/v1/organizations`)

### Public Routes
- `GET /api/v1/organizations/public` - Get public organizations

### Protected Routes
- `GET /api/v1/organizations/my-organizations` - Get organizations where current user is a member
- `POST /api/v1/organizations` - Create a new organization
- `GET /api/v1/organizations` - Get all organizations with pagination
- `GET /api/v1/organizations/:id` - Get organization by ID
- `PUT /api/v1/organizations/:id` - Update organization
- `DELETE /api/v1/organizations/:id` - Delete organization (soft delete)

---

## Organization Member Routes (`/api/v1/organization-members`)

### Protected Routes
- `POST /api/v1/organization-members` - Add a member to an organization (direct add by admin/org_admin)
- `POST /api/v1/organization-members/join-request` - Request to join an organization
- `POST /api/v1/organization-members/approve` - Approve or reject a join request
- `GET /api/v1/organization-members` - Get organization members with pagination and filtering
- `GET /api/v1/organization-members/my-memberships` - Get current user's organization memberships
- `PUT /api/v1/organization-members/:id` - Update member role or status
- `DELETE /api/v1/organization-members/:id` - Remove member from organization
- `GET /api/v1/organization-members/organizations/:organizationId/members` - Get members for a specific organization
- `GET /api/v1/organization-members/organizations/:organizationId/join-requests` - Get pending join requests for an organization

---

## Subscription Routes (`/api/v1/subscriptions`)

### Protected Routes
- `POST /api/v1/subscriptions` - Create a new subscription
- `GET /api/v1/subscriptions` - Get subscriptions with pagination and filtering
- `GET /api/v1/subscriptions/stats` - Get subscription statistics
- `GET /api/v1/subscriptions/expiring` - Get expiring subscriptions
- `GET /api/v1/subscriptions/:id` - Get subscription by ID
- `PUT /api/v1/subscriptions/:id` - Update subscription
- `POST /api/v1/subscriptions/:id/verify` - Verify subscription (approve/reject)
- `DELETE /api/v1/subscriptions/:id` - Cancel subscription
- `GET /api/v1/subscriptions/organizations/:organizationId/subscription` - Get organization's current subscription

---

## Access Levels

- **Public** - No authentication required
- **Private** - Requires authentication
- **Private (member)** - Requires member role or higher
- **Private (org_admin)** - Requires organization admin role or higher
- **Private (admin)** - Requires admin role

---

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Filtering
- `search` - Search term
- `status` - Filter by status
- `sort` - Sort field
- `order` - Sort order (asc/desc)

### Event-specific
- `organizationId` - Filter by organization
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `eventType` - Filter by event type

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error type",
  "stack": "Stack trace (development only)"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Testing Endpoints

You can test the API using:
- **Postman** - Import the routes above
- **cURL** - Command line tool
- **Thunder Client** - VS Code extension
- **REST Client** - VS Code extension

### Example cURL Request
```bash
# Health check
curl http://localhost:4000/health

# Get API info
curl http://localhost:4000/api/v1

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get profile (with token)
curl http://localhost:4000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

