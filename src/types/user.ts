export type OAuthProvider = 'google' | 'github' | 'microsoft';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  authProvider?: string | null;
  createdAt?: string;
}

export interface OAuthLoginPayload {
  provider: OAuthProvider;
  token?: string;
  code?: string;
  profile?: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    providerId?: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  provider?: string;
}
