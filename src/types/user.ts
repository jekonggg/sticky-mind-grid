export type OAuthProvider = 'google' | 'github' | 'microsoft';

export interface OAuthProviderInfo {
  name: string;
  enabled: boolean;
  configured?: boolean;
  clientId?: string | null;
  tenantId?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  authProvider?: string | null;
  emailVerified?: boolean;
  legacyUnverified?: boolean;
  legacyDeadline?: string | null;
  createdAt?: string;
}

export interface OAuthLoginPayload {
  provider: OAuthProvider;
  token?: string;
  code?: string;
  redirectUri?: string;
  profile?: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    providerId?: string;
  };
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
  provider?: string;
}
