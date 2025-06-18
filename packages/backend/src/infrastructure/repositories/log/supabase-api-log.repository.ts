import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { ApiPath } from '@/domain/api/value-objects/api-path';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { LogId } from '@/domain/log/value-objects/log-id';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface APILogRecord {
  id: string;
  user_id: string | null;
  method: string;
  endpoint: string;
  status_code: number;
  response_time: number;
  response_size: number | null;
  ip_address: string;
  user_agent: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  request_id: string | null;
  created_at: string;
}

/**
 * Supabase APIログリポジトリ実装
 */
@injectable()
export class SupabaseAPILogRepository implements IAPILogRepository {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * APIログエントリを保存
   */
  async save(logEntry: APILogEntry): Promise<Result<void>> {
    try {
      const record: APILogRecord = {
        id: logEntry.id.value,
        user_id: logEntry.userId?.value || null,
        method: logEntry.endpoint.method,
        endpoint: logEntry.endpoint.path.value,
        status_code: logEntry.responseInfo.statusCode,
        response_time: logEntry.responseInfo.responseTime,
        response_size: logEntry.responseInfo.size || null,
        ip_address: logEntry.requestInfo.ipAddress,
        user_agent: logEntry.requestInfo.userAgent || null,
        error_message: logEntry.error || null,
        metadata: {
          ...logEntry.requestInfo.headers,
          ...logEntry.responseInfo.headers,
          ...(logEntry.requestInfo.body ? { requestBody: logEntry.requestInfo.body } : {}),
        },
        request_id: logEntry.id.value,
        created_at: logEntry.timestamp.toISOString(),
      };

      const { error } = await this.supabase.from('api_logs').insert(record);

      if (error) {
        this.logger.error({ error, logId: logEntry.id.value }, 'Failed to save API log');
        return Result.fail(
          new DomainError('API_LOG_SAVE_FAILED', 'Failed to save API log', ErrorType.INTERNAL),
        );
      }

      this.logger.debug({ logId: logEntry.id.value }, 'API log saved successfully');
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving API log');
      return Result.fail(
        new DomainError(
          'API_LOG_SAVE_ERROR',
          'Unexpected error saving API log',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * IDでログエントリを検索
   */
  async findById(id: LogId): Promise<Result<APILogEntry | null>> {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .select('*')
        .eq('id', id.value)
        .single() as { data: APILogRecord | null; error: Error | null };

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        this.logger.error({ error, logId: id.value }, 'Failed to find API log by ID');
        return Result.fail(
          new DomainError('API_LOG_FIND_FAILED', 'Failed to find API log', ErrorType.INTERNAL),
        );
      }

      if (!data) {
        return Result.ok(null);
      }

      const logEntry = this.recordToLogEntry(data);
      return Result.ok(logEntry);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding API log');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_ERROR',
          'Unexpected error finding API log',
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
  ): Promise<Result<APILogEntry[]>> {
    try {
      let query = this.supabase
        .from('api_logs')
        .select('*')
        .eq('user_id', userId.value)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, userId: userId.value }, 'Failed to find API logs by user ID');
        return Result.fail(
          new DomainError(
            'API_LOG_FIND_BY_USER_FAILED',
            'Failed to find API logs by user',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding API logs by user');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_BY_USER_ERROR',
          'Unexpected error finding API logs by user',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 時間範囲でログエントリを検索
   */
  async findByTimeRange(
    timeRange: TimeRange,
    limit: number = 100,
  ): Promise<Result<APILogEntry[]>> {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit) as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to find API logs by time range');
        return Result.fail(
          new DomainError(
            'API_LOG_FIND_BY_TIME_FAILED',
            'Failed to find API logs by time range',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding API logs by time range');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_BY_TIME_ERROR',
          'Unexpected error finding API logs by time range',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * エラーログのみを検索（互換性のための旧メソッド）
   */
  async findErrorsByTimeRange(
    timeRange?: TimeRange,
    limit: number = 100,
  ): Promise<Result<APILogEntry[]>> {
    try {
      let query = this.supabase
        .from('api_logs')
        .select('*')
        .gte('status_code', 400)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      }

      const { data, error } = await query as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to find API error logs');
        return Result.fail(
          new DomainError(
            'API_LOG_FIND_ERRORS_FAILED',
            'Failed to find API error logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding API error logs');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_ERRORS_ERROR',
          'Unexpected error finding API error logs',
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
      totalRequests: number;
      uniqueUsers: number;
      errorCount: number;
      averageResponseTime: number;
      requestsByEndpoint: Map<string, number>;
      requestsByStatus: Map<number, number>;
    }>
  > {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString()) as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error }, 'Failed to get API statistics');
        return Result.fail(
          new DomainError(
            'API_LOG_STATS_FAILED',
            'Failed to get API statistics',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logs = data || [];
      const uniqueUserIds = new Set<string>();
      const requestsByEndpoint = new Map<string, number>();
      const requestsByStatus = new Map<number, number>();

      let totalRequests = 0;
      let errorCount = 0;
      let totalResponseTime = 0;

      for (const log of logs) {
        totalRequests++;
        totalResponseTime += log.response_time;

        if (log.user_id) {
          uniqueUserIds.add(log.user_id);
        }

        if (log.status_code >= 400) {
          errorCount++;
        }

        // Count requests by endpoint
        const endpointCount = requestsByEndpoint.get(log.endpoint) || 0;
        requestsByEndpoint.set(log.endpoint, endpointCount + 1);

        // Count requests by status code
        const statusCount = requestsByStatus.get(log.status_code) || 0;
        requestsByStatus.set(log.status_code, statusCount + 1);
      }

      const averageResponseTime =
        totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;

      return Result.ok({
        totalRequests,
        uniqueUsers: uniqueUserIds.size,
        errorCount,
        averageResponseTime,
        requestsByEndpoint,
        requestsByStatus,
      });
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error getting API statistics');
      return Result.fail(
        new DomainError(
          'API_LOG_STATS_ERROR',
          'Unexpected error getting API statistics',
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
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', beforeDate.toISOString());

      if (countError) {
        this.logger.error({ error: countError }, 'Failed to count old API logs');
        return Result.fail(
          new DomainError(
            'API_LOG_COUNT_FAILED',
            'Failed to count old API logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      // 削除を実行
      const { error: deleteError } = await this.supabase
        .from('api_logs')
        .delete()
        .lt('created_at', beforeDate.toISOString());

      if (deleteError) {
        this.logger.error({ error: deleteError }, 'Failed to delete old API logs');
        return Result.fail(
          new DomainError(
            'API_LOG_DELETE_FAILED',
            'Failed to delete old API logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const deletedCount = count || 0;
      this.logger.info(
        { deletedCount, beforeDate: beforeDate.toISOString() },
        'Old API logs deleted',
      );

      return Result.ok(deletedCount);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error deleting old API logs');
      return Result.fail(
        new DomainError(
          'API_LOG_DELETE_ERROR',
          'Unexpected error deleting old API logs',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * レコードをドメインオブジェクトに変換
   */
  private recordToLogEntry(record: APILogRecord): APILogEntry | null {
    try {
      const logIdResult = LogId.create(record.id);
      if (logIdResult.isFailure) {
        throw new Error(`Failed to create LogId: ${logIdResult.getError().message}`);
      }
      const logId = logIdResult.getValue();
      const endpoint = new Endpoint(record.method as HttpMethod, new ApiPath(record.endpoint));

      const requestInfo = new RequestInfo({
        ipAddress: record.ip_address,
        userAgent: record.user_agent || 'Unknown',
        headers: record.metadata || {},
        body: record.metadata?.requestBody || null,
      });

      const responseInfo = new ResponseInfo({
        statusCode: record.status_code,
        responseTime: record.response_time,
        size: record.response_size || 0,
        headers: record.metadata || {},
      });

      const userId = record.user_id ? UserId.create(record.user_id).getValue() : undefined;

      const logEntryResult = APILogEntry.create(
        {
          userId,
          endpoint,
          requestInfo,
          responseInfo,
          timestamp: new Date(record.created_at),
          error: record.error_message || undefined,
        },
        logId,
      );

      if (logEntryResult.isFailure) {
        this.logger.error(
          { error: logEntryResult.getError(), recordId: record.id },
          'Failed to create APILogEntry from record',
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
  private recordsToLogEntries(records: APILogRecord[]): APILogEntry[] {
    const logEntries: APILogEntry[] = [];

    for (const record of records) {
      const logEntry = this.recordToLogEntry(record);
      if (logEntry) {
        logEntries.push(logEntry);
      }
    }

    return logEntries;
  }

  /**
   * 複数のログエントリを一括保存
   */
  async saveMany(logEntries: APILogEntry[]): Promise<Result<void>> {
    try {
      const records: APILogRecord[] = logEntries.map((logEntry) => ({
        id: logEntry.id.value,
        user_id: logEntry.userId?.value || null,
        method: logEntry.endpoint.method,
        endpoint: logEntry.endpoint.path.value,
        status_code: logEntry.responseInfo.statusCode,
        response_time: logEntry.responseInfo.responseTime,
        response_size: logEntry.responseInfo.size || null,
        ip_address: logEntry.requestInfo.ipAddress,
        user_agent: logEntry.requestInfo.userAgent || null,
        error_message: logEntry.error || null,
        metadata: {
          ...logEntry.requestInfo.headers,
          ...logEntry.responseInfo.headers,
          ...(logEntry.requestInfo.body ? { requestBody: logEntry.requestInfo.body } : {}),
        },
        request_id: logEntry.id.value,
        created_at: logEntry.timestamp.toISOString(),
      }));

      const { error } = await this.supabase.from('api_logs').insert(records);

      if (error) {
        this.logger.error({ error, count: records.length }, 'Failed to save API logs batch');
        return Result.fail(
          new DomainError(
            'API_LOG_BATCH_SAVE_FAILED',
            'Failed to save API logs batch',
            ErrorType.INTERNAL,
          ),
        );
      }

      this.logger.debug({ count: records.length }, 'API logs batch saved successfully');
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving API logs batch');
      return Result.fail(
        new DomainError(
          'API_LOG_BATCH_SAVE_ERROR',
          'Unexpected error saving API logs batch',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * 遅いリクエストを検索
   */
  async findSlowRequests(
    thresholdMs: number,
    limit: number = 100,
  ): Promise<Result<APILogEntry[]>> {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .select('*')
        .gte('response_time', thresholdMs)
        .order('response_time', { ascending: false })
        .limit(limit) as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, thresholdMs }, 'Failed to find slow API requests');
        return Result.fail(
          new DomainError(
            'API_LOG_FIND_SLOW_FAILED',
            'Failed to find slow API requests',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding slow API requests');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_SLOW_ERROR',
          'Unexpected error finding slow API requests',
          ErrorType.INTERNAL,
        ),
      );
    }
  }

  /**
   * エラーログを検索（オーバーロード実装）
   */
  async findErrors(timeRangeOrOptions?: TimeRange | {
    userId?: UserId;
    limit?: number;
    offset?: number;
  }, limit?: number): Promise<Result<APILogEntry[]>> {
    // Handle overloaded signatures
    if (timeRangeOrOptions instanceof TimeRange) {
      // First signature: findErrors(timeRange?: TimeRange, limit?: number)
      return this.findErrorsByTimeRange(timeRangeOrOptions, limit);
    } else {
      // Second signature: findErrors(options?: {...})
      return this.findErrorsWithOptions(timeRangeOrOptions);
    }
  }

  /**
   * オプション付きでエラーログを検索
   */
  private async findErrorsWithOptions(options?: {
    userId?: UserId;
    limit?: number;
    offset?: number;
  }): Promise<Result<APILogEntry[]>> {
    try {
      let query = this.supabase
        .from('api_logs')
        .select('*')
        .gte('status_code', 400)
        .order('created_at', { ascending: false });

      if (options?.userId) {
        query = query.eq('user_id', options.userId.value);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query as { data: APILogRecord[] | null; error: Error | null };

      if (error) {
        this.logger.error({ error, options }, 'Failed to find API error logs');
        return Result.fail(
          new DomainError(
            'API_LOG_FIND_ERRORS_FAILED',
            'Failed to find API error logs',
            ErrorType.INTERNAL,
          ),
        );
      }

      const logEntries = this.recordsToLogEntries(data || []);
      return Result.ok(logEntries);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding API error logs');
      return Result.fail(
        new DomainError(
          'API_LOG_FIND_ERRORS_ERROR',
          'Unexpected error finding API error logs',
          ErrorType.INTERNAL,
        ),
      );
    }
  }
}
