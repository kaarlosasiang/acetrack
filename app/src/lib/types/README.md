# Types Organization for AceTrack

This directory contains all TypeScript type definitions for the AceTrack application, organized by entity and purpose.

## File Structure

```
types/
├── index.ts              # Main export file - import everything from here
├── Database.ts           # Core Supabase database schema
├── User.ts              # User-related types and utilities
├── Event.ts             # Event-related types and utilities
├── Attendance.ts        # Attendance-related types and utilities
└── README.md           # This file
```

## Import Patterns

### Option 1: Import from specific files (recommended for single-entity usage)
```typescript
import type { User, UserProfile, UserFilters } from '@/lib/types/User'
import { getUserDisplayName, isAdmin } from '@/lib/types/User'
```

### Option 2: Import from main index (recommended for multi-entity usage)
```typescript
import type { 
  User, 
  Event, 
  Attendance,
  EventWithStats,
  AttendanceWithDetails 
} from '@/lib/types'
```

### Option 3: Import database schema directly (for Supabase client setup)
```typescript
import type { Database } from '@/lib/types/Database'
```

## Type Categories

### Core Database Types
Located in `Database.ts` - These are the base types that match your Supabase schema:
- `Database` - Main database interface
- `Tables<T>` - Type helper for table rows
- `TablesInsert<T>` - Type helper for insertions
- `TablesUpdate<T>` - Type helper for updates
- `Enums<T>` - Type helper for enums

### Entity Types
Each entity (User, Event, Attendance) has its own file with:
- **Core types**: Basic database row types
- **Extended types**: Types with additional computed properties
- **Operation types**: Types for CRUD operations
- **Filter types**: Types for querying and filtering
- **Utility functions**: Helper functions for common operations
- **Constants**: Enums, labels, and other constants

## Type Naming Conventions

- `EntityName` - Core database row type (e.g., `User`, `Event`)
- `EntityNameInsert` - Type for database insertions
- `EntityNameUpdate` - Type for database updates
- `EntityNameWith*` - Extended types with additional data (e.g., `UserWithStats`)
- `EntityName*Data` - Types for API requests/responses (e.g., `EventCreationData`)
- `EntityNameFilters` - Types for query filters

## Examples

### Working with Users
```typescript
import type { 
  User, 
  UserProfile, 
  UserRegistrationData 
} from '@/lib/types/User'
import { 
  getUserDisplayName, 
  isAdmin, 
  toUserProfile 
} from '@/lib/types/User'

// Basic user type
const user: User = await getUser(id)

// Extended user with computed properties
const profile: UserProfile = toUserProfile(user)

// Check user role
if (isAdmin(user)) {
  // Admin-only logic
}

// Registration data
const registrationData: UserRegistrationData = {
  email: 'user@example.com',
  password: 'secure-password',
  fullName: 'John Doe',
  role: 'student'
}
```

### Working with Events
```typescript
import type { 
  Event, 
  EventWithStats, 
  EventCreationData,
  EventFilters 
} from '@/lib/types/Event'
import { 
  getEventStatus, 
  canCheckIn, 
  formatEventTime 
} from '@/lib/types/Event'

// Create event
const eventData: EventCreationData = {
  title: 'Math Class',
  eventDate: new Date(),
  startTime: '09:00',
  endTime: '10:30'
}

// Check event status
const status = getEventStatus(event)

// Filter events
const filters: EventFilters = {
  course: 'Mathematics',
  status: 'upcoming'
}
```

### Working with Attendance
```typescript
import type { 
  Attendance, 
  AttendanceWithDetails,
  AttendanceCheckInData 
} from '@/lib/types/Attendance'
import { 
  canCheckIn, 
  formatAttendanceTime,
  calculateAttendanceRate 
} from '@/lib/types/Attendance'

// Check-in data
const checkInData: AttendanceCheckInData = {
  eventId: 'event-id',
  userId: 'user-id',
  locationVerified: true
}

// Calculate attendance rate
const rate = calculateAttendanceRate({
  totalEvents: 10,
  presentCount: 8,
  lateCount: 1
}) // Returns 90
```

## Best Practices

1. **Import Specificity**: Import only what you need to keep bundle size small
2. **Type Safety**: Always use the provided types rather than `any` or generic objects
3. **Utility Functions**: Use the provided utility functions for consistent behavior
4. **Constants**: Use the provided constants for labels, colors, and status values
5. **Validation**: Use the validation functions (like `canCheckIn`) before performing operations

## Extending Types

When you need additional properties or behavior:

1. **For database schema changes**: Update `Database.ts`
2. **For computed properties**: Add to the respective entity file (e.g., `User.ts`)
3. **For new utility functions**: Add to the respective entity file with proper JSDoc
4. **For cross-entity types**: Consider creating a new specialized file

## Type Generation

The database types in `Database.ts` can be auto-generated from your Supabase schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/types/Database.ts
```

After generation, you may need to adjust the file structure to match our organization.

## Migration Guide

If you're updating from the old single-file approach:

### Before
```typescript
import type { User, Event, Database } from '@/lib/types/database'
```

### After
```typescript
// Option 1: Specific imports
import type { User } from '@/lib/types/User'
import type { Event } from '@/lib/types/Event'
import type { Database } from '@/lib/types/Database'

// Option 2: Combined import
import type { User, Event, Database } from '@/lib/types'
```

The types themselves remain the same, only the import paths have changed.
