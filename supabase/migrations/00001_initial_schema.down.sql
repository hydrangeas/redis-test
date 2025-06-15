-- Drop triggers
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS clean_old_logs();

-- Drop tables (in reverse order of creation due to foreign keys)
DROP TABLE IF EXISTS api_logs;
DROP TABLE IF EXISTS auth_logs;
DROP TABLE IF EXISTS rate_limit_logs;
DROP TABLE IF EXISTS api_keys;

-- Drop types
DROP TYPE IF EXISTS auth_event_type;
DROP TYPE IF EXISTS auth_result;
DROP TYPE IF EXISTS user_tier;

-- Note: We don't drop the uuid-ossp extension as it might be used by other parts of the system