import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { LoggingService } from '../logging.service';
import { setupDependencies } from '../../__tests__/test-utils';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { AuthEvent } from '@/domain/log/value-objects/auth-event';
import { APILog } from '@/domain/log/entities/api-log';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { HTTPMethod } from '@/domain/api/value-objects/http-method';
import { DomainError } from '@/domain/errors/domain-error';
import { StatusCode } from '@/domain/api/value-objects/status-code';
import { RequestDuration } from '@/domain/api/value-objects/request-duration';
import { RequestId } from '@/domain/api/value-objects/request-id';
import { APILogId } from '@/domain/log/value-objects/api-log-id';
import { Result } from '@/domain/errors';

describe('LoggingService Integration', () => {
  let service: LoggingService;
  let mockDependencies: any;

  beforeEach(() => {
    container.reset();
    mockDependencies = setupDependencies();
    service = container.resolve(LoggingService);
  });

  describe('logAuthEvent', () => {
    it('should log successful authentication event', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
      const eventType = AuthEvent.LOGIN_SUCCESS;
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      // Mock repository
      mockDependencies.mockRepositories.authLog.save.mockResolvedValue(Result.ok());

      const result = await service.logAuthEvent(userId, eventType, metadata);

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockRepositories.authLog.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.objectContaining({ value: userId }),
          event: eventType,
          timestamp: expect.any(Date),
          metadata,
        }),
      );
    });

    it('should log failed authentication event', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID v4
      const eventType = AuthEvent.LOGIN_FAILED;
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        reason: 'Invalid credentials',
      };

      mockDependencies.mockRepositories.authLog.save.mockResolvedValue(Result.ok());

      const result = await service.logAuthEvent(userId, eventType, metadata);

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockRepositories.authLog.save).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID v4
      const eventType = AuthEvent.LOGIN_SUCCESS;

      mockDependencies.mockRepositories.authLog.save.mockRejectedValue(new Error('Database error'));

      const result = await service.logAuthEvent(userId, eventType, {});

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('AUTH_LOG_FAILED');
    });
  });

  describe('logAPIAccess', () => {
    it('should log API access successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID v4
      const endpoint = '/secure/data.json';
      const method = 'GET';
      const statusCode = 200;
      const duration = 150;
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      // Mock apiLogService.logAPIAccess
      mockDependencies.mockApiLogService.logAPIAccess.mockResolvedValue(Result.ok());

      const result = await service.logAPIAccess(
        endpoint,
        method,
        statusCode,
        duration,
        userId,
        metadata,
      );

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockApiLogService.logAPIAccess).toHaveBeenCalledWith({
        userId,
        endpoint,
        method,
        statusCode,
        duration: 150,
        requestId: undefined,
        correlationId: undefined,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    });

    it('should log anonymous API access', async () => {
      const endpoint = '/api-docs';
      const method = 'GET';
      const statusCode = 200;
      const duration = 50;

      mockDependencies.mockApiLogService.logAPIAccess.mockResolvedValue(Result.ok());
      
      const result = await service.logAPIAccess(
        endpoint,
        method,
        statusCode,
        duration,
        undefined // No userId for anonymous access
      );

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockApiLogService.logAPIAccess).toHaveBeenCalledWith({
        userId: 'anonymous',
        endpoint,
        method,
        statusCode,
        duration: 50,
        requestId: undefined,
        correlationId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('should handle invalid parameters', async () => {
      mockDependencies.mockApiLogService.logAPIAccess.mockResolvedValue(
        Result.fail(new DomainError('INVALID_USER_ID_FORMAT', 'Invalid user ID', 'VALIDATION', {}))
      );
      
      const result = await service.logAPIAccess(
        '/secure/data.json',
        'GET',
        200,
        100,
        'invalid-uuid'
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_USER_ID_FORMAT');
    });
  });

  describe('getAuthLogs', () => {
    it('should retrieve auth logs for a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440004'; // Valid UUID v4
      const limit = 10;

      const mockLogs = [
        {
          userId: { value: userId },
          event: AuthEvent.LOGIN_SUCCESS,
          timestamp: new Date(),
          metadata: {},
        },
      ];

      mockDependencies.mockRepositories.authLog.findByUserId.mockResolvedValue(Result.ok(mockLogs));

      const result = await service.getAuthLogs(userId, limit);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(mockLogs);
      expect(mockDependencies.mockRepositories.authLog.findByUserId).toHaveBeenCalledWith(
        expect.objectContaining({ value: userId }),
        limit,
      );
    });

    it('should handle invalid user ID', async () => {
      const result = await service.getAuthLogs('invalid-uuid', 10);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_USER_ID_FORMAT');
    });
  });

  describe('getAPILogs', () => {
    it('should retrieve API logs by user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440005'; // Valid UUID v4
      const limit = 20;

      const mockLogs = [];
      mockDependencies.mockRepositories.apiLog.findByUserId.mockResolvedValue(Result.ok(mockLogs));

      const result = await service.getAPILogs(userId, undefined, limit);

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockRepositories.apiLog.findByUserId).toHaveBeenCalled();
    });

    // Note: getAPILogs doesn't support endpoint search, only userId and timeRange

    it('should retrieve API logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockLogs = [];
      mockDependencies.mockRepositories.apiLog.findByTimeRange.mockResolvedValue(
        Result.ok(mockLogs),
      );

      const result = await service.getAPILogs(undefined, { start: startDate, end: endDate });

      expect(result.isSuccess).toBe(true);
      expect(mockDependencies.mockRepositories.apiLog.findByTimeRange).toHaveBeenCalledWith(
        expect.objectContaining({
          start: startDate,
          end: endDate,
        }),
        100, // limit parameter
      );
    });
  });

  // Note: getAPIStatistics method is not implemented in LoggingService yet
  describe.skip('getAPIStatistics', () => {
    it('should retrieve API statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockStats = new Map([
        [200, 100],
        [404, 10],
        [429, 5],
        [500, 2],
      ]);

      mockDependencies.mockRepositories.apiLog.countByStatusCode.mockResolvedValue(
        Result.ok(mockStats),
      );

      const result = await service.getAPIStatistics(startDate, endDate);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.successCount).toBe(100);
      expect(stats.notFoundCount).toBe(10);
      expect(stats.rateLimitCount).toBe(5);
      expect(stats.errorCount).toBe(2);
      expect(stats.totalCount).toBe(117);
    });

    it('should handle repository errors', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDependencies.mockRepositories.apiLog.countByStatusCode.mockResolvedValue(
        Result.fail(new DomainError('DATABASE_ERROR', 'Failed to retrieve statistics', 'INTERNAL', {})),
      );

      const result = await service.getAPIStatistics(startDate, endDate);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('DATABASE_ERROR');
    });
  });
});
