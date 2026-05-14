import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.sessionStatus() === 'unknown') {
    await auth.initializeSession();
  }

  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};
