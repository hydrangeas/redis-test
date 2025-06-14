import { injectable } from 'tsyringe';
import { jwtDecode } from 'jwt-decode';
import { InjectLogger } from '../di/decorators.js';
import type { Logger } from 'pino';

export interface IJwtService {
  decode<T = any>(token: string): T | null;
  verify(token: string): boolean;
  extractUserId(token: string): string | null;
  extractTier(token: string): string | null;
}

interface JwtPayload {
  sub?: string;
  user_id?: string;
  app_metadata?: {
    tier?: string;
  };
  exp?: number;
}

@injectable()
export class JwtService implements IJwtService {
  constructor(@InjectLogger() private readonly logger: Logger) {}

  decode<T = any>(token: string): T | null {
    try {
      return jwtDecode<T>(token);
    } catch (error) {
      this.logger.error({ error }, 'Failed to decode JWT');
      return null;
    }
  }

  verify(token: string): boolean {
    try {
      const decoded = this.decode<JwtPayload>(token);
      if (!decoded) return false;

      // Check expiration
      if (decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
          this.logger.debug('JWT token expired');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error({ error }, 'Failed to verify JWT');
      return false;
    }
  }

  extractUserId(token: string): string | null {
    const decoded = this.decode<JwtPayload>(token);
    return decoded?.sub || decoded?.user_id || null;
  }

  extractTier(token: string): string | null {
    const decoded = this.decode<JwtPayload>(token);
    return decoded?.app_metadata?.tier || 'tier1';
  }
}