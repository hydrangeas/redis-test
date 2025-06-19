import type { Result } from '../errors/result';
import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';


export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  tier: string;
}

export interface TokenValidationResult {
  user: AuthenticatedUser;
  tokenId?: string;
}

export interface IAuthenticationUseCase {
  /**
   * Validates an access token and returns the authenticated user
   * @param token The JWT access token to validate
   * @returns The authenticated user if valid, or an error
   */
  validateToken(token: string): Promise<Result<TokenValidationResult>>;

  /**
   * Refreshes an access token using a refresh token
   * @param refreshToken The refresh token
   * @returns New tokens if successful, or an error
   */
  refreshToken(refreshToken: string): Promise<Result<TokenRefreshResult>>;

  /**
   * Signs out a user, invalidating all their sessions
   * @param userId The user ID to sign out
   * @returns Success or error result
   */
  signOut(userId: string): Promise<Result<void>>;
}
