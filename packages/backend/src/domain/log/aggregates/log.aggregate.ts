import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { Guard } from '@/domain/shared/guard';
import { LogId } from '../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { APILogEntry } from '../entities/api-log-entry';
import { AuthLogEntry } from '../entities/auth-log-entry';
import { AuthResult } from '../value-objects';
import { AuthEvent, EventType } from '../value-objects/auth-event';
import { Provider } from '../value-objects/provider';
import { IPAddress } from '../value-objects/ip-address';
import { UserAgent } from '../value-objects/user-agent';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { RequestInfo } from '../value-objects/request-info';
import { ResponseInfo } from '../value-objects/response-info';

// ドメインイベント
import { APIAccessLoggedEvent } from '../events/api-access-logged.event';
import { AuthEventLoggedEvent } from '../events/auth-event-logged.event';
import { SecurityAlertRaisedEvent } from '../events/security-alert-raised.event';
import { PerformanceIssueDetectedEvent } from '../events/performance-issue-detected.event';

interface LogAggregateProps {
  apiLogs: APILogEntry[];
  authLogs: AuthLogEntry[];
  retentionDays: number;
  lastCleanedAt?: Date;
}

/**
 * ログ集約
 * APIアクセスログと認証ログを統合管理し、
 * セキュリティ監視とパフォーマンス分析を提供
 */
export class LogAggregate extends AggregateRoot<LogAggregateProps> {
  private static readonly DEFAULT_RETENTION_DAYS = 90;
  private static readonly MAX_LOGS_PER_TYPE = 10000;
  private static readonly SLOW_RESPONSE_THRESHOLD_MS = 1000;
  private static readonly FAILED_AUTH_THRESHOLD = 5;

  private constructor(props: LogAggregateProps, id?: LogId) {
    super(props, id);
  }

  get id(): LogId {
    return this._id as LogId;
  }

  get apiLogs(): APILogEntry[] {
    return [...this.props.apiLogs];
  }

  get authLogs(): AuthLogEntry[] {
    return [...this.props.authLogs];
  }

  get retentionDays(): number {
    return this.props.retentionDays;
  }

  get lastCleanedAt(): Date | undefined {
    return this.props.lastCleanedAt;
  }

  /**
   * ログ集約を作成
   */
  public static create(retentionDays?: number, id?: LogId): Result<LogAggregate, DomainError> {
    const days = retentionDays !== undefined ? retentionDays : this.DEFAULT_RETENTION_DAYS;

    if (days < 1 || days > 365) {
      return Result.fail(
        DomainError.validation(
          'INVALID_RETENTION_DAYS',
          'Retention days must be between 1 and 365',
        ),
      );
    }

    const aggregate = new LogAggregate(
      {
        apiLogs: [],
        authLogs: [],
        retentionDays: retentionDays || this.DEFAULT_RETENTION_DAYS,
      },
      id || LogId.generate(),
    );

    return Result.ok(aggregate);
  }

  /**
   * APIアクセスログを記録
   */
  public logAPIAccess(
    userId: UserId | undefined,
    endpoint: Endpoint,
    requestInfo: RequestInfo,
    responseInfo: ResponseInfo,
    error?: string,
  ): Result<void, DomainError> {
    // ログ数の上限チェック
    if (this.props.apiLogs.length >= LogAggregate.MAX_LOGS_PER_TYPE) {
      return Result.fail(
        DomainError.businessRule(
          'API_LOG_LIMIT_EXCEEDED',
          `API log limit of ${LogAggregate.MAX_LOGS_PER_TYPE} exceeded`,
        ),
      );
    }

    const logResult = APILogEntry.create({
      userId,
      endpoint,
      requestInfo,
      responseInfo,
      timestamp: new Date(),
      error,
    });

    if (logResult.isFailure) {
      return Result.fail(logResult.error!);
    }

    const apiLog = logResult.getValue()!;
    this.props.apiLogs.push(apiLog);

    // イベント発行
    this.addDomainEvent(
      new APIAccessLoggedEvent(
        apiLog.id.value,
        userId?.value,
        endpoint.method,
        endpoint.path.value,
        responseInfo.statusCode,
        responseInfo.responseTime,
        requestInfo.ipAddress,
        new Date(),
      ),
    );

    // パフォーマンス問題の検出
    if (responseInfo.responseTime > LogAggregate.SLOW_RESPONSE_THRESHOLD_MS) {
      this.addDomainEvent(
        new PerformanceIssueDetectedEvent(
          endpoint.path.value,
          responseInfo.responseTime,
          'SLOW_RESPONSE',
          new Date(),
        ),
      );
    }

    return Result.ok();
  }

  /**
   * 認証イベントログを記録
   */
  public logAuthEvent(
    event: AuthEvent,
    provider: Provider,
    ipAddress: IPAddress,
    userAgent: UserAgent,
    result: AuthResult,
    userId?: UserId,
    errorMessage?: string,
    metadata?: Record<string, any>,
  ): Result<void, DomainError> {
    // ログ数の上限チェック
    if (this.props.authLogs.length >= LogAggregate.MAX_LOGS_PER_TYPE) {
      return Result.fail(
        DomainError.businessRule(
          'AUTH_LOG_LIMIT_EXCEEDED',
          `Auth log limit of ${LogAggregate.MAX_LOGS_PER_TYPE} exceeded`,
        ),
      );
    }

    const logResult = AuthLogEntry.create({
      userId,
      event,
      provider,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      result,
      errorMessage,
      metadata,
    });

    if (logResult.isFailure) {
      return Result.fail(logResult.error!);
    }

    const authLog = logResult.getValue()!;
    this.props.authLogs.push(authLog);

    // イベント発行
    this.addDomainEvent(
      new AuthEventLoggedEvent(
        authLog.id.value,
        userId?.value,
        event.type,
        provider.value,
        result,
        ipAddress.value,
        new Date(),
      ),
    );

    // セキュリティアラートの検出
    if (authLog.requiresSecurityAlert()) {
      this.addDomainEvent(
        new SecurityAlertRaisedEvent(
          userId?.value,
          'SUSPICIOUS_AUTH_ACTIVITY',
          {
            event: event.type,
            provider: provider.value,
            ipAddress: ipAddress.value,
            userAgent: userAgent.value,
            result,
            errorMessage,
          },
          new Date(),
        ),
      );
    }

    // 連続失敗の検出
    if (result === AuthResult.FAILED) {
      const recentFailures = this.getRecentAuthFailures(ipAddress, 300000); // 5分以内
      if (recentFailures.length >= LogAggregate.FAILED_AUTH_THRESHOLD) {
        this.addDomainEvent(
          new SecurityAlertRaisedEvent(
            userId?.value,
            'MULTIPLE_AUTH_FAILURES',
            {
              ipAddress: ipAddress.value,
              failureCount: recentFailures.length,
              timeWindow: '5_minutes',
            },
            new Date(),
          ),
        );
      }
    }

    return Result.ok();
  }

  /**
   * 古いログをクリーンアップ
   */
  public cleanupOldLogs(): Result<number, DomainError> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.props.retentionDays);

    const initialApiLogCount = this.props.apiLogs.length;
    const initialAuthLogCount = this.props.authLogs.length;

    // APIログのクリーンアップ
    this.props.apiLogs = this.props.apiLogs.filter(
      (log) => log.timestamp.getTime() >= cutoffDate.getTime(),
    );

    // 認証ログのクリーンアップ
    this.props.authLogs = this.props.authLogs.filter(
      (log) => log.timestamp.getTime() >= cutoffDate.getTime(),
    );

    const removedCount =
      initialApiLogCount -
      this.props.apiLogs.length +
      (initialAuthLogCount - this.props.authLogs.length);

    this.props.lastCleanedAt = new Date();

    return Result.ok(removedCount);
  }

  /**
   * ユーザーのAPIアクセス統計を取得
   */
  public getUserAPIStats(userId: UserId): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    endpointUsage: Map<string, number>;
  } {
    const userLogs = this.props.apiLogs.filter((log) => log.userId && log.userId.equals(userId));

    const stats = {
      totalRequests: userLogs.length,
      successfulRequests: userLogs.filter((log) => log.isSuccess).length,
      failedRequests: userLogs.filter((log) => log.isError).length,
      averageResponseTime: 0,
      endpointUsage: new Map<string, number>(),
    };

    if (userLogs.length > 0) {
      const totalResponseTime = userLogs.reduce(
        (sum, log) => sum + log.responseInfo.responseTime,
        0,
      );
      stats.averageResponseTime = totalResponseTime / userLogs.length;

      // エンドポイント使用統計
      userLogs.forEach((log) => {
        const path = log.endpoint.path.value;
        stats.endpointUsage.set(path, (stats.endpointUsage.get(path) || 0) + 1);
      });
    }

    return stats;
  }

  /**
   * ユーザーの認証履歴を取得
   */
  public getUserAuthHistory(userId: UserId, limit: number = 10): AuthLogEntry[] {
    return this.props.authLogs
      .filter((log) => log.userId && log.userId.equals(userId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * IPアドレスの最近の認証失敗を取得
   */
  private getRecentAuthFailures(ipAddress: IPAddress, timeWindowMs: number): AuthLogEntry[] {
    const cutoffTime = Date.now() - timeWindowMs;

    return this.props.authLogs.filter(
      (log) =>
        log.ipAddress.equals(ipAddress) &&
        log.result === AuthResult.FAILED &&
        log.timestamp.getTime() >= cutoffTime,
    );
  }

  /**
   * エンドポイントのパフォーマンス統計を取得
   */
  public getEndpointPerformanceStats(endpoint: string): {
    requestCount: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  } {
    const logs = this.props.apiLogs.filter((log) => log.endpoint.path.value === endpoint);

    if (logs.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
      };
    }

    const responseTimes = logs.map((log) => log.responseInfo.responseTime).sort((a, b) => a - b);

    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const errorCount = logs.filter((log) => log.isError).length;

    return {
      requestCount: logs.length,
      averageResponseTime: totalResponseTime / logs.length,
      p95ResponseTime: this.getPercentile(responseTimes, 0.95),
      p99ResponseTime: this.getPercentile(responseTimes, 0.99),
      errorRate: (errorCount / logs.length) * 100,
    };
  }

  /**
   * パーセンタイル値を計算
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * セキュリティサマリーを取得
   */
  public getSecuritySummary(timeWindowMs: number = 3600000): {
    totalAuthAttempts: number;
    successfulAuths: number;
    failedAuths: number;
    blockedAuths: number;
    suspiciousIPs: string[];
    topFailureReasons: Map<string, number>;
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentAuthLogs = this.props.authLogs.filter(
      (log) => log.timestamp.getTime() >= cutoffTime,
    );

    const summary = {
      totalAuthAttempts: recentAuthLogs.length,
      successfulAuths: recentAuthLogs.filter((log) => log.result === AuthResult.SUCCESS).length,
      failedAuths: recentAuthLogs.filter((log) => log.result === AuthResult.FAILED).length,
      blockedAuths: recentAuthLogs.filter((log) => log.result === AuthResult.BLOCKED).length,
      suspiciousIPs: [] as string[],
      topFailureReasons: new Map<string, number>(),
    };

    // 疑わしいIPアドレスの特定
    const ipFailureCounts = new Map<string, number>();
    recentAuthLogs
      .filter((log) => log.result === AuthResult.FAILED)
      .forEach((log) => {
        const ip = log.ipAddress.value;
        ipFailureCounts.set(ip, (ipFailureCounts.get(ip) || 0) + 1);

        // 失敗理由の集計
        if (log.errorMessage) {
          summary.topFailureReasons.set(
            log.errorMessage,
            (summary.topFailureReasons.get(log.errorMessage) || 0) + 1,
          );
        }
      });

    // 3回以上失敗したIPを疑わしいとする
    summary.suspiciousIPs = Array.from(ipFailureCounts.entries())
      .filter(([_, count]) => count >= 3)
      .map(([ip, _]) => ip);

    return summary;
  }

  /**
   * 既存のログから再構築
   */
  public static reconstruct(
    id: LogId,
    apiLogs: APILogEntry[],
    authLogs: AuthLogEntry[],
    retentionDays: number,
    lastCleanedAt?: Date,
  ): Result<LogAggregate, DomainError> {
    if (retentionDays < 1 || retentionDays > 365) {
      return Result.fail(
        DomainError.validation(
          'INVALID_RETENTION_DAYS',
          'Retention days must be between 1 and 365',
        ),
      );
    }

    const aggregate = new LogAggregate(
      {
        apiLogs,
        authLogs,
        retentionDays,
        lastCleanedAt,
      },
      id,
    );

    return Result.ok(aggregate);
  }
}
