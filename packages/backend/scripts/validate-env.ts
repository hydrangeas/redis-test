#!/usr/bin/env tsx
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { validateEnv } from '../src/infrastructure/config/env.config';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Validating environment variables...\n');

try {
  // Validate environment
  const config = validateEnv(process.env);
  
  console.log('✅ Environment validation successful!\n');
  console.log('📋 Loaded configuration:');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   HOST: ${config.HOST}`);
  console.log(`   LOG_LEVEL: ${config.LOG_LEVEL}`);
  console.log(`   Supabase URL: ${config.PUBLIC_SUPABASE_URL || config.SUPABASE_URL}`);
  console.log(`   API Base URL: ${config.API_BASE_URL}`);
  console.log(`   Frontend URL: ${config.FRONTEND_URL}`);
  console.log(`   Rate Limits: Tier1=${config.RATE_LIMIT_TIER1}, Tier2=${config.RATE_LIMIT_TIER2}, Tier3=${config.RATE_LIMIT_TIER3}`);
  console.log(`   Data Directory: ${config.DATA_DIRECTORY}`);
  
  // Check for warnings
  console.log('\n⚠️  Warnings:');
  if (config.SUPABASE_URL && !config.PUBLIC_SUPABASE_URL) {
    console.log('   - Using legacy SUPABASE_URL. Consider migrating to PUBLIC_SUPABASE_URL');
  }
  if (config.NODE_ENV === 'production' && config.LOG_LEVEL === 'debug') {
    console.log('   - Debug logging enabled in production');
  }
  if (config.JWT_SECRET.length === 32) {
    console.log('   - JWT secret is at minimum length. Consider using a longer secret');
  }
  
  console.log('\n✨ Environment is ready for use!');
  process.exit(0);
} catch (error) {
  console.error('❌ Environment validation failed!\n');
  if (error instanceof Error) {
    console.error(error.message);
  }
  console.error('\n📖 See docs/environment-variables.md for configuration help');
  process.exit(1);
}