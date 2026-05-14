import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AUTH_RETRY_ATTEMPTED, isPublicAuthRequest } from './auth-request.utils';

let sessionExpiredMessageShown = false;

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);
  const auth = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized = error.status === 401;
      const publicAuthRequest = isPublicAuthRequest(request.url);
      const alreadyRetried = request.context.get(AUTH_RETRY_ATTEMPTED);

      if (isUnauthorized && !publicAuthRequest && !alreadyRetried) {
        return from(auth.refreshAccessToken()).pipe(
          switchMap((accessToken) => {
            if (accessToken) {
              return next(
                request.clone({
                  context: request.context.set(AUTH_RETRY_ATTEMPTED, true),
                  setHeaders: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }),
              );
            }

            if (!sessionExpiredMessageShown) {
              sessionExpiredMessageShown = true;
              notifications.info({ message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
              queueMicrotask(() => {
                sessionExpiredMessageShown = false;
              });
            }

            void auth.handleSessionExpired();
            return throwError(() => error);
          }),
        );
      }

      if (error.status >= 500) {
        notifications.error({ message: 'Ocurrió un problema en el servidor. Intente nuevamente.' });
      } else if (error.status === 0) {
        notifications.error({ message: 'No se pudo conectar con la API.' });
      }

      return throwError(() => error);
    }),
  );
};
