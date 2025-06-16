import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../../../infrastructure/di/tokens';
import { setupTestDI } from '../../../../infrastructure/di/container';
import refreshRoute from '../refresh.route';
import { AuthenticationUseCase } from '../../../../application/use-cases/authentication.use-case';
import { ApplicationError } from '../../../../application/errors/application-error';
import type { Result } from '../../../../application/errors/result';

describe('Refresh Route', () => {
  let app: FastifyInstance;
  let mockAuthUseCase: Partial<AuthenticationUseCase>;

  beforeEach(async () => {
    setupTestDI();

    // Mock AuthenticationUseCase
    mockAuthUseCase = {
      refreshToken: vi.fn(),
    };

    container.register(DI_TOKENS.AuthenticationUseCase, {
      useValue: mockAuthUseCase,
    });

    app = fastify({ logger: false });

    // Register error handler to properly format validation errors
    const errorHandler = (await import('../../../plugins/error-handler')).default;
    await app.register(errorHandler);

    await app.register(refreshRoute);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('POST /refresh', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      vi.mocked(mockAuthUseCase.refreshToken).mockResolvedValue({
        success: true,
        data: mockRefreshResult,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refresh_token: 'valid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      });

      expect(mockAuthUseCase.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should return 400 when refresh token is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/validation-error'),
        title: 'Validation Error',
        status: 400,
        instance: '/refresh',
      });

      expect(mockAuthUseCase.refreshToken).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is empty', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refresh_token: '   ',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/missing-refresh-token'),
        title: 'Refresh token is required',
        status: 401,
        instance: '/refresh',
      });
    });

    it('should return 401 when refresh token is invalid', async () => {
      const error = new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Invalid or expired refresh token',
        'UNAUTHORIZED',
      );

      vi.mocked(mockAuthUseCase.refreshToken).mockResolvedValue({
        success: false,
        error,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refresh_token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/invalid-refresh-token'),
        title: 'Invalid or expired refresh token',
        status: 401,
      });
    });

    it('should return 503 when external service fails', async () => {
      const error = new ApplicationError(
        'SUPABASE_ERROR',
        'External service unavailable',
        'EXTERNAL_SERVICE',
        { service: 'supabase' },
      );

      vi.mocked(mockAuthUseCase.refreshToken).mockResolvedValue({
        success: false,
        error,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refresh_token: 'valid-token',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/supabase-error'),
        title: 'External service unavailable',
        status: 503,
      });
    });

    it('should return 503 when unexpected error occurs', async () => {
      vi.mocked(mockAuthUseCase.refreshToken).mockRejectedValue(new Error('Unexpected error'));

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refresh_token: 'valid-token',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/internal-error'),
        title: 'An unexpected error occurred',
        status: 503,
      });
    });

    it('should validate request body schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          invalid_field: 'value',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/validation-error'),
        status: 400,
      });
    });
  });
});
