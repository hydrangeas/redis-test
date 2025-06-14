import { IAuthAdapter, Session } from '../interfaces/auth-adapter.interface';
import { TokenPayload } from '@/domain/auth/types/token-payload';

export class MockSupabaseAuthAdapter implements IAuthAdapter {
  private mockTokens = new Map<string, TokenPayload>();
  private mockSessions = new Map<string, Session>();
  private signedOutUsers = new Set<string>();
  private users: Map<string, any> = new Map();
  private usersByEmail: Map<string, any> = new Map();

  constructor() {
    // デフォルトのテストユーザーを追加
    const testUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { tier: 'tier1' },
      user_metadata: {},
    };
    this.users.set(testUser.id, testUser);
    this.usersByEmail.set(testUser.email, testUser);
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    return this.mockTokens.get(token) || null;
  }

  async refreshAccessToken(refreshToken: string): Promise<Session | null> {
    return this.mockSessions.get(refreshToken) || null;
  }

  async signOut(userId: string): Promise<void> {
    this.signedOutUsers.add(userId);
    // Remove all sessions for this user
    for (const [token, session] of this.mockSessions.entries()) {
      if (session.user.id === userId) {
        this.mockSessions.delete(token);
      }
    }
  }

  async getUserById(userId: string): Promise<any | null> {
    return this.users.get(userId) || null;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    return this.usersByEmail.get(email) || null;
  }

  async createUser(userData: {
    id?: string;
    email: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null> {
    const user = {
      id: userData.id || `test-user-${Date.now()}`,
      email: userData.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: userData.email_confirmed ? new Date().toISOString() : null,
      app_metadata: userData.app_metadata || {},
      user_metadata: userData.user_metadata || {},
    };
    
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    
    return user;
  }

  async updateUser(userId: string, updates: {
    email?: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    // 古いメールアドレスのマッピングを削除
    if (updates.email && updates.email !== user.email) {
      this.usersByEmail.delete(user.email);
    }
    
    // ユーザー情報を更新
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.email_confirmed !== undefined) {
      user.email_confirmed_at = updates.email_confirmed ? new Date().toISOString() : null;
    }
    if (updates.app_metadata !== undefined) user.app_metadata = updates.app_metadata;
    if (updates.user_metadata !== undefined) user.user_metadata = updates.user_metadata;
    user.updated_at = new Date().toISOString();
    
    // 新しいメールアドレスのマッピングを追加
    if (updates.email) {
      this.usersByEmail.set(user.email, user);
    }
    
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    this.users.delete(userId);
    this.usersByEmail.delete(user.email);
    
    return true;
  }

  // テスト用ヘルパーメソッド
  setMockToken(token: string, payload: TokenPayload): void {
    this.mockTokens.set(token, payload);
  }

  setMockSession(refreshToken: string, session: Session): void {
    this.mockSessions.set(refreshToken, session);
  }

  isUserSignedOut(userId: string): boolean {
    return this.signedOutUsers.has(userId);
  }

  setMockUser(user: any): void {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
  }

  reset(): void {
    this.mockTokens.clear();
    this.mockSessions.clear();
    this.signedOutUsers.clear();
    this.users.clear();
    this.usersByEmail.clear();
    
    // デフォルトのテストユーザーを再追加
    const testUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { tier: 'tier1' },
      user_metadata: {},
    };
    this.users.set(testUser.id, testUser);
    this.usersByEmail.set(testUser.email, testUser);
  }
}