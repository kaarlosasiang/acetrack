# Refresh Token Security Implementation

## Overview

This system implements secure refresh token handling using HTTPOnly cookies instead of localStorage to prevent XSS attacks and improve overall security.

## Security Benefits

### 1. XSS Protection

- **HTTPOnly Cookie**: Refresh tokens are stored in HTTPOnly cookies, making them inaccessible to JavaScript
- **No localStorage**: Eliminates the risk of token theft through XSS attacks

### 2. CSRF Protection

- **SameSite Cookie**: Configured with `SameSite=Lax` to prevent CSRF attacks
- **Secure Flag**: Automatically enabled for HTTPS connections

### 3. Token Rotation

- **Automatic Rotation**: New refresh tokens are issued on each refresh to limit exposure window
- **Invalidation**: Old refresh tokens are automatically invalidated

## Implementation Details

### Backend Changes

#### AuthController Updates

1. **Login**: Sets refresh token as HTTPOnly cookie instead of returning it in response
2. **Logout**: Clears the refresh token cookie
3. **Refresh**: Reads refresh token from cookie instead of request body
4. **Cookie Management**: Centralized cookie setting/clearing methods

#### Cookie Configuration

```php
// In config/app.php
define('COOKIE_DOMAIN', ''); // Set to your domain for production
define('COOKIE_SECURE', false); // Set to true in production with HTTPS
define('COOKIE_SAMESITE', 'Lax'); // CSRF protection
```

#### Cookie Settings

- **Name**: `refresh_token`
- **HTTPOnly**: `true` (prevents JavaScript access)
- **Secure**: `true` in production (HTTPS only)
- **SameSite**: `Lax` (CSRF protection)
- **Expiry**: 4x access token lifetime
- **Path**: `/` (available to entire application)

### Frontend Changes

#### AuthService Updates

1. **Login**: Only stores access token and user data in localStorage
2. **Logout**: Only clears localStorage (cookie cleared by backend)
3. **Refresh**: No longer sends refresh token in request body
4. **Token Management**: Removed refresh token localStorage operations

#### API Client Updates

1. **Automatic Refresh**: Uses cookie-based refresh without manual token handling
2. **Error Handling**: Improved session expiration handling
3. **CORS Configuration**: Ensures `withCredentials: true` for cookie support

## Migration Guide

### For Existing Users

1. **Automatic Migration**: Existing refresh tokens in localStorage will be ignored
2. **Re-login Required**: Users will need to log in again to get new HTTPOnly cookies
3. **Gradual Rollout**: Old tokens will expire naturally

### Development Setup

1. Update CORS configuration to allow credentials
2. Ensure `withCredentials: true` in API calls
3. Test cookie functionality in development environment

### Production Deployment

1. Set `COOKIE_SECURE = true` for HTTPS
2. Configure `COOKIE_DOMAIN` for your domain
3. Update frontend CORS configuration
4. Test cross-subdomain cookie sharing if needed

## Security Considerations

### Advantages

- **XSS Resilience**: Tokens cannot be stolen via JavaScript injection
- **Automatic Management**: Browsers handle cookie security features
- **CSRF Protection**: SameSite attribute prevents cross-site requests
- **Token Rotation**: Limits exposure window for compromised tokens

### Considerations

- **CORS Complexity**: Requires proper CORS configuration for credentials
- **Subdomain Sharing**: Domain configuration needed for cross-subdomain access
- **Development Testing**: More complex to test manually (can't easily copy tokens)

## Testing

### Manual Testing

1. **Login**: Verify refresh token cookie is set
2. **API Calls**: Confirm access token works for authenticated endpoints
3. **Token Refresh**: Test automatic token refresh on expiration
4. **Logout**: Verify cookie is cleared properly

### Browser DevTools

1. **Application Tab**: Check cookies in browser storage
2. **Network Tab**: Verify `withCredentials` in requests
3. **Console**: Confirm refresh token is not accessible via JavaScript

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `withCredentials: true` and proper CORS headers
2. **Cookie Not Set**: Check HTTPS requirements and domain configuration
3. **Refresh Fails**: Verify cookie path and domain settings
4. **Cross-Domain Issues**: Configure cookie domain for subdomains

### Debug Steps

1. Check browser developer tools for cookie presence
2. Verify CORS headers in network requests
3. Test in incognito mode to avoid cached cookies
4. Check server logs for cookie-related errors

## Configuration Examples

### Development

```php
define('COOKIE_DOMAIN', '');
define('COOKIE_SECURE', false);
define('COOKIE_SAMESITE', 'Lax');
```

### Production

```php
define('COOKIE_DOMAIN', '.yourdomain.com');
define('COOKIE_SECURE', true);
define('COOKIE_SAMESITE', 'Lax');
```

### Frontend CORS

```typescript
// API client configuration
{
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
```

This implementation significantly improves the security posture of the authentication system while maintaining a seamless user experience.
