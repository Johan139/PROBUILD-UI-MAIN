import { isPlatformBrowser } from '@angular/common';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const isApolloProxyRequest = req.url.startsWith('/apollo/');
  if (isApolloProxyRequest) return next(req);

  const isBrowser = isPlatformBrowser(platformId);
  const token$ = isBrowser ? from(authService.getToken()) : of(null);

  return token$.pipe(
    switchMap((token) => {
      const authedReq = token
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          })
        : req;

      return next(authedReq).pipe(
        catchError((error: any) => {
          const isAuthEndpoint =
            authedReq.url.includes('/login') ||
            authedReq.url.includes('/refresh-token');

          const hasRetried = authedReq.headers.has('X-Auth-Retry');

          if (
            error instanceof HttpErrorResponse &&
            error.status === 401 &&
            !isAuthEndpoint &&
            !hasRetried
          ) {
            return authService.refreshToken().pipe(
              switchMap((tokenResponse: any) => {
                if (!tokenResponse || !tokenResponse.token) {
                  authService.logout();
                  return throwError(
                    () => new Error('Unable to refresh access token.'),
                  );
                }

                const retryReq = authedReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${tokenResponse.token}`,
                    'X-Auth-Retry': '1',
                  },
                });

                return next(retryReq);
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
    }),
  );
};
