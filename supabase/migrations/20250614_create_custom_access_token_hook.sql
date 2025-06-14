-- Create Custom Access Token Hook for adding tier information to JWT
-- This hook runs every time a JWT is issued and adds custom claims

-- Create the hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
  user_id uuid;
  current_app_metadata jsonb;
BEGIN
  -- Extract user_id from the event
  user_id := (event->>'user_id')::uuid;
  
  -- Get current app_metadata for the user
  SELECT raw_app_meta_data INTO current_app_metadata
  FROM auth.users
  WHERE id = user_id;
  
  -- Extract tier from app_metadata
  user_tier := current_app_metadata->>'tier';
  
  -- If tier is not set, set it to tier1 and update the user record
  IF user_tier IS NULL THEN
    user_tier := 'tier1';
    
    -- Update the user's app_metadata with the default tier
    UPDATE auth.users 
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tier', 'tier1')
    WHERE id = user_id;
  END IF;
  
  -- Add tier to JWT claims
  event := jsonb_set(event, '{claims,tier}', to_jsonb(user_tier));
  
  -- Add user_id to claims for easier access
  event := jsonb_set(event, '{claims,sub}', to_jsonb(user_id::text));
  
  -- Add app_metadata to claims if it exists
  IF current_app_metadata IS NOT NULL THEN
    event := jsonb_set(event, '{claims,app_metadata}', current_app_metadata);
  END IF;
  
  RETURN event;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return original event to prevent authentication failure
    RAISE LOG 'Error in custom_access_token_hook: %', SQLERRM;
    RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Create helper function to change user tier
CREATE OR REPLACE FUNCTION public.update_user_tier(
  p_user_id uuid,
  p_new_tier text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate tier value
  IF p_new_tier NOT IN ('tier1', 'tier2', 'tier3') THEN
    RAISE EXCEPTION 'Invalid tier value. Must be tier1, tier2, or tier3';
  END IF;
  
  -- Update user's app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tier', p_new_tier)
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Create function to get user tier
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  SELECT raw_app_meta_data->>'tier' INTO user_tier
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Return tier1 as default if not set
  RETURN COALESCE(user_tier, 'tier1');
END;
$$;

-- Create view for user tiers (for easier querying)
CREATE OR REPLACE VIEW public.user_tiers AS
SELECT 
  id as user_id,
  email,
  COALESCE(raw_app_meta_data->>'tier', 'tier1') as tier,
  created_at,
  updated_at
FROM auth.users;

-- Grant permissions
GRANT SELECT ON public.user_tiers TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_tier TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tier TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Hook function that adds tier information to JWT tokens';
COMMENT ON FUNCTION public.update_user_tier IS 'Updates a user''s tier level';
COMMENT ON FUNCTION public.get_user_tier IS 'Gets a user''s current tier level';
COMMENT ON VIEW public.user_tiers IS 'View showing all users with their tier assignments';

-- Note: After running this migration, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Hooks
-- 2. Enable "Custom Access Token" hook
-- 3. Select the function: public.custom_access_token_hook