import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'teachers',
        loadChildren: () =>
          import('./features/teachers/teachers.routes').then((m) => m.TEACHERS_ROUTES),
      },
      {
        path: 'loans',
        loadChildren: () =>
          import('./features/loans/loans.routes').then((m) => m.LOANS_ROUTES),
      },
      {
        path: 'locations',
        loadChildren: () =>
          import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'settings',
        children: [
          {
            path: 'users',
            loadChildren: () =>
              import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
          },
          {
            path: 'categories',
            loadChildren: () =>
              import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
          },
          {
            path: 'locations',
            loadChildren: () =>
              import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
          },
        ],
      },

    ]
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
