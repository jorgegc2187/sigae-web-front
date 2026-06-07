import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { Location, Manager } from '../models/location.model';

export type LocationApiStatus = 'ACTIVE' | 'INACTIVE';
export type LocationUiStatus = 'Activo' | 'Inactivo';
export type LocationDtoStatus = LocationApiStatus | LocationUiStatus;

export interface LocationManagerDto {
  id: string;
  fullName: string;
}

export interface LocationDto {
  id: string;
  name: string;
  description: string;
  status: LocationDtoStatus;
  managers: LocationManagerDto[];
}

export interface LocationRequest {
  name: string;
  description: string;
  status: LocationApiStatus;
  managerIds: string[];
}

export interface UpdateLocationStatusRequest {
  status: LocationApiStatus;
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/locations`;

  listResource(status?: LocationApiStatus) {
    return httpResource<LocationDto[]>(() => this.buildUrl(status), { defaultValue: [] });
  }

  list(status?: LocationApiStatus) {
    return this.http.get<LocationDto[]>(this.baseUrl, {
      params: this.buildParams(status),
    }).pipe(
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

  updateStatus(id: string, payload: UpdateLocationStatusRequest) {
    return this.http.patch<LocationDto>(`${this.baseUrl}/${id}/status`, payload);
  }

  toLocation(response: LocationDto): Location {
    const managers = response.managers.map((manager) => this.toManager(manager));

    return {
      id: response.id,
      name: response.name,
      description: response.description,
      managers: managers.slice(0, 2),
      additionalManagersCount: Math.max(0, managers.length - 2),
      managersText: this.buildManagersText(managers),
      status: this.toUiStatus(response.status),
    };
  }

  toApiStatus(status: LocationUiStatus): LocationApiStatus {
    return status === 'Activo' ? 'ACTIVE' : 'INACTIVE';
  }

  toUiStatus(status: LocationDtoStatus): LocationUiStatus {
    return status === 'ACTIVE' || status === 'Activo' ? 'Activo' : 'Inactivo';
  }

  private buildUrl(status?: LocationApiStatus): string {
    return status ? `${this.baseUrl}?status=${status}` : this.baseUrl;
  }

  private buildParams(status?: LocationApiStatus): HttpParams | undefined {
    return status ? new HttpParams().set('status', status) : undefined;
  }

  private toManager(response: LocationManagerDto): Manager {
    return {
      id: response.id,
      name: response.fullName,
      initials: response.fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
    };
  }

  private buildManagersText(managers: Manager[]): string {
    if (managers.length === 0) {
      return 'Sin encargado asignado';
    }

    if (managers.length === 1) {
      return managers[0].name;
    }

    return `${managers[0].name}, +${managers.length - 1} más`;
  }

}
