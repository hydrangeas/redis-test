import { DomainEvent } from '@/domain/shared/domain-event';

export class DataAccessDenied extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly resourceId: string,
    public readonly resourcePath: string,
    public readonly userTier: string,
    public readonly reason: string,
    public readonly requestTime: Date,
    eventVersion?: number,
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'DataAccessDenied';
  }
}
