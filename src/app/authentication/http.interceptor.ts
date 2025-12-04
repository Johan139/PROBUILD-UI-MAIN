import { isPlatformBrowser } from '@angular/common';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  let token: string | null = null;

  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('accessToken');
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: any) => {
      const isAuthEndpoint =
        req.url.includes('/login') || req.url.includes('/refresh-token');

      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint
      ) {
        return authService.refreshToken().pipe(
          switchMap((tokenResponse: any) => {
            if (!tokenResponse || !tokenResponse.token) {
              authService.logout();
              return throwError(
                () => new Error('Unable to refresh access token.'),
              );
            }

            req = req.clone({
              setHeaders: {
                Authorization: `Bearer ${tokenResponse.token}`,
              },
            });
            return next(req);
          }),
          catchError((refreshErr) => {
            authService.logout();
            return throwError(() => refreshErr);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
