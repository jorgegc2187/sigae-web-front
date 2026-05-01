import { Routes } from '@angular/router';

export const TEACHERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/teacher-list/teacher-list.component').then(
        (m) => m.TeacherListComponent
      ),
  },
];
