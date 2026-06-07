import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import {
  AssetCondition,
  AssetRequestCondition,
  InventoryAssetGroup,
  AssetRequest,
  AssetResponse,
  AssetTraceabilityEntry,
  InventoryAsset,
} from '../models/inventory.model';

interface AssetTraceabilityResponse {
  id: string;
  eventType: 'CREATED' | 'UPDATED' | 'CONDITION_CHANGED' | 'LOCATION_CHANGED' | 'DECOMMISSIONED' | 'LOANED' | 'RETURNED';
  description: string;
  userName: string;
  occurredAt: string;
}

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

  getGroupById(groupId: string) {
    return this.http.get<InventoryAssetGroup>(`${this.baseUrl}/grouped/${groupId}`);
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

  getManyByIds(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return forkJoin([]);
    }

    return forkJoin(uniqueIds.map((id) => this.getById(id)));
  }

  lookupByScanValue(value: string) {
    return this.http.get<AssetResponse>(`${this.baseUrl}/lookup`, {
      params: { value: value.trim() },
    }).pipe(
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
    return this.http.get<AssetTraceabilityResponse[]>(`${this.baseUrl}/${id}/traceability`).pipe(
      map((entries) => entries.map((entry) => ({
        id: entry.id,
        date: entry.occurredAt,
        type: this.toTraceabilityType(entry.eventType),
        description: entry.description,
        user: entry.userName,
      }))),
    );
  }

  toApiCondition(condition: AssetCondition): AssetRequestCondition {
    const conditions: Record<AssetCondition, AssetRequestCondition> = {
      Bueno: 'BUENO',
      Regular: 'REGULAR',
      Malo: 'MALO',
      Mantenimiento: 'MANTENIMIENTO',
      'Dado de baja': 'DADO_DE_BAJA',
    };
    return conditions[condition];
  }

  private toInventoryAsset(asset: AssetResponse): InventoryAsset {
    const condition = asset.condition;
    const activeLoanId = asset.activeLoanId ?? undefined;
    const availableForLoan =
      asset.availableForLoan ?? ((condition === 'Bueno' || condition === 'Regular') && !activeLoanId);

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
      condition,
      serial: asset.serialNumber,
      barcode: asset.barcode,
      acquisitionDate: asset.acquisitionDate ?? '',
      observations: asset.notes ?? '',
      attributes: Object.fromEntries(
        asset.attributeValues.map((attribute) => [attribute.attributeName, attribute.value]),
      ),
      attributeValues: asset.attributeValues,
      availableForLoan,
      activeLoanId,
    };
  }

  private toTraceabilityType(eventType: AssetTraceabilityResponse['eventType']): AssetTraceabilityEntry['type'] {
    const types: Record<AssetTraceabilityResponse['eventType'], AssetTraceabilityEntry['type']> = {
      CREATED: 'Creación',
      UPDATED: 'Edición',
      CONDITION_CHANGED: 'Estado',
      LOCATION_CHANGED: 'Ubicación',
      DECOMMISSIONED: 'Baja',
      LOANED: 'Préstamo',
      RETURNED: 'Devolución',
    };
    return types[eventType];
  }
}
