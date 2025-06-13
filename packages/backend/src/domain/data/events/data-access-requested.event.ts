import { DomainEvent } from '@/domain/shared/domain-event';

export class DataAccessRequested extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly resourceId: string,
    public readonly resourcePath: string,
    public readonly resourceSize: number,
    public readonly mimeType: string,
    public readonly requestTime: Date,
    eventVersion?: number
  ) {
    super(aggregateId, eventVersion);
  }

  getEventName(): string {
    return 'DataAccessRequested';
  }
}