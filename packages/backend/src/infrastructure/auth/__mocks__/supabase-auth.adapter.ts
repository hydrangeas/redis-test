import { IAuthAdapter, Session } from '../interfaces/auth-adapter.interface';
import { TokenPayload } from '@/domain/auth/types/token-payload';

export class MockSupabaseAuthAdapter implements IAuthAdapter {
  private mockTokens = new Map<string, TokenPayload>();
  private mockSessions = new Map<string, Session>();
  private signedOutUsers = new Set<string>();
  private mockUsers = new Map<string, any>();

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

  async getUserById(id: string): Promise<any | null> {
    return this.mockUsers.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    for (const user of this.mockUsers.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: any): Promise<any | null> {
    const user = {
      id: userData.id,
      email: userData.email,
      email_confirmed_at: userData.email_confirmed ? new Date().toISOString() : null,
      app_metadata: userData.app_metadata || {},
      user_metadata: userData.user_metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.mockUsers.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: any): Promise<any | null> {
    const user = this.mockUsers.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.mockUsers.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.mockUsers.delete(id);
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

  setMockUser(id: string, user: any): void {
    this.mockUsers.set(id, user);
  }

  reset(): void {
    this.mockTokens.clear();
    this.mockSessions.clear();
    this.signedOutUsers.clear();
    this.mockUsers.clear();
  }
}