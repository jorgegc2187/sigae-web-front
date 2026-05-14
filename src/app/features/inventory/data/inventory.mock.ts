import {
  MOCK_ASSET_LOCATIONS,
  MOCK_CATEGORIES,
  MOCK_CATEGORY_FILTERS,
  MOCK_INVENTORY_ASSETS,
} from '../../../shared/models/mock-inventory-catalog.model';
import { InventoryAsset, AssetTraceabilityEntry } from '../models/inventory.model';

export const MOCK_SUPPLIERS = [
  { id: 'supplier-1', name: 'TecnoEdu Perú', ruc: '20604578912', status: 'Activo' as const },
  { id: 'supplier-2', name: 'Mobiliario Escolar SAC', ruc: '20555888991', status: 'Activo' as const },
  { id: 'supplier-3', name: 'LabPro Equipos', ruc: '20447766123', status: 'Activo' as const },
];

export const INVENTORY_ASSETS: InventoryAsset[] = MOCK_INVENTORY_ASSETS.map((asset, index) => {
  const category = MOCK_CATEGORY_FILTERS.find((item) => item.id === asset.categoryId);
  const type = MOCK_CATEGORIES.flatMap((item) => item.types).find((item) => item.id === asset.typeId);
  const supplier = MOCK_SUPPLIERS[index % MOCK_SUPPLIERS.length];

  return {
    id: asset.id,
    code: asset.code,
    name: asset.name,
    categoryId: asset.categoryId,
    categoryName: category?.name ?? 'Inventario',
    typeId: asset.typeId,
    typeName: type?.name ?? asset.groupName,
    icon: asset.groupIcon,
    locationId: asset.locationId,
    locationName: asset.location,
    supplierId: supplier.id,
    supplierName: supplier.name,
    condition: asset.condition,
    serial: asset.serial,
    barcode: `BC-${asset.code}`,
    acquisitionDate: `202${index % 4}-0${(index % 8) + 1}-15`,
    observations: index % 3 === 0 ? 'Activo verificado en inventario físico.' : '',
    attributes: {
      Marca: asset.name.split(' ')[0] ?? 'Genérico',
      Serie: asset.serial,
      Ubicación: MOCK_ASSET_LOCATIONS.find((location) => location.id === asset.locationId)?.name ?? asset.location,
    },
  };
});

export const INVENTORY_TRACEABILITY: Record<string, AssetTraceabilityEntry[]> = Object.fromEntries(
  INVENTORY_ASSETS.map((asset, index) => [
    asset.id,
    [
      {
        id: `${asset.id}-trace-1`,
        date: asset.acquisitionDate,
        type: 'Creación',
        description: `Registro inicial del activo ${asset.code}.`,
        user: 'Administrador SIGAE',
      },
      {
        id: `${asset.id}-trace-2`,
        date: `2025-0${(index % 8) + 1}-20`,
        type: 'Estado',
        description: `Condición actualizada a ${asset.condition}.`,
        user: 'Encargado de inventario',
      },
    ],
  ]),
);
