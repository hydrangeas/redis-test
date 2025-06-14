-- Create initial schema for OpenData API
-- This migration creates the core tables needed for the application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create rate_limit_logs table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries
ALTER TABLE public.rate_limit_logs 
  ADD CONSTRAINT rate_limit_logs_unique_request 
  UNIQUE (user_id, endpoint, method, requested_at);

-- Create indexes for efficient querying
CREATE INDEX idx_rate_limit_logs_user_window 
  ON public.rate_limit_logs (user_id, window_start, window_end);

CREATE INDEX idx_rate_limit_logs_user_endpoint_window 
  ON public.rate_limit_logs (user_id, endpoint, method, window_start, window_end);

CREATE INDEX idx_rate_limit_logs_requested_at 
  ON public.rate_limit_logs (requested_at);

-- Create auth_logs table
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_failure', 
    'logout',
    'token_refresh',
    'password_reset',
    'email_verification',
    'account_locked'
  )),
  provider TEXT CHECK (provider IN ('email', 'google', 'github', 'phone')),
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  metadata JSONB,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for auth_logs
CREATE INDEX idx_auth_logs_user_id 
  ON public.auth_logs (user_id);

CREATE INDEX idx_auth_logs_event_type 
  ON public.auth_logs (event_type);

CREATE INDEX idx_auth_logs_created_at 
  ON public.auth_logs (created_at DESC);

CREATE INDEX idx_auth_logs_user_event_created 
  ON public.auth_logs (user_id, event_type, created_at DESC);

-- Create api_logs table
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL, -- in milliseconds
  response_size INTEGER,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB,
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for api_logs
CREATE INDEX idx_api_logs_user_id 
  ON public.api_logs (user_id);

CREATE INDEX idx_api_logs_endpoint 
  ON public.api_logs (endpoint);

CREATE INDEX idx_api_logs_status_code 
  ON public.api_logs (status_code);

CREATE INDEX idx_api_logs_created_at 
  ON public.api_logs (created_at DESC);

CREATE INDEX idx_api_logs_user_endpoint_created 
  ON public.api_logs (user_id, endpoint, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only service role can access logs
CREATE POLICY "Service role can manage rate_limit_logs" ON public.rate_limit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage auth_logs" ON public.auth_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage api_logs" ON public.api_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to clean up old rate limit logs
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE requested_at < NOW() - INTERVAL '2 hours';
END;
$$;

-- Create function to clean up old auth logs (keep for 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.auth_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create function to clean up old api logs (keep for 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule cleanup jobs with pg_cron
-- Clean up rate limit logs every 2 hours
SELECT cron.schedule(
  'cleanup-rate-limit-logs',
  '0 */2 * * *',
  $$SELECT public.cleanup_old_rate_limit_logs();$$
);

-- Clean up auth logs daily at 3 AM
SELECT cron.schedule(
  'cleanup-auth-logs',
  '0 3 * * *',
  $$SELECT public.cleanup_old_auth_logs();$$
);

-- Clean up API logs daily at 4 AM
SELECT cron.schedule(
  'cleanup-api-logs',
  '0 4 * * *',
  $$SELECT public.cleanup_old_api_logs();$$
);

-- Create helper functions for rate limiting
CREATE OR REPLACE FUNCTION public.get_rate_limit_count(
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_window_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.rate_limit_logs
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND method = p_method
    AND requested_at >= NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  RETURN v_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.rate_limit_logs IS 'Stores rate limiting data for API endpoints';
COMMENT ON TABLE public.auth_logs IS 'Stores authentication events for security monitoring';
COMMENT ON TABLE public.api_logs IS 'Stores API access logs for monitoring and analytics';

COMMENT ON COLUMN public.rate_limit_logs.window_start IS 'Start of the rate limit window';
COMMENT ON COLUMN public.rate_limit_logs.window_end IS 'End of the rate limit window';

COMMENT ON COLUMN public.auth_logs.event_type IS 'Type of authentication event';
COMMENT ON COLUMN public.auth_logs.provider IS 'Authentication provider used';
COMMENT ON COLUMN public.auth_logs.device_info IS 'Device information extracted from user agent';
COMMENT ON COLUMN public.auth_logs.location IS 'Geographical location based on IP address';

COMMENT ON COLUMN public.api_logs.response_time IS 'Response time in milliseconds';
COMMENT ON COLUMN public.api_logs.response_size IS 'Response size in bytes';
COMMENT ON COLUMN public.api_logs.request_id IS 'Unique request identifier for tracing';