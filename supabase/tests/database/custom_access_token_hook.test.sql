-- Test Custom Access Token Hook functionality
-- These tests verify that the hook correctly adds tier information to JWT claims

BEGIN;

-- Test helper functions first
DO $$
DECLARE
  v_test_user_id uuid;
  v_tier text;
  v_event jsonb;
  v_result jsonb;
BEGIN
  -- Create a test user
  v_test_user_id := gen_random_uuid();
  
  -- Test 1: get_user_tier returns tier1 for non-existent user
  v_tier := public.get_user_tier(v_test_user_id);
  IF v_tier = 'tier1' THEN
    RAISE NOTICE 'Test 1 PASSED: get_user_tier returns tier1 for non-existent user';
  ELSE
    RAISE NOTICE 'Test 1 FAILED: Expected tier1, got %', v_tier;
  END IF;
  
  -- Insert test user
  INSERT INTO auth.users (id, email, raw_app_meta_data)
  VALUES (v_test_user_id, 'test@example.com', '{"tier": "tier2"}'::jsonb);
  
  -- Test 2: get_user_tier returns correct tier for existing user
  v_tier := public.get_user_tier(v_test_user_id);
  IF v_tier = 'tier2' THEN
    RAISE NOTICE 'Test 2 PASSED: get_user_tier returns correct tier';
  ELSE
    RAISE NOTICE 'Test 2 FAILED: Expected tier2, got %', v_tier;
  END IF;
  
  -- Test 3: update_user_tier changes tier correctly
  PERFORM public.update_user_tier(v_test_user_id, 'tier3');
  v_tier := public.get_user_tier(v_test_user_id);
  IF v_tier = 'tier3' THEN
    RAISE NOTICE 'Test 3 PASSED: update_user_tier works correctly';
  ELSE
    RAISE NOTICE 'Test 3 FAILED: Expected tier3 after update, got %', v_tier;
  END IF;
  
  -- Test 4: update_user_tier rejects invalid tier
  BEGIN
    PERFORM public.update_user_tier(v_test_user_id, 'tier4');
    RAISE NOTICE 'Test 4 FAILED: update_user_tier should reject invalid tier';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test 4 PASSED: update_user_tier correctly rejects invalid tier';
  END;
  
  -- Test 5: custom_access_token_hook for existing user with tier
  v_event := jsonb_build_object(
    'user_id', v_test_user_id::text,
    'claims', '{}'::jsonb
  );
  v_result := public.custom_access_token_hook(v_event);
  
  IF v_result->'claims'->>'tier' = 'tier3' THEN
    RAISE NOTICE 'Test 5 PASSED: Hook adds existing tier to claims';
  ELSE
    RAISE NOTICE 'Test 5 FAILED: Expected tier3 in claims, got %', v_result->'claims'->>'tier';
  END IF;
  
  -- Test 6: custom_access_token_hook for user without tier
  -- Create another test user without tier
  v_test_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, raw_app_meta_data)
  VALUES (v_test_user_id, 'test2@example.com', '{}'::jsonb);
  
  v_event := jsonb_build_object(
    'user_id', v_test_user_id::text,
    'claims', '{}'::jsonb
  );
  v_result := public.custom_access_token_hook(v_event);
  
  IF v_result->'claims'->>'tier' = 'tier1' THEN
    RAISE NOTICE 'Test 6 PASSED: Hook sets tier1 for new users';
    
    -- Verify tier was saved to user record
    v_tier := public.get_user_tier(v_test_user_id);
    IF v_tier = 'tier1' THEN
      RAISE NOTICE 'Test 6b PASSED: Tier1 was saved to user record';
    ELSE
      RAISE NOTICE 'Test 6b FAILED: Tier not saved to user record';
    END IF;
  ELSE
    RAISE NOTICE 'Test 6 FAILED: Expected tier1 for new user, got %', v_result->'claims'->>'tier';
  END IF;
  
  -- Test 7: Hook adds sub claim
  IF v_result->'claims'->>'sub' = v_test_user_id::text THEN
    RAISE NOTICE 'Test 7 PASSED: Hook adds sub claim with user_id';
  ELSE
    RAISE NOTICE 'Test 7 FAILED: sub claim not added correctly';
  END IF;
  
  -- Clean up test users
  DELETE FROM auth.users WHERE email IN ('test@example.com', 'test2@example.com');
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test error: %', SQLERRM;
  -- Clean up on error
  DELETE FROM auth.users WHERE email IN ('test@example.com', 'test2@example.com');
  RAISE;
END $$;

-- Test the user_tiers view
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Test 8: user_tiers view is accessible
  SELECT COUNT(*) INTO v_count FROM public.user_tiers;
  RAISE NOTICE 'Test 8 PASSED: user_tiers view is accessible (% users found)', v_count;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 8 FAILED: Cannot access user_tiers view - %', SQLERRM;
END $$;

ROLLBACK;