import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { UserId } from '@/domain/auth/value-objects/user-id';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthResult } from '@/domain/log/value-objects';
import { EventType , AuthEvent } from '@/domain/log/value-objects/auth-event';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { LogId } from '@/domain/log/value-objects/log-id';
import { Provider } from '@/domain/log/value-objects/provider';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface AuthLogRecord {
  id: string;
  user_id: string | null;
  event_type: string;
  provider: string | null;
  ip_address: string | null;
  user_agent: string | null;
  result: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
}

/**
 * Supabase認証ログリポジトリ実装
 */
@injectable()
export class SupabaseAuthLogRepository implements IAuthLogRepository {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * 認証ログエントリを保存
   */
  async save(logEntry: AuthLogEntry): Promise<Result<void>> {
    try {
      const record: AuthLogRecord = {
        id: logEntry.id.value,
        user_id: logEntry.userId?.value || null,
        event_type: logEntry.event.type,
        provider: logEntry.provider.value,
        ip_address: logEntry.ipAddress.value,
        user_agent: logEntry.userAgent.value,
        result: logEntry.result,
        error_message: logEntry.errorMessage || null,
        metadata: logEntry.metadata || {},
        session_id: (logEntry.metadata?.sessionId as string) || null,
        created_at: logEntry.timestamp.toISOString(),
      };

      const { error } = await this.supabase.from('auth_logs').insert(record);

      if (error) {
        this.logger.error({ error, logId: logEntry.id.value }, 'Failed to save auth log');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_SAVE_FAILED',
            'Failed to save authentication log',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.debug({ logId: logEntry.id.value }, 'Auth log saved successfully');
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving auth log');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_SAVE_ERROR',
          'Unexpected error saving authentication log',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * IDでログエントリを検索
   */
  async findById(id: LogId): Promise<Result<AuthLogEntry | null>> {
    try {
      const { data, error } = await this.supabase
        .from('auth_logs')
        .select('*')
        .eq('id', id.value)
        .single() as { data: AuthLogRecord | null; error: Error | null };

      if (error && (error as { code?: string }).code !== 'PGRST116') {
        // PGRST116 = no rows returned
        this.logger.error({ error, logId: id.value }, 'Failed to find auth log by ID');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_FAILED',
            'Failed to find authentication log',
            ErrorType.INTERNAL,
          ),
        );
      }

      if (!data) {
        return Result.ok(null);
      }

      const logEntry = this.recordToLogEntry(data);
      return Result.ok(logEntry);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding auth log');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_ERROR',
          'Unexpected error finding authentication log',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * ユーザーIDでログエントリを検索
   */
  async findByUserId(
    userId: UserId,
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    try {
      let query = this.supabase
        .from('auth_logs')
        .select('*')
        .eq('user_id', userId.value)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, userId: userId.value }, 'Failed to find auth logs by user ID');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_BY_USER_FAILED',
            'Failed to find authentication logs by user',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding auth logs by user');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_BY_USER_ERROR',
          'Unexpected error finding authentication logs by user',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * イベントタイプでログエントリを検索
   */
  async findByEventType(
    eventType: EventType,
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    try {
      let query = this.supabase
        .from('auth_logs')
        .select('*')
        .eq('event_type', eventType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, eventType }, 'Failed to find auth logs by event type');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_BY_EVENT_FAILED',
            'Failed to find authentication logs by event type',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding auth logs by event type');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_BY_EVENT_ERROR',
          'Unexpected error finding authentication logs by event type',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * IPアドレスでログエントリを検索
   */
  async findByIPAddress(
    ipAddress: IPAddress,
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    try {
      let query = this.supabase
        .from('auth_logs')
        .select('*')
        .eq('ip_address', ipAddress.value)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, ipAddress: ipAddress.value }, 'Failed to find auth logs by IP');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_BY_IP_FAILED',
            'Failed to find authentication logs by IP address',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding auth logs by IP');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_BY_IP_ERROR',
          'Unexpected error finding authentication logs by IP address',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 失敗ログのみを検索
   */
  async findFailures(
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    try {
      let query = this.supabase
        .from('auth_logs')
        .select('*')
        .eq('result', AuthResult.FAILED)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to find auth failure logs');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_FAILURES_FAILED',
            'Failed to find authentication failure logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding auth failure logs');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_FAILURES_ERROR',
          'Unexpected error finding authentication failure logs',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 疑わしい活動のログを検索
   */
  async findSuspiciousActivities(
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<AuthLogEntry[]>> {
    try {
      let query = this.supabase
        .from('auth_logs')
        .select('*')
        .eq('metadata->>suspicious', 'true')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to find suspicious activity logs');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_FIND_SUSPICIOUS_FAILED',
            'Failed to find suspicious activity logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding suspicious activity logs');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FIND_SUSPICIOUS_ERROR',
          'Unexpected error finding suspicious activity logs',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(timeRange: TimeRange): Promise<
    Result<{
      totalAttempts: number;
      successfulLogins: number;
      failedLogins: number;
      uniqueUsers: number;
      suspiciousActivities: number;
      loginsByProvider: Map<string, number>;
      tokenRefreshCount: number;
    }>
  > {
    try {
      const { data, error } = await this.supabase
        .from('auth_logs')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString()) as { data: AuthLogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to get auth statistics');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_STATS_FAILED',
            'Failed to get authentication statistics',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logs = (data || []);
      const uniqueUserIds = new Set<string>();
      const loginsByProvider = new Map<string, number>();

      let totalAttempts = 0;
      let successfulLogins = 0;
      let failedLogins = 0;
      let suspiciousActivities = 0;
      let tokenRefreshCount = 0;

      for (const log of logs) {
        totalAttempts++;

        if (log.user_id) {
          uniqueUserIds.add(log.user_id);
        }

        if (log.result === (AuthResult.SUCCESS as string)) {
          successfulLogins++;
        } else if (log.result === (AuthResult.FAILED as string)) {
          failedLogins++;
        }

        if (log.metadata?.suspicious === true) {
          suspiciousActivities++;
        }

        if (log.event_type === (EventType.TOKEN_REFRESH as string)) {
          tokenRefreshCount++;
        }

        if (log.provider && log.event_type === (EventType.LOGIN as string)) {
          const count = loginsByProvider.get(log.provider) || 0;
          loginsByProvider.set(log.provider, count + 1);
        }
      }

      return Result.ok({
        totalAttempts,
        successfulLogins,
        failedLogins,
        uniqueUsers: uniqueUserIds.size,
        suspiciousActivities,
        loginsByProvider,
        tokenRefreshCount,
      });
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error getting auth statistics');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_STATS_ERROR',
          'Unexpected error getting authentication statistics',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 古いログエントリを削除
   */
  async deleteOldLogs(beforeDate: Date): Promise<Result<number>> {
    try {
      // まず削除対象の件数を取得
      const { count, error: countError } = await this.supabase
        .from('auth_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', beforeDate.toISOString());

      if (countError) {
        this.logger.error({ error: countError }, 'Failed to count old auth logs');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_COUNT_FAILED',
            'Failed to count old authentication logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      // 削除を実行
      const { error: deleteError } = await this.supabase
        .from('auth_logs')
        .delete()
        .lt('created_at', beforeDate.toISOString());

      if (deleteError) {
        this.logger.error({ error: deleteError }, 'Failed to delete old auth logs');
        return Result.fail(
          new DomainError(
            'AUTH_LOG_DELETE_FAILED',
            'Failed to delete old authentication logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const deletedCount = count || 0;
      this.logger.info(
        { deletedCount, beforeDate: beforeDate.toISOString() },
        'Old auth logs deleted',
      );

      return Result.ok(deletedCount);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error deleting old auth logs');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_DELETE_ERROR',
          'Unexpected error deleting old authentication logs',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * レコードをドメインオブジェクトに変換
   */
  private recordToLogEntry(record: AuthLogRecord): AuthLogEntry | null {
    try {
      const logIdResult = LogId.create(record.id);
      if (logIdResult.isFailure) {
        const error = logIdResult.getError();
        throw new Error(`Failed to create LogId: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      const logId = logIdResult.getValue();
      const event = new AuthEvent(record.event_type as EventType, record.metadata?.description as string | undefined);
      const providerResult = Provider.create(record.provider || 'unknown');
      if (providerResult.isFailure) {
        const error = providerResult.getError();
        throw new Error(`Failed to create Provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      const provider = providerResult.getValue();
      
      const ipAddress = record.ip_address
        ? ((): IPAddress => {
            const result = IPAddress.create(record.ip_address);
            if (result.isFailure) {
              const error = result.getError();
              throw new Error(`Failed to create IPAddress: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return result.getValue();
          })()
        : ((): IPAddress => {
            const result = IPAddress.unknown();
            if (result.isFailure) {
              const error = result.getError();
              throw new Error(`Failed to create unknown IPAddress: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return result.getValue();
          })();
        
      const userAgent = record.user_agent
        ? ((): UserAgent => {
            const result = UserAgent.create(record.user_agent);
            if (result.isFailure) {
              const error = result.getError();
              throw new Error(`Failed to create UserAgent: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return result.getValue();
          })()
        : ((): UserAgent => {
            const result = UserAgent.unknown();
            if (result.isFailure) {
              const error = result.getError();
              throw new Error(`Failed to create unknown UserAgent: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return result.getValue();
          })();

      const userId = record.user_id 
        ? ((): UserId => {
            const result = UserId.create(record.user_id);
            if (result.isFailure) {
              const error = result.getError();
              throw new Error(`Failed to create UserId: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return result.getValue();
          })()
        : undefined;

      const logEntryResult = AuthLogEntry.create(
        {
          userId,
          event,
          provider,
          ipAddress,
          userAgent,
          timestamp: new Date(record.created_at),
          result: record.result as AuthResult,
          errorMessage: record.error_message || undefined,
          metadata: record.metadata || undefined,
        },
        logId,
      );

      if (logEntryResult.isFailure) {
        this.logger.error(
          { error: logEntryResult.getError(), recordId: record.id },
          'Failed to create AuthLogEntry from record',
        );
        return null;
      }

      return logEntryResult.getValue();
    } catch (error) {
      this.logger.error({ error, recordId: record.id }, 'Failed to convert record to log entry');
      return null;
    }
  }

  /**
   * 複数のレコードをドメインオブジェクトに変換
   */
  private recordsToLogEntries(records: AuthLogRecord[]): AuthLogEntry[] {
    const logEntries: AuthLogEntry[] = [];

    for (const record of records) {
      const logEntry = this.recordToLogEntry(record);
      if (logEntry) {
        logEntries.push(logEntry);
      }
    }

    return logEntries;
  }
}
