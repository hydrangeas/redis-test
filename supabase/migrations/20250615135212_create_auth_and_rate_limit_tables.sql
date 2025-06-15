-- Create auth_logs table for authentication event logging
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  provider VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  result VARCHAR(20) NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for auth_logs
CREATE INDEX idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX idx_auth_logs_event_type ON public.auth_logs(event_type);
CREATE INDEX idx_auth_logs_created_at ON public.auth_logs(created_at);
CREATE INDEX idx_auth_logs_ip_address ON public.auth_logs(ip_address);
CREATE INDEX idx_auth_logs_result ON public.auth_logs(result);

-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate_limits
CREATE INDEX idx_rate_limits_user_id ON public.rate_limits(user_id);
CREATE INDEX idx_rate_limits_endpoint ON public.rate_limits(endpoint);
CREATE INDEX idx_rate_limits_timestamp ON public.rate_limits(timestamp);
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);

-- Create api_logs table for API access logging
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER, -- in milliseconds
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_logs
CREATE INDEX idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX idx_api_logs_endpoint ON public.api_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON public.api_logs(status_code);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Policies for auth_logs (only service role can access)
CREATE POLICY "Service role can access auth_logs" ON public.auth_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for rate_limits (only service role can access)
CREATE POLICY "Service role can access rate_limits" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for api_logs (only service role can access)
CREATE POLICY "Service role can access api_logs" ON public.api_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up old logs (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete auth logs older than 90 days
  DELETE FROM public.auth_logs WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete rate limits older than 24 hours
  DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete api logs older than 30 days
  DELETE FROM public.api_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: pg_cron might need to be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT public.cleanup_old_logs();');

-- Grant permissions
GRANT ALL ON public.auth_logs TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.api_logs TO service_role;

-- Custom JWT hook function for adding tier information
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

-- Grant execute permission for the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Note: The custom_access_token_hook needs to be configured in Supabase dashboard
-- under Authentication -> Hooks -> Custom Access Token Hook