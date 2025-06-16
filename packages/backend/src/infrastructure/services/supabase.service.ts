import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { injectable, singleton } from 'tsyringe';
import { EnvConfig } from '../config/env.config';

@injectable()
@singleton()
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private config: EnvConfig) {
    const supabaseUrl = this.config.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = this.config.PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = this.config.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    // Public client with anon key (for client-side operations)
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Admin client with service role key (for server-side operations)
    if (supabaseServiceKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    } else {
      // Fallback to regular client if no service key (development)
      this.adminClient = this.client;
    }
  }

  /**
   * Get the public Supabase client (with anon key)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Get the admin Supabase client (with service role key)
   * Use this for server-side operations that bypass RLS
   */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string) {
    const { data, error } = await this.adminClient.auth.getUser(token);

    if (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }

    return data.user;
  }

  /**
   * Get user metadata including tier information
   */
  async getUserMetadata(userId: string) {
    const { data, error } = await this.adminClient
      .from('auth.users')
      .select('raw_app_meta_data')
      .eq('id', userId)
      .single();

    if (error) {
      // For new users, return default tier
      return { tier: 'tier1' };
    }

    return data?.raw_app_meta_data || { tier: 'tier1' };
  }

  /**
   * Update user tier
   */
  async updateUserTier(userId: string, tier: string) {
    const { error } = await this.adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { tier },
    });

    if (error) {
      throw new Error(`Failed to update user tier: ${error.message}`);
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(event: { userId: string; eventType: string; metadata?: any }) {
    const { error } = await this.adminClient.from('auth_logs').insert({
      user_id: event.userId,
      event_type: event.eventType,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log auth event:', error);
    }
  }
}
