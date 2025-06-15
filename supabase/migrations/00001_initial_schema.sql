-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_tier AS ENUM ('tier1', 'tier2', 'tier3');
CREATE TYPE auth_result AS ENUM ('success', 'failed', 'blocked');
CREATE TYPE auth_event_type AS ENUM (
  'login', 
  'logout', 
  'token_refresh', 
  'login_failed',
  'password_reset',
  'account_locked',
  'suspicious_activity',
  'rate_limit_check'
);

-- API Keys table
CREATE TABLE api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  name VARCHAR(255),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key_hash)
);

-- Indexes for API Keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Rate Limit Logs table
CREATE TABLE rate_limit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier VARCHAR(255) NOT NULL, -- IP or user ID
  endpoint VARCHAR(255) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  tier user_tier NOT NULL DEFAULT 'tier1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Indexes for Rate Limit
CREATE INDEX idx_rate_limit_identifier ON rate_limit_logs(identifier);
CREATE INDEX idx_rate_limit_window ON rate_limit_logs(window_start);
CREATE INDEX idx_rate_limit_endpoint ON rate_limit_logs(endpoint);

-- Auth Logs table
CREATE TABLE auth_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event auth_event_type NOT NULL,
  provider VARCHAR(50) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  result auth_result NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Auth Logs
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_event ON auth_logs(event);
CREATE INDEX idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX idx_auth_logs_ip_address ON auth_logs(ip_address);
CREATE INDEX idx_auth_logs_result ON auth_logs(result);

-- API Logs table
CREATE TABLE api_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  response_size INTEGER,
  ip_address INET NOT NULL,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API Logs
CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_api_logs_ip_address ON api_logs(ip_address);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old logs (30 days retention)
CREATE OR REPLACE FUNCTION clean_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM rate_limit_logs WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic access';
COMMENT ON TABLE rate_limit_logs IS 'Tracks API rate limiting per user/endpoint';
COMMENT ON TABLE auth_logs IS 'Authentication event audit trail';
COMMENT ON TABLE api_logs IS 'API access logs for monitoring and analytics';