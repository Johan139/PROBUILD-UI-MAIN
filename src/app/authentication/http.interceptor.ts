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
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const isApolloProxyRequest = req.url.startsWith('/apollo/');
  const isAuthEndpoint =
    req.url.includes('/login') ||
    req.url.includes('/refresh-token') ||
    req.url.includes('/google-login');
  if (isApolloProxyRequest) return next(req);

  const isBrowser = isPlatformBrowser(platformId);
  // IMPORTANT: Never call getToken() for auth endpoints.
  // When the access token is expired, getToken() will attempt a refresh.
  // If this interceptor also intercepts the refresh-token request and calls
  // getToken(), it can deadlock (refresh request waits for token -> token waits
  // for refresh -> refresh request never starts).
  const token$ = isBrowser && !isAuthEndpoint ? from(authService.getToken()) : of(null);

  const shouldAttachProbuildHeaders = (() => {
    // Avoid attaching custom headers (and auth) to third-party absolute URLs.
    // This prevents CORS preflight failures for providers that don't allow
    // X-Correlation-Id.
    const isAbsoluteUrl = /^https?:\/\//i.test(req.url);
    if (!isAbsoluteUrl) return true;
    if (!isBrowser) return true;

    const getHostname = (value: unknown): string | null => {
      if (!value || typeof value !== 'string') return null;
      try {
        return new URL(value, globalThis.location?.origin).hostname.toLowerCase();
      } catch {
        return null;
      }
    };

    const envAllowedHosts = new Set(
      [
        getHostname((environment as any)?.BACKEND_URL),
        getHostname((environment as any)?.SIGNALR_URL),
      ].filter((h): h is string => !!h),
    );

    try {
      const url = new URL(req.url, globalThis.location?.origin);
      const host = url.hostname.toLowerCase();

      // Allow same-origin requests.
      const originHost = globalThis.location?.hostname?.toLowerCase();
      if (originHost && host === originHost) return true;

      // Allow our own domains / local dev.
      if (host.endsWith('probuildai.com')) return true;
      if (host === 'localhost' || host === '127.0.0.1') return true;

      // Allow configured API hosts (e.g. Azure Container Apps backend).
      if (envAllowedHosts.has(host)) return true;

      return false;
    } catch {
      // If URL parsing fails, fall back to prior behavior.
      return true;
    }
  })();

  return token$.pipe(
    switchMap((token) => {
      authService.noteAuthTokenObserved(!!token, 'interceptor:token_resolved', {
        url: req.url,
        isAuthEndpoint,
      });

      const getCorrelationId = (): string => {
        const maybeCrypto = (globalThis as any)?.crypto;
        if (maybeCrypto?.randomUUID) {
          return maybeCrypto.randomUUID();
        }
        return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      };

      const correlationId =
        req.headers.get('X-Correlation-Id') || getCorrelationId();

      const headers: Record<string, string> = {};
      if (shouldAttachProbuildHeaders) {
        headers['X-Correlation-Id'] = correlationId;
        if (token && !isAuthEndpoint) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const authedReq = req.clone({
        setHeaders: headers,
      });

      // Count authenticated first-party API traffic as activity. This prevents
      // "random" idle logouts when the user is actively using the app via
      // interactions that don't trigger window events reliably (or when the
      // browser throttles events/timers in background tabs).
      if (shouldAttachProbuildHeaders && token && !isAuthEndpoint) {
        authService.recordActivity('http');
      }

      return next(authedReq).pipe(
        catchError((error: any) => {
          const hasRetried = authedReq.headers.has('X-Auth-Retry');
          authService.pushAuthTrace('interceptor.response.error', {
            url: req.url,
            status: error instanceof HttpErrorResponse ? error.status : null,
            hasRetried,
            isAuthEndpoint,
          });

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
              authService.pushAuthTrace('interceptor.401.no_refresh_token_logout', {
                url: req.url,
              });
              // Session is already effectively dead; force a clean logout so
              // the app doesn't keep failing requests and "hang" in an
              // authenticated UI state.
              authService.logout('token_invalid');
              return throwError(() => error);
            }

            authService.pushAuthTrace('interceptor.401.refresh_attempt', {
              url: req.url,
            });
            return authService.refreshToken().pipe(
              switchMap((tokenResponse: any) => {
                if (!tokenResponse || !tokenResponse.token) {
                  authService.pushAuthTrace('interceptor.401.refresh_empty_token', {
                    url: req.url,
                  });
                  authService.logout('refresh_invalid');
                  return throwError(
                    () => new Error('Unable to refresh access token.'),
                  );
                }

                authService.noteAuthTokenObserved(true, 'interceptor:retry_with_refreshed_token', {
                  url: req.url,
                });

                const retryReq = authedReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${tokenResponse.token}`,
                    'X-Auth-Retry': '1',
                  },
                });

                return next(retryReq);
              }),
              catchError((refreshErr) => {
                authService.pushAuthTrace('interceptor.401.refresh_failed', {
                  url: req.url,
                  status:
                    refreshErr instanceof HttpErrorResponse
                      ? refreshErr.status
                      : null,
                  name: (refreshErr as any)?.name || null,
                });
                // Let AuthService.refreshToken() decide whether a logout is required
                // (e.g. repeated auth failures). Avoid forcing immediate logout on
                // transient refresh errors during heavy redirect/API bursts.
                return throwError(() => refreshErr);
              }),
            );
          }

          if (error instanceof HttpErrorResponse && error.status === 401 && isAuthEndpoint) {
            authService.pushAuthTrace('interceptor.auth_endpoint_401', {
              url: req.url,
            });
          }

          return throwError(() => error);
        }),
      );
    }),
  );
};
