/**
 * E2E Test Environment Setup with Mocks
 * This module provides utilities for setting up and tearing down the test environment without external dependencies
 */

import { FastifyInstance } from 'fastify';
import buildApp from '@/app';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { container } from 'tsyringe';
import { setupTestDI } from '@/infrastructure/di';

let app: FastifyInstance;

// Mock Supabase client
const mockSupabase = {
  auth: {
    admin: {
      listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
      createUser: (params: any) => Promise.resolve({
        data: {
          user: {
            id: uuidv4(),
            email: params.email,
            app_metadata: params.app_metadata,
          },
        },
        error: null,
      }),
      deleteUser: () => Promise.resolve({ data: null, error: null }),
    },
    signInWithPassword: (params: any) => Promise.resolve({
      data: {
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
        user: {
          id: uuidv4(),
          email: params.email,
        },
      },
      error: null,
    }),
  },
  from: (table: string) => ({
    delete: () => ({
      in: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
};

/**
 * Set up the test environment with mocks
 */
export async function setupTestEnvironment() {
  // Setup test DI container with mocks
  setupTestDI();

  // Load test environment variables
  process.env.NODE_ENV = 'development';
  process.env.LOG_LEVEL = 'error';
  process.env.DATA_DIRECTORY = path.join(process.cwd(), 'test-data');
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

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

  return { app, supabase: mockSupabase };
}

/**
 * Tear down the test environment
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

  // Reset DI container
  container.reset();
}

/**
 * Clean up test data (mock implementation)
 */
async function cleanupTestData() {
  // Mock implementation - nothing to clean in mock mode
}

/**
 * Create a test user with specified tier
 */
export async function createTestUser(tier: string = 'tier1') {
  const email = `test-${Date.now()}-${uuidv4()}@example.com`;
  const password = 'test-password-123';

  // Mock user creation
  const user = {
    id: uuidv4(),
    email,
    app_metadata: { tier },
  };

  // Mock token generation
  const token = 'mock-jwt-token';
  const refreshToken = 'mock-refresh-token';

  return {
    user,
    email,
    password,
    token,
    refreshToken,
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  },
) {
  const requests = [];

  for (let i = 0; i < count; i++) {
    requests.push(app.inject(requestFactory(i)));
  }

  return Promise.all(requests);
}