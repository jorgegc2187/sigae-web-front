import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import {
  Teacher,
  TeacherApiStatus,
  TeacherRequest,
  TeacherResponse,
  TeacherResponseStatus,
  TeacherUiStatus,
  UpdateTeacherStatusRequest,
} from '../models/teacher.model';

export type TeacherDto = TeacherResponse;

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/teachers`;

  listResource(status?: TeacherApiStatus) {
    return httpResource<TeacherResponse[]>(() => this.buildUrl(status), { defaultValue: [] });
  }

  list(status?: TeacherApiStatus) {
    return this.http.get<TeacherResponse[]>(this.baseUrl, {
      params: this.buildParams(status),
    });
  }

  getById(id: string) {
    return this.http.get<TeacherResponse>(`${this.baseUrl}/${id}`);
  }

  create(payload: TeacherRequest) {
    return this.http.post<TeacherResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: TeacherRequest) {
    return this.http.patch<TeacherResponse>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, payload: UpdateTeacherStatusRequest) {
    return this.http.patch<TeacherResponse>(`${this.baseUrl}/${id}/status`, payload);
  }

  toTeacher(response: TeacherResponse): Teacher {
    return {
      id: response.id,
      name: response.fullName,
      initials: this.buildInitials(response.fullName),
      dni: response.dni,
      specialty: response.specialty?.trim() || 'Sin especialidad registrada',
      email: response.email?.trim() || null,
      phone: response.phone?.trim() || null,
      status: this.toUiStatus(response.status),
    };
  }

  toApiStatus(status: TeacherUiStatus): TeacherApiStatus {
    return status === 'Activo' ? 'ACTIVE' : 'INACTIVE';
  }

  toUiStatus(status: TeacherResponseStatus): TeacherUiStatus {
    return status === 'ACTIVE' || status === 'Activo' ? 'Activo' : 'Inactivo';
  }

  private buildUrl(status?: TeacherApiStatus): string {
    return status ? `${this.baseUrl}?status=${status}` : this.baseUrl;
  }

  private buildParams(status?: TeacherApiStatus): HttpParams | undefined {
    return status ? new HttpParams().set('status', status) : undefined;
  }

  private buildInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
