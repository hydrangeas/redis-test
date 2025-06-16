# Authentication Setup

This document describes the Supabase Auth integration for the frontend application.

## Configuration

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase project details:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Components

### AuthForm

The main authentication component that displays social login providers (Google, GitHub).

### AuthCallbackPage

Handles the OAuth callback after successful authentication with a provider.

### LoadingSpinner

A reusable loading spinner component used during authentication states.

### Alert

A reusable alert component for displaying authentication errors.

## Usage

The authentication flow is integrated into the App component:

- Unauthenticated users are redirected to `/login`
- After successful login, users are redirected to `/dashboard`
- The OAuth callback is handled at `/auth/callback`

## Testing

Run tests with:

```bash
npm test
```

Tests include:

- AuthForm component rendering
- Error handling with useAuthError hook
- Authentication state management
