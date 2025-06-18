import { injectable } from 'tsyringe';

import { IEventStore, DeadLetterEvent } from '@/domain/interfaces/event-store.interface';
import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * インメモリのイベントストア実装
 * 本番環境では永続化層（Supabase等）を使用すること
 */
@injectable()
export class InMemoryEventStore implements IEventStore {
  private events: DomainEvent[] = [];
  private deadLetters: DeadLetterEvent[] = [];

  save(event: DomainEvent): void {
    this.events.push(event);
  }

  getByAggregateId(aggregateId: string): DomainEvent[] {
    return this.events.filter((event) => event.getAggregateId() === aggregateId);
  }

  getByEventName(eventName: string, limit?: number): DomainEvent[] {
    const filtered = this.events.filter((event) => event.getEventName() === eventName);

    if (limit && limit > 0) {
      return filtered.slice(0, limit);
    }

    return filtered;
  }

  saveDeadLetter(deadLetter: DeadLetterEvent): void {
    this.deadLetters.push(deadLetter);
  }

  /**
   * テスト用：すべてのイベントをクリア
   */
  clear(): void {
    this.events = [];
    this.deadLetters = [];
  }

  /**
   * テスト用：デッドレターキューを取得
   */
  getDeadLetters(): DeadLetterEvent[] {
    return [...this.deadLetters];
  }
}
