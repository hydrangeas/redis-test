import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { UniqueEntityId } from '@/domain/shared/unique-entity-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointPath } from '../value-objects/endpoint-path';
import { EndpointId } from '../value-objects/endpoint-id';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { RequestCount } from '../value-objects/request-count';
import { RateLimitLog } from '../entities/rate-limit-log.entity';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { ValidationError } from '@/domain/errors/validation-error';

export interface RateLimitingProps {
  userId: UserId;
  endpointPath: EndpointPath;
  logs: RateLimitLog[];
  windowSeconds: number;
}

export interface RateLimitStatus {
  isExceeded: boolean;
  currentCount: number;
  remainingRequests: number;
  resetTime: Date;
}

/**
 * レート制限を管理する集約
 * ユーザーとエンドポイントの組み合わせごとにレート制限を追跡
 */
export class RateLimiting extends AggregateRoot<RateLimitingProps> {
  
  get userId(): UserId {
    return this.props.userId;
  }

  get endpointPath(): EndpointPath {
    return this.props.endpointPath;
  }

  get logs(): RateLimitLog[] {
    return [...this.props.logs]; // Return a copy to maintain immutability
  }

  get windowSeconds(): number {
    return this.props.windowSeconds;
  }

  /**
   * 現在のレート制限状況をチェック
   */
  checkLimit(maxRequests: number, currentTime: Date = new Date()): RateLimitStatus {
    const window = new RateLimitWindow(this.props.windowSeconds, currentTime);
    
    // ウィンドウ内のリクエストをカウント
    const requestsInWindow = this.props.logs.filter(log => 
      window.contains(log.requestedAt)
    );
    
    const currentCount = requestsInWindow.length;
    const isExceeded = currentCount >= maxRequests;
    const remainingRequests = Math.max(0, maxRequests - currentCount);
    const resetTime = this.calculateResetTime(window, requestsInWindow);
    
    return {
      isExceeded,
      currentCount,
      remainingRequests,
      resetTime
    };
  }

  /**
   * リクエストを記録
   */
  recordRequest(timestamp: Date = new Date()): Result<void> {
    try {
      const newLogResult = RateLimitLog.create({
        userId: this.userId,
        endpointId: EndpointId.generate(), // Temporary ID, will be replaced by repository
        requestCount: RequestCount.create(1).getValue(),
        requestedAt: timestamp
      });
      
      if (newLogResult.isFailure) {
        return Result.fail(newLogResult.getError());
      }
      
      const newLog = newLogResult.getValue();
      this.props.logs.push(newLog);
      
      // ログを時系列でソート
      this.props.logs.sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
      
      // 古いログをクリーンアップ
      this.cleanupOldLogs(timestamp);
      
      return Result.ok();
    } catch (error) {
      return Result.fail(
        new DomainError(
          'RATE_LIMIT_RECORD_ERROR',
          'Failed to record request',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * 指定された時間より古いログを削除
   */
  cleanupOldLogs(currentTime: Date): number {
    const cutoffTime = new Date(currentTime.getTime() - (this.props.windowSeconds * 2 * 1000));
    const beforeCount = this.props.logs.length;
    
    this.props.logs = this.props.logs.filter(log => 
      log.requestedAt.getTime() > cutoffTime.getTime()
    );
    
    return beforeCount - this.props.logs.length;
  }

  /**
   * リセット時刻を計算
   */
  private calculateResetTime(window: RateLimitWindow, requestsInWindow: RateLimitLog[]): Date {
    if (requestsInWindow.length === 0) {
      return new Date(Date.now() + (this.props.windowSeconds * 1000));
    }
    
    // 最も古いリクエストがウィンドウから出る時刻
    const oldestRequest = requestsInWindow[0];
    const oldestRequestTime = oldestRequest.requestedAt.getTime();
    const windowEndTime = oldestRequestTime + (this.props.windowSeconds * 1000);
    
    return new Date(windowEndTime);
  }

  /**
   * 現在のリクエスト数を取得
   */
  getCurrentRequestCount(currentTime: Date = new Date()): RequestCount {
    const window = new RateLimitWindow(this.props.windowSeconds, currentTime);
    const requestsInWindow = this.props.logs.filter(log => 
      window.contains(log.requestedAt)
    );
    
    return RequestCount.create(requestsInWindow.length).getValue();
  }

  /**
   * ファクトリメソッド
   */
  static create(
    props: Omit<RateLimitingProps, 'logs'> & { logs?: RateLimitLog[] },
    id?: UniqueEntityId
  ): Result<RateLimiting> {
    if (!props.userId) {
      return Result.fail(new ValidationError('UserId is required'));
    }
    
    if (!props.endpointPath) {
      return Result.fail(new ValidationError('EndpointPath is required'));
    }
    
    if (!props.windowSeconds || props.windowSeconds <= 0) {
      return Result.fail(new ValidationError('Window seconds must be positive'));
    }

    const rateLimitingProps: RateLimitingProps = {
      userId: props.userId,
      endpointPath: props.endpointPath,
      logs: props.logs || [],
      windowSeconds: props.windowSeconds
    };
    
    return Result.ok(new RateLimiting(rateLimitingProps, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstitute(
    props: RateLimitingProps,
    id: UniqueEntityId
  ): RateLimiting {
    return new RateLimiting(props, id);
  }
}