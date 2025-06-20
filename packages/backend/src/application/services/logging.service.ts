import { injectable, inject } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { APILogService } from '@/domain/log/services/api-log.service';

export interface LoggingMetadata {
  provider?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  attemptNumber?: number;
  additionalInfo?: Record<string, any>;
}

export interface APILogMetadata {
  correlationId?: string;
  traceId?: string;
  parentSpanId?: string;
  [key: string]: any;
}

/**
 * ロギングサービス
 * 認証ログとAPIアクセスログの記録と検索を提供
 */
@injectable()
export class LoggingService {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository) private authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.APILogRepository) private apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.ApiLogService) private apiLogService: APILogService,
  ) {}

  /**
   * エラーをDomainErrorに変換するヘルパー関数
   */
  private toDomainError(error: Error | DomainError, code: string): DomainError {
    return error instanceof DomainError
      ? error
      : new DomainError(code, error.message, ErrorType.INTERNAL);
  }

  /**
   * 認証イベントをログに記録
   */
  async logAuthEvent(
    eventType: EventType,
    result: 'SUCCESS' | 'FAILURE',
    userId: string,
    metadata?: LoggingMetadata,
  ): Promise<Result<void>> {
    try {
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(this.toDomainError(userIdResult.getError(), 'USER_ID_ERROR'));
      }

      // Create value objects for required fields
      const providerResult = Provider.create(metadata?.provider || 'supabase');
      const ipAddressResult = IPAddress.create(metadata?.ipAddress || '0.0.0.0');
      const userAgentResult = UserAgent.create(metadata?.userAgent || 'Unknown');

      if (providerResult.isFailure) {
        return Result.fail(this.toDomainError(providerResult.getError(), 'PROVIDER_ERROR'));
      }
      if (ipAddressResult.isFailure) {
        return Result.fail(this.toDomainError(ipAddressResult.getError(), 'IP_ADDRESS_ERROR'));
      }
      if (userAgentResult.isFailure) {
        return Result.fail(this.toDomainError(userAgentResult.getError(), 'USER_AGENT_ERROR'));
      }

      // Create auth event and result
      const authEventResult = AuthEvent.create(eventType);
      const authResultValue = result === 'SUCCESS' ? AuthResult.SUCCESS : AuthResult.FAILED;

      if (authEventResult.isFailure) {
        return Result.fail(this.toDomainError(authEventResult.getError(), 'AUTH_EVENT_ERROR'));
      }

      // Create auth log entry
      const authLogEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        event: authEventResult.getValue(),
        result: authResultValue,
        provider: providerResult.getValue(),
        ipAddress: ipAddressResult.getValue(),
        userAgent: userAgentResult.getValue(),
        timestamp: new Date(),
        metadata: metadata?.additionalInfo,
      });

      if (authLogEntryResult.isFailure) {
        return Result.fail(this.toDomainError(authLogEntryResult.getError(), 'AUTH_LOG_ENTRY_ERROR'));
      }

      // Save to repository
      const saveResult = await this.authLogRepository.save(authLogEntryResult.getValue());
      if (saveResult.isFailure) {
        return Result.fail(this.toDomainError(saveResult.getError(), 'AUTH_LOG_SAVE_ERROR'));
      }

      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FAILED',
          `Failed to log auth event: ${(error as Error).message}`,
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * APIアクセスをログに記録
   * Note: This is a simplified version for now. The actual implementation
   * needs to be aligned with the domain model for APILogEntry
   */
  async logAPIAccess(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    metadata?: APILogMetadata,
  ): Promise<Result<void>> {
    return this.apiLogService.logAPIAccess({
      userId: userId || 'anonymous',
      endpoint,
      method,
      statusCode,
      duration: responseTime,
      requestId: metadata?.correlationId,
      correlationId: metadata?.correlationId,
      ipAddress: (metadata as any)?.ipAddress,
      userAgent: (metadata as any)?.userAgent,
    });
  }

  /**
   * 認証ログを検索
   */
  async getAuthLogs(
    userId?: string,
    timeRange?: { start: Date; end: Date },
    limit = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    if (userId) {
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(this.toDomainError(userIdResult.getError(), 'USER_ID_ERROR'));
      }

      const timeRangeValue = timeRange ? TimeRange.create(timeRange.start, timeRange.end) : undefined;
      if (timeRange && timeRangeValue?.isFailure) {
        return Result.fail(this.toDomainError(timeRangeValue.getError(), 'TIME_RANGE_ERROR'));
      }

      const result = await this.authLogRepository.findByUserId(
        userIdResult.getValue(),
        timeRangeValue?.getValue(),
        limit,
      );
      
      // Convert from domain/shared/result to domain/errors/result
      if (result.isFailure) {
        return Result.fail(this.toDomainError(result.getError(), 'AUTH_LOG_FETCH_ERROR'));
      }
      return Result.ok(result.getValue());
    }

    if (timeRange) {
      const timeRangeResult = TimeRange.create(timeRange.start, timeRange.end);
      if (timeRangeResult.isFailure) {
        return Result.fail(this.toDomainError(timeRangeResult.getError(), 'TIME_RANGE_ERROR'));
      }
      // TODO: Add findByTimeRange method to auth log repository
      return Result.ok([]);
    }

    return Result.ok([]);
  }

  /**
   * APIログを検索
   */
  async getAPILogs(
    userId?: string,
    timeRange?: { start: Date; end: Date },
    limit = 100,
  ): Promise<Result<APILogEntry[]>> {
    if (userId) {
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(this.toDomainError(userIdResult.getError(), 'USER_ID_ERROR'));
      }

      const timeRangeValue = timeRange ? TimeRange.create(timeRange.start, timeRange.end) : undefined;
      if (timeRange && timeRangeValue?.isFailure) {
        return Result.fail(this.toDomainError(timeRangeValue.getError(), 'TIME_RANGE_ERROR'));
      }

      const result = await this.apiLogRepository.findByUserId(
        userIdResult.getValue(),
        timeRangeValue?.getValue(),
        limit,
      );
      
      // Convert from domain/shared/result to domain/errors/result
      if (result.isFailure) {
        return Result.fail(this.toDomainError(result.getError(), 'API_LOG_FETCH_ERROR'));
      }
      return Result.ok(result.getValue());
    }

    if (timeRange) {
      const timeRangeResult = TimeRange.create(timeRange.start, timeRange.end);
      if (timeRangeResult.isFailure) {
        return Result.fail(this.toDomainError(timeRangeResult.getError(), 'TIME_RANGE_ERROR'));
      }
      const result = await this.apiLogRepository.findByTimeRange(timeRangeResult.getValue(), limit);
      if (result.isFailure) {
        return Result.fail(this.toDomainError(result.getError(), 'API_LOG_FETCH_ERROR'));
      }
      return Result.ok(result.getValue());
    }

    return Result.ok([]);
  }

  /**
   * エラーログを取得
   */
  async getErrorLogs(limit = 100): Promise<Result<APILogEntry[]>> {
    const result = await this.apiLogRepository.findErrors(undefined, limit);
    if (result.isFailure) {
      return Result.fail(this.toDomainError(result.getError(), 'ERROR_LOG_FETCH_ERROR'));
    }
    return Result.ok(result.getValue());
  }

  /**
   * 疑わしいアクティビティを検出
   */
  async detectSuspiciousActivity(
    ipAddress?: string,
    timeWindowMinutes = 5,
    failureThreshold = 5,
  ): Promise<Result<AuthLogEntry[]>> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindowMinutes * 60 * 1000);

    const timeRangeResult = TimeRange.create(startTime, endTime);
    if (timeRangeResult.isFailure) {
      return Result.fail(this.toDomainError(timeRangeResult.getError(), 'TIME_RANGE_ERROR'));
    }

    if (ipAddress) {
      const ipAddressResult = IPAddress.create(ipAddress);
      if (ipAddressResult.isFailure) {
        return Result.fail(this.toDomainError(ipAddressResult.getError(), 'IP_ADDRESS_ERROR'));
      }

      // Find failed login attempts from this IP
      const failedLogins = await this.authLogRepository.findByIPAddress(
        ipAddressResult.getValue(),
        timeRangeResult.getValue(),
        failureThreshold + 1,
      );

      if (failedLogins.isFailure) {
        return Result.fail(this.toDomainError(failedLogins.getError(), 'SUSPICIOUS_ACTIVITY_DETECTION_ERROR'));
      }

      const failures = failedLogins
        .getValue()
        .filter((log) => log.result === AuthResult.FAILED && log.event.type === EventType.LOGIN);

      if (failures.length >= failureThreshold) {
        return Result.ok(failures);
      }
    }

    // Check for suspicious activities across all IPs
    const result = await this.authLogRepository.findSuspiciousActivities(timeRangeResult.getValue(), 100);
    if (result.isFailure) {
      return Result.fail(this.toDomainError(result.getError(), 'SUSPICIOUS_ACTIVITY_DETECTION_ERROR'));
    }
    return Result.ok(result.getValue());
  }
}