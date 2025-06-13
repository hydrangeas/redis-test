import { DomainEvent } from '@/domain/shared/domain-event';

export class AuthenticationFailed extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly provider: string,
    public readonly reason: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
    public readonly attemptedUserId?: string
  ) {
    super(aggregateId, eventVersion);
    Object.freeze(this);
  }

  getEventName(): string {
    return 'AuthenticationFailed';
  }

  getData(): Record<string, any> {
    return {
      provider: this.provider,
      reason: this.reason,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      attemptedUserId: this.attemptedUserId,
    };
  }
}