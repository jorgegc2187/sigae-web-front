import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

export const TEACHERS_ROUTES: Routes = [
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: {
      roles: ['Administrador'],
      pageTitle: 'Docentes',
      pageSubtitle: 'Editar docente',
    },
    loadComponent: () =>
      import('./pages/teacher-form/teacher-form.component').then(
        (m) => m.TeacherFormComponent,
      ),
    title: 'Editar Docente',
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: {
      roles: ['Administrador'],
      pageTitle: 'Docentes',
      pageSubtitle: 'Registrar docente',
    },
    loadComponent: () =>
      import('./pages/teacher-form/teacher-form.component').then(
        (m) => m.TeacherFormComponent,
      ),
    title: 'Nuevo Docente',
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/teacher-list/teacher-list.component').then(
        (m) => m.TeacherListComponent
      ),
    title: 'Docentes',
    data: {
      pageTitle: 'Docentes',
      pageSubtitle: 'Gestión del personal docente',
    },
  },
];
