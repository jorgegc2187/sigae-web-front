import { Routes } from '@angular/router';

export const LOCATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/location-list/location-list.component').then(
        (m) => m.LocationListComponent
      ),
    title: 'Ubicaciones - SIGAE',
    data: {
      pageTitle: 'Ubicaciones',
      pageSubtitle: 'Gestión de espacios y responsables',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/location-form/location-form.component').then(
        (m) => m.LocationFormComponent
      ),
    title: 'Nueva Ubicación - SIGAE',
    data: {
      pageTitle: 'Ubicaciones',
      pageSubtitle: 'Registrar nueva ubicación',
    },
  },
];
