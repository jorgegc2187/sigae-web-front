import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { Supplier } from '../models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/suppliers`;

  list() {
    return this.http.get<Supplier[]>(this.baseUrl);
  }

  create(payload: Omit<Supplier, 'id' | 'assetsCount' | 'status'>) {
    return this.http.post<Supplier>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Supplier>) {
    return this.http.patch<Supplier>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: string) {
    return this.http.patch<Supplier>(`${this.baseUrl}/${id}/deactivate`, {});
  }
}
