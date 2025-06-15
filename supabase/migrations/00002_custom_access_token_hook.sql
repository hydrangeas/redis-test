-- Function for Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_tier text;
BEGIN
  -- Extract the current claims
  claims := event->'claims';
  
  -- Get user tier from app_metadata
  user_tier := COALESCE(
    event->'user_metadata'->>'tier',
    event->'app_metadata'->>'tier',
    'tier1'
  );
  
  -- If new user (no tier set), set default tier
  IF user_tier IS NULL OR user_tier = '' THEN
    user_tier := 'tier1';
    
    -- Update user's app_metadata with default tier
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tier', user_tier)
    WHERE id = (event->>'user_id')::uuid;
  END IF;
  
  -- Add custom claims
  claims := claims || jsonb_build_object(
    'user_tier', user_tier,
    'app_metadata', jsonb_build_object(
      'tier', user_tier
    )
  );
  
  -- Return modified claims
  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Comments for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Adds user tier information to JWT claims during token generation';

-- Note: The actual hook configuration must be done in the Supabase dashboard
-- Navigate to Authentication > Hooks and set this function as the Custom Access Token Hook