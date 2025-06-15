# Environment Variables Configuration

This document describes the environment variable management system for the OpenData API project.

## Overview

The project uses a type-safe environment variable system with validation at startup. This ensures that:
- All required variables are present
- Values are properly formatted and typed
- Clear error messages are provided for misconfiguration
- Both development and production environments are supported

## Environment Files

### Local Development

Create a `.env.local` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env.local
```

### File Structure

- `.env.example` - Template with all required variables
- `.env.local` - Local development configuration (gitignored)
- `.env.production` - Production configuration (gitignored)
- `.env.staging` - Staging configuration (gitignored)

## Required Variables

### Supabase Configuration

```env
# Either use PUBLIC_ prefixed (recommended)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Or use legacy names (backward compatibility)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Service role key (required for both)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### JWT Configuration

```env
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

The JWT secret must be at least 32 characters long. Generate a secure secret:

```bash
openssl rand -base64 32
```

### Application Configuration

```env
NODE_ENV=development  # or 'staging' or 'production'
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info  # fatal, error, warn, info, debug, trace
```

### API URLs

```env
API_BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
```

### Rate Limiting

```env
RATE_LIMIT_TIER1=60   # requests per minute for tier1 users
RATE_LIMIT_TIER2=120  # requests per minute for tier2 users
RATE_LIMIT_TIER3=300  # requests per minute for tier3 users
RATE_LIMIT_WINDOW=60  # window size in seconds
```

### Data Directory

```env
DATA_DIRECTORY=./data  # where JSON data files are stored
```

## Validation

The application validates all environment variables at startup using Zod schemas. If validation fails, the application will not start and will display clear error messages.

### Validation Rules

1. **URLs** must be valid URLs with protocol (http:// or https://)
2. **Numbers** must be positive integers
3. **Enums** must match allowed values
4. **Strings** must meet minimum length requirements

### Error Messages

If validation fails, you'll see messages like:

```
Environment validation errors:
  PUBLIC_SUPABASE_URL: Invalid url
  JWT_SECRET: String must contain at least 32 character(s)
  NODE_ENV: Invalid enum value. Expected 'development' | 'staging' | 'production', received 'test'
```

## Type Safety

The environment configuration is fully typed in TypeScript:

```typescript
import { getEnvConfig } from '@/infrastructure/config';

const config = getEnvConfig();
// config is fully typed with all environment variables
```

## Testing

For testing, you can use the `resetEnvConfig()` function to clear the singleton cache:

```typescript
import { resetEnvConfig } from '@/infrastructure/config';

// In your test
beforeEach(() => {
  process.env.NODE_ENV = 'development';
  resetEnvConfig();
});
```

## Security Best Practices

1. **Never commit** `.env.local` or any file with real credentials
2. **Use different secrets** for development, staging, and production
3. **Rotate secrets regularly**, especially JWT secrets
4. **Limit access** to production environment variables
5. **Use environment-specific** values for all URLs and keys

## Backward Compatibility

The system supports both new (`PUBLIC_SUPABASE_*`) and legacy (`SUPABASE_*`) environment variable names for easier migration. However, we recommend using the `PUBLIC_` prefixed versions for clarity.

## Deployment

### Vercel

See [Vercel Environment Variables Setup Guide](./vercel-environment-variables.md) for Vercel-specific configuration.

### Docker

For Docker deployments, use environment files:

```bash
docker run --env-file .env.production your-image
```

### Kubernetes

Use ConfigMaps and Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
```

## Troubleshooting

### Common Issues

1. **Missing variables**: Check that all required variables are set
2. **Wrong format**: Ensure URLs include protocol, numbers are integers
3. **Wrong environment**: Verify NODE_ENV matches your deployment
4. **Permission issues**: Ensure the process can read .env files

### Debug Mode

Enable debug logging to see which variables are being loaded:

```env
LOG_LEVEL=debug
```

### Validation Script

Test your environment configuration:

```bash
npm run validate:env
```

This will load and validate all environment variables without starting the server.