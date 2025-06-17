import { container } from 'tsyringe';

import { ApplicationError } from '@/application/errors/application-error';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DomainException } from '@/domain/errors/exceptions';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

import type { ApplicationErrorType } from '@/application/errors/application-error';
import type { ProblemDetails } from '@/domain/errors/problem-details';
import type { EnvConfig } from '@/infrastructure/config';

/**
 * ErrorTypeからHTTPステータスコードへのマッピング
 */
const STATUS_CODE_MAP: Record<string, number> = {
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
 * ApplicationErrorTypeからHTTPステータスコードへのマッピング
 */
const APP_STATUS_CODE_MAP: Record<ApplicationErrorType, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  EXTERNAL_SERVICE: 503,
  INTERNAL: 500,
};

/**
 * エラーをRFC 7807 Problem Details形式に変換
 */
export function toProblemDetails(
  error:
    | DomainError
    | DomainException
    | ApplicationError
    | Error
    | { code: string; message: string; type: string },
  instance?: string,
): ProblemDetails {
  const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
  const baseUrl = config.API_BASE_URL;

  // ApplicationErrorの場合
  if (error instanceof ApplicationError) {
    return {
      type: `${baseUrl}/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.message,
      status: APP_STATUS_CODE_MAP[error.type] || 500,
      detail: error.metadata ? JSON.stringify(error.metadata) : error.message,
      instance,
    };
  }

  // プレーンオブジェクトの場合（簡易エラー）
  if (!(error instanceof Error) && 'code' in error && 'message' in error && 'type' in error) {
    const statusCode =
      error.type in APP_STATUS_CODE_MAP
        ? APP_STATUS_CODE_MAP[error.type as ApplicationErrorType]
        : 500;

    return {
      type: `${baseUrl}/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.message,
      status: statusCode,
      detail: error.message,
      instance,
    };
  }

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
      problemDetails.errors = [
        {
          field: (error as any).field,
          constraints: (error as any).constraints,
        },
      ];
    }

    return problemDetails;
  }

  // DomainErrorの場合
  if (error instanceof DomainError) {
    // TypeScript enumの値とキーの問題を解決
    const statusCode = STATUS_CODE_MAP[error.type] || 500;
    const problemDetails: ProblemDetails = {
      type: `${baseUrl}/errors/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.message,
      status: statusCode,
      detail: error.details ? JSON.stringify(error.details) : error.message,
    };

    if (instance) {
      problemDetails.instance = instance;
    }

    return problemDetails;
  }

  // 通常のErrorの場合（予期しないエラー）
  return {
    type: `${baseUrl}/errors/internal-server-error`,
    title: 'Internal Server Error',
    status: 500,
    detail: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    instance,
  };
}

/**
 * Fastifyバリデーションエラーを変換
 */
export function mapValidationError(validation: any[], instance: string): ProblemDetails {
  const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
  const baseUrl = config.API_BASE_URL;

  return {
    type: `${baseUrl}/errors/validation-error`,
    title: 'Validation Error',
    status: 400,
    detail: 'Request validation failed',
    instance,
    errors: validation.map((err) => ({
      field: err.instancePath || err.dataPath,
      message: err.message,
      params: err.params,
    })),
  };
}
