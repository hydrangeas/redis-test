import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { container } from 'tsyringe';
import { setupTestDI } from '../../di/container';
import { DI_TOKENS } from '../../di/tokens';
import { Logger } from 'pino';
import { EventLogger } from '../event-logger';
import { EventBus } from '../../events/event-bus';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { APIEndpoint } from '@/domain/api/entities/api-endpoint.entity';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';

describe('Logging Infrastructure Integration', () => {
  let mockLogger: Logger;
  let eventBus: EventBus;
  let eventLogger: EventLogger;

  beforeEach(() => {
    setupTestDI();

    // モックロガーを作成
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    // モックロガーでDIコンテナを上書き
    container.register<Logger>(DI_TOKENS.Logger, {
      useValue: mockLogger,
    });

    // EventBusとEventLoggerを取得
    eventBus = container.resolve<EventBus>(DI_TOKENS.EventBus);
    eventLogger = container.resolve(EventLogger);

    // EventLoggerをEventBusに登録
    eventBus.subscribe('UserAuthenticated', eventLogger);
    eventBus.subscribe('APIAccessRequested', eventLogger);
  });

  afterEach(() => {
    container.reset();
  });

  describe('Domain Event Logging', () => {
    it('should log UserAuthenticated event', async () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      if (userIdResult.isFailure) {
        throw new Error('Failed to create user ID');
      }
      const userId = userIdResult.getValue();

      const event = new UserAuthenticated(
        userId.value, // aggregateId
        1, // eventVersion
        userId.value, // userId
        'google', // provider
        'tier1', // tier
        'session-123', // sessionId
        '127.0.0.1', // ipAddress
        'Mozilla/5.0', // userAgent
      );

      await eventBus.publish(event);

      // 少し待機（非同期処理のため）
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify the event was logged
      expect(mockLogger.info).toHaveBeenCalled();

      // Get the first call to info
      const firstCall = (mockLogger.info as any).mock.calls.find(
        (call: any[]) => call[1] === 'Domain event: UserAuthenticated',
      );

      if (firstCall) {
        const loggedData = firstCall[0];
        expect(loggedData.context).toBe('domain_event');
        expect(loggedData.event.name).toBe('UserAuthenticated');
        expect(loggedData.event.eventId).toBe(event.eventId);

        // The sanitized data includes the properties from the event
        expect(loggedData.event.data.userId).toBe(userId.value);
        expect(loggedData.event.data.provider).toBe('google');
        expect(loggedData.event.data.tier).toBe('tier1');
        expect(loggedData.event.data.ipAddress).toBe('127.0.0.1');
      } else {
        // Check all calls for debugging
        console.log('All logger.info calls:', (mockLogger.info as any).mock.calls);
        throw new Error('Expected log message not found');
      }
    });

    it('should log APIAccessRequested event with sanitized data', async () => {
      const endpointResult = APIEndpoint.create({
        path: '/api/data/test.json',
        method: HttpMethod.GET,
        type: EndpointType.PROTECTED,
        isActive: true,
      });

      if (endpointResult.isFailure) {
        throw new Error('Failed to create endpoint');
      }

      const endpoint = endpointResult.getValue();
      const event = new APIAccessRequested(
        endpoint.id.value, // aggregateId
        'user-123', // userId
        endpoint.id.value, // endpointId
        endpoint.path.value, // path
        HttpMethod.GET, // method
        EndpointType.PROTECTED, // endpointType
        new Date(), // requestTime
        1, // eventVersion
      );

      await eventBus.publish(event);

      // 少し待機（非同期処理のため）
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Find the correct log call
      const logCall = (mockLogger.info as any).mock.calls.find(
        (call: any[]) => call[1] === 'Domain event: APIAccessRequested',
      );

      if (!logCall) {
        console.log('All logger.info calls:', (mockLogger.info as any).mock.calls);
        throw new Error('Expected log message not found');
      }

      const loggedData = logCall[0].event.data;

      // センシティブデータがサニタイズされていることを確認
      expect(loggedData.headers).toBeUndefined();
      expect(loggedData.path).toBe('/api/data/test.json');
      expect(loggedData.method).toBe('GET');
    });
  });

  describe('Performance Metrics Logging', () => {
    it('should measure and log async operation performance', async () => {
      const { measurePerformance } = await import('../metrics');

      const mockOperation = vi.fn().mockResolvedValue('result');
      const result = await measurePerformance(mockLogger, 'test-async-operation', mockOperation, {
        requestId: 'req-123',
      });

      expect(result).toBe('result');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          performance: expect.objectContaining({
            operation: 'test-async-operation',
            duration: expect.any(Number),
            requestId: 'req-123',
            status: 'success',
          }),
          context: 'performance_metric',
        }),
        expect.stringContaining('Performance: test-async-operation completed in'),
      );
    });
  });
});
