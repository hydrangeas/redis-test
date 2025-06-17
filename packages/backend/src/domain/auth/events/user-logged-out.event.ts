import { DomainEvent } from '@/domain/shared/domain-event';

export class UserLoggedOut extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly reason: string,
    public readonly sessionId?: string,
    public readonly allSessions: boolean = false,
  ) {
    super(aggregateId, eventVersion);
    Object.freeze(this);
  }

  getEventName(): string {
    return 'UserLoggedOut';
  }

  getData(): Record<string, unknown> {
    return {
      userId: this.userId,
      reason: this.reason,
      sessionId: this.sessionId,
      allSessions: this.allSessions,
    };
  }
}
