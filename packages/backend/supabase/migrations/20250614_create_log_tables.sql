-- Create auth_logs table for authentication event logging
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    result VARCHAR(20) NOT NULL,
    error_message TEXT,
    metadata JSONB,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_auth_logs_user_id (user_id),
    INDEX idx_auth_logs_event_type (event_type),
    INDEX idx_auth_logs_ip_address (ip_address),
    INDEX idx_auth_logs_created_at (created_at),
    INDEX idx_auth_logs_result (result),
    INDEX idx_auth_logs_session_id (session_id)
);

-- Create api_logs table for API access logging
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    response_size INTEGER,
    ip_address INET NOT NULL,
    user_agent TEXT,
    error_message TEXT,
    metadata JSONB,
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_api_logs_user_id (user_id),
    INDEX idx_api_logs_endpoint (endpoint),
    INDEX idx_api_logs_status_code (status_code),
    INDEX idx_api_logs_created_at (created_at),
    INDEX idx_api_logs_response_time (response_time),
    INDEX idx_api_logs_request_id (request_id)
);

-- Create partial indexes for performance optimization
CREATE INDEX idx_auth_logs_failures ON auth_logs (created_at, ip_address) 
WHERE result = 'FAILED';

CREATE INDEX idx_auth_logs_suspicious ON auth_logs (created_at, user_id) 
WHERE metadata->>'suspicious' = 'true';

CREATE INDEX idx_api_logs_errors ON api_logs (created_at, endpoint) 
WHERE status_code >= 400;

CREATE INDEX idx_api_logs_slow_requests ON api_logs (created_at, endpoint) 
WHERE response_time > 1000;

-- Add foreign key constraints (optional, depending on requirements)
-- ALTER TABLE auth_logs ADD CONSTRAINT fk_auth_logs_user_id 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE api_logs ADD CONSTRAINT fk_api_logs_user_id 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create views for common queries
CREATE VIEW auth_statistics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE result = 'SUCCESS') as successful_logins,
    COUNT(*) FILTER (WHERE result = 'FAILED') as failed_logins,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE metadata->>'suspicious' = 'true') as suspicious_activities
FROM auth_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

CREATE VIEW api_statistics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    AVG(response_time) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time
FROM api_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Create function for cleaning old logs
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(auth_logs_deleted BIGINT, api_logs_deleted BIGINT) AS $$
DECLARE
    auth_count BIGINT;
    api_count BIGINT;
BEGIN
    -- Delete old auth logs
    WITH deleted AS (
        DELETE FROM auth_logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
        RETURNING 1
    )
    SELECT COUNT(*) INTO auth_count FROM deleted;
    
    -- Delete old API logs
    WITH deleted AS (
        DELETE FROM api_logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
        RETURNING 1
    )
    SELECT COUNT(*) INTO api_count FROM deleted;
    
    RETURN QUERY SELECT auth_count, api_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies if needed
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own logs
CREATE POLICY auth_logs_read_own ON auth_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY api_logs_read_own ON api_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can do everything
CREATE POLICY auth_logs_service_role ON auth_logs
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY api_logs_service_role ON api_logs
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');