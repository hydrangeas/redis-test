import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * セキュリティアラート発生イベント
 */
export class SecurityAlertRaisedEvent extends DomainEvent {
  constructor(
    public readonly userId: string | undefined,
    public readonly alertType: string,
    public readonly details: Record<string, unknown>,
    public readonly occurredAt: Date,
  ) {
    super();
  }

  getAggregateId(): string {
    return this.userId || 'system';
  }

  getEventName(): string {
    return 'SecurityAlertRaised';
  }
}
