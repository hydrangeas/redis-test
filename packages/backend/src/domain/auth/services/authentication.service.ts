import { injectable } from 'tsyringe';
import { AuthenticatedUser } from '../value-objects/authenticated-user';
import { UserId } from '../value-objects/user-id';
import { UserTier } from '../value-objects/user-tier';
import { TierLevel } from '../value-objects/tier-level';
import { TokenPayload } from '../types/token-payload';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { AuthenticationException } from '@/domain/errors/exceptions';

/**
 * 認証ドメインサービス
 * JWTトークンの検証とAuthenticatedUserオブジェクトへの変換を担当
 */
@injectable()
export class AuthenticationService {
  /**
   * アクセストークンを検証し、認証済みユーザーを取得する
   * 実際のトークン検証はインフラ層に委譲される
   */
  async validateAccessToken(tokenPayload: TokenPayload | null): Promise<Result<AuthenticatedUser>> {
    if (!tokenPayload) {
      return Result.fail(
        new DomainError(
          'INVALID_TOKEN',
          'Token payload is null or undefined',
          ErrorType.UNAUTHORIZED,
        ),
      );
    }

    // トークンの有効期限チェック
    if (this.isTokenExpired(tokenPayload)) {
      const expiredAt = tokenPayload.exp
        ? new Date(tokenPayload.exp * 1000).toISOString()
        : 'unknown';

      return Result.fail(
        new DomainError('TOKEN_EXPIRED', 'Access token has expired', ErrorType.UNAUTHORIZED, {
          expiredAt,
        }),
      );
    }

    // ユーザー情報の抽出
    try {
      const authenticatedUser = this.extractUserFromToken(tokenPayload);
      return Result.ok(authenticatedUser);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'TOKEN_EXTRACTION_FAILED',
          error instanceof Error ? error.message : 'Failed to extract user from token',
          ErrorType.UNAUTHORIZED,
        ),
      );
    }
  }

  /**
   * トークンペイロードからAuthenticatedUserを生成
   */
  extractUserFromToken(tokenPayload: TokenPayload): AuthenticatedUser {
    // User IDの取得と検証
    const userIdResult = UserId.create(tokenPayload.sub);
    if (userIdResult.isFailure) {
      throw new AuthenticationException(
        'JWT',
        `Invalid user ID in token: ${userIdResult.getError().message}`,
      );
    }

    // ティア情報の取得
    const tierString = this.extractTierFromPayload(tokenPayload);
    const tierLevel = this.parseTierLevel(tierString);

    // UserTierの作成
    const userTierResult = UserTier.create(tierLevel);
    if (userTierResult.isFailure) {
      throw new AuthenticationException(
        'JWT',
        `Invalid user tier: ${userTierResult.getError().message}`,
      );
    }

    return new AuthenticatedUser(userIdResult.getValue(), userTierResult.getValue());
  }

  /**
   * トークンペイロードからティア情報を抽出
   */
  private extractTierFromPayload(payload: TokenPayload): string {
    // app_metadataからティア情報を取得
    const tier = payload.app_metadata?.tier;

    if (!tier) {
      // ティア情報がない場合はデフォルトでTIER1
      return 'tier1';
    }

    return tier.toString().toLowerCase();
  }

  /**
   * ティア文字列をTierLevel列挙型に変換
   */
  private parseTierLevel(tierString: string): TierLevel {
    const normalizedTier = tierString.toUpperCase().replace('TIER', 'TIER');

    switch (normalizedTier) {
      case 'TIER1':
        return TierLevel.TIER1;
      case 'TIER2':
        return TierLevel.TIER2;
      case 'TIER3':
        return TierLevel.TIER3;
      default:
        // 不明なティアはデフォルトでTIER1
        return TierLevel.TIER1;
    }
  }

  /**
   * トークンの有効期限をチェック
   */
  private isTokenExpired(payload: TokenPayload): boolean {
    if (!payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000); // 現在時刻（Unix timestamp）
    return payload.exp < now;
  }

}
