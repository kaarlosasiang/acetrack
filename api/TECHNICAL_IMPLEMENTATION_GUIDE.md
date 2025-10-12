# AceTrack API - Technical Implementation Guide

This document provides detailed technical information about the AceTrack API implementation, including architecture, data models, and internal workflows.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models & Relationships](#data-models--relationships)
3. [Service Layer Architecture](#service-layer-architecture)
4. [Authentication & Authorization Flow](#authentication--authorization-flow)
5. [Database Schema](#database-schema)
6. [Business Logic Workflows](#business-logic-workflows)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Performance Considerations](#performance-considerations)

---

## 🏗️ Architecture Overview

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, Rate limiting, Mongo sanitization

### Project Structure

```
src/
├── models/           # Mongoose models and schemas
├── modules/          # Feature-based modules
│   ├── auth/         # Authentication & authorization
│   ├── organizations/# Organization management
│   ├── subscriptions/# Subscription handling
│   ├── events/       # Event management
│   └── organizationMembers/ # Member management
├── shared/           # Shared utilities and interfaces
│   ├── interfaces/   # TypeScript interfaces
│   ├── middleware/   # Express middleware
│   ├── utils/        # Utility functions
│   └── validators/   # Zod validation schemas
└── config/           # Configuration files
```

### Module Architecture Pattern

Each module follows a consistent object-based pattern:

```typescript
// Service Layer (Business Logic)
const moduleService = {
  createResource: async (data, userId) => {
    /* logic */
  },
  getResources: async (query, userContext) => {
    /* logic */
  },
  updateResource: async (id, data, userId) => {
    /* logic */
  },
  deleteResource: async (id, userId) => {
    /* logic */
  },
};

// Controller Layer (HTTP Handling)
const moduleController = {
  createResource: async (req, res, next) => {
    /* HTTP logic */
  },
  getResources: async (req, res, next) => {
    /* HTTP logic */
  },
  updateResource: async (req, res, next) => {
    /* HTTP logic */
  },
  deleteResource: async (req, res, next) => {
    /* HTTP logic */
  },
};

// Routes (Endpoint Definitions)
router.post('/', validateBody(schema), controller.createResource);
router.get('/', validateQuery(schema), controller.getResources);
```

---

## 🗃️ Data Models & Relationships

### Entity Relationship Diagram

```
User ──┐
       ├── Organization (adminUserId)
       └── OrganizationMember (userId)

Organization ──┐
               ├── Subscription (organizationId)
               ├── Event (organizationId)
               └── OrganizationMember (organizationId)

Event ──── EventAttendance (eventId, userId)

Subscription ──── User (verifiedBy)
```

### Core Models

#### User Model

```typescript
interface IUser {
  _id: ObjectId;
  email: string; // Unique identifier
  password: string; // Hashed with bcrypt
  firstName: string;
  lastName: string;
  username?: string; // Optional display name
  role: 'user' | 'org_admin' | 'admin';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Organization Model

```typescript
interface IOrganization {
  _id: ObjectId;
  name: string; // Must be unique
  description?: string;
  adminUserId: ObjectId; // Reference to User
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  memberCount: number; // Virtual field
  createdAt: Date;
  updatedAt: Date;
}
```

#### Subscription Model

```typescript
interface ISubscription {
  _id: ObjectId;
  organizationId: ObjectId; // Reference to Organization
  duration: '6months' | '1year' | '2years';
  startDate: Date;
  endDate: Date; // Auto-calculated from duration
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentAmount: number;
  paymentMethod?: string;
  receiptFile?: string;
  verifiedBy?: ObjectId; // Reference to Admin User
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isActive: boolean;
  daysRemaining: number;
  isExpiringSoon: boolean;
}
```

#### Event Model

```typescript
interface IEvent {
  _id: ObjectId;
  title: string;
  description?: string;
  organizationId: ObjectId; // Reference to Organization
  createdBy: ObjectId; // Reference to User (org admin)
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  maxAttendees?: number;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  category?: string;
  isPublic: boolean;
  requiresApproval: boolean;
  tags: string[];
  attendeeCount: number; // Virtual field
  createdAt: Date;
  updatedAt: Date;
}
```

#### OrganizationMember Model

```typescript
interface IOrganizationMember {
  _id: ObjectId;
  userId: ObjectId; // Reference to User
  organizationId: ObjectId; // Reference to Organization
  role: 'member' | 'officer' | 'org_admin';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  lastActive?: Date;
  joinRequestMessage?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ⚙️ Service Layer Architecture

### Business Logic Separation

Each service module encapsulates business logic and data access:

#### Authentication Service

```typescript
const authService = {
  // Core authentication functions
  registerUser: async userData => {
    /* Registration logic */
  },
  loginUser: async credentials => {
    /* Login logic */
  },
  generateTokens: user => {
    /* JWT token generation */
  },
  verifyToken: token => {
    /* Token validation */
  },
  refreshTokens: async refreshToken => {
    /* Token refresh */
  },

  // Email verification
  sendVerificationEmail: async user => {
    /* Email sending */
  },
  verifyEmail: async token => {
    /* Email verification */
  },

  // Password management
  requestPasswordReset: async email => {
    /* Reset request */
  },
  resetPassword: async (token, newPassword) => {
    /* Password reset */
  },
};
```

#### Organization Service

```typescript
const organizationService = {
  createOrganization: async (orgData, adminUserId) => {
    // 1. Validate organization data
    // 2. Check for duplicate names
    // 3. Create organization
    // 4. Update user role to org_admin
    // 5. Create initial membership record
    // 6. Return organization data
  },

  getOrganizations: async (query, userContext) => {
    // 1. Apply filters based on user role
    // 2. Implement pagination
    // 3. Add search functionality
    // 4. Return paginated results
  },

  updateOrganization: async (orgId, updateData, userId) => {
    // 1. Verify user permissions
    // 2. Validate update data
    // 3. Update organization
    // 4. Return updated data
  },
};
```

#### Subscription Service

```typescript
const subscriptionService = {
  createSubscription: async (subData, createdBy) => {
    // 1. Verify organization exists
    // 2. Check for existing active subscriptions
    // 3. Auto-calculate end date from duration
    // 4. Create subscription with 'pending' status
    // 5. Return subscription data
  },

  verifySubscription: async (verifyData, verifiedBy) => {
    // 1. Verify admin permissions
    // 2. Update subscription status
    // 3. Record verification details
    // 4. Enable organization features
  },

  calculateEndDate: (startDate, duration) => {
    // Utility function to calculate subscription end dates
    // 6months: +6 months, 1year: +1 year, 2years: +2 years
  },
};
```

---

## 🔐 Authentication & Authorization Flow

### JWT Token Management

#### Token Structure

```typescript
// Access Token Payload
{
  userId: string;
  email: string;
  role: 'user' | 'org_admin' | 'admin';
  organizationId?: string;  // If user is org_admin
  iat: number;              // Issued at
  exp: number;              // Expires at (15 minutes)
}

// Refresh Token Payload
{
  userId: string;
  tokenVersion: number;     // For token invalidation
  iat: number;
  exp: number;              // Expires at (7 days)
}
```

#### Authentication Middleware

```typescript
export const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    // 2. Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Fetch user data and attach to request
    const user = await User.findById(decoded.userId);
    req.user = user;

    // 4. Continue to next middleware
    next();
  } catch (error) {
    // Handle authentication errors
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
```

### Role-Based Access Control

#### Permission Matrix

| Action                  | User | Org Admin | Admin |
| ----------------------- | ---- | --------- | ----- |
| Register                | ✅   | ✅        | ✅    |
| Create Organization     | ✅   | ✅        | ✅    |
| Manage Own Organization | ❌   | ✅        | ✅    |
| Create Subscription     | ❌   | ✅        | ✅    |
| Verify Subscription     | ❌   | ❌        | ✅    |
| Create Events           | ❌   | ✅\*      | ✅    |
| Manage Members          | ❌   | ✅\*      | ✅    |

\*Requires active subscription

#### Authorization Checks

```typescript
// Organization ownership check
const checkOrganizationAccess = async (userId, organizationId) => {
  const user = await User.findById(userId);
  if (user.role === 'admin') return true;

  if (user.role === 'org_admin') {
    const org = await Organization.findOne({
      _id: organizationId,
      adminUserId: userId,
    });
    return !!org;
  }

  return false;
};

// Subscription requirement check
const checkActiveSubscription = async organizationId => {
  const subscription = await Subscription.findOne({
    organizationId,
    status: 'active',
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });
  return !!subscription;
};
```

---

## 🗄️ Database Schema

### Indexes for Performance

#### User Collection

```javascript
// Unique indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });

// Query optimization indexes
db.users.createIndex({ role: 1 });
db.users.createIndex({ isEmailVerified: 1 });
```

#### Organization Collection

```javascript
// Unique indexes
db.organizations.createIndex({ name: 1 }, { unique: true });

// Query optimization indexes
db.organizations.createIndex({ adminUserId: 1 });
db.organizations.createIndex({ isActive: 1 });
db.organizations.createIndex({ createdAt: -1 });
```

#### Subscription Collection

```javascript
// Query optimization indexes
db.subscriptions.createIndex({ organizationId: 1 });
db.subscriptions.createIndex({ status: 1 });
db.subscriptions.createIndex({ duration: 1 });
db.subscriptions.createIndex({ endDate: 1 });

// Compound indexes for common queries
db.subscriptions.createIndex({ organizationId: 1, status: 1 });
db.subscriptions.createIndex({ status: 1, endDate: 1 });
```

#### Event Collection

```javascript
// Query optimization indexes
db.events.createIndex({ organizationId: 1 });
db.events.createIndex({ createdBy: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ startDateTime: 1 });
db.events.createIndex({ isPublic: 1 });

// Text search index
db.events.createIndex({
  title: 'text',
  description: 'text',
  tags: 'text',
});

// Compound indexes
db.events.createIndex({ organizationId: 1, status: 1 });
db.events.createIndex({ status: 1, startDateTime: 1 });
```

### Data Validation Rules

#### Mongoose Schema Validation

```typescript
// Example: Organization schema with validation
const organizationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    unique: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    trim: true,
  },
  adminUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin user ID is required'],
  },
  // ... other fields with validation
});

// Pre-save middleware
organizationSchema.pre('save', async function (next) {
  // Custom validation logic
  if (this.isNew) {
    // Check if admin user exists and has appropriate role
    const admin = await User.findById(this.adminUserId);
    if (!admin) {
      throw new Error('Admin user not found');
    }
  }
  next();
});
```

---

## 🔄 Business Logic Workflows

### Organization Creation Workflow

```typescript
async function createOrganizationWorkflow(orgData, userId) {
  // Step 1: Validate user exists and can create organizations
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Step 2: Check for duplicate organization names
  const existing = await Organization.findOne({ name: orgData.name });
  if (existing) throw new AppError('Organization name already exists', 409);

  // Step 3: Create organization
  const organization = new Organization({
    ...orgData,
    adminUserId: userId,
  });
  await organization.save();

  // Step 4: Update user role to org_admin
  await User.findByIdAndUpdate(userId, { role: 'org_admin' });

  // Step 5: Create initial membership record
  const membership = new OrganizationMember({
    userId,
    organizationId: organization._id,
    role: 'org_admin',
    status: 'active',
    joinedAt: new Date(),
  });
  await membership.save();

  // Step 6: Return organization data
  return organization;
}
```

### Subscription Verification Workflow

```typescript
async function verifySubscriptionWorkflow(verifyData, adminId) {
  // Step 1: Verify admin permissions
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== 'admin') {
    throw new AppError('Only administrators can verify subscriptions', 403);
  }

  // Step 2: Find subscription
  const subscription = await Subscription.findById(verifyData.subscriptionId);
  if (!subscription) throw new AppError('Subscription not found', 404);

  // Step 3: Update subscription status
  const updateData = {
    verifiedBy: adminId,
    verifiedAt: new Date(),
    status: verifyData.verified ? 'active' : 'cancelled',
  };

  if (verifyData.notes) updateData.notes = verifyData.notes;

  // Step 4: Save changes
  const updatedSubscription = await Subscription.findByIdAndUpdate(
    verifyData.subscriptionId,
    updateData,
    { new: true }
  );

  // Step 5: Log action
  logger.info(
    `Subscription ${verifyData.verified ? 'approved' : 'rejected'}: ${verifyData.subscriptionId}`
  );

  return updatedSubscription;
}
```

### Event Creation Workflow

```typescript
async function createEventWorkflow(eventData, creatorId) {
  // Step 1: Verify user permissions
  const user = await User.findById(creatorId);
  if (!user || !['org_admin', 'admin'].includes(user.role)) {
    throw new AppError('Insufficient permissions to create events', 403);
  }

  // Step 2: Verify organization exists and user has access
  const organization = await Organization.findById(eventData.organizationId);
  if (!organization) throw new AppError('Organization not found', 404);

  if (user.role === 'org_admin' && organization.adminUserId.toString() !== creatorId) {
    throw new AppError('You can only create events for your organization', 403);
  }

  // Step 3: Check active subscription requirement
  const activeSubscription = await Subscription.findOne({
    organizationId: eventData.organizationId,
    status: 'active',
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  if (!activeSubscription) {
    throw new AppError('Organization must have an active subscription to create events', 400);
  }

  // Step 4: Create event
  const event = new Event({
    ...eventData,
    createdBy: creatorId,
    status: 'draft',
  });
  await event.save();

  return event;
}
```

---

## ⚡ Performance Considerations

### Query Optimization

#### Pagination Implementation

```typescript
async function getPaginatedResults(model, filter, options) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  // Use aggregation for complex queries with counts
  const results = await model.aggregate([
    { $match: filter },
    {
      $facet: {
        data: [{ $sort: options.sort || { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
        count: [{ $count: 'total' }],
      },
    },
  ]);

  const data = results[0].data;
  const total = results[0].count[0]?.total || 0;
  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: { page, limit, total, pages },
  };
}
```

#### Efficient Lookups

```typescript
// Use aggregation for efficient joins
const eventsWithAttendance = await Event.aggregate([
  { $match: { organizationId: orgId } },
  {
    $lookup: {
      from: 'eventattendances',
      localField: '_id',
      foreignField: 'eventId',
      as: 'attendances',
    },
  },
  {
    $addFields: {
      attendeeCount: { $size: '$attendances' },
    },
  },
  { $project: { attendances: 0 } }, // Remove detailed attendance data
]);
```

### Caching Strategy

#### Redis Caching (Future Enhancement)

```typescript
// Cache frequently accessed data
const cacheService = {
  get: async key => {
    // Get from Redis cache
  },

  set: async (key, data, ttl = 3600) => {
    // Set in Redis cache with TTL
  },

  invalidate: async pattern => {
    // Invalidate cache keys matching pattern
  },
};

// Usage in service layer
async function getOrganizations(query) {
  const cacheKey = `organizations:${JSON.stringify(query)}`;

  let result = await cacheService.get(cacheKey);
  if (!result) {
    result = await Organization.find(query);
    await cacheService.set(cacheKey, result, 1800); // 30 minutes
  }

  return result;
}
```

---

## 🛡️ Error Handling Strategy

### Centralized Error Handling

#### Custom Error Classes

```typescript
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}
```

#### Global Error Handler

```typescript
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message);
    error = new AppError(`Validation error: ${message}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

---

## 📊 Monitoring & Logging

### Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'acetrack-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Usage in services
logger.info('User registered', { userId, email });
logger.warn('Subscription expiring soon', { subscriptionId, daysRemaining });
logger.error('Database connection failed', { error: err.message });
```

### Health Monitoring

```typescript
// Health check endpoint with detailed status
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    checks: {
      database: 'unknown',
      memory: 'unknown',
    },
  };

  try {
    // Database connectivity check
    await mongoose.connection.db.admin().ping();
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'ERROR';
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

_This technical implementation guide provides comprehensive details about the AceTrack API architecture, data models, and internal workflows. Use this alongside the User Flow Documentation for complete understanding of the system._
