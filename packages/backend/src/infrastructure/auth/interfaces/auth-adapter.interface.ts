import type { TokenPayload } from '@/domain/auth/types/token-payload';

export interface IAuthAdapter {
  verifyToken(token: string): Promise<TokenPayload | null>;
  refreshAccessToken(refreshToken: string): Promise<Session | null>;
  signOut(userId: string): Promise<void>;
  getUserById(id: string): Promise<AuthUser | null>;
  getUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(userData: CreateUserData): Promise<AuthUser | null>;
  updateUser(id: string, updates: UpdateUserData): Promise<AuthUser | null>;
  deleteUser(id: string): Promise<boolean>;
}

export interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface CreateUserData {
  email: string;
  password?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
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
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  };
}
