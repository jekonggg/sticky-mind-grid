export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
