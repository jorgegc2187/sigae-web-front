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
  UserStatus,
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

  toUser(response: UserResponse): User {
    return {
      id: response.id,
      name: response.fullName,
      email: response.email,
      initials: this.buildInitials(response.fullName),
      avatarColor: this.avatarColor(response.role),
      role: this.toUiRole(response.role),
      locations: response.role === 'ADMINISTRADOR' ? null : 'Pendiente de asignación',
      status: this.toUiStatus(response.status),
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
    return status === 'Activo' ? 'ACTIVE' : 'INACTIVE';
  }

  private toUiRole(role: ApiUserRole): UserRole {
    const roles: Record<ApiUserRole, UserRole> = {
      ADMINISTRADOR: 'Administrador',
      ENCARGADO: 'Encargado',
      SOLO_LECTURA: 'Solo Lectura',
    };
    return roles[role];
  }

  private toUiStatus(status: ApiUserStatus): UserStatus {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  private buildInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private avatarColor(role: ApiUserRole): string {
    if (role === 'ADMINISTRADOR') return 'bg-primary';
    if (role === 'ENCARGADO') return 'bg-secondary';
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
}
