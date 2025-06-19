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

  save(event: DomainEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  getByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    return Promise.resolve(this.events.filter((event) => event.getAggregateId() === aggregateId));
  }

  getByEventName(eventName: string, limit?: number): Promise<DomainEvent[]> {
    const filtered = this.events.filter((event) => event.getEventName() === eventName);

    if (limit && limit > 0) {
      return Promise.resolve(filtered.slice(0, limit));
    }

    return Promise.resolve(filtered);
  }

  saveDeadLetter(deadLetter: DeadLetterEvent): Promise<void> {
    this.deadLetters.push(deadLetter);
    return Promise.resolve();
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
