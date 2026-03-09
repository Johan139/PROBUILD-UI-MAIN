import { isPlatformBrowser } from '@angular/common';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const isApolloProxyRequest = req.url.startsWith('/apollo/');

  if (isApolloProxyRequest) {
    return next(req);
  }

  // Use AuthService as the single source of truth for token retrieval/refresh.
  // On the server we skip attaching auth headers.
  const withAuthHeaders$ = isPlatformBrowser(platformId)
    ? from(authService.getToken()).pipe(
        switchMap((token) => {
          if (!token) return next(req);
          const authedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next(authedReq);
        }),
      )
    : next(req);

  return withAuthHeaders$.pipe(
    catchError((error: any) => {
      const isAuthEndpoint =
        req.url.includes('/login') || req.url.includes('/refresh-token');
      const alreadyRetried = req.headers.get('X-Auth-Retry') === '1';

      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint &&
        !alreadyRetried
      ) {
        return authService.refreshToken().pipe(
          switchMap((tokenResponse: any) => {
            const refreshedTokenRaw = tokenResponse?.token as string | undefined;
            const refreshedToken = refreshedTokenRaw?.startsWith('Bearer ')
              ? refreshedTokenRaw.slice(7).trim()
              : refreshedTokenRaw;

            if (!refreshedToken) {
              authService.logout();
              return throwError(
                () => new Error('Unable to refresh access token.'),
              );
            }

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${refreshedToken}`,
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
};
