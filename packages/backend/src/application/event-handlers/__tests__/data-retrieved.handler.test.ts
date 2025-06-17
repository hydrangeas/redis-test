import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataRetrievedHandler } from '../data/data-retrieved.handler';
import { DataRetrieved } from '@/domain/data/events/data-retrieved.event';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { Result } from '@/domain/errors/result';
import { Logger } from 'pino';

describe('DataRetrievedHandler', () => {
  let handler: DataRetrievedHandler;
  let mockAPILogRepository: IAPILogRepository;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの作成
    mockAPILogRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByTimeRange: vi.fn(),
      findErrors: vi.fn(),
      getStatistics: vi.fn(),
      deleteOldLogs: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    handler = new DataRetrievedHandler(mockAPILogRepository, mockLogger);
  });

  describe('handle', () => {
    it('should save data retrieval log successfully', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '/secure/data.json',
        1024,
        'application/json',
        false,
        150,
      );

      vi.mocked(mockAPILogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAPILogRepository.save).toHaveBeenCalled();
      const saveCall = vi.mocked(mockAPILogRepository.save).mock.calls[0];
      expect(saveCall).toBeDefined();
      
      if (saveCall && saveCall[0]) {
        const savedLog = saveCall[0];
        expect(savedLog).toBeInstanceOf(APILogEntry);
        expect(savedLog.userId.value).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(savedLog.endpoint.path.value).toBe('/secure/data.json');
        expect(savedLog.endpoint.method).toBe('GET');
        expect(savedLog.responseInfo.statusCode).toBe(200);
        expect(savedLog.responseInfo.responseTime).toBe(150);
        // APILogEntry doesn't have metadata property
        // These values should be checked in responseInfo
        expect(savedLog.responseInfo.size).toBe(1024);
        expect(savedLog.responseInfo.headers['content-type']).toBe('application/json');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          userId: '550e8400-e29b-41d4-a716-446655440000',
          dataPath: '/secure/data.json',
          resourceSize: 1024,
          responseTime: 150,
          cached: false,
        }),
        'Handling DataRetrieved event',
      );
    });

    it('should warn on slow data retrieval', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '/secure/large-data.json',
        10485760, // 10MB
        'application/json',
        false,
        6000, // 6 seconds
      );

      vi.mocked(mockAPILogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          dataPath: '/secure/large-data.json',
          responseTime: 6000,
          resourceSize: 10485760,
        }),
        'Slow data retrieval detected',
      );
    });

    it('should handle cached data retrieval', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '/secure/cached-data.json',
        2048,
        'application/json',
        true, // cached
        10, // Very fast due to cache
      );

      vi.mocked(mockAPILogRepository.save).mockResolvedValueOnce(Result.ok(undefined as any));

      // Act
      await handler.handle(event);

      // Assert
      const saveCall = vi.mocked(mockAPILogRepository.save).mock.calls[0];
      if (saveCall && saveCall[0]) {
        const savedLog = saveCall[0];
        // Check responseTime for cached response
        expect(savedLog.responseInfo.responseTime).toBe(10);
      }
    });

    it('should handle invalid userId gracefully', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '', // Invalid empty userId
        '/secure/data.json',
        1024,
        'application/json',
        false,
        150,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAPILogRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
        }),
        'Invalid userId in DataRetrieved event',
      );
    });

    it('should handle invalid dataPath gracefully', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '', // Invalid empty path
        1024,
        'application/json',
        false,
        150,
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAPILogRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
        }),
        'Invalid dataPath in DataRetrieved event',
      );
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '/secure/data.json',
        1024,
        'application/json',
        false,
        150,
      );

      vi.mocked(mockAPILogRepository.save).mockResolvedValueOnce(Result.fail('Database error'));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          error: 'Database error',
        }),
        'Failed to save data retrieval log',
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const event = new DataRetrieved(
        'agg-123',
        1,
        '550e8400-e29b-41d4-a716-446655440000',
        '/secure/data.json',
        1024,
        'application/json',
        false,
        150,
      );

      const error = new Error('Unexpected error');
      vi.mocked(mockAPILogRepository.save).mockRejectedValueOnce(error);

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Unexpected error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          error: 'Unexpected error',
          stack: expect.any(String),
        }),
        'Error handling DataRetrieved event',
      );
    });
  });
});
