import { IRateLimitLogRepository } from '../rate-limit-log-repository.interface';
import { RateLimitLog } from '../../entities/rate-limit-log.entity';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '../../value-objects/endpoint-id';
import { RateLimitWindow } from '../../value-objects/rate-limit-window';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { vi } from 'vitest';

/**
 * レート制限ログリポジトリのモック実装
 * テスト用のインメモリ実装
 */
export class MockRateLimitLogRepository implements IRateLimitLogRepository {
  private logs: RateLimitLog[] = [];

  // Spy functions for testing
  public saveSpy = vi.fn();
  public saveManySpy = vi.fn();
  public findByUserAndEndpointSpy = vi.fn();
  public findByUserSpy = vi.fn();
  public findByEndpointSpy = vi.fn();
  public deleteOldLogsSpy = vi.fn();
  public countRequestsSpy = vi.fn();

  constructor() {
    // Initialize empty
  }

  /**
   * レート制限ログを保存
   */
  async save(log: RateLimitLog): Promise<Result<void>> {
    this.saveSpy(log);

    try {
      this.logs.push(log);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DomainError('SAVE_FAILED', 'Failed to save rate limit log', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 複数のログを一括保存
   */
  async saveMany(logs: RateLimitLog[]): Promise<Result<void>> {
    this.saveManySpy(logs);

    try {
      this.logs.push(...logs);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DomainError('SAVE_FAILED', 'Failed to save rate limit logs', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * ユーザーとエンドポイントの組み合わせでログを検索
   */
  async findByUserAndEndpoint(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>> {
    this.findByUserAndEndpointSpy(userId, endpointId, window);

    try {
      const filteredLogs = this.logs.filter(
        (log) =>
          log.userId === userId.value &&
          log.endpointId === endpointId.value &&
          log.timestamp >= window.startTime &&
          log.timestamp <= window.endTime,
      );

      return Result.ok(filteredLogs);
    } catch (error) {
      return Result.fail(
        new DomainError('FIND_FAILED', 'Failed to find rate limit logs', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 特定のユーザーの全ログを取得
   */
  async findByUser(
    userId: UserId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>> {
    this.findByUserSpy(userId, window);

    try {
      let filteredLogs = this.logs.filter((log) => log.userId === userId.value);

      if (window) {
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.timestamp >= window.startTime &&
            log.timestamp <= window.endTime,
        );
      }

      return Result.ok(filteredLogs);
    } catch (error) {
      return Result.fail(
        new DomainError('FIND_FAILED', 'Failed to find user logs', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 特定のエンドポイントの全ログを取得
   */
  async findByEndpoint(
    endpointId: EndpointId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>> {
    this.findByEndpointSpy(endpointId, window);

    try {
      let filteredLogs = this.logs.filter((log) => log.endpointId === endpointId.value);

      if (window) {
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.timestamp >= window.startTime &&
            log.timestamp <= window.endTime,
        );
      }

      return Result.ok(filteredLogs);
    } catch (error) {
      return Result.fail(
        new DomainError('FIND_FAILED', 'Failed to find endpoint logs', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 古いログを削除
   */
  async deleteOldLogs(beforeDate: Date): Promise<Result<number>> {
    this.deleteOldLogsSpy(beforeDate);

    try {
      const originalCount = this.logs.length;
      this.logs = this.logs.filter((log) => log.timestamp >= beforeDate);
      const deletedCount = originalCount - this.logs.length;

      return Result.ok(deletedCount);
    } catch (error) {
      return Result.fail(
        new DomainError('DELETE_FAILED', 'Failed to delete old logs', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * 特定期間のリクエスト数を集計
   */
  async countRequests(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<number>> {
    this.countRequestsSpy(userId, endpointId, window);

    try {
      const count = this.logs.filter(
        (log) =>
          log.userId === userId.value &&
          log.endpointId === endpointId.value &&
          log.timestamp >= window.startTime &&
          log.timestamp <= window.endTime,
      ).length;

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DomainError('COUNT_FAILED', 'Failed to count requests', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * テスト用: ログをクリア
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * テスト用: ログ数を取得
   */
  count(): number {
    return this.logs.length;
  }

  /**
   * テスト用: すべてのログを取得
   */
  getAll(): RateLimitLog[] {
    return [...this.logs];
  }

  /**
   * テスト用: ログを事前に追加
   */
  seed(logs: RateLimitLog[]): void {
    this.logs.push(...logs);
  }
}