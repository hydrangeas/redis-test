import { DomainEvent } from '@/domain/shared/domain-event';

export class DataResourceNotFound extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly requestedPath: string,
    public readonly requestTime: Date
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'DataResourceNotFound';
  }
}