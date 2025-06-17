import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';


import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { DomainEvent } from '@/domain/shared/domain-event';

import { DI_TOKENS } from '../di';

/**
 * ドメインイベントのロギングを行うハンドラー
 * すべてのドメインイベントをログに記録する
 */
@injectable()
export class EventLogger implements IEventHandler<DomainEvent> {
  constructor(@inject(DI_TOKENS.Logger) private readonly logger: Logger) {}

  async handle(event: DomainEvent): Promise<void> {
    this.logger.info(
      {
        event: {
          name: event.getEventName(),
          eventId: event.eventId,
          aggregateId: event.aggregateId,
          occurredAt: event.occurredAt,
          data: this.sanitizeEventData(event),
        },
        context: 'domain_event',
      },
      `Domain event: ${event.getEventName()}`,
    );
  }

  /**
   * イベントデータから機密情報を除去
   */
  private sanitizeEventData(event: unknown): unknown {
    const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'jwt'];
    const sanitized = { ...event };

    const removeSensitive = (obj: unknown): unknown => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {};

      for (const key in obj as Record<string, unknown>) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
          (result as Record<string, unknown>)[key] = '[REDACTED]';
        } else if (typeof (obj as Record<string, unknown>)[key] === 'object') {
          (result as Record<string, unknown>)[key] = removeSensitive((obj as Record<string, unknown>)[key]);
        } else {
          (result as Record<string, unknown>)[key] = (obj as Record<string, unknown>)[key];
        }
      }

      return result;
    };

    return removeSensitive(sanitized);
  }
}
