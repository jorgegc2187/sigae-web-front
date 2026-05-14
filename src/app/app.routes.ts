import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
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
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
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
            canActivate: [roleGuard],
            data: { roles: ['Administrador'] },
            loadChildren: () =>
              import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
          },
          {
            path: 'categories',
            canActivate: [roleGuard],
            data: { roles: ['Administrador'] },
            loadChildren: () =>
              import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
          },
          {
            path: 'locations',
            loadChildren: () =>
              import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
          },
          {
            path: 'suppliers',
            canActivate: [roleGuard],
            data: { roles: ['Administrador'] },
            loadChildren: () =>
              import('./features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES),
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
