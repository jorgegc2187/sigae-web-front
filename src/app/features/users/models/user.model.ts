export type UserRole = 'Administrador' | 'Encargado' | 'Solo Lectura';
export type UserStatus = 'Activo' | 'Inactivo';
export type ApiUserRole = 'ADMINISTRADOR' | 'ENCARGADO' | 'SOLO_LECTURA';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string; // clase de DaisyUI/Tailwind, ej. 'bg-primary'
  role: UserRole;
  locations: string | null; // 'Acceso global' | 'Aula de Cómputo, +1 más' | null
  status: UserStatus;
  lastAccess: string; // texto relativo, ej. 'Hoy', 'Hace 1 día'
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  lastAccessAt: string | null;
  locationIds: string[];
  locationNames: string[];
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password?: string;
  role: ApiUserRole;
  status: ApiUserStatus;
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
