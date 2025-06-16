/**
 * ドメイン例外の基底クラス
 * throw可能なエラーオブジェクト
 */
export abstract class DomainException extends Error {
  constructor(
    /** エラーコード */
    public readonly code: string,
    /** エラーメッセージ */
    message: string,
    /** HTTPステータスコード */
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    // V8エンジンでのスタックトレース最適化
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 認証例外
 */
export class AuthenticationException extends DomainException {
  constructor(
    public readonly provider: string,
    public readonly reason: string,
  ) {
    super('AUTH_FAILED', `Authentication failed: ${reason}`, 401);
  }
}

/**
 * 認可例外
 */
export class AuthorizationException extends DomainException {
  constructor(
    public readonly resource: string,
    public readonly action: string,
    public readonly userId?: string,
  ) {
    super('FORBIDDEN', `Access denied: Cannot ${action} ${resource}`, 403);
  }
}

/**
 * レート制限例外
 */
export class RateLimitException extends DomainException {
  constructor(
    public readonly limit: number,
    public readonly resetTime: Date,
    public readonly retryAfter: number,
  ) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429);
  }
}

/**
 * バリデーション例外
 */
export class ValidationException extends DomainException {
  constructor(
    public readonly field: string,
    public readonly value: any,
    public readonly constraints: string[],
  ) {
    super('VALIDATION_FAILED', `Validation failed for field '${field}'`, 400);
  }
}

/**
 * リソース未発見例外
 */
export class ResourceNotFoundException extends DomainException {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
  ) {
    super('RESOURCE_NOT_FOUND', `${resourceType} with id '${resourceId}' not found`, 404);
  }
}

/**
 * ビジネスルール違反例外
 */
export class BusinessRuleViolationException extends DomainException {
  constructor(
    public readonly rule: string,
    public readonly context: Record<string, any>,
  ) {
    super('BUSINESS_RULE_VIOLATION', `Business rule violation: ${rule}`, 422);
  }
}

/**
 * 外部サービス例外
 */
export class ExternalServiceException extends DomainException {
  constructor(
    public readonly service: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `External service error: ${service} failed during ${operation}`,
      503,
    );
  }
}

/**
 * パストラバーサル例外
 */
export class PathTraversalException extends DomainException {
  constructor(
    public readonly attemptedPath: string,
    public readonly sanitizedPath: string,
  ) {
    super('PATH_TRAVERSAL_DETECTED', 'Invalid path detected: potential security threat', 400);
  }
}
