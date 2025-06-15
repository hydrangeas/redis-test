-- Partial indexes for better query performance
CREATE INDEX idx_api_logs_recent 
  ON api_logs(created_at DESC) 
  WHERE created_at > NOW() - INTERVAL '7 days';

CREATE INDEX idx_auth_logs_failures 
  ON auth_logs(ip_address, created_at DESC) 
  WHERE result = 'failed';

CREATE INDEX idx_rate_limit_recent
  ON rate_limit_logs(identifier, window_start DESC)
  WHERE window_start > NOW() - INTERVAL '1 day';

-- Composite indexes for common queries
CREATE INDEX idx_api_logs_user_endpoint
  ON api_logs(user_id, endpoint, created_at DESC);

CREATE INDEX idx_auth_logs_user_event
  ON auth_logs(user_id, event, created_at DESC);

-- Materialized view for API usage statistics
CREATE MATERIALIZED VIEW api_usage_stats AS
SELECT 
  user_id,
  DATE_TRUNC('hour', created_at) as hour,
  endpoint,
  COUNT(*) as request_count,
  AVG(response_time) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, hour, endpoint;

CREATE UNIQUE INDEX idx_api_usage_stats 
  ON api_usage_stats(user_id, hour, endpoint);

-- Materialized view for auth statistics
CREATE MATERIALIZED VIEW auth_stats AS
SELECT
  user_id,
  DATE_TRUNC('day', created_at) as day,
  event,
  result,
  COUNT(*) as event_count
FROM auth_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, day, event, result;

CREATE UNIQUE INDEX idx_auth_stats
  ON auth_stats(user_id, day, event, result);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY api_usage_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY auth_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current rate limit status (optimized)
CREATE OR REPLACE FUNCTION get_rate_limit_status(p_user_id UUID, p_tier user_tier)
RETURNS TABLE(
  current_count INTEGER,
  limit_value INTEGER,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ
) AS $$
DECLARE
  v_window_minutes INTEGER := 60; -- 1 hour window
  v_window_start TIMESTAMPTZ;
  v_limit INTEGER;
BEGIN
  -- Calculate current window
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Get limit based on tier
  v_limit := CASE p_tier
    WHEN 'tier1' THEN 60
    WHEN 'tier2' THEN 120
    WHEN 'tier3' THEN 300
    ELSE 60
  END;
  
  RETURN QUERY
  SELECT
    COALESCE(SUM(request_count), 0)::INTEGER as current_count,
    v_limit as limit_value,
    v_window_start as window_start,
    v_window_start + INTERVAL '1 hour' as window_end
  FROM rate_limit_logs
  WHERE user_id = p_user_id
    AND window_start >= v_window_start;
END;
$$ LANGUAGE plpgsql;

-- Function to get API usage summary
CREATE OR REPLACE FUNCTION get_api_usage_summary(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  total_requests BIGINT,
  unique_endpoints INTEGER,
  error_rate NUMERIC,
  avg_response_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(DISTINCT endpoint)::INTEGER as unique_endpoints,
    ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as error_rate,
    ROUND(AVG(response_time)::NUMERIC, 2) as avg_response_time
  FROM api_logs
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete old logs
  DELETE FROM auth_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM rate_limit_logs WHERE window_start < NOW() - INTERVAL '2 days';
  
  -- Refresh materialized views
  PERFORM refresh_materialized_views();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION get_rate_limit_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_materialized_views TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO service_role;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW api_usage_stats IS 'Aggregated API usage statistics for performance dashboards';
COMMENT ON MATERIALIZED VIEW auth_stats IS 'Aggregated authentication event statistics';
COMMENT ON FUNCTION get_rate_limit_status IS 'Returns current rate limit usage for a user';
COMMENT ON FUNCTION get_api_usage_summary IS 'Returns API usage summary for a user over specified days';
COMMENT ON FUNCTION refresh_materialized_views IS 'Refreshes all materialized views for analytics';
COMMENT ON FUNCTION cleanup_old_data IS 'Removes old log entries and refreshes views';

-- Note: Schedule periodic cleanup and refresh using pg_cron or external scheduler
-- Example: SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data()');
-- Example: SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_materialized_views()');