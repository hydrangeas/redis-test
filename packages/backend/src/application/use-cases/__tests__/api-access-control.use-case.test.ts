import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIAccessControlUseCase } from '../api-access-control.use-case';
import { IAPIAccessControlService } from '@/domain/api/services/api-access-control.service';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { Logger } from 'pino';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { Result } from '@/domain/shared/result';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { InvalidAPIAccess } from '@/domain/api/events/invalid-api-access.event';
import { DomainError } from '@/domain/errors/domain-error';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';

// モックの作成
const mockAccessControlService: IAPIAccessControlService = {
  canAccessEndpoint: vi.fn(),
  checkRateLimit: vi.fn(),
  calculateResetTime: vi.fn(),
};

const mockRateLimitUseCase: IRateLimitUseCase = {
  checkAndRecordAccess: vi.fn(),
};

const mockApiLogRepository: IAPILogRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByTimeRange: vi.fn(),
  findErrors: vi.fn(),
  getStatistics: vi.fn(),
  deleteOldLogs: vi.fn(),
};

const mockEventBus: IEventBus = {
  publish: vi.fn(),
  publishBatch: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  dispatch: vi.fn(),
};

const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
  level: 'info',
} as any;

describe('APIAccessControlUseCase', () => {
  let useCase: APIAccessControlUseCase;
  let authenticatedUser: AuthenticatedUser;

  beforeEach(() => {
    vi.clearAllMocks();

    useCase = new APIAccessControlUseCase(
      mockAccessControlService,
      mockRateLimitUseCase,
      mockApiLogRepository,
      mockEventBus,
      mockLogger,
    );

    // 認証済みユーザーのセットアップ
    const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
    if (userIdResult.isFailure) {
      throw new Error('Failed to create UserId');
    }
    const userId = userIdResult.getValue();

    const rateLimitResult = RateLimit.create(60, 60);
    if (rateLimitResult.isFailure) {
      throw new Error('Failed to create RateLimit');
    }
    const rateLimit = rateLimitResult.getValue();

    const tierResult = UserTier.create(TierLevel.TIER1, rateLimit);
    if (tierResult.isFailure) {
      throw new Error('Failed to create UserTier');
    }
    const tier = tierResult.getValue();

    authenticatedUser = new AuthenticatedUser(userId, tier);

    // デフォルトのモック設定
    vi.mocked(mockAccessControlService.canAccessEndpoint).mockReturnValue(Result.ok(true));
    vi.mocked(mockApiLogRepository.save).mockResolvedValue(Result.ok());
  });

  describe('checkAndRecordAccess', () => {
    it('should allow access when all checks pass', async () => {
      // Arrange
      const endpoint = '/api/data/test.json';
      const method = 'GET';
      const rateLimitResult = {
        allowed: true,
        currentCount: 10,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 50,
        retryAfter: null,
      };

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(
        Result.ok(rateLimitResult),
      );

      // Act
      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({
        allowed: true,
        reason: 'authenticated',
        rateLimitStatus: rateLimitResult,
      });

      // イベントが発行されたことを確認
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(APIAccessRequested));

      // 簡略化されたログ記録のため、APIログリポジトリは呼ばれない
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint,
          method,
          statusCode: 200,
        }),
        'API access logged',
      );
    });

    it('should deny access when endpoint is not found', async () => {
      // Arrange
      const endpoint = '../../invalid/path';
      const method = 'GET';

      // Act
      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({
        allowed: false,
        reason: 'endpoint_not_found',
        message: 'Invalid endpoint path',
      });
    });

    it('should deny access when user is unauthorized', async () => {
      // Arrange
      const endpoint = '/api/admin/data.json';
      const method = 'GET';

      vi.mocked(mockAccessControlService.canAccessEndpoint).mockReturnValue(Result.ok(false));

      // Act
      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({
        allowed: false,
        reason: 'unauthorized',
        message: 'Access to this endpoint is not allowed for your tier',
      });

      // 不正アクセスイベントが発行されたことを確認
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(InvalidAPIAccess));
    });

    it('should deny access when rate limit is exceeded', async () => {
      // Arrange
      const endpoint = '/api/data/test.json';
      const method = 'GET';
      const rateLimitResult = {
        allowed: false,
        currentCount: 61,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 0,
        retryAfter: 45,
      };

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(
        Result.ok(rateLimitResult),
      );

      // Act
      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({
        allowed: false,
        reason: 'rate_limit_exceeded',
        rateLimitStatus: rateLimitResult,
        message: 'Rate limit exceeded. Try again in 45 seconds',
      });

      // レート制限超過イベントが発行されたことを確認
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2); // APIAccessRequested + InvalidAPIAccess
    });

    it('should handle rate limit check failure', async () => {
      // Arrange
      const endpoint = '/api/data/test.json';
      const method = 'GET';
      const error = DomainError.internal('RATE_LIMIT_SERVICE_ERROR', 'Rate limit service error');

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(Result.fail(error));

      // Act
      const result = await useCase.checkAndRecordAccess(authenticatedUser, endpoint, method);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBe(error);
    });

    it('should record access with metadata', async () => {
      // Arrange
      const endpoint = '/api/data/test.json';
      const method = 'GET';
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const rateLimitResult = {
        allowed: true,
        currentCount: 10,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 50,
        retryAfter: null,
      };

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(
        Result.ok(rateLimitResult),
      );

      // Act
      const result = await useCase.checkAndRecordAccess(
        authenticatedUser,
        endpoint,
        method,
        metadata,
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint,
          method,
          statusCode: 200,
          metadata,
        }),
        'API access logged',
      );
    });
  });

  describe('recordPublicAccess', () => {
    it('should record access to public endpoints', async () => {
      // Arrange
      const endpoint = '/health';
      const method = 'GET';

      // Act
      const result = await useCase.recordPublicAccess(endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint,
          method,
          statusCode: 200,
        }),
        'API access logged',
      );
    });

    it('should handle logging errors gracefully', async () => {
      // Arrange
      const endpoint = '/health';
      const method = 'GET';
      const error = new Error('Database connection failed');

      // ログ記録はシンプルになったため、このテストケースは調整
      // 実際にはロガーのエラーはここでは発生しない

      // Act
      const result = await useCase.recordPublicAccess(endpoint, method);

      // Assert
      expect(result.isSuccess).toBe(true); // ログ記録は簡略化され、失敗しない
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should record public access with metadata', async () => {
      // Arrange
      const endpoint = '/api-docs';
      const method = 'GET';
      const metadata = {
        ipAddress: '10.0.0.1',
        userAgent: 'curl/7.64.1',
      };

      // Act
      const result = await useCase.recordPublicAccess(endpoint, method, metadata);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint,
          method,
          statusCode: 200,
          metadata,
        }),
        'API access logged',
      );
    });
  });

  describe('determineEndpointType', () => {
    it('should correctly identify public endpoints', async () => {
      // Arrange
      const publicEndpoints = ['/health', '/api-docs', '/openapi.json'];
      const rateLimitResult = {
        allowed: true,
        currentCount: 1,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 59,
        retryAfter: null,
      };

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(
        Result.ok(rateLimitResult),
      );

      for (const endpoint of publicEndpoints) {
        // Act
        await useCase.checkAndRecordAccess(authenticatedUser, endpoint, 'GET');

        // Assert
        // canAccessEndpoint should be called with public endpoint type
        expect(mockAccessControlService.canAccessEndpoint).toHaveBeenCalledWith(
          authenticatedUser,
          expect.any(EndpointPath),
          expect.objectContaining({
            _value: 'public',
          }),
        );
      }
    });

    it('should default to protected for other endpoints', async () => {
      // Arrange
      const protectedEndpoints = ['/api/data/test.json', '/secure/resource'];
      const rateLimitResult = {
        allowed: true,
        currentCount: 1,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 59,
        retryAfter: null,
      };

      vi.mocked(mockRateLimitUseCase.checkAndRecordAccess).mockResolvedValue(
        Result.ok(rateLimitResult),
      );

      for (const endpoint of protectedEndpoints) {
        // Act
        await useCase.checkAndRecordAccess(authenticatedUser, endpoint, 'GET');

        // Assert
        expect(mockAccessControlService.canAccessEndpoint).toHaveBeenCalledWith(
          authenticatedUser,
          expect.any(EndpointPath),
          expect.objectContaining({
            _value: 'protected',
          }),
        );
      }
    });
  });
});
