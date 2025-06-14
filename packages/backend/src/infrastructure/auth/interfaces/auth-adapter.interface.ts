import { TokenPayload } from '@/domain/auth/types/token-payload';

export interface IAuthAdapter {
  verifyToken(token: string): Promise<TokenPayload | null>;
  refreshAccessToken(refreshToken: string): Promise<Session | null>;
  signOut(userId: string): Promise<void>;
  
  // User management methods
  getUserById(userId: string): Promise<any | null>;
  getUserByEmail(email: string): Promise<any | null>;
  createUser(userData: {
    id?: string;
    email: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null>;
  updateUser(userId: string, updates: {
    email?: string;
    email_confirmed?: boolean;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<any | null>;
  deleteUser(userId: string): Promise<boolean>;
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