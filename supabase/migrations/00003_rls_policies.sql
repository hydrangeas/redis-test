-- Enable RLS on all tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Rate Limit Logs policies (read-only for users)
CREATE POLICY "Users can view their own rate limit logs"
  ON rate_limit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Auth Logs policies (read-only for users)
CREATE POLICY "Users can view their own auth logs"
  ON auth_logs FOR SELECT
  USING (auth.uid() = user_id);

-- API Logs policies (read-only for users)
CREATE POLICY "Users can view their own API logs"
  ON api_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role policies for backend operations
CREATE POLICY "Service role full access to rate_limit_logs"
  ON rate_limit_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to auth_logs"
  ON auth_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to api_logs"
  ON api_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to api_keys"
  ON api_keys FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Comments for documentation
COMMENT ON POLICY "Users can view their own API keys" ON api_keys IS 'Allows users to see only their own API keys';
COMMENT ON POLICY "Users can create their own API keys" ON api_keys IS 'Allows users to create API keys for their account';
COMMENT ON POLICY "Users can update their own API keys" ON api_keys IS 'Allows users to update their own API keys';
COMMENT ON POLICY "Users can delete their own API keys" ON api_keys IS 'Allows users to delete their own API keys';
COMMENT ON POLICY "Users can view their own rate limit logs" ON rate_limit_logs IS 'Allows users to view their API usage history';
COMMENT ON POLICY "Users can view their own auth logs" ON auth_logs IS 'Allows users to view their authentication history';
COMMENT ON POLICY "Users can view their own API logs" ON api_logs IS 'Allows users to view their API request history';
COMMENT ON POLICY "Service role full access to rate_limit_logs" ON rate_limit_logs IS 'Allows backend service to manage rate limiting';
COMMENT ON POLICY "Service role full access to auth_logs" ON auth_logs IS 'Allows backend service to write authentication logs';
COMMENT ON POLICY "Service role full access to api_logs" ON api_logs IS 'Allows backend service to write API access logs';
COMMENT ON POLICY "Service role full access to api_keys" ON api_keys IS 'Allows backend service to validate API keys';