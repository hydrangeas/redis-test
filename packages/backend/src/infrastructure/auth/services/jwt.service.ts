import jwt from 'jsonwebtoken';
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
  async generateAccessToken(userId: string, tier: string): Promise<Result<string>> {
    try {
      const payload: JWTPayload = {
        sub: userId,
        tier,
        type: 'access',
      };

      const token = jwt.sign(payload, this.config.JWT_SECRET, {
        expiresIn: this.accessTokenExpiry,
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      });

      this.logger.debug({ userId, tier }, 'Access token generated');
      return Result.ok(token);
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to generate access token');
      return Result.fail('Failed to generate access token');
    }
  }

  /**
   * リフレッシュトークンを生成する
   */
  async generateRefreshToken(userId: string): Promise<Result<string>> {
    try {
      const payload: JWTPayload = {
        sub: userId,
        type: 'refresh',
      };

      const token = jwt.sign(payload, this.config.JWT_SECRET, {
        expiresIn: this.refreshTokenExpiry,
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      });

      this.logger.debug({ userId }, 'Refresh token generated');
      return Result.ok(token);
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to generate refresh token');
      return Result.fail('Failed to generate refresh token');
    }
  }

  /**
   * アクセストークンを検証する
   */
  async verifyAccessToken(token: string): Promise<Result<JWTPayload>> {
    try {
      const payload = jwt.verify(token, this.config.JWT_SECRET, {
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      }) as JWTPayload;

      // アクセストークンであることを確認
      if (payload.type !== 'access') {
        return Result.fail('Invalid token type');
      }

      this.logger.debug({ sub: payload.sub }, 'Access token verified');
      return Result.ok(payload);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        this.logger.debug('Token expired');
        return Result.fail('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        this.logger.debug({ error: error.message }, 'Invalid token');
        return Result.fail('Invalid token');
      }
      this.logger.error({ error }, 'Failed to verify access token');
      return Result.fail('Failed to verify token');
    }
  }

  /**
   * リフレッシュトークンを検証する
   */
  async verifyRefreshToken(token: string): Promise<Result<JWTPayload>> {
    try {
      const payload = jwt.verify(token, this.config.JWT_SECRET, {
        issuer: this.config.API_BASE_URL,
        audience: this.config.API_BASE_URL,
      }) as JWTPayload;

      // リフレッシュトークンであることを確認
      if (payload.type !== 'refresh') {
        return Result.fail('Invalid token type');
      }

      this.logger.debug({ sub: payload.sub }, 'Refresh token verified');
      return Result.ok(payload);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        this.logger.debug('Token expired');
        return Result.fail('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        this.logger.debug({ error: error.message }, 'Invalid token');
        return Result.fail('Invalid token');
      }
      this.logger.error({ error }, 'Failed to verify refresh token');
      return Result.fail('Failed to verify token');
    }
  }

  /**
   * トークンをデコードする（検証なし）
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      this.logger.error({ error }, 'Failed to decode token');
      return null;
    }
  }
}
