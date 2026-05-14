import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/supplier-list/supplier-list.component').then((m) => m.SupplierListComponent),
    title: 'Proveedores - SIGAE',
    data: {
      pageTitle: 'Proveedores',
      pageSubtitle: 'Gestión de proveedores del inventario',
    },
  },
];
