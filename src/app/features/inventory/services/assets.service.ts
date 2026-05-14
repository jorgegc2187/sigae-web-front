import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import {
  ApiAssetCondition,
  AssetCondition,
  InventoryAssetGroup,
  AssetRequest,
  AssetResponse,
  AssetTraceabilityEntry,
  InventoryAsset,
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/assets`;

  listGroupedResource(search: () => string, categoryId: () => string) {
    return httpResource<InventoryAssetGroup[]>(() => {
      const params = new URLSearchParams();
      const normalizedSearch = search().trim();
      const normalizedCategoryId = categoryId();

      if (normalizedSearch) {
        params.set('search', normalizedSearch);
      }

      if (normalizedCategoryId && normalizedCategoryId !== 'all') {
        params.set('categoryId', normalizedCategoryId);
      }

      const query = params.toString();
      return query ? `${this.baseUrl}/grouped?${query}` : `${this.baseUrl}/grouped`;
    }, { defaultValue: [] });
  }

  groupedDetailResource(groupId: () => string | undefined) {
    return httpResource<InventoryAssetGroup | null>(() => {
      const normalizedGroupId = groupId()?.trim();
      return normalizedGroupId ? `${this.baseUrl}/grouped/${normalizedGroupId}` : undefined;
    }, { defaultValue: null });
  }

  list() {
    return this.http.get<AssetResponse[]>(this.baseUrl).pipe(
      map((assets) => assets.map((asset) => this.toInventoryAsset(asset))),
    );
  }

  getById(id: string) {
    return this.http.get<AssetResponse>(`${this.baseUrl}/${id}`).pipe(
      map((asset) => this.toInventoryAsset(asset)),
    );
  }

  create(payload: AssetRequest) {
    return this.http.post<AssetResponse>(this.baseUrl, payload).pipe(
      map((asset) => this.toInventoryAsset(asset)),
    );
  }

  update(id: string, payload: AssetRequest) {
    return this.http.patch<AssetResponse>(`${this.baseUrl}/${id}`, payload).pipe(
      map((asset) => this.toInventoryAsset(asset)),
    );
  }

  traceability(id: string) {
    return this.http.get<AssetTraceabilityEntry[]>(`${this.baseUrl}/${id}/traceability`);
  }

  toApiCondition(condition: AssetCondition): ApiAssetCondition {
    const conditions: Record<AssetCondition, ApiAssetCondition> = {
      Bueno: 'BUENO',
      Regular: 'REGULAR',
      Malo: 'MALO',
      Mantenimiento: 'MANTENIMIENTO',
      'Dado de baja': 'DADO_DE_BAJA',
    };
    return conditions[condition];
  }

  private toUiCondition(condition: ApiAssetCondition): AssetCondition {
    const conditions: Record<ApiAssetCondition, AssetCondition> = {
      BUENO: 'Bueno',
      REGULAR: 'Regular',
      MALO: 'Malo',
      MANTENIMIENTO: 'Mantenimiento',
      DADO_DE_BAJA: 'Dado de baja',
    };
    return conditions[condition];
  }

  private toInventoryAsset(asset: AssetResponse): InventoryAsset {
    return {
      id: asset.id,
      code: asset.code,
      name: asset.name,
      categoryId: asset.categoryId,
      categoryName: asset.categoryName,
      typeId: asset.assetTypeId,
      typeName: asset.assetTypeName,
      icon: 'inventory_2',
      locationId: asset.locationId,
      locationName: asset.locationName,
      supplierId: asset.supplierId ?? undefined,
      supplierName: asset.supplierName ?? undefined,
      condition: this.toUiCondition(asset.condition),
      serial: asset.serialNumber ?? 'Sin serie',
      barcode: asset.barcode ?? '',
      acquisitionDate: asset.acquisitionDate ?? '',
      observations: asset.notes ?? '',
      attributes: Object.fromEntries(
        asset.attributeValues.map((attribute) => [attribute.attributeName, attribute.value]),
      ),
    };
  }
}
