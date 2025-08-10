# Supabase Configuration

This directory contains the production-ready Supabase configuration for AceTrack.

## Files Overview

- `supabase.ts` - Main Supabase client configuration
- `../types/database.ts` - TypeScript type definitions for the database schema
- `../utils/supabase-utils.ts` - Utility functions for common database operations

## Setup

1. **Environment Variables**: Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, keep secret)

2. **Get Supabase Credentials**:
   - Go to your [Supabase dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings > API
   - Copy the URL and keys

## Usage Examples

### Basic Client Usage

```typescript
import { supabase } from '@/lib/config/supabase'

// Get current user
const { data: user } = await supabase.auth.getUser()

// Query data
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('is_active', true)
```

### Using Utility Functions

```typescript
import { auth, events, attendances } from '@/lib/utils/supabase-utils'

// Authentication
const session = await auth.getSession()
await auth.signIn('user@example.com', 'password')

// Events
const activeEvents = await events.getEvents({ isActive: true })
const newEvent = await events.createEvent({
  title: 'New Event',
  event_date: '2024-01-01',
  // ... other fields
})

// Attendance
await attendances.checkIn('event-id', 'user-id', true)
const userAttendance = await attendances.getAttendances({ userId: 'user-id' })
```

### Server-Side Usage

```typescript
import { createServerClient } from '@/lib/config/supabase'

// In API routes or server actions
export async function GET() {
  const supabase = createServerClient()
  
  const { data } = await supabase
    .from('users')
    .select('*')
  
  return Response.json(data)
}
```

### Real-time Subscriptions

```typescript
import { realtime } from '@/lib/utils/supabase-utils'

// Subscribe to attendance changes for an event
const subscription = realtime.subscribeToEventAttendance(
  'event-id',
  (payload) => {
    console.log('Attendance changed:', payload)
  }
)

// Don't forget to unsubscribe
subscription.unsubscribe()
```

## Type Safety

The configuration provides full TypeScript support:

```typescript
import type { User, Event, Attendance } from '@/lib/types/database'

// Fully typed database operations
const user: User = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

## Error Handling

Use the built-in error handler for consistent error messages:

```typescript
import { handleSupabaseError } from '@/lib/config/supabase'

try {
  await supabase.from('users').insert(userData)
} catch (error) {
  const userFriendlyMessage = handleSupabaseError(error)
  console.error(userFriendlyMessage)
}
```

## Security Features

- ✅ Environment validation on startup
- ✅ URL format validation
- ✅ Separate client/server configurations
- ✅ PKCE flow for OAuth
- ✅ Session persistence with custom storage key
- ✅ Rate limiting for real-time connections
- ✅ Proper TypeScript types to prevent runtime errors

## Database Schema

The database includes the following main tables:

- **users** - User profiles and authentication data
- **events** - Class sessions and activities
- **attendances** - Attendance records with check-in/out times

See `../types/database.ts` for complete schema definitions.

## Development Tips

1. **Health Check**: Use `checkSupabaseConnection()` to verify database connectivity
2. **Debugging**: Development logs show connection status and configuration
3. **Type Generation**: Consider using Supabase CLI to auto-generate types:
   ```bash
   npx supabase gen types typescript --project-id your-project-id > src/lib/types/database.ts
   ```

## Production Checklist

- [ ] Environment variables are set in production
- [ ] Row Level Security (RLS) policies are configured
- [ ] Database indexes are optimized for your queries
- [ ] Backup and recovery procedures are in place
- [ ] Monitoring and alerting are configured
- [ ] API rate limits are appropriate for your usage

## Troubleshooting

### Connection Issues
- Verify environment variables are correctly set
- Check Supabase project status in dashboard
- Ensure your deployment platform has access to external URLs

### Authentication Issues
- Verify email templates are configured
- Check redirect URLs in Supabase Auth settings
- Ensure proper error handling in your auth flows

### Performance Issues
- Review database queries for efficiency
- Consider implementing caching strategies
- Monitor real-time connection usage
