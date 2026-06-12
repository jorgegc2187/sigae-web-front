import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
    title: 'Editar Usuario',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Editar usuario',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
    title: 'Crear Usuario',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Crear nuevo usuario',
    },
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/user-list/user-list.component').then((m) => m.UserListComponent),
    title: 'Usuarios',
    data: {
      pageTitle: 'Usuarios',
      pageSubtitle: 'Gestión de accesos y roles',
    },
  },
];
