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
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { HTTPMethod } from '@/domain/api/value-objects/http-method';

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
      const userId = UserId.create();
      const event = new UserAuthenticated(
        userId,
        'google' as any,
        TierLevel.TIER1,
        '127.0.0.1'
      );

      await eventBus.publish(event);

      // 少し待機（非同期処理のため）
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            name: 'UserAuthenticated',
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            occurredAt: event.occurredAt,
            data: expect.objectContaining({
              provider: 'google',
              tier: 'tier1',
              ipAddress: '127.0.0.1',
            }),
          }),
          context: 'domain_event',
        }),
        'Domain event: UserAuthenticated'
      );
    });

    it('should log APIAccessRequested event with sanitized data', async () => {
      const event = new APIAccessRequested(
        'user-123',
        APIEndpoint.create('/api/data/test.json'),
        HTTPMethod.GET,
        '127.0.0.1',
        { authorization: 'Bearer secret-token' } // センシティブデータ
      );

      await eventBus.publish(event);

      // 少し待機（非同期処理のため）
      await new Promise(resolve => setTimeout(resolve, 10));

      const logCall = (mockLogger.info as any).mock.calls[0];
      const loggedData = logCall[0].event.data;

      // センシティブデータがサニタイズされていることを確認
      expect(loggedData.headers).toBeUndefined();
      expect(loggedData.endpoint).toBe('/api/data/test.json');
      expect(loggedData.method).toBe('GET');
    });
  });

  describe('Performance Metrics Logging', () => {
    it('should measure and log async operation performance', async () => {
      const { measurePerformance } = await import('../metrics');
      
      const mockOperation = vi.fn().mockResolvedValue('result');
      const result = await measurePerformance(
        mockLogger,
        'test-async-operation',
        mockOperation,
        { requestId: 'req-123' }
      );

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
        expect.stringContaining('Performance: test-async-operation completed in')
      );
    });
  });
});