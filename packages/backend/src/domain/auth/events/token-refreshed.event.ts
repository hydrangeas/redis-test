import { DomainEvent } from '@/domain/shared/domain-event';

export class TokenRefreshed extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly oldTokenId?: string,
    public readonly newTokenId?: string,
    public readonly refreshCount: number = 1,
    public readonly sessionId?: string
  ) {
    super(aggregateId, eventVersion);
    Object.freeze(this);
  }

  getEventName(): string {
    return 'TokenRefreshed';
  }

  getData(): Record<string, any> {
    return {
      userId: this.userId,
      oldTokenId: this.oldTokenId,
      newTokenId: this.newTokenId,
      refreshCount: this.refreshCount,
      sessionId: this.sessionId,
    };
  }
}