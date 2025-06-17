import { injectable, inject } from 'tsyringe';
import {
  IAuthenticationUseCase,
  TokenRefreshResult,
  TokenValidationResult,
} from '../interfaces/authentication-use-case.interface';
import { Result } from '../errors/result';
import { ApplicationError } from '../errors/application-error';
import { ApplicationResult } from '../errors/result';
import { IAuthAdapter } from '@/infrastructure/auth/interfaces/auth-adapter.interface';
import { IJWTValidator } from '@/infrastructure/auth/interfaces/jwt-validator.interface';
import { AuthenticationService } from '@/domain/auth/services/authentication.service';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { AuthenticationFailed } from '@/domain/auth/events/authentication-failed.event';
import { UserLoggedOut } from '@/domain/auth/events/user-logged-out.event';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

@injectable()
export class AuthenticationUseCase implements IAuthenticationUseCase {
  constructor(
    @inject(DI_TOKENS.AuthAdapter)
    private readonly authAdapter: IAuthAdapter,
    @inject(DI_TOKENS.JWTValidator)
    private readonly jwtValidator: IJWTValidator,
    @inject(DI_TOKENS.AuthenticationService)
    private readonly authService: AuthenticationService,
    @inject(DI_TOKENS.EventBus)
    private readonly eventBus: IEventBus,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async validateToken(token: string): Promise<Result<TokenValidationResult>> {
    try {
      // Validate token format with JWT validator
      const jwtValidation = await this.jwtValidator.validateToken(token);
      if (jwtValidation.isFailure) {
        return ApplicationResult.fail(
          new ApplicationError(
            'INVALID_TOKEN_FORMAT',
            jwtValidation.getError().message,
            'VALIDATION',
          ),
        );
      }

      // Verify token with auth adapter
      const tokenPayload = await this.authAdapter.verifyToken(token);

      if (!tokenPayload) {
        // Log authentication failure event
        const failureEvent = new AuthenticationFailed(
          'system',
          1,
          'unknown',
          'JWT_VERIFICATION_FAILED',
          token.substring(0, 10) + '...',
        );
        await this.eventBus.publish(failureEvent);

        return ApplicationResult.fail(
          new ApplicationError(
            'TOKEN_VERIFICATION_FAILED',
            'Token verification failed',
            'UNAUTHORIZED',
          ),
        );
      }

      // Validate with domain service
      const validationResult = await this.authService.validateAccessToken(tokenPayload);

      if (validationResult.isFailure) {
        const error = validationResult.getError();

        // Log authentication failure event
        const failureEvent = new AuthenticationFailed(
          tokenPayload.sub || 'unknown', // aggregateId
          1, // eventVersion
          'jwt', // provider
          error.message, // reason
          'unknown', // ipAddress (TODO: get from request)
          'unknown', // userAgent (TODO: get from request)
          tokenPayload.sub, // attemptedUserId
        );
        await this.eventBus.publish(failureEvent);

        return ApplicationResult.fail(
          new ApplicationError('TOKEN_VALIDATION_FAILED', error.message, 'UNAUTHORIZED'),
        );
      }

      const authenticatedUser = validationResult.getValue();

      this.logger.info(
        {
          userId: authenticatedUser.userId.value,
          tier: authenticatedUser.tier.level,
        },
        'Token validated successfully',
      );

      return ApplicationResult.ok({
        user: authenticatedUser,
        tokenId: tokenPayload.sub, // Use sub as tokenId since jti is not available
      });
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Unexpected error during token validation',
      );

      return ApplicationResult.fail(
        new ApplicationError(
          'INTERNAL_ERROR',
          'An unexpected error occurred during token validation',
          'INTERNAL',
        ),
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<Result<TokenRefreshResult>> {
    try {
      // Validate refresh token format
      if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
        return ApplicationResult.fail(
          new ApplicationError(
            'INVALID_REFRESH_TOKEN_FORMAT',
            'Refresh token format is invalid',
            'VALIDATION',
          ),
        );
      }

      // Refresh token with auth adapter
      const session = await this.authAdapter.refreshAccessToken(refreshToken);

      if (!session) {
        return ApplicationResult.fail(
          new ApplicationError(
            'REFRESH_TOKEN_INVALID',
            'Invalid or expired refresh token',
            'UNAUTHORIZED',
          ),
        );
      }

      // Extract token IDs if available
      let oldTokenId: string | undefined;
      let newTokenId: string | undefined;

      try {
        // Try to decode tokens to get JTI claims
        const decoded = this.jwtValidator.decodeToken<any>(session.access_token);
        newTokenId = decoded?.jti;
      } catch (e) {
        // If we can't decode, that's ok - token IDs are optional
      }

      // Publish token refreshed event
      const refreshEvent = new TokenRefreshed(
        session.user.id,
        1,
        session.user.id,
        oldTokenId,
        newTokenId,
        1, // First refresh
        refreshToken.substring(0, 10), // Session ID proxy
      );
      await this.eventBus.publish(refreshEvent);

      this.logger.info(
        {
          userId: session.user.id,
          tier: session.user.app_metadata?.tier || 'tier1',
        },
        'Token refreshed successfully',
      );

      return ApplicationResult.ok({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        userId: session.user.id,
        tier: session.user.app_metadata?.tier || 'tier1',
      });
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Unexpected error during token refresh',
      );

      return ApplicationResult.fail(
        new ApplicationError(
          'INTERNAL_ERROR',
          'An unexpected error occurred during token refresh',
          'INTERNAL',
        ),
      );
    }
  }

  async signOut(userId: string): Promise<Result<void>> {
    try {
      // Validate user ID format
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        return ApplicationResult.fail(
          new ApplicationError('INVALID_USER_ID', 'User ID is invalid', 'VALIDATION'),
        );
      }

      // Sign out with auth adapter
      await this.authAdapter.signOut(userId);

      // Publish user logged out event
      const logoutEvent = new UserLoggedOut(userId, 1, userId, 'user_initiated');
      await this.eventBus.publish(logoutEvent);

      this.logger.info(
        {
          userId,
        },
        'User signed out successfully',
      );

      return ApplicationResult.ok(undefined);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        },
        'Unexpected error during sign out',
      );

      return ApplicationResult.fail(
        new ApplicationError(
          'INTERNAL_ERROR',
          'An unexpected error occurred during sign out',
          'INTERNAL',
        ),
      );
    }
  }
}
