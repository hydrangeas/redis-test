-- Revoke permissions
REVOKE EXECUTE ON FUNCTION get_rate_limit_status FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_api_usage_summary FROM authenticated;
REVOKE EXECUTE ON FUNCTION refresh_materialized_views FROM service_role;
REVOKE EXECUTE ON FUNCTION cleanup_old_data FROM service_role;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_old_data();
DROP FUNCTION IF EXISTS get_api_usage_summary(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_rate_limit_status(UUID, user_tier);
DROP FUNCTION IF EXISTS refresh_materialized_views();

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS auth_stats;
DROP MATERIALIZED VIEW IF EXISTS api_usage_stats;

-- Drop indexes
DROP INDEX IF EXISTS idx_auth_logs_user_event;
DROP INDEX IF EXISTS idx_api_logs_user_endpoint;
DROP INDEX IF EXISTS idx_rate_limit_recent;
DROP INDEX IF EXISTS idx_auth_logs_failures;
DROP INDEX IF EXISTS idx_api_logs_recent;