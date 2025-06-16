import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { AuthLogHandler } from '../auth-log.handler';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry, AuthResult } from '@/domain/log/entities/auth-log-entry';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { Logger } from 'pino';

describe('AuthLogHandler', () => {
  let handler: AuthLogHandler;
  let mockAuthLogRepository: IAuthLogRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの初期化
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
      fatal: vi.fn(),
      trace: vi.fn(),
    } as any;

    handler = new AuthLogHandler(mockAuthLogRepository, mockLogger);
  });

  it('should successfully log user authenticated event', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
    const event = new UserAuthenticated(
      userId,
      1,
      userId,
      'google',
      'tier2',
      'session-456',
      '192.168.1.1',
      'Mozilla/5.0...',
    );

    (mockAuthLogRepository.save as MockedFunction<any>).mockResolvedValue(Result.ok());

    // Act
    await handler.handle(event);

    // Assert
    expect(mockAuthLogRepository.save).toHaveBeenCalledOnce();
    const savedLog = (mockAuthLogRepository.save as MockedFunction<any>).mock.calls[0][0];

    expect(savedLog).toBeDefined();
    expect(savedLog.userId?.value).toBe(userId);
    expect(savedLog.provider.value).toBe('google');
    expect(savedLog.result).toBe(AuthResult.SUCCESS);
    expect(savedLog.metadata?.tier).toBe('tier2');
    expect(savedLog.metadata?.sessionId).toBe('session-456');

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          eventName: 'UserAuthenticated',
          aggregateId: userId,
        }),
      }),
      'Authentication event logged successfully',
    );
  });

  it('should handle event without optional fields', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID v4
    const event = new UserAuthenticated(userId, 1, userId, 'github', 'tier1');

    (mockAuthLogRepository.save as MockedFunction<any>).mockResolvedValue(Result.ok());

    // Act
    await handler.handle(event);

    // Assert
    expect(mockAuthLogRepository.save).toHaveBeenCalledOnce();
    const savedLog = (mockAuthLogRepository.save as MockedFunction<any>).mock.calls[0][0];

    expect(savedLog).toBeDefined();
    expect(savedLog.userId?.value).toBe(userId);
    expect(savedLog.provider.value).toBe('github');
    expect(savedLog.ipAddress.value).toBe('0.0.0.0'); // IPAddress.unknown() returns '0.0.0.0'
    expect(savedLog.userAgent.value).toBe('Unknown');
  });

  it('should handle repository save failure', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID v4
    const event = new UserAuthenticated(userId, 1, userId, 'google', 'tier2');

    const error = new DomainError('REPOSITORY_ERROR', 'Database connection failed', 'INTERNAL');
    (mockAuthLogRepository.save as MockedFunction<any>).mockResolvedValue(Result.fail(error));

    // Act
    await handler.handle(event);

    // Assert
    expect(mockAuthLogRepository.save).toHaveBeenCalledOnce();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: error,
        event: expect.objectContaining({
          eventName: 'UserAuthenticated',
        }),
      }),
      'Failed to save authentication log',
    );
  });

  it('should handle invalid user ID', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'invalid-user',
      1,
      'invalid-user-id', // Invalid user ID format
      'google',
      'tier2',
    );

    // Act
    await handler.handle(event);

    // Assert
    expect(mockAuthLogRepository.save).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          eventName: 'UserAuthenticated',
        }),
      }),
      'Failed to create user id',
    );
  });

  it('should handle invalid provider', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440003'; // Valid UUID v4
    const event = new UserAuthenticated(
      userId,
      1,
      userId,
      '', // Invalid empty provider
      'tier2',
    );

    // Act
    await handler.handle(event);

    // Assert
    expect(mockAuthLogRepository.save).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          eventName: 'UserAuthenticated',
        }),
      }),
      'Failed to create provider',
    );
  });

  it('should not throw error on unexpected exception', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440004'; // Valid UUID v4
    const event = new UserAuthenticated(userId, 1, userId, 'google', 'tier2');

    const unexpectedError = new Error('Unexpected error');
    (mockAuthLogRepository.save as MockedFunction<any>).mockRejectedValue(unexpectedError);

    // Act & Assert
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unexpected error',
        event: expect.objectContaining({
          eventName: 'UserAuthenticated',
        }),
      }),
      'Failed to log authentication event',
    );
  });

  it('should include event metadata in log entry', async () => {
    // Arrange
    const userId = '550e8400-e29b-41d4-a716-446655440005'; // Valid UUID v4
    const event = new UserAuthenticated(userId, 1, userId, 'google', 'tier3', 'session-789');

    (mockAuthLogRepository.save as MockedFunction<any>).mockResolvedValue(Result.ok());

    // Act
    await handler.handle(event);

    // Assert
    const savedLog = (mockAuthLogRepository.save as MockedFunction<any>).mock.calls[0][0];
    expect(savedLog.metadata).toEqual({
      tier: 'tier3',
      sessionId: 'session-789',
      eventId: event.eventId,
    });
  });
});
