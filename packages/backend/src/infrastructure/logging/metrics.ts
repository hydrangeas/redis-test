import { Logger } from 'pino';

/**
 * パフォーマンスメトリクスのログ記録
 */
export function logPerformance(
  logger: Logger,
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  logger.info({
    performance: {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
    context: 'performance_metric',
  }, `Performance: ${operation} completed in ${duration}ms`);
}

/**
 * 非同期操作の実行時間を計測してログに記録
 */
export async function measurePerformance<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = process.hrtime.bigint();
  
  try {
    const result = await fn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // ナノ秒をミリ秒に変換
    
    logPerformance(logger, operation, duration, {
      ...metadata,
      status: 'success',
    });
    
    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;
    
    logPerformance(logger, operation, duration, {
      ...metadata,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

/**
 * 同期操作の実行時間を計測してログに記録
 */
export function measureSyncPerformance<T>(
  logger: Logger,
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const startTime = process.hrtime.bigint();
  
  try {
    const result = fn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;
    
    logPerformance(logger, operation, duration, {
      ...metadata,
      status: 'success',
    });
    
    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;
    
    logPerformance(logger, operation, duration, {
      ...metadata,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}