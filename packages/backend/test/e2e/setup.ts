/**
 * E2E Test Environment Setup
 * This module provides utilities for setting up and tearing down the test environment
 */

import { FastifyInstance } from 'fastify';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import buildApp from '@/app';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

let app: FastifyInstance;
let supabase: SupabaseClient;

/**
 * Set up the test environment
 * - Initializes Supabase test client
 * - Cleans up test data
 * - Starts Fastify application
 */
export async function setupTestEnvironment() {
  // Load test environment variables
  process.env.NODE_ENV = 'development';
  process.env.LOG_LEVEL = 'error';
  process.env.DATA_DIRECTORY = path.join(process.cwd(), 'test-data');

  // Create Supabase test client
  supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Clean up test data before starting
  await cleanupTestData();

  // Ensure test data directory exists
  await fs.mkdir(process.env.DATA_DIRECTORY, { recursive: true });

  // Build and start Fastify application
  app = await buildApp({
    logger: false,
  });

  // Listen on a random port
  await app.listen({ port: 0, host: '127.0.0.1' });

  return { app, supabase };
}

/**
 * Tear down the test environment
 * - Closes the Fastify application
 * - Cleans up test data
 */
export async function teardownTestEnvironment() {
  if (app) {
    await app.close();
  }
  await cleanupTestData();
  
  // Remove test data directory
  try {
    await fs.rm(process.env.DATA_DIRECTORY || 'test-data', { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Clean up test data from the database
 */
async function cleanupTestData() {
  try {
    // Clean up test users (those with email starting with 'test-')
    const { data: testUsers } = await supabase.auth.admin.listUsers();
    if (testUsers?.users) {
      const testUserIds = testUsers.users
        .filter(user => user.email?.startsWith('test-'))
        .map(user => user.id);

      // Delete test user data from various tables
      if (testUserIds.length > 0) {
        await Promise.all([
          supabase.from('auth_logs').delete().in('user_id', testUserIds),
          supabase.from('api_logs').delete().in('user_id', testUserIds),
          supabase.from('rate_limit_logs').delete().in('user_id', testUserIds),
        ]);

        // Delete test users
        for (const userId of testUserIds) {
          await supabase.auth.admin.deleteUser(userId);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create a test user with specified tier
 */
export async function createTestUser(tier: string = 'tier1') {
  const email = `test-${Date.now()}-${uuidv4()}@example.com`;
  const password = 'test-password-123';

  // Create user with admin API
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tier },
  });

  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`);
  }

  // Sign in to get access token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return {
    user: createData.user,
    email,
    password,
    token: signInData.session?.access_token,
    refreshToken: signInData.session?.refresh_token,
  };
}

/**
 * Create test data files
 */
export async function createTestDataFile(relativePath: string, data: any) {
  const fullPath = path.join(process.env.DATA_DIRECTORY || 'test-data', relativePath);
  const dir = path.dirname(fullPath);
  
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  
  return fullPath;
}

/**
 * Remove test data file
 */
export async function removeTestDataFile(relativePath: string) {
  const fullPath = path.join(process.env.DATA_DIRECTORY || 'test-data', relativePath);
  
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Wait for a specific amount of time (useful for rate limit tests)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the base URL of the running application
 */
export function getBaseUrl(): string {
  const address = app.server.address();
  if (typeof address === 'string') {
    return `http://${address}`;
  }
  return `http://127.0.0.1:${address?.port}`;
}

/**
 * Make multiple concurrent requests
 */
export async function makeConcurrentRequests(
  count: number,
  requestFactory: (index: number) => {
    method: string;
    url: string;
    headers?: any;
    payload?: any;
  }
) {
  const requests = [];
  
  for (let i = 0; i < count; i++) {
    requests.push(app.inject(requestFactory(i)));
  }
  
  return Promise.all(requests);
}