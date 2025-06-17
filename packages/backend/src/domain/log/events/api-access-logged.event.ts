import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * APIアクセスログ記録イベント
 */
export class APIAccessLoggedEvent extends DomainEvent {
  constructor(
    public readonly logId: string,
    public readonly userId: string | undefined,
    public readonly method: string,
    public readonly path: string,
    public readonly statusCode: number,
    public readonly responseTime: number,
    public readonly ipAddress: string,
    public readonly occurredAt: Date,
  ) {
    super();
  }

  getAggregateId(): string {
    return this.logId;
  }

  getEventName(): string {
    return 'APIAccessLogged';
  }
}
