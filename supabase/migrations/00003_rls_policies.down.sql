-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role full access to api_keys" ON api_keys;

DROP POLICY IF EXISTS "Users can view their own rate limit logs" ON rate_limit_logs;
DROP POLICY IF EXISTS "Service role full access to rate_limit_logs" ON rate_limit_logs;

DROP POLICY IF EXISTS "Users can view their own auth logs" ON auth_logs;
DROP POLICY IF EXISTS "Service role full access to auth_logs" ON auth_logs;

DROP POLICY IF EXISTS "Users can view their own API logs" ON api_logs;
DROP POLICY IF EXISTS "Service role full access to api_logs" ON api_logs;

-- Disable RLS on all tables
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs DISABLE ROW LEVEL SECURITY;