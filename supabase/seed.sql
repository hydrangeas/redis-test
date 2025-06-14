-- Seed data for OpenData API
-- This file contains initial data for development and testing

-- Insert test users with different tiers
-- Note: Users are managed by Supabase Auth, this is just for reference
-- The actual tier assignment will be done through app_metadata in the auth.users table

-- Example of how to update a user's tier (run this after users sign up):
-- UPDATE auth.users 
-- SET app_metadata = jsonb_set(
--   COALESCE(app_metadata, '{}'::jsonb),
--   '{tier}',
--   '"tier2"'
-- )
-- WHERE email = 'testuser@example.com';

-- Insert some initial configuration data if needed
-- This is a placeholder for any reference data your application might need