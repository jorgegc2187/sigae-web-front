import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const guestOnlyGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.sessionStatus() === 'unknown') {
    await auth.initializeSession();
  }

  if (state.url.split('?')[0] === '/auth/reset-password') {
    if (auth.hasActiveSession()) {
      await auth.logout(false);
    }

    return true;
  }

  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
