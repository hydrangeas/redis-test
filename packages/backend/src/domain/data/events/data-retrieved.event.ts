import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * データ取得イベント
 * オープンデータリソースが取得された際に発生
 */
export class DataRetrieved extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly dataPath: string,
    public readonly resourceSize: number,
    public readonly mimeType: string,
    public readonly cached: boolean,
    public readonly responseTime: number // milliseconds
  ) {
    super(aggregateId, eventVersion);
    Object.freeze(this);
  }

  getEventName(): string {
    return 'DataRetrieved';
  }
}