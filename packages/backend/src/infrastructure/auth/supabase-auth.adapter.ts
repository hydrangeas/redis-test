import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { IAuthAdapter, Session } from './interfaces/auth-adapter.interface';
import { TokenPayload } from '@/domain/auth/types/token-payload';
import { getEnvConfig } from '@/infrastructure/config/env.config';
import { Logger } from 'pino';

@injectable()
export class SupabaseAuthAdapter implements IAuthAdapter {
  private readonly supabaseClient: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  constructor(private readonly logger: Logger) {
    const env = getEnvConfig();

    // 通常のクライアント（anonキー使用）
    this.supabaseClient = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 管理者クライアント（サービスロールキー使用）
    this.adminClient = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * JWTトークンを検証し、ペイロードを返す
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Supabase Admin APIを使用してトークンを検証
      const { data: user, error } = await this.adminClient.auth.getUser(token);

      if (error || !user) {
        this.logger.warn(
          {
            error: error?.message,
            token: token.substring(0, 10) + '...',
          },
          'Token verification failed',
        );
        return null;
      }

      // トークンをデコードしてペイロードを取得
      const decoded = jwtDecode<TokenPayload>(token);

      // Supabaseのユーザー情報とマージ
      return {
        ...decoded,
        sub: user.user.id,
        email: user.user.email,
        app_metadata: user.user.app_metadata || {},
        user_metadata: user.user.user_metadata || {},
      };
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to verify token',
      );
      return null;
    }
  }

  /**
   * リフレッシュトークンを使用して新しいアクセストークンを取得
   */
  async refreshAccessToken(refreshToken: string): Promise<Session | null> {
    try {
      const { data, error } = await this.supabaseClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        this.logger.warn(
          {
            error: error?.message,
          },
          'Token refresh failed',
        );
        return null;
      }

      // Sessionオブジェクトに変換
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at || 0,
        token_type: 'bearer',
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          app_metadata: data.session.user.app_metadata || {},
          user_metadata: data.session.user.user_metadata || {},
        },
      };
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to refresh access token',
      );
      return null;
    }
  }

  /**
   * ユーザーをサインアウトする
   */
  async signOut(userId: string): Promise<void> {
    try {
      // Admin APIを使用してユーザーのすべてのセッションを無効化
      const { error } = await this.adminClient.auth.admin.signOut(userId);

      if (error) {
        this.logger.error(
          {
            error: error.message,
            userId,
          },
          'Failed to sign out user',
        );
        throw new Error(`Sign out failed: ${error.message}`);
      }

      this.logger.info(
        {
          userId,
        },
        'User signed out successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
        },
        'Failed to sign out user',
      );
      throw error;
    }
  }

  /**
   * IDでユーザーを取得
   */
  async getUserById(id: string): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.getUserById(id);

      if (error || !data.user) {
        this.logger.debug({ userId: id }, 'User not found');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: id,
        },
        'Failed to get user by ID',
      );
      return null;
    }
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.listUsers();

      if (error) {
        this.logger.error({ error: error.message }, 'Failed to list users');
        return null;
      }

      const user = data.users.find((u) => u.email === email);
      return user || null;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email,
        },
        'Failed to get user by email',
      );
      return null;
    }
  }

  /**
   * ユーザーを作成
   */
  async createUser(userData: any): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.createUser({
        email: userData.email,
        email_confirm: userData.email_confirmed,
        app_metadata: userData.app_metadata,
        user_metadata: userData.user_metadata,
      });

      if (error || !data.user) {
        this.logger.error({ error: error?.message }, 'Failed to create user');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to create user',
      );
      return null;
    }
  }

  /**
   * ユーザー情報を更新
   */
  async updateUser(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.updateUserById(id, {
        email: updates.email,
        email_confirm: updates.email_confirmed,
        app_metadata: updates.app_metadata,
        user_metadata: updates.user_metadata,
      });

      if (error || !data.user) {
        this.logger.error({ error: error?.message }, 'Failed to update user');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: id,
        },
        'Failed to update user',
      );
      return null;
    }
  }

  /**
   * ユーザーを削除
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await this.adminClient.auth.admin.deleteUser(id);

      if (error) {
        this.logger.error({ error: error.message }, 'Failed to delete user');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: id,
        },
        'Failed to delete user',
      );
      return false;
    }
  }

  /**
   * Custom Access Token Hookの設定を検証（初期化時に実行）
   */
  async validateCustomClaimsHook(): Promise<boolean> {
    try {
      // テスト用のトークンを作成して、カスタムクレームが含まれているか検証
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword',
      });

      if (data?.session) {
        const decoded = jwtDecode<any>(data.session.access_token);
        const hasTierClaim = decoded.app_metadata?.tier !== undefined;

        // クリーンアップ
        await this.supabaseClient.auth.signOut();

        return hasTierClaim;
      }

      return false;
    } catch (error) {
      this.logger.warn('Could not validate custom claims hook');
      return false;
    }
  }
}
