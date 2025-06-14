import { injectable } from 'tsyringe';
import { InjectAuthenticationService, InjectLogger } from '../../infrastructure/di/decorators.js';
import type { IAuthenticationService } from '../../domain/services/authentication.service.js';
import type { Logger } from 'pino';

export interface AuthenticationRequest {
  token: string;
}

export interface AuthenticationResponse {
  success: boolean;
  userId?: string;
  tier?: string;
  error?: string;
}

@injectable()
export class AuthenticationUseCase {
  constructor(
    @InjectAuthenticationService() private readonly authService: IAuthenticationService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async execute(request: AuthenticationRequest): Promise<AuthenticationResponse> {
    try {
      const { token } = request;

      if (!token) {
        return {
          success: false,
          error: 'Token is required',
        };
      }

      const user = await this.authService.authenticateUser(token);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid or expired token',
        };
      }

      this.logger.info({ userId: user.userId, tier: user.tier }, 'User authenticated');

      return {
        success: true,
        userId: user.userId,
        tier: user.tier,
      };
    } catch (error) {
      this.logger.error({ error }, 'Authentication use case failed');
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }
}