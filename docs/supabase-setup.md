# Supabase Setup Guide

This guide explains how to set up Supabase for the Open Data API project.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (create one at https://supabase.com)
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

## Local Development Setup

### 1. Install Supabase CLI

The Supabase CLI is already installed as a dev dependency:

```bash
npm install
```

### 2. Start Supabase Locally

```bash
npx supabase start
```

This will start the following services:

- **Database**: PostgreSQL on port 54322
- **Auth**: Authentication service on port 54321
- **Studio**: Database management UI on port 54323
- **Inbucket**: Email testing service on port 54324

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Update the values with your local Supabase credentials (shown after running `supabase start`).

## Production Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New project"
3. Fill in the project details:
   - Name: "OpenData API"
   - Database Password: (generate a strong password)
   - Region: Choose the closest to your users
   - Pricing Plan: Free tier is sufficient for development

### 2. Configure Authentication

#### Enable Social Providers

1. Go to Authentication → Providers in your Supabase dashboard
2. Enable Google:

   - Click on Google
   - Toggle "Enable Google provider"
   - Add your Google OAuth credentials
   - Redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

3. Enable GitHub:
   - Click on GitHub
   - Toggle "Enable GitHub provider"
   - Add your GitHub OAuth credentials
   - Redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

#### Configure JWT Settings

1. Go to Settings → Auth
2. Set JWT expiry to 3600 seconds (1 hour)
3. Enable refresh token rotation
4. Set refresh token expiry to 2592000 seconds (30 days)

### 3. Get Your Project Credentials

1. Go to Settings → API
2. Copy the following values to your `.env.local`:
   - `PUBLIC_SUPABASE_URL`: Your project URL
   - `PUBLIC_SUPABASE_ANON_KEY`: The `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY`: The `service_role` key (keep this secret!)

### 4. Database Schema

The database schema will be automatically created by the application when it starts. The following tables will be created:

- `rate_limits`: Stores API rate limit data per user
- `auth_logs`: Stores authentication event logs

## OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local development)
5. Copy Client ID and Client Secret to environment variables

### GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: "OpenData API"
   - Homepage URL: Your app URL
   - Authorization callback URL:
     - `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local development)
4. Copy Client ID and Client Secret to environment variables

## Custom JWT Hook (Optional)

To automatically add user tier information to JWT tokens, you can create a custom hook:

```sql
-- Create a function to add custom claims to JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add tier information to the JWT
  IF event->>'user_id' IS NOT NULL THEN
    -- Get or create user tier
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = (event->>'user_id')::uuid
      AND raw_app_meta_data->>'tier' IS NOT NULL
    ) THEN
      -- Set default tier for new users
      UPDATE auth.users
      SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"tier": "tier1"}'::jsonb
      WHERE id = (event->>'user_id')::uuid;
    END IF;

    -- Add tier to claims
    event = jsonb_set(event, '{claims,tier}',
      COALESCE(
        (SELECT raw_app_meta_data->>'tier'
         FROM auth.users
         WHERE id = (event->>'user_id')::uuid)::jsonb,
        '"tier1"'::jsonb
      )
    );
  END IF;

  RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Configure the hook in your Supabase dashboard under Auth Hooks
```

## Troubleshooting

### Common Issues

1. **Local Supabase won't start**

   - Make sure Docker is running
   - Check if ports are already in use
   - Try `npx supabase stop` then `npx supabase start`

2. **Authentication errors**

   - Verify environment variables are correctly set
   - Check redirect URLs match exactly
   - Ensure OAuth apps are properly configured

3. **Database connection issues**
   - Check if Supabase services are running
   - Verify database URL and credentials
   - Check firewall/network settings

## Useful Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# View local Supabase status
npx supabase status

# Reset local database
npx supabase db reset

# Create a new migration
npx supabase migration new <migration_name>

# Run migrations
npx supabase db push

# Generate TypeScript types from database
npx supabase gen types typescript --local > packages/shared/supabase-types.ts
```

## Security Best Practices

1. **Never commit secrets**: Use environment variables for all sensitive data
2. **Use RLS (Row Level Security)**: Enable RLS on all tables
3. **Validate input**: Always validate data on both client and server
4. **Rate limiting**: Implement rate limiting to prevent abuse
5. **Monitor usage**: Regularly check your Supabase dashboard for unusual activity

## Setting Up for Development

### Quick Start

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd opendata-api
   npm install
   ```

2. **Setup environment variables**:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start local Supabase (optional)**:

   ```bash
   npx supabase start
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Verifying Setup

To verify your Supabase setup is working correctly:

1. **Check Supabase connection**:

   ```bash
   npm run test:supabase
   ```

2. **Test authentication flow**:

   - Navigate to http://localhost:5173
   - Click on "Sign in with Google" or "Sign in with GitHub"
   - You should be redirected to the OAuth provider
   - After authentication, you should be redirected back to the dashboard

3. **Check rate limiting**:
   - Make API requests to test rate limiting
   - Check the headers for rate limit information

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables are set in production
- [ ] OAuth redirect URLs are configured for production domain
- [ ] Database migrations are run
- [ ] RLS policies are enabled on all tables
- [ ] API keys are restricted to specific domains
- [ ] Monitoring and alerts are configured
- [ ] Backup strategy is in place
