import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import {
  ApiUserRole,
  ApiUserStatus,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  User,
  UserResponse,
  UserRole,
  UserRoleResponse,
  UserStatus,
  UserStatusResponse,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/users`;

  listResource() {
    return httpResource<UserResponse[]>(() => this.baseUrl, { defaultValue: [] });
  }

  create(payload: CreateUserRequest) {
    return this.http.post<UserResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateUserRequest) {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: ApiUserStatus) {
    const payload: UpdateUserStatusRequest = { status };
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/status`, payload);
  }

  cancelInvitation(id: string) {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/invitation/cancel`, {});
  }

  resendInvitation(id: string) {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/invitation/resend`, {});
  }

  toUser(response: UserResponse): User {
    const role = this.toUiRole(response.role);

    return {
      id: response.id,
      name: response.fullName,
      email: response.email,
      initials: this.buildInitials(response.fullName),
      avatarColor: this.avatarColor(role),
      role,
      locations:
        role === 'Administrador' ? null : this.summarizeLocations(response.locationNames),
      status: this.toUiStatus(response.status),
      invitationStatus: response.invitationStatus,
      invitationExpiresAt: response.invitationExpiresAt,
      lastAccess: this.formatLastAccess(response.lastAccessAt),
    };
  }

  toApiRole(role: UserRole): ApiUserRole {
    const roles: Record<UserRole, ApiUserRole> = {
      Administrador: 'ADMINISTRADOR',
      Encargado: 'ENCARGADO',
      'Solo Lectura': 'SOLO_LECTURA',
    };
    return roles[role];
  }

  toApiStatus(status: UserStatus): ApiUserStatus {
    if (status === 'Activo') {
      return 'ACTIVE';
    }

    if (status === 'Pendiente') {
      return 'PENDING';
    }

    return 'INACTIVE';
  }

  private toUiRole(role: UserRoleResponse): UserRole {
    if (role === 'ADMINISTRADOR' || role === 'Administrador') {
      return 'Administrador';
    }

    if (role === 'ENCARGADO' || role === 'Encargado') {
      return 'Encargado';
    }

    return 'Solo Lectura';
  }

  private toUiStatus(status: UserStatusResponse): UserStatus {
    if (status === 'ACTIVE' || status === 'Activo') {
      return 'Activo';
    }

    if (status === 'PENDING' || status === 'Pendiente') {
      return 'Pendiente';
    }

    return 'Inactivo';
  }

  private buildInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private avatarColor(role: UserRole): string {
    if (role === 'Administrador') return 'bg-primary';
    if (role === 'Encargado') return 'bg-secondary';
    return 'bg-neutral';
  }

  private formatLastAccess(value: string | null): string {
    if (!value) {
      return 'Nunca';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private summarizeLocations(locationNames: string[]): string {
    if (locationNames.length === 0) {
      return 'Sin ubicaciones asignadas';
    }

    if (locationNames.length === 1) {
      return locationNames[0];
    }

    return `${locationNames[0]}, +${locationNames.length - 1} más`;
  }
}
