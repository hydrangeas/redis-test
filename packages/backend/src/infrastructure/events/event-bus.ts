import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { IEventBus, IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { IEventStore } from '@/domain/interfaces/event-store.interface';
import { DomainEvent } from '@/domain/shared/domain-event';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface EventHandlerEntry<T extends DomainEvent> {
  eventName: string;
  handler: IEventHandler<T>;
  priority: number;
}

@injectable()
export class EventBus implements IEventBus {
  private handlers = new Map<string, EventHandlerEntry<DomainEvent>[]>();
  private pendingEvents: DomainEvent[] = [];
  private isDispatching = false;
  private processedEventIds = new Set<string>();

  constructor(
    @inject(DI_TOKENS.EventStore)
    private readonly eventStore: IEventStore,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  publish(event: DomainEvent): void {
    // 重複チェック
    if (this.processedEventIds.has(event.eventId)) {
      this.logger.warn(
        {
          eventId: event.eventId,
          eventName: event.getEventName(),
        },
        'Duplicate event detected, skipping',
      );
      return;
    }

    this.pendingEvents.push(event);

    this.logger.debug(
      {
        eventId: event.eventId,
        eventName: event.getEventName(),
        pendingCount: this.pendingEvents.length,
      },
      'Event queued for dispatch',
    );
  }

  publishAll(events: DomainEvent[]): void {
    events.forEach((event) => this.publish(event));
  }

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: IEventHandler<T>,
    priority: number = 0,
  ): void {
    const handlers = this.handlers.get(eventName) || [];

    // 重複登録を防ぐ
    const exists = handlers.some((h) => h.handler === handler);
    if (exists) {
      this.logger.warn(
        {
          eventName,
          handler: handler.constructor.name,
        },
        'Handler already registered',
      );
      return;
    }

    handlers.push({ eventName, handler, priority });

    // 優先度でソート（高い優先度が先に実行）
    handlers.sort((a, b) => b.priority - a.priority);

    this.handlers.set(eventName, handlers);

    this.logger.info(
      {
        eventName,
        handler: handler.constructor.name,
        totalHandlers: handlers.length,
      },
      'Event handler registered',
    );
  }

  unsubscribe<T extends DomainEvent>(eventName: string, handler: IEventHandler<T>): void {
    const handlers = this.handlers.get(eventName);
    if (!handlers) return;

    const filtered = handlers.filter((h) => h.handler !== handler);

    if (filtered.length === 0) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.set(eventName, filtered);
    }

    this.logger.info(
      {
        eventName,
        handler: handler.constructor.name,
        remainingHandlers: filtered.length,
      },
      'Event handler unregistered',
    );
  }

  async dispatchPendingEvents(): Promise<void> {
    if (this.isDispatching) {
      this.logger.warn('Already dispatching events, skipping');
      return;
    }

    if (this.pendingEvents.length === 0) {
      return;
    }

    this.isDispatching = true;
    const eventsToDispatch = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      this.logger.info(
        {
          eventCount: eventsToDispatch.length,
        },
        'Starting event dispatch',
      );

      for (const event of eventsToDispatch) {
        await this.dispatchEvent(event);
        this.processedEventIds.add(event.eventId);
      }

      // 古い処理済みIDをクリーンアップ（メモリリーク防止）
      if (this.processedEventIds.size > 10000) {
        this.processedEventIds.clear();
      }
    } finally {
      this.isDispatching = false;
    }
  }

  clearPendingEvents(): void {
    const count = this.pendingEvents.length;
    this.pendingEvents = [];

    if (count > 0) {
      this.logger.info(
        {
          clearedCount: count,
        },
        'Pending events cleared',
      );
    }
  }

  private async dispatchEvent(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    const handlers = this.handlers.get(eventName) || [];

    if (handlers.length === 0) {
      this.logger.debug(
        {
          eventName,
          eventId: event.eventId,
        },
        'No handlers registered for event',
      );
      return;
    }

    // イベントストアに保存
    try {
      await this.eventStore.save(event);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event.getMetadata(),
        },
        'Failed to save event to store',
      );
      // イベントストアへの保存失敗はハンドラー実行を妨げない
    }

    // 各ハンドラーを順次実行
    for (const { handler, priority } of handlers) {
      try {
        await handler.handle(event);

        this.logger.debug(
          {
            eventName,
            eventId: event.eventId,
            handler: handler.constructor.name,
            priority,
          },
          'Event handler executed successfully',
        );
      } catch (error) {
        // ハンドラーのエラーは他のハンドラーの実行を妨げない
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            eventName,
            eventId: event.eventId,
            handler: handler.constructor.name,
          },
          'Event handler failed',
        );

        // デッドレターキューに送信
        await this.sendToDeadLetterQueue(event, error);
      }
    }
  }

  private async sendToDeadLetterQueue(event: DomainEvent, error: unknown): Promise<void> {
    try {
      await this.eventStore.saveDeadLetter({
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    } catch (dlqError) {
      this.logger.error(
        {
          originalError: error instanceof Error ? error.message : 'Unknown',
          dlqError: dlqError instanceof Error ? dlqError.message : 'Unknown',
          event: event.getMetadata(),
        },
        'Failed to send to dead letter queue',
      );
    }
  }
}
