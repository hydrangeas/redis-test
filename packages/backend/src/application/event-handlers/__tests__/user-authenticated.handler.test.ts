import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserAuthenticatedHandler } from '../auth/user-authenticated.handler';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { Result } from '@/domain/errors/result';
import { Logger } from 'pino';
import { LogId } from '@/domain/log/value-objects/log-id';

describe('UserAuthenticatedHandler', () => {
  let handler: UserAuthenticatedHandler;
  let mockAuthLogRepository: IAuthLogRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの作成
    mockAuthLogRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
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
    } as unknown as Logger;

    handler = new UserAuthenticatedHandler(mockAuthLogRepository, mockLogger);
  });

  describe('handle', () => {
    it('should save authentication log successfully', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'google',
        'tier1',
        'session-123',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      const mockLogId = LogId.create().value!;
      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).toHaveBeenCalled();
      const savedLog = vi.mocked(mockAuthLogRepository.save).mock.calls[0][0];
      expect(savedLog).toBeInstanceOf(AuthLogEntry);
      expect(savedLog.userId.value).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(savedLog.provider?.value).toBe('google');
      expect(savedLog.ipAddress?.value).toBe('192.168.1.1');
      expect(savedLog.userAgent?.value).toBe('Mozilla/5.0');
      expect(savedLog.metadata).toMatchObject({
        tier: 'tier1',
        eventId: event.eventId,
        aggregateId: 'agg-123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          provider: 'google',
          tier: 'tier1',
        }),
        'Handling UserAuthenticated event',
      );
    });

    it('should handle invalid userId gracefully', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '', // Invalid empty userId
        'google',
        'tier1',
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
        }),
        'Invalid userId in UserAuthenticated event',
      );
    });

    it('should handle invalid provider gracefully', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'invalid_provider', // Invalid provider
        'tier1',
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
        }),
        'Invalid provider in UserAuthenticated event',
      );
    });

    it('should warn on invalid optional fields but continue processing', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'google',
        'tier1',
        'session-123',
        'invalid.ip', // Invalid IP
        '', // Invalid empty user agent
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAuthLogRepository.save).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          ipAddress: 'invalid.ip',
        }),
        'Invalid IP address in UserAuthenticated event',
      );
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'google',
        'tier1',
      );

      vi.mocked(mockAuthLogRepository.save).mockResolvedValueOnce(Result.fail('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          error: 'Database error',
        }),
        'Failed to save auth log',
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const event = new UserAuthenticated(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        'google',
        'tier1',
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
        'Error handling UserAuthenticated event',
      );
    });
  });
});
