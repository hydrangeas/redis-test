import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { IAuthAdapter, Session } from './interfaces/auth-adapter.interface';
import { TokenPayload } from '@/domain/auth/types/token-payload';
import { getEnvConfig } from '@/infrastructure/config/env.config';
import type { Logger } from 'pino';

@injectable()
export class SupabaseAuthAdapter implements IAuthAdapter {
  private readonly supabaseClient: SupabaseClient;
  private readonly adminClient: SupabaseClient;
  
  constructor(private readonly logger: Logger) {
    const env = getEnvConfig();
    
    // 通常のクライアント（anonキー使用）
    this.supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 管理者クライアント（サービスロールキー使用）
    this.adminClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  /**
   * JWTトークンを検証し、ペイロードを返す
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Supabase Admin APIを使用してトークンを検証
      const { data: user, error } = await this.adminClient.auth.getUser(token);

      if (error || !user) {
        this.logger.warn({
          error: error?.message,
          token: token.substring(0, 10) + '...',
        }, 'Token verification failed');
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
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to verify token');
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
        this.logger.warn({
          error: error?.message,
        }, 'Token refresh failed');
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
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to refresh access token');
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
        this.logger.error({
          error: error.message,
          userId,
        }, 'Failed to sign out user');
        throw new Error(`Sign out failed: ${error.message}`);
      }

      this.logger.info({
        userId,
      }, 'User signed out successfully');
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      }, 'Failed to sign out user');
      throw error;
    }
  }

  /**
   * IDによるユーザー取得
   */
  async getUserById(userId: string): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.getUserById(userId);
      
      if (error || !data) {
        this.logger.debug({ userId, error: error?.message }, 'User not found by ID');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      }, 'Failed to get user by ID');
      return null;
    }
  }

  /**
   * メールアドレスによるユーザー取得
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.listUsers({
        filter: `email.eq.${email}`,
        page: 1,
        perPage: 1,
      });
      
      if (error || !data.users || data.users.length === 0) {
        this.logger.debug({ email, error: error?.message }, 'User not found by email');
        return null;
      }

      return data.users[0];
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      }, 'Failed to get user by email');
      return null;
    }
  }

  /**
   * ユーザー作成
   */
  async createUser(userData: {
    id?: string;
    email: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null> {
    try {
      const { data, error } = await this.adminClient.auth.admin.createUser({
        email: userData.email,
        email_confirm: userData.email_confirmed || false,
        app_metadata: userData.app_metadata || {},
        user_metadata: userData.user_metadata || {},
        id: userData.id,
      });
      
      if (error || !data) {
        this.logger.error({ 
          email: userData.email, 
          error: error?.message 
        }, 'Failed to create user');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email,
      }, 'Failed to create user');
      return null;
    }
  }

  /**
   * ユーザー更新
   */
  async updateUser(userId: string, updates: {
    email?: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null> {
    try {
      const updateData: any = {};
      
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.email_confirmed !== undefined) updateData.email_confirm = updates.email_confirmed;
      if (updates.app_metadata !== undefined) updateData.app_metadata = updates.app_metadata;
      if (updates.user_metadata !== undefined) updateData.user_metadata = updates.user_metadata;

      const { data, error } = await this.adminClient.auth.admin.updateUserById(
        userId,
        updateData
      );
      
      if (error || !data) {
        this.logger.error({ 
          userId, 
          error: error?.message 
        }, 'Failed to update user');
        return null;
      }

      return data.user;
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      }, 'Failed to update user');
      return null;
    }
  }

  /**
   * ユーザー削除
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await this.adminClient.auth.admin.deleteUser(userId);
      
      if (error) {
        this.logger.error({ 
          userId, 
          error: error.message 
        }, 'Failed to delete user');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      }, 'Failed to delete user');
      return false;
    }
  }

  /**
   * Custom Access Token Hookの設定を検証（初期化時に実行）
   */
  async validateCustomClaimsHook(): Promise<boolean> {
    try {
      const env = getEnvConfig();
      
      // テスト環境の場合はスキップ
      if (env.NODE_ENV === 'test' || !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        this.logger.debug('Skipping custom claims validation in test environment');
        return true;
      }

      // テスト用のトークンを作成して、カスタムクレームが含まれているか検証
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
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