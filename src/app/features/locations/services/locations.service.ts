import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { Location } from '../models/location.model';

export interface LocationDto {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface LocationRequest {
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/locations`;

  listResource() {
    return httpResource<LocationDto[]>(() => this.baseUrl, { defaultValue: [] });
  }

  list() {
    return this.http.get<LocationDto[]>(this.baseUrl).pipe(
      map((locations) => locations.map((location) => this.toLocation(location))),
    );
  }

  getById(id: string) {
    return this.http.get<LocationDto>(`${this.baseUrl}/${id}`);
  }

  create(payload: LocationRequest) {
    return this.http.post<LocationDto>(this.baseUrl, payload);
  }

  update(id: string, payload: LocationRequest) {
    return this.http.patch<LocationDto>(`${this.baseUrl}/${id}`, payload);
  }

  toLocation(response: LocationDto): Location {
    return {
      id: response.id,
      name: response.name,
      description: response.description,
      managers: [],
      managersText: 'Sin encargado asignado',
      status: response.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
    };
  }
}
