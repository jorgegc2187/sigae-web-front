export type UserRole = 'Administrador' | 'Encargado' | 'Solo Lectura';
export type UserStatus = 'Activo' | 'Inactivo' | 'Pendiente';
export type ApiUserRole = 'ADMINISTRADOR' | 'ENCARGADO' | 'SOLO_LECTURA';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  locationIds?: string[];
}

export interface AuthUserResponsePayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole | ApiUserRole;
  status?: UserStatus | ApiUserStatus;
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
  user: AuthUserResponsePayload;
}
