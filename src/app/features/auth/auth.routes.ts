import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'recover-password',
    loadComponent: () =>
      import('./pages/recover-password/recover-password.component').then(
        (m) => m.RecoverPasswordComponent
      ),
  },
];
