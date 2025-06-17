import { injectable } from 'tsyringe';
import { IRateLimitLogRepository } from '@/domain/api/interfaces/rate-limit-log-repository.interface';
import { RateLimitLog } from '@/domain/api/entities/rate-limit-log.entity';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { RateLimitWindow } from '@/domain/api/value-objects/rate-limit-window';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';

/**
 * インメモリレート制限ログリポジトリ実装
 * 開発・テスト用のインメモリ実装
 */
@injectable()
export class InMemoryRateLimitLogRepository implements IRateLimitLogRepository {
  private logs: Map<string, RateLimitLog> = new Map();

  async save(log: RateLimitLog): Promise<Result<void>> {
    try {
      this.logs.set(log.id.value, log);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
          'SAVE_FAILED',
          'Failed to save rate limit log',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async saveMany(logs: RateLimitLog[]): Promise<Result<void>> {
    try {
      for (const log of logs) {
        this.logs.set(log.id.value, log);
      }
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
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
  ): Promise<Result<RateLimitLog[]>> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - window.windowMilliseconds);

      const matchingLogs = Array.from(this.logs.values()).filter((log) => {
        return (
          log.userId === userId.value &&
          log.endpointId === endpointId.value &&
          log.timestamp >= windowStart &&
          log.timestamp <= now
        );
      });

      return Result.ok(matchingLogs);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
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
  ): Promise<Result<RateLimitLog[]>> {
    try {
      let matchingLogs = Array.from(this.logs.values()).filter((log) => log.userId === userId.value);

      if (window) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - window.windowMilliseconds);
        matchingLogs = matchingLogs.filter(
          (log) => log.timestamp >= windowStart && log.timestamp <= now,
        );
      }

      return Result.ok(matchingLogs);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
          'FIND_BY_USER_FAILED',
          'Failed to find user rate limit logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByEndpoint(
    endpointId: EndpointId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>> {
    try {
      let matchingLogs = Array.from(this.logs.values()).filter(
        (log) => log.endpointId === endpointId.value,
      );

      if (window) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - window.windowMilliseconds);
        matchingLogs = matchingLogs.filter(
          (log) => log.timestamp >= windowStart && log.timestamp <= now,
        );
      }

      return Result.ok(matchingLogs);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
          'FIND_BY_ENDPOINT_FAILED',
          'Failed to find endpoint rate limit logs',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async deleteOldLogs(beforeDate: Date): Promise<Result<number>> {
    try {
      const initialSize = this.logs.size;

      // 古いログを削除
      for (const [id, log] of this.logs.entries()) {
        if (log.timestamp < beforeDate) {
          this.logs.delete(id);
        }
      }

      const deletedCount = initialSize - this.logs.size;
      return Result.ok(deletedCount);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
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
  ): Promise<Result<number>> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - window.windowMilliseconds);

      const count = Array.from(this.logs.values())
        .filter((log) => {
          return (
            log.userId === userId.value &&
            log.endpointId === endpointId.value &&
            log.timestamp >= windowStart &&
            log.timestamp <= now
          );
        })
        .length; // Count the number of logs

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        DomainError.internal(
          'COUNT_FAILED',
          'Failed to count requests',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * テスト用：リポジトリをクリア
   */
  clear(): void {
    this.logs.clear();
  }

  /**
   * テスト用：全ログを取得
   */
  getAll(): RateLimitLog[] {
    return Array.from(this.logs.values());
  }
}
