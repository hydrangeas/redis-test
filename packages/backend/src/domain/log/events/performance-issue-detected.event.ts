import { DomainEvent } from '@/domain/shared/domain-event';

/**
 * パフォーマンス問題検出イベント
 */
export class PerformanceIssueDetectedEvent extends DomainEvent {
  constructor(
    public readonly endpoint: string,
    public readonly responseTime: number,
    public readonly issueType: string,
    public readonly occurredAt: Date,
  ) {
    super();
  }

  getAggregateId(): string {
    return this.endpoint;
  }
}
