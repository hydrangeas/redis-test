import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../event-bus';
import { DomainEvent } from '@/domain/shared/domain-event';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { IEventStore } from '@/domain/interfaces/event-store.interface';
import { Logger } from 'pino';

class TestEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: string,
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'TestEvent';
  }
}

class AnotherTestEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly value: number,
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'AnotherTestEvent';
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockEventStore: IEventStore;
  let mockLogger: Logger;

  beforeEach(() => {
    mockEventStore = {
      save: vi.fn(),
      saveDeadLetter: vi.fn(),
      getByAggregateId: vi.fn(),
      getByEventName: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    eventBus = new EventBus(mockEventStore, mockLogger);
  });

  describe('publish', () => {
    it('should queue events for delayed dispatch', () => {
      const event = new TestEvent('agg-1', 'test data');

      eventBus.publish(event);

      expect(mockEventStore.save).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          eventName: 'TestEvent',
          pendingCount: 1,
        }),
        'Event queued for dispatch',
      );
    });

    it('should prevent duplicate event processing', async () => {
      const event = new TestEvent('agg-1', 'test data');

      // 最初にイベントを発行して処理
      eventBus.publish(event);
      await eventBus.dispatchPendingEvents();

      // 同じイベントを再度発行
      eventBus.publish(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          eventName: 'TestEvent',
        }),
        'Duplicate event detected, skipping',
      );
    });
  });

  describe('publishAll', () => {
    it('should publish multiple events', () => {
      const events = [
        new TestEvent('agg-1', 'data 1'),
        new TestEvent('agg-2', 'data 2'),
        new AnotherTestEvent('agg-3', 42),
      ];

      eventBus.publishAll(events);

      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should register event handlers', () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'TestEvent',
          handler: 'Object',
          totalHandlers: 1,
        }),
        'Event handler registered',
      );
    });

    it('should prevent duplicate handler registration', () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);
      eventBus.subscribe('TestEvent', handler);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'TestEvent',
          handler: 'Object',
        }),
        'Handler already registered',
      );
    });

    it('should unregister event handlers', () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);
      eventBus.unsubscribe('TestEvent', handler);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'TestEvent',
          handler: 'Object',
          remainingHandlers: 0,
        }),
        'Event handler unregistered',
      );
    });

    it('should respect handler priority', async () => {
      const executionOrder: number[] = [];

      const highPriorityHandler: IEventHandler<TestEvent> = {
        handle: vi.fn(async () => {
          executionOrder.push(1);
        }),
      };

      const lowPriorityHandler: IEventHandler<TestEvent> = {
        handle: vi.fn(async () => {
          executionOrder.push(2);
        }),
      };

      eventBus.subscribe('TestEvent', lowPriorityHandler, 1);
      eventBus.subscribe('TestEvent', highPriorityHandler, 10);

      const event = new TestEvent('agg-1', 'test');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe('dispatchPendingEvents', () => {
    it('should dispatch events to registered handlers', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(handler.handle).toHaveBeenCalledWith(event);
      expect(mockEventStore.save).toHaveBeenCalledWith(event);
    });

    it('should handle multiple handlers for same event', async () => {
      const handler1: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      const handler2: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(handler1.handle).toHaveBeenCalledWith(event);
      expect(handler2.handle).toHaveBeenCalledWith(event);
    });

    it('should handle different event types independently', async () => {
      const testHandler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      const anotherHandler: IEventHandler<AnotherTestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', testHandler);
      eventBus.subscribe('AnotherTestEvent', anotherHandler);

      const event1 = new TestEvent('agg-1', 'test');
      const event2 = new AnotherTestEvent('agg-2', 42);

      eventBus.publish(event1);
      eventBus.publish(event2);

      await eventBus.dispatchPendingEvents();

      expect(testHandler.handle).toHaveBeenCalledWith(event1);
      expect(anotherHandler.handle).toHaveBeenCalledWith(event2);
    });

    it('should prevent concurrent dispatch', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
      };

      eventBus.subscribe('TestEvent', handler);
      eventBus.publish(new TestEvent('agg-1', 'test'));

      const promise1 = eventBus.dispatchPendingEvents();
      const promise2 = eventBus.dispatchPendingEvents();

      await Promise.all([promise1, promise2]);

      expect(mockLogger.warn).toHaveBeenCalledWith('Already dispatching events, skipping');
      expect(handler.handle).toHaveBeenCalledTimes(1);
    });

    it('should handle event store save failures gracefully', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      vi.mocked(mockEventStore.save).mockRejectedValueOnce(new Error('Store error'));

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(handler.handle).toHaveBeenCalledWith(event);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Store error',
        }),
        'Failed to save event to store',
      );
    });

    it('should handle handler errors gracefully', async () => {
      const failingHandler: IEventHandler<TestEvent> = {
        handle: vi.fn().mockRejectedValue(new Error('Handler error')),
      };

      const successHandler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', failingHandler);
      eventBus.subscribe('TestEvent', successHandler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      // 失敗したハンドラーがあっても、他のハンドラーは実行される
      expect(successHandler.handle).toHaveBeenCalled();
      expect(mockEventStore.saveDeadLetter).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Handler error',
          eventName: 'TestEvent',
        }),
        'Event handler failed',
      );
    });

    it('should clear processed event IDs when threshold reached', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);

      // 10001個のイベントを処理して閾値を超える
      for (let i = 0; i < 10001; i++) {
        const event = new TestEvent(`agg-${i}`, `data-${i}`);
        eventBus.publish(event);
      }

      await eventBus.dispatchPendingEvents();

      // 2回目の同じイベントが処理されることを確認（IDがクリアされたため）
      const repeatEvent = new TestEvent('agg-0', 'data-0');
      eventBus.publish(repeatEvent);

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'TestEvent',
        }),
        'Duplicate event detected, skipping',
      );
    });
  });

  describe('clearPendingEvents', () => {
    it('should clear all pending events', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn(),
      };

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      eventBus.clearPendingEvents();

      await eventBus.dispatchPendingEvents();

      expect(handler.handle).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          clearedCount: 1,
        }),
        'Pending events cleared',
      );
    });

    it('should not log when no events to clear', () => {
      eventBus.clearPendingEvents();

      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.any(Object),
        'Pending events cleared',
      );
    });
  });

  describe('dead letter queue', () => {
    it('should send failed events to dead letter queue', async () => {
      const error = new Error('Handler failed');
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn().mockRejectedValue(error),
      };

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(mockEventStore.saveDeadLetter).toHaveBeenCalledWith({
        event,
        error: 'Handler failed',
        timestamp: expect.any(Date),
      });
    });

    it('should handle dead letter queue save failures', async () => {
      const handler: IEventHandler<TestEvent> = {
        handle: vi.fn().mockRejectedValue(new Error('Handler error')),
      };

      vi.mocked(mockEventStore.saveDeadLetter).mockRejectedValueOnce(new Error('DLQ error'));

      eventBus.subscribe('TestEvent', handler);

      const event = new TestEvent('agg-1', 'test data');
      eventBus.publish(event);

      await eventBus.dispatchPendingEvents();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: 'Handler error',
          dlqError: 'DLQ error',
        }),
        'Failed to send to dead letter queue',
      );
    });
  });
});
