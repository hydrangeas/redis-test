import { DomainEvent } from '@/domain/shared/domain-event';
import { EventType } from '../value-objects/auth-event';

/**
 * 認証イベントログ記録イベント
 */
export class AuthEventLoggedEvent extends DomainEvent {
  constructor(
    public readonly logId: string,
    public readonly userId: string | undefined,
    public readonly eventType: EventType,
    public readonly provider: string,
    public readonly result: string,
    public readonly ipAddress: string,
    public readonly occurredAt: Date,
  ) {
    super();
  }

  getAggregateId(): string {
    return this.logId;
  }

  getEventName(): string {
    return 'AuthEventLogged';
  }
}
