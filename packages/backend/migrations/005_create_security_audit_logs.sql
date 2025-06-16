-- Create security_audit_logs table for tracking security events
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_tier VARCHAR(50),
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_security_audit_event_type (event_type),
  INDEX idx_security_audit_user_id (user_id),
  INDEX idx_security_audit_ip_address (ip_address),
  INDEX idx_security_audit_created_at (created_at)
);

-- Add comment
COMMENT ON TABLE security_audit_logs IS 'Stores security-related events for auditing and monitoring';

-- Row Level Security
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs
CREATE POLICY "Service role can insert security logs" 
  ON security_audit_logs FOR INSERT
  TO service_role
  USING (true);

-- Only service role can read logs
CREATE POLICY "Service role can read security logs" 
  ON security_audit_logs FOR SELECT
  TO service_role
  USING (true);

-- Create function to clean old logs
CREATE OR REPLACE FUNCTION clean_old_security_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;