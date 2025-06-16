import { DomainEvent } from '@/domain/shared/domain-event';

export class RateLimitExceeded extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly requestCount: number,
    public readonly rateLimit: number,
    public readonly requestTime: Date,
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'RateLimitExceeded';
  }
}
