import { IAuthAdapter, Session } from '../interfaces/auth-adapter.interface';
import { TokenPayload } from '@/domain/auth/types/token-payload';

export class MockSupabaseAuthAdapter implements IAuthAdapter {
  private mockTokens = new Map<string, TokenPayload>();
  private mockSessions = new Map<string, Session>();
  private signedOutUsers = new Set<string>();

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

  reset(): void {
    this.mockTokens.clear();
    this.mockSessions.clear();
    this.signedOutUsers.clear();
  }
}