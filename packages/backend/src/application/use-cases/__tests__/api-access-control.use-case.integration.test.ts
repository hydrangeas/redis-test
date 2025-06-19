import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { APIAccessControlUseCase } from '../api-access-control.use-case';
import { setupDependencies, createMockUser } from '../../__tests__/test-utils';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { APIAccessControlService } from '@/domain/api/services/api-access-control.service';
import { RateLimitUseCase } from '../rate-limit.use-case';
import { Result } from '@/domain/errors';
import { Email } from '@/domain/auth/value-objects/email';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { RateLimitExceeded } from '@/domain/api/events/rate-limit-exceeded.event';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

describe('APIAccessControlUseCase Integration', () => {
  let useCase: APIAccessControlUseCase;
  let mockDependencies: any;
  let apiAccessControlService: APIAccessControlService;
  let rateLimitUseCase: RateLimitUseCase;

  beforeEach(() => {
    container.reset();
    mockDependencies = setupDependencies();

    // Mock domain service
    apiAccessControlService = {
      canAccessEndpoint: vi.fn(),
      checkRateLimit: vi.fn(),
      calculateResetTime: vi.fn(),
    } as any;
    container.registerInstance(DI_TOKENS.APIAccessControlService, apiAccessControlService);

    // Mock rate limit use case
    rateLimitUseCase = {
      checkAndRecordAccess: vi.fn(),
      getUserUsageStatus: vi.fn(),
      resetUserLimit: vi.fn(),
    } as any;
    container.registerInstance(DI_TOKENS.RateLimitUseCase, rateLimitUseCase);

    useCase = container.resolve(APIAccessControlUseCase);
  });

  describe('checkAndRecordAccess', () => {
    it('should allow access within rate limit', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
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

      const endpoint = '/secure/data.json';
      const method = 'GET';

      // Mock access control service
      apiAccessControlService.canAccessEndpoint.mockReturnValue(Result.ok(true));

      // Mock rate limit check - under limit
      rateLimitUseCase.checkAndRecordAccess.mockResolvedValue(
        Result.ok({
          allowed: true,
          limit: 60,
          remaining: 30,
          resetAt: Math.floor((Date.now() + 60000) / 1000),
        }),
      );

      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method, {
        ipAddress: '192.168.1.100',
      });

      expect(result.isSuccess).toBe(true);
      const decision = result.getValue();
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('authenticated');
      expect(decision.rateLimitStatus?.remaining).toBe(30);

      // Verify rate limit was checked
      expect(rateLimitUseCase.checkAndRecordAccess).toHaveBeenCalledWith(
        authenticatedUser,
        endpoint,
        method,
      );

      // Verify event was published
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(APIAccessRequested),
      );
    });

    it('should deny access when rate limit exceeded', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID v4
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

      const endpoint = '/secure/data.json';
      const method = 'GET';

      // Mock access control service
      apiAccessControlService.canAccessEndpoint.mockReturnValue(Result.ok(true));

      // Mock rate limit check - at limit
      rateLimitUseCase.checkAndRecordAccess.mockResolvedValue(
        Result.ok({
          allowed: false,
          limit: 60,
          remaining: 0,
          resetAt: Math.floor((Date.now() + 45000) / 1000),
          retryAfter: 45,
        }),
      );

      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method, {
        ipAddress: '192.168.1.100',
      });

      expect(result.isSuccess).toBe(true);
      const decision = result.getValue();
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('rate_limit_exceeded');
      expect(decision.rateLimitStatus?.remaining).toBe(0);

      // Verify rate limit was checked
      expect(rateLimitUseCase.checkAndRecordAccess).toHaveBeenCalled();

      // Verify rate limit exceeded event
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(RateLimitExceeded),
      );
    });

    it('should handle rate limit check errors', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID v4
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

      // Mock access control service
      apiAccessControlService.canAccessEndpoint.mockReturnValue(Result.ok(true));

      // Mock rate limit check failure
      rateLimitUseCase.checkAndRecordAccess.mockResolvedValue(
        Result.fail(
          new DomainError(
            'RATE_LIMIT_CHECK_FAILED',
            'Failed to check rate limit',
            ErrorType.INTERNAL,
          ),
        ),
      );

      const result = await useCase.checkAndRecordAccess(
        authenticatedUser,
        '/secure/data.json',
        'GET',
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RATE_LIMIT_CHECK_FAILED');
    });
  });

  describe('recordPublicAccess', () => {
    it('should record public endpoint access', async () => {
      const endpoint = '/api-docs';
      const method = 'GET';
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      const result = await useCase.recordPublicAccess(endpoint, method, metadata);

      expect(result.isSuccess).toBe(true);
      // Public access is recorded through internal logging, not rate limit
    });
  });

  describe('cross-context integration', () => {
    it('should coordinate rate limiting and logging across contexts', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID v4
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

      const endpoint = '/secure/complex/data.json';
      const method = 'POST';

      // Mock access control service
      apiAccessControlService.canAccessEndpoint.mockReturnValue(Result.ok(true));

      // Mock successful rate limit check
      rateLimitUseCase.checkAndRecordAccess.mockResolvedValue(
        Result.ok({
          allowed: true,
          limit: 120, // tier2 limit
          remaining: 70,
          resetAt: Math.floor((Date.now() + 60000) / 1000),
        }),
      );

      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method, {
        ipAddress: '10.0.0.1',
        correlationId: 'correlation-123',
        requestId: 'request-123',
      });

      expect(result.isSuccess).toBe(true);
      const decision = result.getValue();
      expect(decision.allowed).toBe(true);
      expect(decision.rateLimitStatus?.limit).toBe(120); // tier2 limit

      // Verify all contexts were involved
      expect(rateLimitUseCase.checkAndRecordAccess).toHaveBeenCalled();
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalled();
    });

    it('should handle concurrent requests properly', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440004'; // Valid UUID v4
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

      const endpoint = '/secure/data.json';

      // Mock access control service
      apiAccessControlService.canAccessEndpoint.mockReturnValue(Result.ok(true));

      // Setup rate limit responses for concurrent requests
      let requestCount = 58;
      rateLimitUseCase.checkAndRecordAccess.mockImplementation(async () => {
        const currentCount = requestCount++;
        const allowed = currentCount < 60;
        const remaining = Math.max(0, 60 - currentCount - 1);
        return Result.ok({
          allowed,
          limit: 60,
          remaining,
          resetAt: Math.floor((Date.now() + 60000) / 1000),
          retryAfter: allowed ? undefined : 30,
        });
      });

      // Simulate 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() =>
          useCase.checkAndRecordAccess(authenticatedUser, endpoint, 'GET', {
            ipAddress: '192.168.1.100',
          }),
        );

      const results = await Promise.all(promises);

      // First 2 should succeed, rest should be rate limited
      const allowedCount = results.filter((r) => r.isSuccess && r.getValue().allowed).length;
      const deniedCount = results.filter((r) => r.isSuccess && !r.getValue().allowed).length;

      expect(allowedCount).toBe(2); // 58, 59
      expect(deniedCount).toBe(3); // 60, 61, 62

      // Verify all requests were checked
      expect(rateLimitUseCase.checkAndRecordAccess).toHaveBeenCalledTimes(5);
    });
  });
});
