import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status >= 500) {
        notifications.error({ message: 'Ocurrió un problema en el servidor. Intente nuevamente.' });
      } else if (error.status === 0) {
        notifications.error({ message: 'No se pudo conectar con la API.' });
      }

      return throwError(() => error);
    }),
  );
};
