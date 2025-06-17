import type { TokenPayload } from '@/domain/auth/types/token-payload';

export interface IAuthAdapter {
  verifyToken(token: string): Promise<TokenPayload | null>;
  refreshAccessToken(refreshToken: string): Promise<Session | null>;
  signOut(userId: string): Promise<void>;
  getUserById(id: string): Promise<any | null>;
  getUserByEmail(email: string): Promise<any | null>;
  createUser(userData: any): Promise<any | null>;
  updateUser(id: string, updates: any): Promise<any | null>;
  deleteUser(id: string): Promise<boolean>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    app_metadata: Record<string, any>;
    user_metadata: Record<string, any>;
  };
}
