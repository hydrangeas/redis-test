import { DomainEvent } from '@/domain/shared/domain-event';

export class InvalidAPIAccess extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly reason: string,
    public readonly requestTime: Date,
    eventVersion?: number,
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'InvalidAPIAccess';
  }
}
