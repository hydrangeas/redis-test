import { sign, verify, decode } from 'jsonwebtoken';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { IJWTService, JWTPayload } from '@/application/interfaces/jwt.service.interface';
import { Result } from '@/domain/shared/result';
import { EnvConfig } from '@/infrastructure/config';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

@injectable()
export class JWTService implements IJWTService {
  private readonly accessTokenExpiry = '1h';
  private readonly refreshTokenExpiry = '30d';

  constructor(
    @inject(DI_TOKENS.EnvConfig) private readonly config: EnvConfig,
    @inject(DI_TOKENS.Logger) private readonly logger: Logger,
  ) {}

  /**
   * アクセストークンを生成する
   */
  generateAccessToken(userId: string, tier: string): Promise<Result<string>> {
    try {
      const payload: JWTPayload = {
        sub: userId,
        tier,
        type: 'access',
      };

      const token = sign(payload, this.config.JWT_SECRET, {
        expiresIn: this.accessTokenExpiry,
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      });

      this.logger.debug({ userId, tier }, 'Access token generated');
      return Promise.resolve(Result.ok(token));
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to generate access token');
      return Promise.resolve(Result.fail('Failed to generate access token'));
    }
  }

  /**
   * リフレッシュトークンを生成する
   */
  generateRefreshToken(userId: string): Promise<Result<string>> {
    try {
      const payload: JWTPayload = {
        sub: userId,
        type: 'refresh',
      };

      const token = sign(payload, this.config.JWT_SECRET, {
        expiresIn: this.refreshTokenExpiry,
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      });

      this.logger.debug({ userId }, 'Refresh token generated');
      return Promise.resolve(Result.ok(token));
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to generate refresh token');
      return Promise.resolve(Result.fail('Failed to generate refresh token'));
    }
  }

  /**
   * アクセストークンを検証する
   */
  verifyAccessToken(token: string): Promise<Result<JWTPayload>> {
    try {
      const payload = verify(token, this.config.JWT_SECRET, {
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      }) as JWTPayload;

      // アクセストークンであることを確認
      if (payload.type !== 'access') {
        return Promise.resolve(Result.fail('Invalid token type'));
      }

      this.logger.debug({ sub: payload.sub }, 'Access token verified');
      return Promise.resolve(Result.ok(payload));
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        this.logger.debug('Token expired');
        return Promise.resolve(Result.fail('Token expired'));
      }
      if ((error as Error).name === 'JsonWebTokenError') {
        this.logger.debug({ error: (error as Error).message }, 'Invalid token');
        return Promise.resolve(Result.fail('Invalid token'));
      }
      this.logger.error({ error }, 'Failed to verify access token');
      return Promise.resolve(Result.fail('Failed to verify token'));
    }
  }

  /**
   * リフレッシュトークンを検証する
   */
  verifyRefreshToken(token: string): Promise<Result<JWTPayload>> {
    try {
      const payload = verify(token, this.config.JWT_SECRET, {
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      }) as JWTPayload;

      // リフレッシュトークンであることを確認
      if (payload.type !== 'refresh') {
        return Promise.resolve(Result.fail('Invalid token type'));
      }

      this.logger.debug({ sub: payload.sub }, 'Refresh token verified');
      return Promise.resolve(Result.ok(payload));
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        this.logger.debug('Token expired');
        return Promise.resolve(Result.fail('Token expired'));
      }
      if ((error as Error).name === 'JsonWebTokenError') {
        this.logger.debug({ error: (error as Error).message }, 'Invalid token');
        return Promise.resolve(Result.fail('Invalid token'));
      }
      this.logger.error({ error }, 'Failed to verify refresh token');
      return Promise.resolve(Result.fail('Failed to verify token'));
    }
  }

  /**
   * トークンをデコードする（検証なし）
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return decode(token) as JWTPayload;
    } catch (error) {
      this.logger.error({ error }, 'Failed to decode token');
      return null;
    }
  }
}
