import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitExceededHandler } from '../api/rate-limit-exceeded.handler';
import { RateLimitExceeded } from '@/domain/api/events/rate-limit-exceeded.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { Result } from '@/domain/shared/result';
import { Logger } from 'pino';
import { EventType } from '@/domain/log/value-objects/auth-event';
import { AuthResult } from '@/domain/log/value-objects';

describe('RateLimitExceededHandler', () => {
  let handler: RateLimitExceededHandler;
  let mockAuthLogRepository: IAuthLogRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの作成
    mockAuthLogRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByEventType: vi.fn(),
      findByIPAddress: vi.fn(),
      findFailures: vi.fn(),
      findSuspiciousActivities: vi.fn(),
      getStatistics: vi.fn(),
      deleteOldLogs: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    handler = new RateLimitExceededHandler(mockAuthLogRepository, mockLogger);
  });

  describe('handle', () => {
    it('should save rate limit exceeded log successfully', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'endpoint-123',
        61,
        60,
        new Date(),
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));
      vi.mocked(mockAuthLogRepository.findByEventType).mockResolvedValueOnce(Result.ok([]));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).toHaveBeenCalled();
      const savedLog = vi.mocked(mockAuthLogRepository.save).mock.calls[0][0];
      expect(savedLog).toBeInstanceOf(AuthLogEntry);
      expect(savedLog.userId.value).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(savedLog.event.type).toBe(EventType.RATE_LIMIT_CHECK);
      expect(savedLog.result).toBe(AuthResult.BLOCKED);
      expect(savedLog.errorMessage).toBe('Rate limit exceeded: 61/60 requests');
      expect(savedLog.metadata).toMatchObject({
        endpointId: 'endpoint-123',
        requestCount: 61,
        rateLimit: 60,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          requestCount: 61,
          rateLimit: 60,
        }),
        'Handling RateLimitExceeded event',
      );
    });

    it('should detect multiple rate limit violations', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'endpoint-123',
        61,
        60,
        new Date(),
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));

      // Mock multiple previous violations
      const previousViolations = Array(5)
        .fill(null)
        .map(
          () =>
            ({
              id: { value: 'log-id' } as any,
              userId: { value: '550e8400-e29b-41d4-a716-446655440000' } as any,
              eventType: EventType.RATE_LIMIT_CHECK,
              result: AuthResult.BLOCKED,
              createdAt: new Date(),
            }) as AuthLogEntry,
        );

      vi.mocked(mockAuthLogRepository.findByEventType).mockResolvedValueOnce(
        Result.ok(previousViolations),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          blockCount: 5,
        }),
        'Multiple rate limit violations detected for user',
      );
    });

    it('should handle invalid userId gracefully', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        '', // Invalid empty userId
        'endpoint-123',
        61,
        60,
        new Date(),
        1,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
        }),
        'Invalid userId in RateLimitExceeded event',
      );
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'endpoint-123',
        61,
        60,
        new Date(),
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.fail('Database error'));
      vi.mocked(mockAuthLogRepository.findByEventType).mockResolvedValueOnce(Result.ok([]));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          error: expect.any(Error),
        }),
        'Failed to save rate limit exceeded log',
      );
    });

    it('should handle findByEventType failure gracefully', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'endpoint-123',
        61,
        60,
        new Date(),
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));
      vi.mocked(mockAuthLogRepository.findByEventType).mockResolvedValueOnce(
        Result.fail('Query error'),
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        expect.anything(),
        'Multiple rate limit violations detected for user',
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const event = new RateLimitExceeded(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'endpoint-123',
        61,
        60,
        new Date(),
      );

      const error = new Error('Unexpected error');
      vi.mocked(mockAuthLogRepository.save).mockRejectedValueOnce(error);

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Unexpected error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          error: 'Unexpected error',
          stack: expect.any(String),
        }),
        'Error handling RateLimitExceeded event',
      );
    });
  });
});
