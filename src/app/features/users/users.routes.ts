import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/user-list/user-list.component').then((m) => m.UserListComponent),
    title: 'Usuarios - SIGAE',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Gestión de accesos y roles',
    },
  },
];
