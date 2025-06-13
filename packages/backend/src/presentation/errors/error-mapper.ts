import { container } from 'tsyringe';
import { DI_TOKENS } from '../../infrastructure/di';
import { DomainError, ErrorType } from '../../domain/errors/domain-error';
import { DomainException } from '../../domain/errors/exceptions';
import { ProblemDetails } from '../../domain/errors/problem-details';
import type { EnvConfig } from '../../infrastructure/config';

/**
 * ErrorTypeからHTTPステータスコードへのマッピング
 */
const STATUS_CODE_MAP: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.BUSINESS_RULE]: 422,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.EXTERNAL_SERVICE]: 503,
  [ErrorType.INTERNAL]: 500,
};

/**
 * エラーをRFC 7807 Problem Details形式に変換
 */
export function toProblemDetails(
  error: DomainError | DomainException | Error,
  instance?: string
): ProblemDetails {
  const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
  const baseUrl = config.API_BASE_URL;

  // DomainExceptionの場合
  if (error instanceof DomainException) {
    const problemDetails: ProblemDetails = {
      type: `${baseUrl}/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.message,
      status: error.statusCode,
      detail: error.message,
      instance,
    };

    // 特定の例外タイプに応じた拡張プロパティ
    if ('retryAfter' in error) {
      problemDetails.retryAfter = (error as any).retryAfter;
    }
    if ('limit' in error && 'resetTime' in error) {
      problemDetails.limit = (error as any).limit;
      problemDetails.resetTime = (error as any).resetTime.toISOString();
    }
    if ('field' in error && 'constraints' in error) {
      problemDetails.errors = [{
        field: (error as any).field,
        constraints: (error as any).constraints,
      }];
    }

    return problemDetails;
  }

  // DomainErrorの場合
  if (error instanceof DomainError) {
    return {
      type: `${baseUrl}/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.message,
      status: STATUS_CODE_MAP[error.type] || 500,
      detail: error.details ? JSON.stringify(error.details) : error.message,
      instance,
    };
  }

  // 通常のErrorの場合（予期しないエラー）
  return {
    type: `${baseUrl}/errors/internal-server-error`,
    title: 'Internal Server Error',
    status: 500,
    detail: config.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : error.message,
    instance,
  };
}

/**
 * Fastifyバリデーションエラーを変換
 */
export function mapValidationError(
  validation: any[],
  instance: string
): ProblemDetails {
  const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
  const baseUrl = config.API_BASE_URL;

  return {
    type: `${baseUrl}/errors/validation-error`,
    title: 'Validation Error',
    status: 400,
    detail: 'Request validation failed',
    instance,
    errors: validation.map(err => ({
      field: err.instancePath || err.dataPath,
      message: err.message,
      params: err.params,
    })),
  };
}