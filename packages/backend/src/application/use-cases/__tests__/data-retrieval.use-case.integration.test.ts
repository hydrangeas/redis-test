import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { DataRetrievalUseCase } from '../data-retrieval.use-case';
import { AuthenticationUseCase } from '../authentication.use-case';
import { APIAccessControlUseCase } from '../api-access-control.use-case';
import { setupDependencies, createMockUser } from '../../__tests__/test-utils';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
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

      // File system mocks are no longer needed as we use the repository pattern

      // Mock repository
      const mockResource = {
        id: { value: 'resource-id' },
        path: { value: filePath },
        metadata: {
          size: 1024,
          etag: '"abc123"',
          lastModified: new Date('2024-01-01'),
          contentType: 'application/json',
        },
        recordAccess: vi.fn(),
      };
      mockDependencies.mockRepositories.openData.findByPath.mockResolvedValue(Result.ok(mockResource));
      mockDependencies.mockRepositories.openData.getContent.mockResolvedValue(Result.ok(mockData));

      const result = await useCase.retrieveData(
        filePath,
        authenticatedUser,
      );

      expect(result.isSuccess).toBe(true);
      const dataResult = result.getValue();
      expect(dataResult.content).toEqual(mockData);
      expect(dataResult.checksum).toBeDefined();
      expect(dataResult.lastModified).toEqual(new Date('2024-01-01'));

      // Authentication is not called in retrieveData anymore
      // expect(authUseCase.validateToken).toHaveBeenCalledWith(token);

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
      mockDependencies.mockRepositories.openData.findByPath.mockResolvedValue(
        Result.fail(new DomainError('RESOURCE_NOT_FOUND', 'Resource not found', ErrorType.NOT_FOUND))
      );

      const result = await useCase.retrieveData(
        filePath,
        authenticatedUser,
      );

      expect(result.isFailure).toBe(true);
      const error = result.getError();
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      // DomainError doesn't have these specific fields
      // expect(error.details).toMatchObject({...});
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

      const result = await useCase.retrieveData(
        filePath,
        authenticatedUser,
      );

      expect(result.isFailure).toBe(true);
      const error = result.getError();
      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.type).toBe(ErrorType.FORBIDDEN);
    });

    // This test is not applicable for DataRetrievalUseCase as it expects an already authenticated user
    // Authentication should be tested at a higher level (e.g., controller or API handler)
    it.skip('should return 401 when authentication fails', async () => {
      // This test would need to be implemented at the API handler level
      // where authentication happens before calling DataRetrievalUseCase
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

      const mockResource = {
        id: { value: 'resource-id' },
        path: { value: filePath },
        metadata: {
          size: 2048,
          etag: '"def456"',
          lastModified: new Date('2024-01-15'),
          contentType: 'application/json',
        },
        recordAccess: vi.fn(),
      };
      mockDependencies.mockRepositories.openData.findByPath.mockResolvedValue(Result.ok(mockResource));
      mockDependencies.mockRepositories.openData.getContent.mockResolvedValue(Result.ok(mockData));

      const result = await useCase.retrieveData(
        filePath,
        authenticatedUser,
      );

      expect(result.isSuccess).toBe(true);
      const dataResult = result.getValue();
      expect(dataResult.content).toEqual(mockData);
      expect(dataResult.checksum).toBeDefined();
      expect(dataResult.lastModified).toEqual(new Date('2024-01-15'));

      // Authentication is not called in retrieveData anymore
      // expect(authUseCase.validateToken).toHaveBeenCalled();
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
      const mockResource = {
        id: { value: 'resource-id' },
        path: { value: filePath },
        metadata: {
          size: 512,
          etag: '"abc123"',
          lastModified: lastModified,
          contentType: 'application/json',
        },
        recordAccess: vi.fn(),
        matchesEtag: vi.fn().mockReturnValue(false),
      };
      mockDependencies.mockRepositories.openData.findByPath.mockResolvedValue(Result.ok(mockResource));
      mockDependencies.mockRepositories.openData.getContent.mockResolvedValue(Result.ok(mockData));

      const result = await useCase.retrieveData(
        filePath,
        authenticatedUser,
      );

      expect(result.isSuccess).toBe(true);
      const dataResult = result.getValue();
      expect(dataResult.lastModified).toEqual(lastModified);
      expect(dataResult.checksum).toBeDefined();
      expect(dataResult.checksum).toMatch(/^"[a-f0-9]+"$/); // ETag format
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

      const result = await useCase.retrieveData(
        maliciousPath,
        authenticatedUser,
      );

      expect(result.isFailure).toBe(true);
      const error = result.getError();
      expect(error.code).toBe('INVALID_PATH_FORMAT');
      expect(error.type).toBe(ErrorType.VALIDATION);

      // Verify access control was not called for invalid path
      expect(apiAccessControlUseCase.checkAndRecordAccess).not.toHaveBeenCalled();
    });
  });
});
