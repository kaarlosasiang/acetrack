# CSRF Token Endpoints

The API provides CSRF (Cross-Site Request Forgery) token endpoints for security.

## Available Endpoints

### 1. Root-level CSRF endpoint (for frontend)
```
GET /csrf-token
```

**Response:**
```json
{
  "success": true,
  "csrf_token": "a1b2c3d4e5f6...",
  "message": "CSRF token generated successfully"
}
```

### 2. Auth module CSRF endpoint
```
GET /api/v1/auth/csrf-token
```

**Response:**
```json
{
  "success": true,
  "csrf_token": "a1b2c3d4e5f6...",
  "message": "CSRF token generated successfully"
}
```

## Usage

### With curl:
```bash
# Get CSRF token (root-level)
curl http://localhost:4000/csrf-token

# Get CSRF token (auth module)
curl http://localhost:4000/api/v1/auth/csrf-token
```

### Expected Response:
```json
{
  "success": true,
  "csrf_token": "64characterhexadecimalstringhere...",
  "message": "CSRF token generated successfully"
}
```

### With Frontend:
```typescript
// The frontend apiClient.ts already handles CSRF tokens automatically
// It fetches the token from /csrf-token and includes it in requests
// as X-CSRF-TOKEN header
```

## Implementation Details

- CSRF tokens are generated using `crypto.randomBytes(32).toString('hex')`
- Each token is 64 characters long (32 bytes in hex format)
- Tokens are stateless (no server-side storage required for this implementation)
- The frontend automatically includes the token in request headers as `X-CSRF-TOKEN`

## Security Notes

⚠️ **Important**: This is a basic CSRF token implementation. For production, consider:

1. **Session-based tokens**: Store tokens in sessions for better security
2. **Token validation**: Implement middleware to validate CSRF tokens on protected routes
3. **Token expiration**: Add expiration times to tokens
4. **SameSite cookies**: Use SameSite cookie attributes for additional protection

## Testing

```bash
# Start the API
pnpm dev:api

# Test root-level endpoint
curl http://localhost:4000/csrf-token

# Test auth module endpoint
curl http://localhost:4000/api/v1/auth/csrf-token
```

Both endpoints should return a valid CSRF token.

