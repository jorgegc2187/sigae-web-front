export type AssetCondition = 'Bueno' | 'Regular' | 'Malo' | 'Mantenimiento' | 'Dado de baja';
export type ApiAssetCondition = 'BUENO' | 'REGULAR' | 'MALO' | 'MANTENIMIENTO' | 'DADO_DE_BAJA';

export interface InventoryAsset {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  typeId: string;
  typeName: string;
  icon: string;
  locationId: string;
  locationName: string;
  supplierId?: string;
  supplierName?: string;
  condition: AssetCondition;
  serial: string;
  barcode: string;
  acquisitionDate: string;
  observations?: string;
  attributes: Record<string, string>;
}

export interface AssetTraceabilityEntry {
  id: string;
  date: string;
  type: 'Creación' | 'Edición' | 'Estado' | 'Ubicación' | 'Baja';
  description: string;
  user: string;
}

export interface InventoryAssetGroupUnit {
  id: string;
  code: string;
  locationName: string;
  condition: AssetCondition;
  lastInspectionDate: string;
}

export interface InventoryAssetGroup {
  groupId: string;
  displayName: string;
  categoryId: string;
  categoryIcon: string;
  categoryName: string;
  totalUnits: number;
  lastEntryDate: string;
  units: InventoryAssetGroupUnit[];
}

export interface AssetAttributeValueResponse {
  attributeDefinitionId: string;
  attributeName: string;
  value: string;
}

export interface AssetResponse {
  id: string;
  code: string;
  name: string;
  assetTypeId: string;
  assetTypeName: string;
  categoryId: string;
  categoryName: string;
  locationId: string;
  locationName: string;
  supplierId: string | null;
  supplierName: string | null;
  condition: ApiAssetCondition;
  serialNumber: string | null;
  barcode: string | null;
  acquisitionDate: string | null;
  notes: string | null;
  attributeValues: AssetAttributeValueResponse[];
}

export interface AssetRequest {
  code: string;
  name: string;
  assetTypeId: string;
  locationId: string;
  supplierId: string | null;
  condition: ApiAssetCondition;
  serialNumber: string | null;
  barcode: string | null;
  acquisitionDate: string | null;
  notes: string | null;
  attributeValues: Array<{
    attributeDefinitionId: string;
    value: string;
  }>;
}
