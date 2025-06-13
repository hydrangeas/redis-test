/**
 * ドメインエラーの種別
 */
export enum ErrorType {
  /** バリデーションエラー */
  VALIDATION = 'VALIDATION',
  /** ビジネスルール違反 */
  BUSINESS_RULE = 'BUSINESS_RULE',
  /** リソースが見つからない */
  NOT_FOUND = 'NOT_FOUND',
  /** 認証エラー */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 認可エラー */
  FORBIDDEN = 'FORBIDDEN',
  /** レート制限エラー */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 外部サービスエラー */
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  /** 内部エラー */
  INTERNAL = 'INTERNAL',
}

/**
 * ドメインエラークラス
 * ビジネスロジック層で発生するエラーを表現
 */
export class DomainError {
  constructor(
    /** エラーコード（一意の識別子） */
    public readonly code: string,
    /** エラーメッセージ */
    public readonly message: string,
    /** エラーの種別 */
    public readonly type: ErrorType,
    /** 追加の詳細情報 */
    public readonly details?: any
  ) {}

  /**
   * ファクトリメソッド
   */
  static validation(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.VALIDATION, details);
  }

  static businessRule(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.BUSINESS_RULE, details);
  }

  static notFound(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.NOT_FOUND, details);
  }

  static unauthorized(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.UNAUTHORIZED, details);
  }

  static forbidden(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.FORBIDDEN, details);
  }

  static rateLimit(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.RATE_LIMIT, details);
  }

  static externalService(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.EXTERNAL_SERVICE, details);
  }

  static internal(code: string, message: string, details?: any): DomainError {
    return new DomainError(code, message, ErrorType.INTERNAL, details);
  }
}