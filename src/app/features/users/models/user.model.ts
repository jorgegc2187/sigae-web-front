export type UserRole = 'Administrador' | 'Encargado' | 'Solo Lectura';
export type UserStatus = 'Activo' | 'Inactivo' | 'Pendiente';
export type InvitationStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type ApiUserRole = 'ADMINISTRADOR' | 'ENCARGADO' | 'SOLO_LECTURA';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type UserRoleResponse = UserRole | ApiUserRole;
export type UserStatusResponse = UserStatus | ApiUserStatus;

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string; // clase de DaisyUI/Tailwind, ej. 'bg-primary'
  role: UserRole;
  locations: string | null; // 'Acceso global' | 'Aula de Cómputo, +1 más' | null
  status: UserStatus;
  invitationStatus: InvitationStatus | null;
  invitationExpiresAt: string | null;
  lastAccess: string; // texto relativo, ej. 'Hoy', 'Hace 1 día'
  mfaRequired: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  mfaLabel: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRoleResponse;
  status: UserStatusResponse;
  lastAccessAt: string | null;
  locationIds: string[];
  locationNames: string[];
  invitationStatus: InvitationStatus | null;
  invitationExpiresAt: string | null;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password?: string;
  role: ApiUserRole;
  locationIds?: string[];
  sendInvitation: boolean;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: ApiUserRole;
  locationIds?: string[];
}

export interface UpdateUserStatusRequest {
  status: ApiUserStatus;
}

export interface UpdateUserMfaPolicyRequest {
  mfaRequired: boolean;
}
