import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
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
  {
    path: 'mfa/enroll',
    loadComponent: () =>
      import('./pages/mfa-enroll/mfa-enroll.component').then(
        (m) => m.MfaEnrollComponent
      ),
  },
  {
    path: 'mfa/verify',
    loadComponent: () =>
      import('./pages/mfa-verify/mfa-verify.component').then(
        (m) => m.MfaVerifyComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
];
