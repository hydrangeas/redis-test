/**
 * 通知サービスのインターフェース
 */
export interface INotificationService {
  /**
   * 新しいデバイスからのログインアラートを送信
   * @param params アラートパラメータ
   */
  sendNewDeviceAlert(params: {
    userId: string;
    device: string;
    location: string;
    timestamp: Date;
  }): Promise<void>;

  /**
   * セキュリティアラートを送信
   * @param params アラートパラメータ
   */
  sendSecurityAlert(params: {
    userId: string;
    reason: string;
    details: Record<string, any>;
  }): Promise<void>;

  /**
   * レート制限アラートを送信
   * @param params アラートパラメータ
   */
  sendRateLimitAlert(params: {
    userId: string;
    endpoint: string;
    attempts: number;
    timestamp: Date;
  }): Promise<void>;
}
