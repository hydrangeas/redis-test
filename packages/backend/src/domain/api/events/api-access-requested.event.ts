import { DomainEvent } from '@/domain/shared/domain-event';

export class APIAccessRequested extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly path: string,
    public readonly method: string,
    public readonly endpointType: string,
    public readonly requestTime: Date,
    eventVersion?: number
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'APIAccessRequested';
  }
}