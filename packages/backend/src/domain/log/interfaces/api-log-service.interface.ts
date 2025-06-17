import { Result } from '@/domain/errors/result';
import { APILogEntry } from '../entities/api-log-entry';
import { UserId } from '@/domain/auth/value-objects/user-id';

export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  totalBandwidth: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorRate: number;
}

export interface IApiLogService {
  saveLog(entry: APILogEntry): Promise<Result<void>>;

  getUsageStats(
    userId: UserId,
    timeRange: { start: Date; end: Date },
  ): Promise<Result<ApiUsageStats>>;

  getErrorLogs(options?: {
    userId?: UserId;
    limit?: number;
    offset?: number;
  }): Promise<Result<APILogEntry[]>>;

  getSlowRequests(thresholdMs: number, limit?: number): Promise<Result<APILogEntry[]>>;

  cleanup(): Promise<void>;
}
