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
            // Prevent refresh attempts after logout.
            // When inactivity/logout fires, in-flight requests can still return 401.
            // Without this guard the interceptor keeps trying refresh, which can
            // leave the app in a half-logged-out / hung state.
            const hasRefreshToken =
              isBrowser && !!localStorage.getItem('refreshToken');
            if (!authService.isLoggedIn() || !hasRefreshToken) {
              // Session is already effectively dead; force a clean logout so
              // the app doesn't keep failing requests and "hang" in an
              // authenticated UI state.
              authService.logout('token_invalid');
              return throwError(() => error);
            }

            return authService.refreshToken().pipe(
              switchMap((tokenResponse: any) => {
                if (!tokenResponse || !tokenResponse.token) {
                  authService.logout('refresh_invalid');
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
                // Avoid infinite 401 → refresh → fail loops with a dead session.
                authService.logout('refresh_invalid');
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
