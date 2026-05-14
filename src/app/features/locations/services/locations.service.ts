import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';

export interface LocationDto {
  id: string;
  name: string;
  code?: string;
  type?: string;
  responsibleName?: string;
  status?: 'Activo' | 'Inactivo';
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/locations`;

  list() {
    return this.http.get<LocationDto[]>(this.baseUrl);
  }

  getById(id: string) {
    return this.http.get<LocationDto>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<LocationDto>) {
    return this.http.post<LocationDto>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<LocationDto>) {
    return this.http.patch<LocationDto>(`${this.baseUrl}/${id}`, payload);
  }
}
