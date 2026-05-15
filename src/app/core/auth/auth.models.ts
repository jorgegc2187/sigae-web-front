export type UserRole = 'Administrador' | 'Encargado' | 'Solo Lectura';
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status?: 'Activo' | 'Inactivo';
  locationIds?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}
