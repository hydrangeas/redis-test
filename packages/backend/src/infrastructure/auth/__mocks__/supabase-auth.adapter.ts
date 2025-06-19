import { injectable } from 'tsyringe';

import type { IAuthAdapter, Session, AuthUser, CreateUserData, UpdateUserData } from '../interfaces/auth-adapter.interface';
import type { TokenPayload } from '@/domain/auth/types/token-payload';

@injectable()
export class MockSupabaseAuthAdapter implements IAuthAdapter {
  private mockTokens = new Map<string, TokenPayload>();
  private mockSessions = new Map<string, Session>();
  private signedOutUsers = new Set<string>();
  private mockUsers = new Map<string, AuthUser>();

  verifyToken(token: string): Promise<TokenPayload | null> {
    return Promise.resolve(this.mockTokens.get(token) || null);
  }

  refreshAccessToken(refreshToken: string): Promise<Session | null> {
    return Promise.resolve(this.mockSessions.get(refreshToken) || null);
  }

  signOut(userId: string): Promise<void> {
    this.signedOutUsers.add(userId);
    // Remove all sessions for this user
    for (const [token, session] of this.mockSessions.entries()) {
      if (session.user.id === userId) {
        this.mockSessions.delete(token);
      }
    }
    return Promise.resolve();
  }

  getUserById(id: string): Promise<AuthUser | null> {
    return Promise.resolve(this.mockUsers.get(id) || null);
  }

  getUserByEmail(email: string): Promise<AuthUser | null> {
    for (const user of this.mockUsers.values()) {
      if (user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  createUser(userData: CreateUserData): Promise<AuthUser | null> {
    const user: AuthUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      app_metadata: userData.app_metadata || {},
      user_metadata: userData.user_metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.mockUsers.set(user.id, user);
    return Promise.resolve(user);
  }

  updateUser(id: string, updates: UpdateUserData): Promise<AuthUser | null> {
    const user = this.mockUsers.get(id);
    if (!user) return Promise.resolve(null);

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.mockUsers.set(id, updatedUser);
    return Promise.resolve(updatedUser);
  }

  deleteUser(id: string): Promise<boolean> {
    return Promise.resolve(this.mockUsers.delete(id));
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

  setMockUser(id: string, user: AuthUser): void {
    this.mockUsers.set(id, user);
  }

  reset(): void {
    this.mockTokens.clear();
    this.mockSessions.clear();
    this.signedOutUsers.clear();
    this.mockUsers.clear();
  }
}
