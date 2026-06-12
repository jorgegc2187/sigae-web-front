import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    title: 'Iniciar sesión',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'recover-password',
    title: 'Recuperar contraseña',
    loadComponent: () =>
      import('./pages/recover-password/recover-password.component').then(
        (m) => m.RecoverPasswordComponent
      ),
  },
  {
    path: 'mfa/enroll',
    title: 'Activar 2FA',
    loadComponent: () =>
      import('./pages/mfa-enroll/mfa-enroll.component').then(
        (m) => m.MfaEnrollComponent
      ),
  },
  {
    path: 'mfa/verify',
    title: 'Verificación 2FA',
    loadComponent: () =>
      import('./pages/mfa-verify/mfa-verify.component').then(
        (m) => m.MfaVerifyComponent
      ),
  },
  {
    path: 'reset-password',
    title: 'Restablecer contraseña',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
];
