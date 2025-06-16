import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../../../infrastructure/di/tokens';
import { setupTestDI } from '../../../../infrastructure/di/container';
import logoutRoute from '../logout.route';
import { AuthenticationUseCase } from '../../../../application/use-cases/authentication.use-case';
import { ApplicationError } from '../../../../application/errors/application-error';
import type { Result } from '../../../../application/errors/result';
import { AuthenticatedUser } from '../../../../domain/auth/value-objects/authenticated-user';
import { UserId } from '../../../../domain/auth/value-objects/user-id';
import { UserTier } from '../../../../domain/auth/value-objects/user-tier';
import { registerAuthDecorator } from '../../../middleware/authenticate';

describe('Logout Route', () => {
  let app: FastifyInstance;
  let mockAuthUseCase: Partial<AuthenticationUseCase>;

  function createMockAuthenticatedUser(userId = 'test-user-123'): AuthenticatedUser {
    return new AuthenticatedUser(new UserId(userId), new UserTier('tier1'));
  }

  beforeEach(async () => {
    setupTestDI();

    // Mock AuthenticationUseCase
    mockAuthUseCase = {
      validateToken: vi.fn(),
      signOut: vi.fn(),
    };

    container.register(DI_TOKENS.AuthenticationUseCase, {
      useValue: mockAuthUseCase,
    });

    app = fastify({ logger: false });

    // Register authentication decorator
    registerAuthDecorator(app);

    // Register error handler to properly format validation errors
    const errorHandler = (await import('../../../plugins/error-handler')).default;
    await app.register(errorHandler);

    await app.register(logoutRoute);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('POST /logout', () => {
    it('should logout successfully with valid token', async () => {
      const mockUser = createMockAuthenticatedUser();

      // Mock successful token validation
      vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokenId: 'token-123',
        },
      });

      // Mock successful logout
      vi.mocked(mockAuthUseCase.signOut).mockResolvedValue({
        success: true,
        data: undefined,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['clear-site-data']).toBe('"storage"');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        message: 'Logout successful',
        timestamp: expect.any(String),
      });

      expect(mockAuthUseCase.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockAuthUseCase.signOut).toHaveBeenCalledWith('test-user-123');
    });

    it('should return 401 when authorization header is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/logout',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.headers['www-authenticate']).toBe('Bearer');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/missing-auth-header'),
        title: 'Missing or invalid authorization header',
        status: 401,
        instance: '/logout',
      });

      expect(mockAuthUseCase.validateToken).not.toHaveBeenCalled();
      expect(mockAuthUseCase.signOut).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header format is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.headers['www-authenticate']).toBe('Bearer');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/invalid-auth-format'),
        title: 'Authorization header must use Bearer scheme',
        status: 401,
      });
    });

    it('should return 401 when token is invalid', async () => {
      const error = new ApplicationError(
        'INVALID_TOKEN',
        'Token is invalid or expired',
        'UNAUTHORIZED',
      );

      vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
        success: false,
        error,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/invalid-token'),
        title: 'Token is invalid or expired',
        status: 401,
      });

      expect(mockAuthUseCase.signOut).not.toHaveBeenCalled();
    });

    it('should return 503 when logout fails due to external service', async () => {
      const mockUser = createMockAuthenticatedUser();

      vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokenId: 'token-123',
        },
      });

      const error = new ApplicationError(
        'LOGOUT_ERROR',
        'Failed to invalidate session',
        'EXTERNAL_SERVICE',
      );

      vi.mocked(mockAuthUseCase.signOut).mockResolvedValue({
        success: false,
        error,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/logout-error'),
        title: 'Failed to invalidate session',
        status: 503,
      });
    });

    it('should return 500 when logout fails due to internal error', async () => {
      const mockUser = createMockAuthenticatedUser();

      vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokenId: 'token-123',
        },
      });

      const error = new ApplicationError('INTERNAL_ERROR', 'Internal server error', 'INTERNAL');

      vi.mocked(mockAuthUseCase.signOut).mockResolvedValue({
        success: false,
        error,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('should return 503 when unexpected error occurs', async () => {
      const mockUser = createMockAuthenticatedUser();

      vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokenId: 'token-123',
        },
      });

      vi.mocked(mockAuthUseCase.signOut).mockRejectedValue(new Error('Unexpected error'));

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/logout-error'),
        title: 'An error occurred during logout',
        status: 503,
      });
    });
  });
});
