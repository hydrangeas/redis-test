#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - PUBLIC_SUPABASE_URL or SUPABASE_URL');
    if (!supabaseAnonKey) console.error('   - PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  if (supabaseServiceKey) {
    console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...`);
  }

  // Test connection with anon key
  console.log('\n📡 Testing connection with anon key...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test auth service
    const { data: authData, error: authError } = await anonClient.auth.getSession();
    if (authError) {
      console.error('❌ Auth service error:', authError.message);
    } else {
      console.log('✅ Auth service is accessible');
      console.log('   Session:', authData.session ? 'Active' : 'None');
    }

    // Test database connection (public schema)
    const { error: dbError } = await anonClient.from('_test_connection').select('*').limit(1);
    if (dbError && dbError.code !== '42P01') {
      // 42P01 = table does not exist
      console.error('❌ Database connection error:', dbError.message);
    } else {
      console.log('✅ Database is accessible');
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }

  // Test connection with service role key
  if (supabaseServiceKey) {
    console.log('\n🔐 Testing connection with service role key...');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      // Test auth admin functions
      const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      if (usersError) {
        console.error('❌ Auth admin error:', usersError.message);
      } else {
        console.log('✅ Auth admin functions are accessible');
        console.log(`   Total users: ${users.users.length}`);
      }

      // Test database with service role
      const tables = ['auth_logs', 'rate_limits', 'api_logs'];
      for (const table of tables) {
        const { error } = await serviceClient.from(table).select('count').limit(1);
        if (error && error.code !== '42P01') {
          console.error(`❌ Table ${table} error:`, error.message);
        } else if (error && error.code === '42P01') {
          console.log(`⚠️  Table ${table} does not exist (run migrations)`);
        } else {
          console.log(`✅ Table ${table} is accessible`);
        }
      }
    } catch (error) {
      console.error('❌ Service role test failed:', error);
    }
  } else {
    console.log('\n⚠️  Service role key not provided - skipping admin tests');
  }

  console.log('\n✨ Supabase connection test completed!');

  // Test OAuth providers configuration
  console.log('\n🔑 OAuth Providers Configuration:');
  const googleClientId = process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID;
  const googleSecret = process.env.SUPABASE_AUTH_GOOGLE_SECRET;
  const githubClientId = process.env.SUPABASE_AUTH_GITHUB_CLIENT_ID;
  const githubSecret = process.env.SUPABASE_AUTH_GITHUB_SECRET;

  if (googleClientId && googleSecret) {
    console.log('✅ Google OAuth credentials configured');
  } else {
    console.log('⚠️  Google OAuth credentials not configured');
  }

  if (githubClientId && githubSecret) {
    console.log('✅ GitHub OAuth credentials configured');
  } else {
    console.log('⚠️  GitHub OAuth credentials not configured');
  }

  console.log('\n📋 Next steps:');
  console.log('1. If using local Supabase, run: npx supabase start');
  console.log('2. Run migrations: npx supabase db push');
  console.log('3. Configure OAuth providers in Supabase dashboard');
  console.log('4. Update .env.local with your project credentials');
}

// Run the test
testSupabaseConnection().catch(console.error);
