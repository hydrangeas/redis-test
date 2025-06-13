import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseAuthAdapter } from '../supabase-auth.adapter';
import { MockSupabaseAuthAdapter } from '../__mocks__/supabase-auth.adapter';
import type { Logger } from 'pino';
import { TokenPayload } from '@/domain/auth/types/token-payload';
import { Session } from '../interfaces/auth-adapter.interface';

describe('SupabaseAuthAdapter', () => {
  let mockAdapter: MockSupabaseAuthAdapter;
  let logger: Logger;

  beforeEach(() => {
    mockAdapter = new MockSupabaseAuthAdapter();
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;
  });

  describe('MockSupabaseAuthAdapter', () => {
    describe('verifyToken', () => {
      it('should return token payload for valid token', async () => {
        const token = 'valid-token';
        const payload: TokenPayload = {
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          app_metadata: { tier: 'tier1' },
          user_metadata: {},
        };

        mockAdapter.setMockToken(token, payload);
        const result = await mockAdapter.verifyToken(token);

        expect(result).toEqual(payload);
      });

      it('should return null for invalid token', async () => {
        const result = await mockAdapter.verifyToken('invalid-token');
        expect(result).toBeNull();
      });
    });

    describe('refreshAccessToken', () => {
      it('should return new session for valid refresh token', async () => {
        const refreshToken = 'valid-refresh-token';
        const session: Session = {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'test@example.com',
            app_metadata: { tier: 'tier1' },
            user_metadata: {},
          },
        };

        mockAdapter.setMockSession(refreshToken, session);
        const result = await mockAdapter.refreshAccessToken(refreshToken);

        expect(result).toEqual(session);
      });

      it('should return null for invalid refresh token', async () => {
        const result = await mockAdapter.refreshAccessToken('invalid-refresh-token');
        expect(result).toBeNull();
      });
    });

    describe('signOut', () => {
      it('should sign out user and remove sessions', async () => {
        const userId = '550e8400-e29b-41d4-a716-446655440000';
        const refreshToken = 'user-refresh-token';
        const session: Session = {
          access_token: 'access-token',
          refresh_token: refreshToken,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: userId,
            email: 'test@example.com',
            app_metadata: { tier: 'tier1' },
            user_metadata: {},
          },
        };

        mockAdapter.setMockSession(refreshToken, session);
        
        // Verify session exists
        expect(await mockAdapter.refreshAccessToken(refreshToken)).toEqual(session);
        
        // Sign out
        await mockAdapter.signOut(userId);
        
        // Verify user is signed out
        expect(mockAdapter.isUserSignedOut(userId)).toBe(true);
        
        // Verify session is removed
        expect(await mockAdapter.refreshAccessToken(refreshToken)).toBeNull();
      });
    });

    describe('helper methods', () => {
      it('should reset all data', () => {
        const token = 'test-token';
        const payload: TokenPayload = {
          sub: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          app_metadata: { tier: 'tier1' },
          user_metadata: {},
        };

        mockAdapter.setMockToken(token, payload);
        mockAdapter.signOut('550e8400-e29b-41d4-a716-446655440000');
        
        // Verify data is set
        expect(mockAdapter.verifyToken(token)).resolves.toEqual(payload);
        expect(mockAdapter.isUserSignedOut('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        
        // Reset
        mockAdapter.reset();
        
        // Verify data is cleared
        expect(mockAdapter.verifyToken(token)).resolves.toBeNull();
        expect(mockAdapter.isUserSignedOut('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
      });
    });
  });
});