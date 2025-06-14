import { injectable } from 'tsyringe';
import { InjectSupabaseClient, InjectLogger } from '../di/decorators.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from 'pino';

export interface RateLimitRecord {
  user_id: string;
  endpoint: string;
  request_count: number;
  window_start: Date;
  window_end: Date;
}

export interface IRateLimitRepository {
  getRequestCount(userId: string, endpoint: string, windowStart: Date): Promise<number>;
  incrementRequestCount(userId: string, endpoint: string, windowStart: Date, windowEnd: Date): Promise<void>;
  cleanupOldRecords(before: Date): Promise<void>;
}

@injectable()
export class RateLimitRepository implements IRateLimitRepository {
  private readonly tableName = 'rate_limits';

  constructor(
    @InjectSupabaseClient() private readonly supabase: SupabaseClient,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async getRequestCount(userId: string, endpoint: string, windowStart: Date): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('request_count')
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned
        throw error;
      }

      return data?.request_count || 0;
    } catch (error) {
      this.logger.error({ error, userId, endpoint }, 'Failed to get request count');
      return 0;
    }
  }

  async incrementRequestCount(
    userId: string,
    endpoint: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from(this.tableName).upsert(
        {
          user_id: userId,
          endpoint,
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          request_count: 1,
        },
        {
          onConflict: 'user_id,endpoint,window_start',
          count: 'exact',
        },
      );

      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error({ error, userId, endpoint }, 'Failed to increment request count');
      throw error;
    }
  }

  async cleanupOldRecords(before: Date): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .lt('window_end', before.toISOString());

      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error({ error, before }, 'Failed to cleanup old records');
      throw error;
    }
  }
}