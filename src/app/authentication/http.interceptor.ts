// src/app/authentication/http.interceptor.ts
import { isPlatformBrowser } from '@angular/common';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  let token: string | null = null;

  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('accessToken');
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return authService.refreshToken().pipe(
          switchMap((token: any) => {
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token.accessToken}`
              }
            });
            return next(newReq);
          }),
          catchError((err) => {
            authService.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
