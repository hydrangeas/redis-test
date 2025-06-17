import { v4 as uuidv4 } from 'uuid';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly eventVersion: number;
  public readonly occurredAt: Date;

  constructor(aggregateId?: string, eventVersion?: number) {
    this.eventId = uuidv4();
    this.aggregateId = aggregateId || '';
    this.eventVersion = eventVersion || 1;
    this.occurredAt = new Date();
  }

  abstract getEventName(): string;

  getAggregateId(): string {
    return this.aggregateId;
  }

  getMetadata(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      aggregateId: this.aggregateId,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
    };
  }
}
