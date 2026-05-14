import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { isPublicAuthRequest } from './auth-request.utils';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const publicAuthRequest = isPublicAuthRequest(request.url);

  if (!token || request.headers.has('Authorization') || publicAuthRequest) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
