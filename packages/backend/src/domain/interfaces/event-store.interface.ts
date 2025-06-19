import type { DomainEvent } from '@/domain/shared/domain-event';

export interface IEventStore {
  save(event: DomainEvent): Promise<void>;
  getByAggregateId(aggregateId: string): Promise<DomainEvent[]>;
  getByEventName(eventName: string, limit?: number): Promise<DomainEvent[]>;
  saveDeadLetter(deadLetter: DeadLetterEvent): Promise<void>;
}

export interface DeadLetterEvent {
  event: DomainEvent;
  error: string;
  timestamp: Date;
}
