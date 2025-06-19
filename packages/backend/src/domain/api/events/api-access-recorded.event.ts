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
  ) {
    super(aggregateId, version);
  }

  getEventName(): string {
    return 'APIAccessRecorded';
  }

  getEventData(): Record<string, unknown> {
    return {
      endpoint: this.endpoint,
      method: this.method,
    };
  }
}
