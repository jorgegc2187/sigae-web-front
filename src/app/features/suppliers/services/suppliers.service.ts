import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { Supplier, SupplierRequest, SupplierResponse } from '../models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/suppliers`;

  list() {
    return this.http.get<SupplierResponse[]>(this.baseUrl).pipe(
      map((suppliers) => suppliers.map((supplier) => this.toSupplier(supplier))),
    );
  }

  create(payload: SupplierRequest) {
    return this.http.post<SupplierResponse>(this.baseUrl, payload).pipe(
      map((supplier) => this.toSupplier(supplier)),
    );
  }

  update(id: string, payload: SupplierRequest) {
    return this.http.patch<SupplierResponse>(`${this.baseUrl}/${id}`, payload).pipe(
      map((supplier) => this.toSupplier(supplier)),
    );
  }

  deactivate(id: string) {
    return this.http.patch<SupplierResponse>(`${this.baseUrl}/${id}/deactivate`, {}).pipe(
      map((supplier) => this.toSupplier(supplier)),
    );
  }

  toRequest(supplier: Omit<Supplier, 'id' | 'assetsCount'>): SupplierRequest {
    return {
      name: supplier.name,
      ruc: supplier.ruc || null,
      email: supplier.email || null,
      phone: supplier.phone || null,
      address: supplier.address || null,
      status: supplier.status === 'Activo' ? 'ACTIVE' : 'INACTIVE',
    };
  }

  private toSupplier(response: SupplierResponse): Supplier {
    return {
      id: response.id,
      name: response.name,
      ruc: response.ruc ?? undefined,
      email: response.email ?? undefined,
      phone: response.phone ?? undefined,
      address: response.address ?? undefined,
      status: response.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
      assetsCount: 0,
    };
  }
}
