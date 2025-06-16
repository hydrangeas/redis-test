import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { AuthenticationFailed } from '@/domain/auth/events/authentication-failed.event';
import { ISecurityAlertService } from '@/infrastructure/services/security-alert.service';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { EventType } from '@/domain/log/value-objects/auth-event';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import type { Logger } from 'pino';

@injectable()
export class SecurityMonitorHandler
  implements IEventHandler<TokenRefreshed | AuthenticationFailed>
{
  private readonly REFRESH_THRESHOLD = 10; // 10回/時間
  private readonly FAILED_AUTH_THRESHOLD = 5; // 5回/15分

  constructor(
    @inject(DI_TOKENS.SecurityAlertService)
    private readonly alertService: ISecurityAlertService,
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: TokenRefreshed | AuthenticationFailed): Promise<void> {
    if (event instanceof TokenRefreshed) {
      await this.handleTokenRefreshed(event);
    } else if (event instanceof AuthenticationFailed) {
      await this.handleAuthenticationFailed(event);
    }
  }

  private async handleTokenRefreshed(event: TokenRefreshed): Promise<void> {
    try {
      // 異常なリフレッシュ頻度の検出
      const recentRefreshes = await this.countRecentRefreshes(
        event.userId,
        60, // 過去60分
      );

      if (recentRefreshes > this.REFRESH_THRESHOLD) {
        await this.alertService.sendAlert({
          type: 'SUSPICIOUS_TOKEN_REFRESH',
          severity: 'HIGH',
          userId: event.userId,
          details: {
            refreshCount: recentRefreshes,
            threshold: this.REFRESH_THRESHOLD,
            sessionId: event.sessionId,
          },
          message: `User ${event.userId} has refreshed token ${recentRefreshes} times in the last hour`,
        });

        this.logger.warn(
          {
            userId: event.userId,
            refreshCount: recentRefreshes,
          },
          'Suspicious token refresh pattern detected',
        );
      }
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event.getMetadata(),
        },
        'Failed to monitor token refresh',
      );
    }
  }

  private async handleAuthenticationFailed(event: AuthenticationFailed): Promise<void> {
    try {
      // 同一IPからの連続失敗の検出
      const recentFailures = await this.countRecentFailures(
        event.ipAddress,
        15, // 過去15分
      );

      if (recentFailures >= this.FAILED_AUTH_THRESHOLD) {
        await this.alertService.sendAlert({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'CRITICAL',
          details: {
            ipAddress: event.ipAddress,
            failureCount: recentFailures,
            provider: event.provider,
            userAgent: event.userAgent,
          },
          message: `Potential brute force attack from IP ${event.ipAddress}`,
        });

        // IPブロックの推奨
        await this.recommendIPBlock(event.ipAddress);
      }
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event.getMetadata(),
        },
        'Failed to monitor authentication failure',
      );
    }
  }

  private async countRecentRefreshes(userId: string, minutes: number): Promise<number> {
    const timeRange = new TimeRange(new Date(Date.now() - minutes * 60 * 1000), new Date());

    const userIdResult = UserId.create(userId);
    if (userIdResult.isFailure) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    const logsResult = await this.authLogRepository.findByUserId(
      userIdResult.getValue(),
      timeRange,
    );

    if (logsResult.isFailure) {
      throw new Error(`Failed to fetch logs: ${logsResult.getError().message}`);
    }

    const logs = logsResult.getValue();
    return logs.filter((log) => log.event.type === EventType.TOKEN_REFRESH).length;
  }

  private async countRecentFailures(ipAddress: string, minutes: number): Promise<number> {
    const timeRange = new TimeRange(new Date(Date.now() - minutes * 60 * 1000), new Date());

    const ipAddressResult = IPAddress.create(ipAddress);
    if (ipAddressResult.isFailure) {
      throw new Error(`Invalid IP address: ${ipAddress}`);
    }

    const logsResult = await this.authLogRepository.findByIPAddress(
      ipAddressResult.getValue(),
      timeRange,
    );

    if (logsResult.isFailure) {
      throw new Error(`Failed to fetch logs: ${logsResult.getError().message}`);
    }

    const logs = logsResult.getValue();
    return logs.filter((log) => log.event.type === EventType.LOGIN_FAILED).length;
  }

  private async recommendIPBlock(ipAddress: string): Promise<void> {
    // 実装: IPブロックリストへの追加推奨
    this.logger.warn(
      {
        ipAddress,
        action: 'RECOMMEND_IP_BLOCK',
      },
      'Recommending IP block due to suspicious activity',
    );
  }
}
