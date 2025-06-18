import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { UserId } from '@/domain/auth/value-objects/user-id';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IApiLogService, ApiUsageStats } from '@/domain/log/interfaces/api-log-service.interface';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface QueueItem {
  entry: APILogEntry;
  timestamp: number;
}

@injectable()
export class ApiLogService implements IApiLogService {
  private readonly buffer: QueueItem[] = [];
  private flushTimer?: NodeJS.Timeout;
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 1000; // 1 second
  private readonly MAX_BATCH_SIZE = 50;

  constructor(
    @inject(DI_TOKENS.ApiLogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {
    this.startBufferFlush();
  }

  async saveLog(entry: APILogEntry): Promise<Result<void>> {
    try {
      // バッファに追加
      this.buffer.push({
        entry,
        timestamp: Date.now(),
      });

      // バッファサイズが閾値を超えたら即座にフラッシュ
      if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
        await this.flushBuffer();
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error }, 'Failed to save log to buffer');
      return Result.fail(new DomainError('LOG_SAVE_ERROR', 'Failed to save API log', ErrorType.INTERNAL));
    }
  }

  async getUsageStats(
    userId: UserId,
    timeRange: { start: Date; end: Date },
  ): Promise<Result<ApiUsageStats>> {
    try {
      const timeRangeResult = TimeRange.create(timeRange.start, timeRange.end);
      if (timeRangeResult.isFailure) {
        return Result.fail(timeRangeResult.getError());
      }

      const logsResult = await this.apiLogRepository.findByUserId(
        userId,
        timeRangeResult.getValue(),
      );

      if (logsResult.isFailure) {
        return Result.fail(logsResult.getError());
      }

      const logs = logsResult.getValue();

      if (logs.length === 0) {
        return Result.ok({
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          totalBandwidth: 0,
          topEndpoints: [],
          errorRate: 0,
        });
      }

      const stats = this.calculateStats(logs);
      return Result.ok(stats);
    } catch (error) {
      this.logger.error({ error, userId: userId.value }, 'Failed to calculate usage stats');

      return Result.fail(
        new DomainError('STATS_ERROR', 'Failed to calculate usage statistics', ErrorType.INTERNAL),
      );
    }
  }

  async getErrorLogs(options?: {
    userId?: UserId;
    limit?: number;
    offset?: number;
  }): Promise<Result<APILogEntry[]>> {
    return this.apiLogRepository.findErrors(options);
  }

  async getSlowRequests(
    thresholdMs: number,
    limit: number = 100,
  ): Promise<Result<APILogEntry[]>> {
    return this.apiLogRepository.findSlowRequests(thresholdMs, limit);
  }

  private calculateStats(logs: APILogEntry[]): ApiUsageStats {
    const totalRequests = logs.length;
    const successfulRequests = logs.filter((log) => log.isSuccess).length;
    const failedRequests = totalRequests - successfulRequests;

    // レスポンスタイム統計
    const responseTimes = logs.map((log) => log.responseInfo.responseTime).sort((a, b) => a - b);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;

    // 帯域幅統計
    const totalBandwidth = logs.reduce((sum, log) => sum + log.responseInfo.size, 0);

    // エンドポイント統計
    const endpointCounts = new Map<string, number>();
    logs.forEach((log) => {
      const endpoint = log.endpoint.path.value;
      const count = endpointCounts.get(endpoint) || 0;
      endpointCounts.set(endpoint, count + 1);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorRate = failedRequests / totalRequests;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      totalBandwidth,
      topEndpoints,
      errorRate,
    };
  }

  private startBufferFlush(): void {
    // 定期的にバッファをフラッシュ
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flushBuffer().catch((error: unknown) => {
          this.logger.error({ error }, 'Failed to flush buffer in timer');
        });
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    // バッチ処理のためにバッファから取り出す
    const itemsToSave = this.buffer.splice(0, this.MAX_BATCH_SIZE);
    const logsToSave = itemsToSave.map((item) => item.entry);

    try {
      // バッチ保存を使用
      const result = await this.apiLogRepository.saveMany(logsToSave);

      if (result.isFailure) {
        this.logger.error(
          {
            error: result.getError(),
            logCount: logsToSave.length,
          },
          'Failed to save API logs batch',
        );

        // 失敗したログをバッファに戻す
        this.buffer.unshift(...itemsToSave);
      } else {
        this.logger.debug(
          {
            logCount: logsToSave.length,
          },
          'API logs batch saved successfully',
        );
      }
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving API logs');
      // 失敗したログをバッファに戻す
      this.buffer.unshift(...itemsToSave);
    }
  }

  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 残りのログをフラッシュ
    await this.flushBuffer();
  }
}
