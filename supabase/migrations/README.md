# Supabase Database Migrations

This directory contains database migration files for the Open Data API project.

## Migration Files

### Forward Migrations (Applied in order)

1. **00001_initial_schema.sql**

   - Creates custom types (user_tier, auth_result, auth_event_type)
   - Creates core tables: api_keys, rate_limit_logs, auth_logs, api_logs
   - Sets up indexes for performance
   - Adds update timestamp trigger
   - Creates log cleanup function

2. **00002_custom_access_token_hook.sql**

   - Creates custom access token hook function
   - Automatically adds user tier to JWT claims
   - Sets default tier for new users
   - **Note**: Requires manual configuration in Supabase dashboard (Authentication > Hooks)

3. **00003_rls_policies.sql**

   - Enables Row Level Security on all tables
   - Creates policies for user data access (users can only see their own data)
   - Creates service role policies for backend operations

4. **00004_performance_optimizations.sql**
   - Adds partial indexes for recent data queries
   - Creates materialized views for usage statistics
   - Adds utility functions for rate limit and usage queries
   - Sets up scheduled cleanup functions

### Rollback Migrations

Each forward migration has a corresponding `.down.sql` file for rollback:

- 00001_initial_schema.down.sql
- 00002_custom_access_token_hook.down.sql
- 00003_rls_policies.down.sql
- 00004_performance_optimizations.down.sql

## Applying Migrations

### Using Supabase CLI

```bash
# Apply all migrations
supabase migration up

# Apply specific migration
supabase migration up --to-version 00002

# Rollback last migration
supabase migration down

# Check migration status
supabase migration list
```

### Manual Application

If applying manually through SQL editor:

1. Apply migrations in numerical order (00001, 00002, etc.)
2. Each migration should be run as a single transaction
3. Record applied migrations in a tracking table

## Important Notes

1. **Custom Access Token Hook**: After applying migration 00002, you must manually configure the hook in Supabase dashboard:

   - Go to Authentication > Hooks
   - Set `public.custom_access_token_hook` as the Custom Access Token Hook

2. **Scheduled Jobs**: The cleanup functions in migration 00004 should be scheduled using pg_cron:

   ```sql
   -- Run cleanup daily at 2 AM
   SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data()');

   -- Refresh materialized views every 15 minutes
   SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_materialized_views()');
   ```

3. **Performance Considerations**:
   - Materialized views are used for analytics to avoid heavy queries on main tables
   - Partial indexes optimize queries for recent data
   - Old logs are automatically cleaned up to maintain performance

## Testing Migrations

Before applying to production:

1. Test on a local Supabase instance
2. Verify all RLS policies work correctly
3. Test rollback procedures
4. Check performance with sample data
