import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';

export interface TeacherDto {
  id: string;
  fullName: string;
  documentNumber?: string;
  email?: string;
  status?: 'Activo' | 'Inactivo';
}

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/teachers`;

  list() {
    return this.http.get<TeacherDto[]>(this.baseUrl);
  }

  create(payload: Partial<TeacherDto>) {
    return this.http.post<TeacherDto>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<TeacherDto>) {
    return this.http.patch<TeacherDto>(`${this.baseUrl}/${id}`, payload);
  }
}
