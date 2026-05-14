import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventory-list/inventory-list.component').then((m) => m.InventoryListComponent),
    title: 'Inventario - SIGAE',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Activos, estados y trazabilidad',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/inventory-form/inventory-form.component').then((m) => m.InventoryFormComponent),
    title: 'Nuevo activo - SIGAE',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Registrar nuevo activo',
    },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/inventory-detail/inventory-detail.component').then((m) => m.InventoryDetailComponent),
    title: 'Detalle de activo - SIGAE',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Detalle y trazabilidad del activo',
    },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/inventory-form/inventory-form.component').then((m) => m.InventoryFormComponent),
    title: 'Editar activo - SIGAE',
    data: {
      pageTitle: 'Inventario',
      pageSubtitle: 'Actualizar activo',
    },
  },
];
