import { MockAssetCondition } from '../../../shared/models/mock-inventory-catalog.model';

export type AssetCondition = MockAssetCondition;

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
