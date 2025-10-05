# Auth Context Usage Guide

This guide demonstrates how to use the new cookie-based auth context in your components.

## Auth Screen Protection

### Automatic Redirect for Authenticated Users

All authentication screens (login, register, forgot password) are now protected against access by authenticated users:

```tsx
"use client";

import { useGuestGuard } from "@/lib/hooks/useAuthGuard";
import { AuthPageLoading } from "@/components/common/auth-loading";

export default function LoginPage() {
  // Automatically redirects authenticated users to dashboard
  const { isLoading } = useGuestGuard();

  if (isLoading) {
    return <AuthPageLoading message="Redirecting..." />;
  }

  return <div>{/* Your login form */}</div>;
}
```

### Custom Redirect Configuration

You can customize where authenticated users are redirected:

```tsx
// Redirect to specific page
const { isLoading } = useGuestGuard({
  redirectTo: "/dashboard/overview",
});

// Don't preserve intended redirect path
const { isLoading } = useGuestGuard({
  shouldPreservePath: false,
});

// Custom configuration
const { isLoading } = useGuestGuard({
  redirectTo: "/admin",
  shouldPreservePath: false,
});
```

### Redirect Flow Examples

**Scenario 1: User tries to access login while authenticated**

1. User navigates to `/login`
2. `useGuestGuard` detects authentication
3. Redirects to `/dashboard` (or saved redirect path)

**Scenario 2: User logs out and tries to access protected route**

1. User logs out
2. Tries to access `/dashboard`
3. `useAuthGuard` saves current path and redirects to `/login`
4. User logs in successfully
5. `useGuestGuard` finds saved path and redirects back to `/dashboard`

**Scenario 3: Direct navigation to auth screens when authenticated**

1. Authenticated user tries to visit `/register`
2. `useGuestGuard` immediately redirects to dashboard
3. User never sees the registration form

### 1. Login Component Example

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/authContext";
import { useGuestGuard } from "@/lib/hooks/useAuthGuard";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already authenticated
  useGuestGuard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login({ email, password });
    if (success) {
      // Redirect will be handled automatically by the context
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

### 2. Protected Component Example

```tsx
"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();

  // Protect this route - redirect to login if not authenticated
  const { isLoading } = useAuthGuard();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.first_name}!</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>

      <button onClick={refreshUser}>Refresh Profile</button>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Role-Based Protection

```tsx
"use client";

import { useRoleGuard } from "@/lib/hooks/useAuthGuard";

export default function AdminPage() {
  const { isLoading, hasAllowedRole } = useRoleGuard(["admin", "super_admin"]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasAllowedRole) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin-only content */}
    </div>
  );
}
```

### 4. Navigation Component with Auth State

```tsx
"use client";

import { useAuth } from "@/lib/contexts/authContext";
import Link from "next/link";

export default function Navigation() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  if (isLoading) {
    return <nav>Loading...</nav>;
  }

  return (
    <nav>
      <Link href="/">Home</Link>

      {isAuthenticated ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <span>Hello, {user?.first_name}!</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
```

### 5. Registration Component

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/authContext";
import { useGuestGuard } from "@/lib/hooks/useAuthGuard";

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  // Redirect if already authenticated
  useGuestGuard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(formData);
    if (success) {
      // Show success message - user needs to verify email
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.first_name}
        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
        placeholder="First Name"
        required
      />
      {/* Other form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
```

### 6. Conditional Rendering Hook

```tsx
"use client";

import { useAuthCheck, useRole } from "@/lib/contexts/authContext";

export default function ConditionalContent() {
  const { isAuthenticated, isLoading, user } = useAuthCheck();
  const isAdmin = useRole("admin");

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome back, {user?.first_name}!</p>
          {isAdmin && <div>Admin-only content here</div>}
        </div>
      ) : (
        <div>Please log in to continue</div>
      )}
    </div>
  );
}
```

## Key Features

### 🔐 **Automatic Token Management**

- Access tokens stored in localStorage
- Refresh tokens handled via HTTPOnly cookies
- Automatic token refresh on API calls
- Session expiration handling

### 🛡️ **Route Protection**

- `useAuthGuard()` - Protects authenticated routes
- `useGuestGuard()` - Protects guest-only routes (login/register)
- `useRoleGuard()` - Role-based access control

### 🔄 **State Synchronization**

- Syncs auth state across browser tabs
- Handles logout in one tab affecting others
- Automatic redirect after login

### 🎯 **User Experience**

- Loading states during auth operations
- Error handling with toast notifications
- Redirect preservation (return to intended page after login)

### 📱 **Responsive Design**

- Works with Next.js app router
- Client-side state management
- Server-side compatible

## Security Benefits

1. **XSS Protection**: Refresh tokens in HTTPOnly cookies
2. **CSRF Protection**: SameSite cookie attributes
3. **Token Rotation**: New refresh tokens on each use
4. **Automatic Cleanup**: Tokens cleared on logout
5. **Session Management**: Multi-tab logout handling

## Migration from Old System

If you're migrating from the old localStorage-based refresh tokens:

1. Users will need to log in again (old refresh tokens are ignored)
2. Update any components using the old auth patterns
3. Remove manual refresh token handling
4. Use the new auth hooks for route protection

This new system provides better security while maintaining a smooth user experience!
