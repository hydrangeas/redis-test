import { injectable } from 'tsyringe';
import { InjectSupabaseClient, InjectLogger } from '../di/decorators.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';

export interface User {
  id: string;
  email?: string;
  app_metadata?: {
    tier: string;
  };
}

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  updateTier(userId: string, tier: string): Promise<void>;
}

@injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectSupabaseClient() private readonly supabase: SupabaseClient,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async findById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error) {
        this.logger.error({ error, userId }, 'Failed to fetch user');
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email,
        app_metadata: data.user.app_metadata as { tier: string },
      };
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to find user');
      return null;
    }
  }

  async updateTier(userId: string, tier: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        app_metadata: { tier },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error({ error, userId, tier }, 'Failed to update user tier');
      throw error;
    }
  }
}