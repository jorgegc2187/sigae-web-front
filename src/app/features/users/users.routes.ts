import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
    title: 'Editar Usuario - SIGAE',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Editar usuario',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
    title: 'Crear Usuario - SIGAE',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Crear nuevo usuario',
    },
  },
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
