import { injectable } from 'tsyringe';
import { InjectJwtService, InjectUserRepository, InjectLogger } from '../../infrastructure/di/decorators.js';
import type { IJwtService } from '../../infrastructure/services/jwt.service.js';
import type { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import type { Logger } from 'pino';

export interface AuthenticatedUser {
  userId: string;
  tier: string;
}

export interface IAuthenticationService {
  authenticateUser(token: string): Promise<AuthenticatedUser | null>;
  getUserTier(userId: string): Promise<string>;
}

@injectable()
export class AuthenticationService implements IAuthenticationService {
  constructor(
    @InjectJwtService() private readonly jwtService: IJwtService,
    @InjectUserRepository() private readonly userRepository: IUserRepository,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async authenticateUser(token: string): Promise<AuthenticatedUser | null> {
    try {
      // Verify token
      if (!this.jwtService.verify(token)) {
        this.logger.debug('Invalid or expired token');
        return null;
      }

      // Extract user info
      const userId = this.jwtService.extractUserId(token);
      if (!userId) {
        this.logger.error('No user ID in token');
        return null;
      }

      // Get tier from token or user record
      let tier = this.jwtService.extractTier(token);
      if (!tier) {
        const user = await this.userRepository.findById(userId);
        tier = user?.app_metadata?.tier || 'tier1';
      }

      return { userId, tier };
    } catch (error) {
      this.logger.error({ error }, 'Authentication failed');
      return null;
    }
  }

  async getUserTier(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.findById(userId);
      return user?.app_metadata?.tier || 'tier1';
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user tier');
      return 'tier1';
    }
  }
}