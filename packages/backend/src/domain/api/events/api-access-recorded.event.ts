import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * APIアクセス記録イベント
 * APIへのアクセスが正常に記録されたときに発生
 */
export class APIAccessRecorded extends DomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly endpoint: string,
    public readonly method: string,
    occurredAt?: Date,
  ) {
    super(aggregateId, version, occurredAt);
  }

  getEventName(): string {
    return 'APIAccessRecorded';
  }

  getEventData(): Record<string, any> {
    return {
      endpoint: this.endpoint,
      method: this.method,
    };
  }
}
