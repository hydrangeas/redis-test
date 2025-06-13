import { injectable, inject } from 'tsyringe';
import { Logger } from 'pino';
import { DI_TOKENS } from '../di';

/**
 * ドメインイベントの基本インターフェース
 */
export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  occurredAt: Date;
  getEventName(): string;
}

/**
 * イベントハンドラーのインターフェース
 */
export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * ドメインイベントのロギングを行うハンドラー
 */
@injectable()
export class EventLogger implements IEventHandler<DomainEvent> {
  constructor(
    @inject(DI_TOKENS.Logger) private readonly logger: Logger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    this.logger.info({
      event: {
        name: event.getEventName(),
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        data: this.sanitizeEventData(event),
      },
      context: 'domain_event',
    }, `Domain event: ${event.getEventName()}`);
  }

  /**
   * イベントデータから機密情報を除去
   */
  private sanitizeEventData(event: any): any {
    const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'jwt'];
    const sanitized = { ...event };

    const removeSensitive = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: any = Array.isArray(obj) ? [] : {};
      
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          result[key] = removeSensitive(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }
      
      return result;
    };

    return removeSensitive(sanitized);
  }
}