import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sign, verify, decode, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { JWTService } from '../jwt.service';
import { EnvConfig } from '@/infrastructure/config';
import { Logger } from 'pino';

// Mock jwt module
vi.mock('jsonwebtoken', () => {
  class TokenExpiredError extends Error {
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
    expiredAt: Date;
  }
  
  class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  }
  
  return {
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
    TokenExpiredError,
    JsonWebTokenError,
  };
});

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockConfig: EnvConfig;
  let mockLogger: Logger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock config
    mockConfig = {
      NODE_ENV: 'test',
      PORT: 8080,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'error',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      JWT_SECRET: 'test-secret-at-least-32-characters-long',
      API_BASE_URL: 'http://localhost:8080',
      FRONTEND_URL: 'http://localhost:3000',
      RATE_LIMIT_TIER1: 60,
      RATE_LIMIT_TIER2: 120,
      RATE_LIMIT_TIER3: 300,
      RATE_LIMIT_WINDOW: 60,
    };

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as any;

    // Create service instance
    jwtService = new JWTService(mockConfig, mockLogger);
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const tier = 'tier2';
      const mockToken = 'mock.access.token';

      vi.mocked(sign).mockReturnValue(mockToken as any);

      const result = await jwtService.generateAccessToken(userId, tier);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(mockToken);
      expect(sign).toHaveBeenCalledWith(
        {
          sub: userId,
          tier,
          type: 'access',
        },
        mockConfig.JWT_SECRET,
        {
          expiresIn: '1h',
          issuer: mockConfig.API_BASE_URL,
          audience: mockConfig.API_BASE_URL,
        },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith({ userId, tier }, 'Access token generated');
    });

    it('should handle token generation errors', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const tier = 'tier1';
      const error = new Error('Sign error');

      vi.mocked(sign).mockImplementation(() => {
        throw error;
      });

      const result = await jwtService.generateAccessToken(userId, tier);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Failed to generate access token');
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error, userId },
        'Failed to generate access token',
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockToken = 'mock.refresh.token';

      vi.mocked(sign).mockReturnValue(mockToken as any);

      const result = await jwtService.generateRefreshToken(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(mockToken);
      expect(sign).toHaveBeenCalledWith(
        {
          sub: userId,
          type: 'refresh',
        },
        mockConfig.JWT_SECRET,
        {
          expiresIn: '30d',
          issuer: mockConfig.API_BASE_URL,
          audience: mockConfig.API_BASE_URL,
        },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith({ userId }, 'Refresh token generated');
    });

    it('should handle token generation errors', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error('Sign error');

      vi.mocked(sign).mockImplementation(() => {
        throw error;
      });

      const result = await jwtService.generateRefreshToken(userId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Failed to generate refresh token');
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error, userId },
        'Failed to generate refresh token',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const token = 'valid.access.token';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        tier: 'tier2',
        type: 'access',
        iat: 1234567890,
        exp: 1234571490,
      };

      vi.mocked(verify).mockReturnValue(payload as any);

      const result = await jwtService.verifyAccessToken(token);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(payload);
      expect(verify).toHaveBeenCalledWith(token, mockConfig.JWT_SECRET, {
        issuer: mockConfig.API_BASE_URL,
        audience: mockConfig.API_BASE_URL,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({ sub: payload.sub }, 'Access token verified');
    });

    it('should reject non-access tokens', async () => {
      const token = 'refresh.token';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        type: 'refresh', // Wrong type
      };

      vi.mocked(verify).mockReturnValue(payload as any);

      const result = await jwtService.verifyAccessToken(token);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Invalid token type');
    });

    it('should handle expired tokens', async () => {
      const token = 'expired.token';
      const error = new TokenExpiredError('jwt expired', new Date());

      vi.mocked(verify).mockImplementation(() => {
        throw error;
      });

      const result = await jwtService.verifyAccessToken(token);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Token expired');
      expect(mockLogger.debug).toHaveBeenCalledWith('Token expired');
    });

    it('should handle invalid tokens', async () => {
      const token = 'invalid.token';
      const error = new JsonWebTokenError('invalid signature');

      vi.mocked(verify).mockImplementation(() => {
        throw error;
      });

      const result = await jwtService.verifyAccessToken(token);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Invalid token');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { error: 'invalid signature' },
        'Invalid token',
      );
    });

    it('should handle verification errors', async () => {
      const token = 'error.token';
      const error = new Error('Verification error');

      vi.mocked(verify).mockImplementation(() => {
        throw error;
      });

      const result = await jwtService.verifyAccessToken(token);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Failed to verify token');
      expect(mockLogger.error).toHaveBeenCalledWith({ error }, 'Failed to verify access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const token = 'valid.refresh.token';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        type: 'refresh',
        iat: 1234567890,
        exp: 1237159890,
      };

      vi.mocked(verify).mockReturnValue(payload as any);

      const result = await jwtService.verifyRefreshToken(token);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(payload);
      expect(mockLogger.debug).toHaveBeenCalledWith({ sub: payload.sub }, 'Refresh token verified');
    });

    it('should reject non-refresh tokens', async () => {
      const token = 'access.token';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        type: 'access', // Wrong type
      };

      vi.mocked(verify).mockReturnValue(payload as any);

      const result = await jwtService.verifyRefreshToken(token);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Invalid token type');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'some.token.here';
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        tier: 'tier1',
      };

      vi.mocked(decode).mockReturnValue(payload as any);

      const result = jwtService.decodeToken(token);

      expect(result).toEqual(payload);
      expect(decode).toHaveBeenCalledWith(token);
    });

    it('should return null on decode error', () => {
      const token = 'invalid.token';
      const error = new Error('Decode error');

      vi.mocked(decode).mockImplementation(() => {
        throw error;
      });

      const result = jwtService.decodeToken(token);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith({ error }, 'Failed to decode token');
    });
  });
});
