import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { authenticate } from '../authenticate';
import { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import { ApplicationError } from '@/application/errors/application-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { setupTestDI } from '@/infrastructure/di';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';

describe('authenticate middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockAuthUseCase: Partial<AuthenticationUseCase>;

  function createMockAuthenticatedUser(userId = 'test-user-123'): AuthenticatedUser {
    return new AuthenticatedUser(new UserId(userId), new UserTier('tier1'));
  }

  beforeEach(() => {
    setupTestDI();

    // Mock request
    mockRequest = {
      headers: {},
      url: '/test',
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as any,
    };

    // Mock reply
    mockReply = {
      code: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Mock AuthenticationUseCase
    mockAuthUseCase = {
      validateToken: vi.fn(),
    };

    container.register(DI_TOKENS.AuthenticationUseCase, {
      useValue: mockAuthUseCase,
    });
  });

  it('should authenticate successfully with valid token', async () => {
    const mockUser = createMockAuthenticatedUser();
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
      success: true,
      data: {
        user: mockUser,
        tokenId: 'token-123',
      },
    });

    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockAuthUseCase.validateToken).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.user).toBe(mockUser);
    expect(mockRequest.authenticatedUser).toBe(mockUser);
    expect(mockReply.send).not.toHaveBeenCalled();
    expect(mockRequest.log.info).toHaveBeenCalledWith(
      {
        userId: 'test-user-123',
        tier: 'tier1',
      },
      'User authenticated successfully',
    );
  });

  it('should return 401 when authorization header is missing', async () => {
    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.code).toHaveBeenCalledWith(401);
    expect(mockReply.header).toHaveBeenCalledWith('content-type', 'application/problem+json');
    expect(mockReply.header).toHaveBeenCalledWith('www-authenticate', 'Bearer');
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('/errors/missing-auth-header'),
        title: 'Missing or invalid authorization header',
        status: 401,
      }),
    );
    expect(mockAuthUseCase.validateToken).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header format is invalid', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.code).toHaveBeenCalledWith(401);
    expect(mockReply.header).toHaveBeenCalledWith('www-authenticate', 'Bearer');
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('/errors/invalid-auth-format'),
        title: 'Authorization header must use Bearer scheme',
        status: 401,
      }),
    );
  });

  it('should return 401 when token validation fails', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    const error = new ApplicationError(
      'INVALID_TOKEN',
      'Token is invalid or expired',
      'UNAUTHORIZED',
    );

    vi.mocked(mockAuthUseCase.validateToken).mockResolvedValue({
      success: false,
      error,
    });

    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.code).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('/errors/invalid-token'),
        title: 'Token is invalid or expired',
        status: 401,
      }),
    );
    expect(mockRequest.log.warn).toHaveBeenCalled();
  });

  it('should return 500 when unexpected error occurs', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    vi.mocked(mockAuthUseCase.validateToken).mockRejectedValue(new Error('Unexpected error'));

    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.code).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('/errors/auth-error'),
        title: 'An error occurred during authentication',
        status: 500,
      }),
    );
    expect(mockRequest.log.error).toHaveBeenCalled();
  });

  it('should handle non-string authorization header', async () => {
    mockRequest.headers = {
      authorization: ['Bearer token1', 'Bearer token2'] as any,
    };

    await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.code).toHaveBeenCalledWith(401);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('/errors/missing-auth-header'),
        title: 'Missing or invalid authorization header',
        status: 401,
      }),
    );
  });
});
