-- Test RLS policies for log tables
-- Run these tests to verify that RLS is working correctly

-- Setup test users
DO $$
DECLARE
  v_service_role_id UUID;
  v_anon_role_id UUID;
BEGIN
  -- Note: In real Supabase, roles are handled differently
  -- This is a simplified test setup
  
  -- Test 1: Verify service role can insert into rate_limit_logs
  SET ROLE service_role;
  BEGIN
    INSERT INTO public.rate_limit_logs (user_id, endpoint, method, window_start, window_end)
    VALUES (gen_random_uuid(), '/api/test', 'GET', NOW(), NOW() + INTERVAL '1 minute');
    RAISE NOTICE 'Test 1 PASSED: Service role can insert into rate_limit_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 1 FAILED: Service role cannot insert into rate_limit_logs - %', SQLERRM;
  END;
  
  -- Test 2: Verify anon role cannot access rate_limit_logs
  SET ROLE anon;
  BEGIN
    PERFORM * FROM public.rate_limit_logs LIMIT 1;
    RAISE NOTICE 'Test 2 FAILED: Anon role can read from rate_limit_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 2 PASSED: Anon role cannot read from rate_limit_logs';
  END;
  
  -- Test 3: Verify service role can insert into auth_logs
  SET ROLE service_role;
  BEGIN
    INSERT INTO public.auth_logs (user_id, event_type, provider)
    VALUES (gen_random_uuid(), 'login_success', 'email');
    RAISE NOTICE 'Test 3 PASSED: Service role can insert into auth_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 3 FAILED: Service role cannot insert into auth_logs - %', SQLERRM;
  END;
  
  -- Test 4: Verify service role can insert into api_logs
  SET ROLE service_role;
  BEGIN
    INSERT INTO public.api_logs (user_id, method, endpoint, status_code, response_time)
    VALUES (gen_random_uuid(), 'GET', '/api/data/test.json', 200, 50);
    RAISE NOTICE 'Test 4 PASSED: Service role can insert into api_logs';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 4 FAILED: Service role cannot insert into api_logs - %', SQLERRM;
  END;
  
  -- Reset role
  RESET ROLE;
END $$;

-- Test cleanup functions
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert old test data
  SET ROLE service_role;
  
  -- Insert old rate limit log (3 hours old)
  INSERT INTO public.rate_limit_logs (user_id, endpoint, method, requested_at, window_start, window_end)
  VALUES (gen_random_uuid(), '/api/old', 'GET', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '1 minute');
  
  -- Run cleanup
  PERFORM public.cleanup_old_rate_limit_logs();
  
  -- Check if old record was deleted
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_logs
  WHERE endpoint = '/api/old';
  
  IF v_count = 0 THEN
    RAISE NOTICE 'Test 5 PASSED: Old rate limit logs are cleaned up';
  ELSE
    RAISE NOTICE 'Test 5 FAILED: Old rate limit logs were not cleaned up';
  END IF;
  
  RESET ROLE;
END $$;