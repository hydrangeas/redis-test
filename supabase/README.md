# Supabase Configuration

This directory contains the Supabase configuration for the OpenData API project.

## Structure

```
supabase/
├── config.toml          # Supabase CLI configuration
├── migrations/          # Database migrations
│   └── *.sql           # SQL migration files
├── functions/          # Edge functions (if needed)
└── .gitignore         # Git ignore rules
```

## Setup Instructions

### 1. Install Supabase CLI

The Supabase CLI is already included as a dev dependency:

```bash
npm install
```

### 2. Start Local Supabase

```bash
npm run supabase:start
```

This will start:
- PostgreSQL database on port 54322
- Auth service on port 54321
- Supabase Studio on port 54323
- Email testing (Inbucket) on port 54324

### 3. Run Migrations

```bash
npm run supabase:db:push
```

This will create the following tables:
- `auth_logs` - Authentication event logging
- `rate_limits` - API rate limiting data
- `api_logs` - API access logging

### 4. Stop Local Supabase

```bash
npm run supabase:stop
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and update with your values:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# OAuth Providers (for production)
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
SUPABASE_AUTH_GOOGLE_SECRET=your-google-secret
SUPABASE_AUTH_GITHUB_CLIENT_ID=your-github-client-id
SUPABASE_AUTH_GITHUB_SECRET=your-github-secret
```

## Testing Connection

Run the test script to verify your Supabase setup:

```bash
npm run test:supabase
```

## Production Setup

For production deployment:

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Configure OAuth providers in the dashboard
3. Update environment variables with production credentials
4. Run migrations using the Supabase CLI or dashboard

## Custom JWT Hook

The project includes a custom JWT hook that automatically adds user tier information to tokens. This needs to be configured in the Supabase dashboard under Authentication → Hooks → Custom Access Token Hook.

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Only service role can access the log tables
- OAuth redirect URLs must be configured for each environment
- Keep service role keys secure and never commit them to git