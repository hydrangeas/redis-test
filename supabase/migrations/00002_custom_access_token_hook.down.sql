-- Revoke permissions
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM supabase_auth_admin;

-- Drop the custom access token hook function
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Note: The hook configuration in Supabase dashboard must be removed manually