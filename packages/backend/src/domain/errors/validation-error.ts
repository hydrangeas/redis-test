/**
 * バリューオブジェクトのバリデーションエラー
 * 軽量なエラークラス
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
    
    // V8エンジンでのスタックトレース最適化
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}