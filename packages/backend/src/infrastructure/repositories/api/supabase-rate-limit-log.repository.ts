import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import { IRateLimitLogRepository } from '@/domain/api/interfaces/rate-limit-log-repository.interface';
import { RateLimitLog } from '@/domain/api/entities/rate-limit-log.entity';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { RateLimitWindow } from '@/domain/api/value-objects/rate-limit-window';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import { RequestCount } from '@/domain/api/value-objects/request-count';

interface RateLimitLogRecord {
  id: string;
  user_id: string;
  endpoint_id: string;
  request_count: number;
  requested_at: string;
  created_at: string;
}

/**
 * Supabase レート制限ログリポジトリ実装
 */
@injectable()
export class SupabaseRateLimitLogRepository implements IRateLimitLogRepository {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async save(log: RateLimitLog): Promise<Result<void, DomainError>> {
    try {
      const record: RateLimitLogRecord = {
        id: log.id.value,
        user_id: log.userId.value,
        endpoint_id: log.endpointId.value,
        request_count: log.requestCount.value,
        requested_at: log.requestedAt.toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase.from('rate_limit_logs').insert(record);

      if (error) {
        this.logger.error({ error, log: record }, 'Failed to save rate limit log');
        return Result.fail(DomainError.unexpected('SAVE_FAILED', 'Failed to save rate limit log'));
      }

      this.logger.debug({ logId: log.id.value }, 'Rate limit log saved');
      return Result.ok();
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving rate limit log');
      return Result.fail(
        DomainError.unexpected(
          'SAVE_FAILED',
          'Failed to save rate limit log',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async saveMany(logs: RateLimitLog[]): Promise<Result<void, DomainError>> {
    try {
      if (logs.length === 0) {
        return Result.ok();
      }

      const records: RateLimitLogRecord[] = logs.map((log) => ({
        id: log.id.value,
        user_id: log.userId.value,
        endpoint_id: log.endpointId.value,
        request_count: log.requestCount.value,
        requested_at: log.requestedAt.toISOString(),
        created_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase.from('rate_limit_logs').insert(records);

      if (error) {
        this.logger.error({ error, count: logs.length }, 'Failed to save rate limit logs');
        return Result.fail(
          DomainError.unexpected('SAVE_MANY_FAILED', 'Failed to save rate limit logs'),
        );
      }

      this.logger.debug({ count: logs.length }, 'Rate limit logs saved');
      return Result.ok();
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving rate limit logs');
      return Result.fail(
        DomainError.unexpected(
          'SAVE_MANY_FAILED',
          'Failed to save rate limit logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByUserAndEndpoint(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<RateLimitLog[], DomainError>> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - window.windowMilliseconds);

      const { data, error } = await this.supabase
        .from('rate_limit_logs')
        .select('*')
        .eq('user_id', userId.value)
        .eq('endpoint_id', endpointId.value)
        .gte('requested_at', windowStart.toISOString())
        .lte('requested_at', now.toISOString())
        .order('requested_at', { ascending: false });

      if (error) {
        this.logger.error({ error }, 'Failed to find rate limit logs');
        return Result.fail(DomainError.unexpected('FIND_FAILED', 'Failed to find rate limit logs'));
      }

      const logs = await this.recordsToLogs(data || []);
      return Result.ok(logs);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding rate limit logs');
      return Result.fail(
        DomainError.unexpected(
          'FIND_FAILED',
          'Failed to find rate limit logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByUser(
    userId: UserId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[], DomainError>> {
    try {
      let query = this.supabase.from('rate_limit_logs').select('*').eq('user_id', userId.value);

      if (window) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - window.windowMilliseconds);
        query = query
          .gte('requested_at', windowStart.toISOString())
          .lte('requested_at', now.toISOString());
      }

      const { data, error } = await query.order('requested_at', { ascending: false });

      if (error) {
        this.logger.error({ error }, 'Failed to find user rate limit logs');
        return Result.fail(
          DomainError.unexpected('FIND_BY_USER_FAILED', 'Failed to find user logs'),
        );
      }

      const logs = await this.recordsToLogs(data || []);
      return Result.ok(logs);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding user logs');
      return Result.fail(
        DomainError.unexpected(
          'FIND_BY_USER_FAILED',
          'Failed to find user logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByEndpoint(
    endpointId: EndpointId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[], DomainError>> {
    try {
      let query = this.supabase
        .from('rate_limit_logs')
        .select('*')
        .eq('endpoint_id', endpointId.value);

      if (window) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - window.windowMilliseconds);
        query = query
          .gte('requested_at', windowStart.toISOString())
          .lte('requested_at', now.toISOString());
      }

      const { data, error } = await query.order('requested_at', { ascending: false });

      if (error) {
        this.logger.error({ error }, 'Failed to find endpoint rate limit logs');
        return Result.fail(
          DomainError.unexpected('FIND_BY_ENDPOINT_FAILED', 'Failed to find endpoint logs'),
        );
      }

      const logs = await this.recordsToLogs(data || []);
      return Result.ok(logs);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding endpoint logs');
      return Result.fail(
        DomainError.unexpected(
          'FIND_BY_ENDPOINT_FAILED',
          'Failed to find endpoint logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async deleteOldLogs(beforeDate: Date): Promise<Result<number, DomainError>> {
    try {
      // まず削除対象の件数を取得
      const { count: deleteCount, error: countError } = await this.supabase
        .from('rate_limit_logs')
        .select('*', { count: 'exact', head: true })
        .lt('requested_at', beforeDate.toISOString());

      if (countError) {
        this.logger.error({ error: countError }, 'Failed to count old logs');
        return Result.fail(DomainError.unexpected('COUNT_FAILED', 'Failed to count old logs'));
      }

      // 削除を実行
      const { error: deleteError } = await this.supabase
        .from('rate_limit_logs')
        .delete()
        .lt('requested_at', beforeDate.toISOString());

      if (deleteError) {
        this.logger.error({ error: deleteError }, 'Failed to delete old logs');
        return Result.fail(DomainError.unexpected('DELETE_FAILED', 'Failed to delete old logs'));
      }

      const deletedCount = deleteCount || 0;
      this.logger.info(
        { deletedCount, beforeDate: beforeDate.toISOString() },
        'Old rate limit logs deleted',
      );

      return Result.ok(deletedCount);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error deleting old logs');
      return Result.fail(
        DomainError.unexpected(
          'DELETE_FAILED',
          'Failed to delete old logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async countRequests(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<number, DomainError>> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - window.windowMilliseconds);

      const { data, error } = await this.supabase
        .from('rate_limit_logs')
        .select('request_count')
        .eq('user_id', userId.value)
        .eq('endpoint_id', endpointId.value)
        .gte('requested_at', windowStart.toISOString())
        .lte('requested_at', now.toISOString());

      if (error) {
        this.logger.error({ error }, 'Failed to count requests');
        return Result.fail(DomainError.unexpected('COUNT_FAILED', 'Failed to count requests'));
      }

      const totalCount = (data || []).reduce((sum, record) => sum + record.request_count, 0);

      return Result.ok(totalCount);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error counting requests');
      return Result.fail(
        DomainError.unexpected(
          'COUNT_FAILED',
          'Failed to count requests',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * レコードをドメインオブジェクトに変換
   */
  private async recordsToLogs(records: RateLimitLogRecord[]): Promise<RateLimitLog[]> {
    const logs: RateLimitLog[] = [];

    for (const record of records) {
      const userIdResult = UserId.fromString(record.user_id);
      const endpointIdResult = EndpointId.create(record.endpoint_id);
      const requestCountResult = RequestCount.create(record.request_count);

      if (userIdResult.isSuccess && endpointIdResult.isSuccess && requestCountResult.isSuccess) {
        const logResult = RateLimitLog.create({
          userId: userIdResult.getValue()!,
          endpointId: endpointIdResult.getValue()!,
          requestCount: requestCountResult.getValue()!,
          requestedAt: new Date(record.requested_at),
        });

        if (logResult.isSuccess) {
          logs.push(logResult.getValue()!);
        }
      }
    }

    return logs;
  }
}
