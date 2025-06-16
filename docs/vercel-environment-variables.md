# Vercel Environment Variables Setup Guide

This guide explains how to configure environment variables for the OpenData API when deploying to Vercel.

## Overview

Vercel provides three environment types:

- **Development**: Used when running `vercel dev` locally
- **Preview**: Used for preview deployments (pull requests)
- **Production**: Used for production deployments

## Required Environment Variables

### 1. Supabase Configuration

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Security Note**: The `SUPABASE_SERVICE_ROLE_KEY` should only be added to the backend environment, never exposed to the frontend.

### 2. JWT Configuration

```bash
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### 3. Application Configuration

```bash
NODE_ENV=production
LOG_LEVEL=info
API_BASE_URL=https://your-api-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 4. Rate Limiting

```bash
RATE_LIMIT_TIER1=60
RATE_LIMIT_TIER2=120
RATE_LIMIT_TIER3=300
RATE_LIMIT_WINDOW=60
```

### 5. OAuth Providers (Optional)

```bash
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
SUPABASE_AUTH_GOOGLE_SECRET=your-google-secret
SUPABASE_AUTH_GITHUB_CLIENT_ID=your-github-client-id
SUPABASE_AUTH_GITHUB_SECRET=your-github-secret
```

## Setting Environment Variables in Vercel

### Method 1: Vercel Dashboard

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable with the appropriate values
4. Select which environments should have access to each variable:
   - Development ✓
   - Preview ✓
   - Production ✓

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Set a variable for all environments
vercel env add PUBLIC_SUPABASE_URL

# Set a variable for production only
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Pull environment variables to .env.local
vercel env pull
```

### Method 3: Using vercel.json

For non-sensitive configuration, you can use `vercel.json`:

```json
{
  "env": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "info"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

## Environment-Specific Configuration

### Development Environment

For local development with Vercel:

```bash
# .env.development.local
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

### Preview Environment

For pull request previews:

```bash
# Set in Vercel Dashboard for Preview environment
API_BASE_URL=https://pr-{{PR_NUMBER}}-your-project.vercel.app
FRONTEND_URL=https://pr-{{PR_NUMBER}}-your-project.vercel.app
```

### Production Environment

For production deployments:

```bash
# Set in Vercel Dashboard for Production environment
API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

## Automatic Environment Variables

Vercel automatically provides these variables:

- `VERCEL`: Always `1` when running on Vercel
- `VERCEL_ENV`: `development`, `preview`, or `production`
- `VERCEL_URL`: The deployment URL
- `VERCEL_REGION`: The deployment region
- `VERCEL_GIT_COMMIT_SHA`: The git commit SHA
- `VERCEL_GIT_COMMIT_REF`: The git branch or tag

## Security Best Practices

1. **Never commit sensitive values**: Use Vercel's environment variables for all secrets
2. **Limit scope**: Only expose variables to the environments that need them
3. **Use different values**: Don't use production secrets in development/preview
4. **Rotate secrets regularly**: Update JWT secrets and API keys periodically
5. **Audit access**: Regularly review who has access to your Vercel project

## Validating Environment Variables

The application validates environment variables at startup. If any required variables are missing or invalid, the deployment will fail with clear error messages.

To test your configuration locally:

```bash
# Load environment variables and run validation
npm run build
```

## Troubleshooting

### Common Issues

1. **Missing environment variables**

   - Check the build logs in Vercel Dashboard
   - Ensure all required variables are set for the deployment environment

2. **Invalid values**

   - Verify URL formats include protocol (https://)
   - Ensure numeric values are positive integers
   - Check JWT secret is at least 32 characters

3. **Environment mismatch**
   - Verify NODE_ENV matches the Vercel environment
   - Check that URLs point to the correct domains

### Debug Commands

```bash
# List all environment variables for a project
vercel env ls

# Show details of a specific variable
vercel env get PUBLIC_SUPABASE_URL

# Remove a variable
vercel env rm VARIABLE_NAME
```

## Migration from Other Platforms

If migrating from another platform:

1. Export existing environment variables
2. Map variable names to match the application's expectations
3. Update OAuth redirect URLs in provider dashboards
4. Test thoroughly in preview environment before production

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Security Best Practices](https://vercel.com/docs/concepts/projects/environment-variables#security-considerations)
