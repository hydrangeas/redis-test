# Security Configuration

This document describes the security features and configurations implemented in the backend API.

## CORS (Cross-Origin Resource Sharing)

### Configuration

CORS is configured through environment variables and the security configuration service.

#### Allowed Origins

- Default: `FRONTEND_URL` environment variable
- Development mode: Additionally allows `localhost:3000`, `localhost:5173`, `127.0.0.1:3000`, `127.0.0.1:5173`
- Custom origins: Can be added via `CORS_ALLOWED_ORIGINS` environment variable (comma-separated)

#### Allowed Methods

- GET, POST, PUT, DELETE, PATCH, OPTIONS

#### Allowed Headers

- Content-Type
- Authorization
- X-Request-ID
- X-API-Key
- X-Client-Version

#### Exposed Headers

- X-Request-ID
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- X-API-Version

#### Credentials

- Enabled (cookies and authorization headers are allowed)

#### Preflight Cache

- 24 hours (86400 seconds)

## Security Headers

### Content Security Policy (CSP)

Production:
```
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data: https:;
connect-src 'self' [SUPABASE_URL];
font-src 'self';
object-src 'none';
media-src 'none';
frame-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

Development mode relaxes some restrictions for hot reload and API documentation.

### HTTP Strict Transport Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Other Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

### API-Specific Headers

- `X-API-Version`: Set from `API_VERSION` env var (default: 1.0.0)
- `X-Request-ID`: Unique request identifier for tracing
- `Cache-Control`: API endpoints use `no-store, no-cache, must-revalidate, private`

## Path Validation

### Path Traversal Prevention

The following patterns are blocked:
- `..` (parent directory traversal)
- URL encoded traversal (`%2e%2e`, `%2F`, `%5C`)
- Double URL encoded dots
- Null bytes (`\x00`)
- Double slashes (`//`)
- Backslashes (`\`)

### Hidden File Protection

- Access to files/directories starting with `.` is blocked
- Exception: `.well-known` directory is allowed

### Path Constraints

- Maximum path length: 2048 characters
- Valid characters: alphanumeric, underscore, hyphen, dot
- Path segments must not exceed 255 characters

## Input Sanitization

### Query Parameter Sanitization

All query parameters are automatically sanitized to prevent XSS attacks:
- HTML entities are escaped
- JavaScript protocols are removed
- Event handlers are stripped
- Non-printable characters are removed

### Request Body Sanitization

JSON request bodies are sanitized with:
- Maximum object depth: 10 levels
- Key length limit: 255 characters
- String values are HTML-escaped
- Dangerous patterns are removed

### Sanitization Functions

The following functions are available on the request object:
- `request.sanitizeInput(string)`: Sanitize a single string value
- `request.sanitizeJson(object, maxDepth)`: Recursively sanitize JSON object

## Rate Limiting

Rate limits are configured per tier:
- Tier 1: 60 requests/minute (default)
- Tier 2: 120 requests/minute
- Tier 3: 300 requests/minute

Configurable via environment variables:
- `RATE_LIMIT_TIER1`
- `RATE_LIMIT_TIER2`
- `RATE_LIMIT_TIER3`
- `RATE_LIMIT_WINDOW` (in seconds)

## Best Practices

1. **Always validate and sanitize user input** - Use the provided sanitization functions
2. **Use parameterized queries** - Never concatenate user input into SQL queries
3. **Implement proper authentication** - All API endpoints except health and docs require authentication
4. **Log security events** - Failed validations and suspicious activities are logged
5. **Keep dependencies updated** - Regularly update security-critical dependencies
6. **Use HTTPS in production** - Ensure all traffic is encrypted
7. **Implement proper error handling** - Don't expose sensitive information in error messages

## Security Testing

Run security tests:
```bash
npm test -- security.test.ts
```

Check for vulnerabilities:
```bash
npm audit
```

## Incident Response

If a security issue is detected:
1. Check logs for suspicious activity patterns
2. Review rate limit violations
3. Check for path traversal attempts
4. Monitor authentication failures
5. Review CORS policy violations

Logs include:
- IP addresses
- User agents
- Request paths
- Timestamps
- Error details