import { TokenPayload } from '@/domain/auth/types/token-payload';

export interface IAuthAdapter {
  verifyToken(token: string): Promise<TokenPayload | null>;
  refreshAccessToken(refreshToken: string): Promise<Session | null>;
  signOut(userId: string): Promise<void>;
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