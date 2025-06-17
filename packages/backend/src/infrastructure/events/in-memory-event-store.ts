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

  async save(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async getByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.filter((event) => event.getAggregateId() === aggregateId);
  }

  async getByEventName(eventName: string, limit?: number): Promise<DomainEvent[]> {
    const filtered = this.events.filter((event) => event.getEventName() === eventName);

    if (limit && limit > 0) {
      return filtered.slice(0, limit);
    }

    return filtered;
  }

  async saveDeadLetter(deadLetter: DeadLetterEvent): Promise<void> {
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
