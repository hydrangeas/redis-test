import { DomainEvent } from '@/domain/shared/domain-event';

export interface UserAuthenticatedData {
  userId: string;
  provider: string;
  tier: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * ユーザー認証成功時に発行されるドメインイベント
 */
export class UserAuthenticated extends DomainEvent {
  constructor(
    aggregateId: string,
    eventVersion: number,
    public readonly userId: string,
    public readonly provider: string,
    public readonly tier: string,
    public readonly sessionId?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super(aggregateId, eventVersion);
    Object.freeze(this);
  }

  getEventName(): string {
    return 'UserAuthenticated';
  }

  /**
   * イベントデータを取得
   */
  getData(): UserAuthenticatedData {
    return {
      userId: this.userId,
      provider: this.provider,
      tier: this.tier,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    };
  }
}
