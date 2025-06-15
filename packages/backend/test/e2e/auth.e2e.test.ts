/**
 * Authentication Endpoints E2E Tests
 * Tests the complete authentication flow including login, logout, and token refresh
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  createTestUser,
  delay 
} from './setup';

describe('Authentication Endpoints E2E', () => {
  let app: FastifyInstance;
  let supabase: SupabaseClient;

  beforeAll(async () => {
    ({ app, supabase } = await setupTestEnvironment());
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('POST /auth/callback', () => {
    it('should handle Supabase auth callback with valid token', async () => {
      const { token } = await createTestUser('tier1');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          access_token: token,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.app_metadata).toBeDefined();
      expect(body.user.app_metadata.tier).toBe('tier1');
    });

    it('should reject invalid token in callback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          access_token: 'invalid-jwt-token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
      expect(body.title).toBe('Unauthorized');
      expect(body.detail).toContain('Invalid token');
    });

    it('should handle missing token in callback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          token_type: 'bearer',
          expires_in: 3600,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/bad-request');
      expect(body.title).toBe('Bad Request');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout authenticated user', async () => {
      const { token } = await createTestUser('tier1');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Logged out successfully');

      // Verify logout event was logged
      await delay(100); // Wait for async logging
      const { data: logs } = await supabase
        .from('auth_logs')
        .select('*')
        .eq('event_type', 'LOGOUT')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(logs).toBeDefined();
      expect(logs?.length).toBeGreaterThan(0);
    });

    it('should require authentication for logout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBeDefined();
      
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
      expect(body.title).toBe('Unauthorized');
      expect(body.detail).toBe('Authentication required');
    });

    it('should reject invalid bearer token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { refreshToken } = await createTestUser('tier2');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.access_token).toBeDefined();
      expect(body.token_type).toBe('bearer');
      expect(body.expires_in).toBeGreaterThan(0);
      expect(body.refresh_token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          refresh_token: 'invalid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
      expect(body.title).toBe('Unauthorized');
      expect(body.detail).toContain('Invalid refresh token');
    });

    it('should require refresh token in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/bad-request');
      expect(body.title).toBe('Bad Request');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user information', async () => {
      const { token, user, email } = await createTestUser('tier3');

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(user.id);
      expect(body.email).toBe(email);
      expect(body.app_metadata.tier).toBe('tier3');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBeDefined();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      // 1. Create user and get initial token
      const { token, refreshToken, user } = await createTestUser('tier1');

      // 2. Verify token works for authenticated endpoint
      const meResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(meResponse.statusCode).toBe(200);

      // 3. Test token refresh
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          refresh_token: refreshToken,
        },
      });
      expect(refreshResponse.statusCode).toBe(200);
      
      const refreshBody = JSON.parse(refreshResponse.body);
      const newToken = refreshBody.access_token;

      // 4. Verify new token works
      const newMeResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
      expect(newMeResponse.statusCode).toBe(200);

      // 5. Logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });
      expect(logoutResponse.statusCode).toBe(200);

      // 6. Verify authentication logs were created
      await delay(200); // Wait for async logging
      const { data: logs } = await supabase
        .from('auth_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      expect(logs).toBeDefined();
      expect(logs?.length).toBeGreaterThanOrEqual(2);
      
      const eventTypes = logs?.map(log => log.event_type) || [];
      expect(eventTypes).toContain('LOGIN_SUCCESS');
      expect(eventTypes).toContain('LOGOUT');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in auth responses', async () => {
      const endpoints = ['/auth/callback', '/auth/logout', '/auth/refresh', '/auth/me'];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint === '/auth/me' ? 'GET' : 'POST',
          url: endpoint,
          headers: {
            'Content-Type': 'application/json',
          },
          payload: endpoint === '/auth/me' ? undefined : {},
        });

        // Check security headers are present
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['strict-transport-security']).toBeDefined();
      }
    });
  });
});