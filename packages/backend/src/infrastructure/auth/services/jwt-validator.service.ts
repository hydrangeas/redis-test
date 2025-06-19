import { jwtDecode } from 'jwt-decode';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';


import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

import { IJWTValidator } from '../interfaces/jwt-validator.interface';


@injectable()
export class JWTValidatorService implements IJWTValidator {
  constructor(@inject(DI_TOKENS.Logger) private readonly logger: Logger) {}

  /**
   * JWTトークンの形式と基本的な検証を行う
   * 注意: 署名検証はSupabase側で行われるため、ここでは形式チェックのみ
   */
  validateToken(token: string): Promise<Result<void>> {
    try {
      // トークンが空でないか確認
      if (!token || typeof token !== 'string') {
        return Promise.resolve(
          Result.fail(
            new DomainError(
              'INVALID_TOKEN_FORMAT',
              'Token is empty or not a string',
              ErrorType.VALIDATION,
            ),
          ),
        );
      }

      // Bearer形式の場合は除去
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // JWT形式の確認（3つのドットで区切られた部分があるか）
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        return Promise.resolve(
          Result.fail(
            new DomainError(
              'INVALID_JWT_FORMAT',
              'Token does not have valid JWT format',
              ErrorType.VALIDATION,
            ),
          ),
        );
      }

      // 各部分がBase64URLエンコードされているか確認
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
      for (let i = 0; i < parts.length; i++) {
        if (!base64UrlPattern.test(parts[i])) {
          return Promise.resolve(
            Result.fail(
              new DomainError(
                'INVALID_JWT_ENCODING',
                `Part ${i + 1} of JWT is not properly encoded`,
                ErrorType.VALIDATION,
              ),
            ),
          );
        }
      }

      // デコード可能か確認
      try {
        const decoded = jwtDecode(cleanToken);
        if (!decoded) {
          return Promise.resolve(
            Result.fail(
              new DomainError(
                'JWT_DECODE_FAILED',
                'Failed to decode JWT payload',
                ErrorType.VALIDATION,
              ),
            ),
          );
        }
      } catch (error) {
        return Promise.resolve(
          Result.fail(
            new DomainError(
              'JWT_DECODE_ERROR',
              error instanceof Error ? error.message : 'Failed to decode JWT',
              ErrorType.VALIDATION,
            ),
          ),
        );
      }

      this.logger.debug('JWT format validation successful');
      return Promise.resolve(Result.ok(undefined));
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'JWT validation failed with unexpected error',
      );

      return Promise.resolve(
        Result.fail(
          new DomainError(
            'JWT_VALIDATION_ERROR',
            error instanceof Error ? error.message : 'JWT validation failed',
            ErrorType.VALIDATION,
          ),
        ),
      );
    }
  }

  /**
   * トークンをデコードしてペイロードを取得（検証なし）
   */
  decodeToken<T = unknown>(token: string): T | null {
    try {
      // Bearer形式の場合は除去
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      const decoded = jwtDecode<T>(cleanToken);
      return decoded;
    } catch (error) {
      this.logger.warn(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to decode JWT token',
      );
      return null;
    }
  }
}
