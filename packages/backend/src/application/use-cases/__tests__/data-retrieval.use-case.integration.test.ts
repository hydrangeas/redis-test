import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { DataRetrievalUseCase } from '../data-retrieval.use-case';
import { AuthenticationUseCase } from '../authentication.use-case';
import { APIAccessControlUseCase } from '../api-access-control.use-case';
import { setupDependencies, createMockUser } from '../../__tests__/test-utils';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Result } from '@/domain/errors';
import { FilePath } from '@/domain/data/value-objects/file-path';
import { JsonObject } from '@/domain/data/value-objects/json-object';
import { OpenDataResource, ResourceMetadata } from '@/domain/data/value-objects/open-data-resource';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { Email } from '@/domain/auth/value-objects/email';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { ApplicationError } from '@/application/errors/application-error';

describe('DataRetrievalUseCase Integration', () => {
  let useCase: DataRetrievalUseCase;
  let authUseCase: AuthenticationUseCase;
  let apiAccessControlUseCase: APIAccessControlUseCase;
  let mockDependencies: any;

  beforeEach(() => {
    container.reset();
    mockDependencies = setupDependencies();

    // Register use cases
    authUseCase = container.resolve(AuthenticationUseCase);
    apiAccessControlUseCase = container.resolve(APIAccessControlUseCase);
    useCase = container.resolve(DataRetrievalUseCase);
  });

  describe('retrieveData', () => {
    it('should retrieve data successfully when access is allowed', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
      const token = 'valid-token';
      const filePath = '/secure/319985/r5.json';
      const ipAddress = '192.168.1.100';
      const mockData = { key: 'value', nested: { data: 'test' } };

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER1);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Mock authentication
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      // Mock access control
      vi.spyOn(apiAccessControlUseCase, 'checkAndRecordAccess').mockResolvedValue(
        Result.ok({
          allowed: true,
          reason: 'authenticated',
          rateLimitStatus: {
            allowed: true,
            currentCount: 10,
            limit: 60,
            remainingRequests: 50,
            resetTime: new Date(Date.now() + 60000),
            windowStart: new Date(Date.now() - 30000),
            windowEnd: new Date(Date.now() + 30000),
          },
        }),
      );

      // Mock file system
      mockDependencies.mockFileSystem.access.mockResolvedValue(undefined);
      mockDependencies.mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockData));
      mockDependencies.mockFileSystem.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date('2024-01-01'),
      });

      // Mock repository
      mockDependencies.mockRepositories.openData.exists.mockResolvedValue(true);

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(true);
      const dataResult = result.data;
      expect(dataResult.data).toEqual(mockData);
      expect(dataResult.metadata.contentType).toBe('application/json');
      expect(dataResult.metadata.size).toBe(1024);

      // Verify authentication was called
      expect(authUseCase.validateToken).toHaveBeenCalledWith(token);

      // Verify access control was called
      expect(apiAccessControlUseCase.checkAndRecordAccess).toHaveBeenCalledWith(
        authenticatedUser,
        filePath,
        'GET',
        expect.objectContaining({ ipAddress }),
      );
    });

    it('should return 404 when file does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID v4
      const token = 'valid-token';
      const filePath = '/secure/missing.json';
      const ipAddress = '192.168.1.100';

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER1);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Mock authentication
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      // Mock access control
      vi.spyOn(apiAccessControlUseCase, 'checkAndRecordAccess').mockResolvedValue(
        Result.ok({
          allowed: true,
          reason: 'authenticated',
        }),
      );

      // Mock file not found
      mockDependencies.mockRepositories.openData.exists.mockResolvedValue(false);
      mockDependencies.mockFileSystem.access.mockRejectedValue(new Error('ENOENT'));

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(false);
      const error = result.error;
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.details).toMatchObject({
        type: 'https://example.com/errors/not-found',
        title: 'Resource not found',
        status: 404,
        detail: 'The requested data file does not exist',
        instance: filePath,
      });
    });

    it('should return 429 when rate limit exceeded', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID v4
      const token = 'valid-token';
      const filePath = '/secure/data.json';
      const ipAddress = '192.168.1.100';

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER1);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Mock authentication
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      // Mock rate limit exceeded
      vi.spyOn(apiAccessControlUseCase, 'checkAndRecordAccess').mockResolvedValue(
        Result.ok({
          allowed: false,
          reason: 'rate_limit_exceeded',
          rateLimitStatus: {
            allowed: false,
            currentCount: 60,
            limit: 60,
            remainingRequests: 0,
            resetTime: new Date(Date.now() + 45000),
            windowStart: new Date(Date.now() - 15000),
            windowEnd: new Date(Date.now() + 45000),
            retryAfter: 45,
          },
        }),
      );

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(false);
      const error = result.error;
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.details).toMatchObject({
        type: 'https://example.com/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
      });
    });

    it('should return 401 when authentication fails', async () => {
      const token = 'invalid-token';
      const filePath = '/secure/data.json';
      const ipAddress = '192.168.1.100';

      // Mock authentication failure
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: false,
        error: new ApplicationError('INVALID_TOKEN_FORMAT', 'Invalid token format', 'VALIDATION'),
      });

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(false);
      const error = result.error;
      expect(error.code).toBe('AUTHENTICATION_FAILED');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('cross-context data flow', () => {
    it('should handle complete flow from auth to data retrieval', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID v4
      const token = 'valid-token';
      const filePath = '/secure/complex/data.json';
      const ipAddress = '10.0.0.1';
      const mockData = {
        complexData: {
          items: [1, 2, 3],
          metadata: { version: '1.0' },
        },
      };

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER2);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Setup full mock chain
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      vi.spyOn(apiAccessControlUseCase, 'checkAndRecordAccess').mockResolvedValue(
        Result.ok({
          allowed: true,
          reason: 'authenticated',
          rateLimitStatus: {
            allowed: true,
            currentCount: 20,
            limit: 120, // tier2
            remainingRequests: 100,
            resetTime: new Date(Date.now() + 60000),
            windowStart: new Date(Date.now() - 30000),
            windowEnd: new Date(Date.now() + 30000),
          },
        }),
      );

      mockDependencies.mockRepositories.openData.exists.mockResolvedValue(true);
      mockDependencies.mockFileSystem.access.mockResolvedValue(undefined);
      mockDependencies.mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockData));
      mockDependencies.mockFileSystem.stat.mockResolvedValue({
        size: 2048,
        mtime: new Date('2024-01-15'),
      });

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(true);
      const dataResult = result.data;
      expect(dataResult.data).toEqual(mockData);
      expect(dataResult.metadata.size).toBe(2048);

      // Verify all contexts were involved
      expect(authUseCase.validateToken).toHaveBeenCalled();
      expect(apiAccessControlUseCase.checkAndRecordAccess).toHaveBeenCalled();
    });

    it('should handle caching headers correctly', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440004'; // Valid UUID v4
      const token = 'valid-token';
      const filePath = '/secure/cached.json';
      const ipAddress = '192.168.1.1';
      const mockData = { cached: true };
      const lastModified = new Date('2024-01-01T12:00:00Z');

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER1);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Setup authentication
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      vi.spyOn(apiAccessControlUseCase, 'checkAndRecordAccess').mockResolvedValue(
        Result.ok({
          allowed: true,
          reason: 'authenticated',
        }),
      );

      // Setup file system
      mockDependencies.mockRepositories.openData.exists.mockResolvedValue(true);
      mockDependencies.mockFileSystem.access.mockResolvedValue(undefined);
      mockDependencies.mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockData));
      mockDependencies.mockFileSystem.stat.mockResolvedValue({
        size: 512,
        mtime: lastModified,
      });

      const result = await useCase.retrieveData({
        token,
        path: filePath,
        ipAddress,
      });

      expect(result.success).toBe(true);
      const dataResult = result.data;
      expect(dataResult.metadata.lastModified).toEqual(lastModified);
      expect(dataResult.metadata.etag).toBeDefined();
      expect(dataResult.metadata.etag).toMatch(/^"[a-f0-9]+"$/); // ETag format
    });

    it('should handle path traversal attempts', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440005'; // Valid UUID v4
      const token = 'valid-token';
      const maliciousPath = '/secure/../../../etc/passwd';
      const ipAddress = '192.168.1.100';

      // Create authenticated user
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create(TierLevel.TIER1);

      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }

      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue(),
      );

      // Setup authentication
      vi.spyOn(authUseCase, 'validateToken').mockResolvedValue({
        success: true,
        data: {
          user: authenticatedUser,
          tokenId: 'token-123',
        },
      });

      const result = await useCase.retrieveData({
        token,
        path: maliciousPath,
        ipAddress,
      });

      expect(result.success).toBe(false);
      const error = result.error;
      expect(error.code).toBe('INVALID_PATH');
      expect(error.statusCode).toBe(400);

      // Verify access control was not called for invalid path
      expect(apiAccessControlUseCase.checkAndRecordAccess).not.toHaveBeenCalled();
    });
  });
});
