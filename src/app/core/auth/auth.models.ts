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
  mfaRequired?: boolean;
  mfaEnabled?: boolean;
  mfaEnabledAt?: string | null;
}

export interface AuthUserResponsePayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole | ApiUserRole;
  status?: UserStatus | ApiUserStatus;
  locationIds?: string[];
  mfaRequired?: boolean;
  mfaEnabled?: boolean;
  mfaEnabledAt?: string | null;
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
  type?: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUserResponsePayload;
}

export interface MfaChallengeResponse {
  type: 'MFA_ENROLL_REQUIRED' | 'MFA_CHALLENGE_REQUIRED';
  challengeToken: string;
  expiresIn: number;
}

export type LoginResponse = AuthResponse | MfaChallengeResponse;

export interface MfaChallengeSession {
  type: MfaChallengeResponse['type'];
  challengeToken: string;
  expiresAt: number;
}

export interface MfaEnrollStartResponse {
  otpauthUri: string;
  manualKey: string;
  expiresIn: number;
}

export interface AuthPublicErrorPayload {
  message: string | null;
  code: string | null;
  retryAfterSeconds: number | null;
}
