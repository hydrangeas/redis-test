export abstract class DomainEvent {
  public readonly aggregateId: string;
  public readonly eventVersion: number;
  public readonly occurredAt: Date;

  constructor(aggregateId: string, eventVersion: number) {
    this.aggregateId = aggregateId;
    this.eventVersion = eventVersion;
    this.occurredAt = new Date();
  }

  abstract getEventName(): string;
}