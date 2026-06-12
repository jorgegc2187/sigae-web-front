import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventory-list/inventory-list.component').then((m) => m.InventoryListComponent),
    title: 'Inventario',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Inventario maestro y unidades individuales',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/inventory-form/inventory-form.component').then((m) => m.InventoryFormComponent),
    title: 'Nuevo activo',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Registrar nuevo activo',
    },
  },
  {
    path: 'groups/:groupId',
    loadComponent: () =>
      import('./pages/inventory-group-detail/inventory-group-detail.component').then((m) => m.InventoryGroupDetailComponent),
    title: 'Familia de activos',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Unidades agrupadas por familia de activo',
    },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/inventory-detail/inventory-detail.component').then((m) => m.InventoryDetailComponent),
    title: 'Detalle de activo',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Detalle y trazabilidad del activo',
    },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/inventory-form/inventory-form.component').then((m) => m.InventoryFormComponent),
    title: 'Editar activo',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Actualizar activo',
    },
  },
];
