import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { InventoryAsset, AssetTraceabilityEntry } from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/assets`;

  list() {
    return this.http.get<InventoryAsset[]>(this.baseUrl);
  }

  getById(id: string) {
    return this.http.get<InventoryAsset>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<InventoryAsset>) {
    return this.http.post<InventoryAsset>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<InventoryAsset>) {
    return this.http.patch<InventoryAsset>(`${this.baseUrl}/${id}`, payload);
  }

  traceability(id: string) {
    return this.http.get<AssetTraceabilityEntry[]>(`${this.baseUrl}/${id}/traceability`);
  }
}
