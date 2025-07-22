import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.BACKEND_URL}/Account`;

  public currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public userRole: string | null = null;

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor() {}

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return;

    const user = JSON.parse(userJson);
    this.currentUserSubject.next(user);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      this.logout();
      return;
    }

    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      const expiration = new Date(0);
      expiration.setUTCSeconds(decodedToken.exp);

      if (expiration.valueOf() < Date.now()) {
        try {
          await firstValueFrom(this.refreshToken());
        } catch (err) {
          console.error('Session expired. Logging out.', err);
          this.logout();
        }
      }
    } catch (err) {
      console.error('Invalid token. Logging out.', err);
      this.logout();
    }
  }

login(credentials: { email: string; password: string }): Observable<any> {
  return this.http
    .post<any>(`${this.apiUrl}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' },
    })
    .pipe(
      tap((response) => {
        console.log('response:', response);
        if (!isPlatformBrowser(this.platformId)) return;

        // Defensive guard to avoid TypeError
        if (!response || typeof response !== 'object' || !response.token) {
          console.warn('Invalid response received in tap. Skipping login logic.');
          return;
        }

        const { token, refreshToken, userId, firstName, lastName, userType } = response;

        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userId', userId);
        localStorage.setItem('firstName', firstName);
        localStorage.setItem('lastName', lastName);
        localStorage.setItem('userType', userType);
        localStorage.setItem('loggedIn', 'true');

        const user = { id: userId, firstName, lastName, userType };
        localStorage.setItem('currentUser', JSON.stringify(user));

        this.currentUserSubject.next(user);
      }),
      catchError((error: HttpErrorResponse) => {


        let parsed = error.error;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            parsed = {};
          }
        }

        // Log or surface error message
        console.error('Login error:', parsed?.error || error.message || 'Unknown error');

        return throwError(() => error);
      })
    );
}


  changeUserRole(userType: string): void {
    localStorage.setItem('userType', userType);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('userId');
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
  }

  refreshToken(): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.asObservable();
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap((response: any) => {
        this.isRefreshing = false;
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        this.refreshTokenSubject.next(response.accessToken);
      })
    );
  }

  async getToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      const expiration = new Date(0);
      expiration.setUTCSeconds(decodedToken.exp);

      if (expiration.valueOf() < Date.now() + 5000) {
        await firstValueFrom(this.refreshToken());
        return localStorage.getItem('accessToken');
      }

      return token;
    } catch (err) {
      console.error('Token decode failed:', err);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return isPlatformBrowser(this.platformId) && !!localStorage.getItem('accessToken');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userType');
  }

  private loadUserFromToken(token: string): void {
    if (!token) return;

    if (token === 'fake-dev-token-12345') {
      this.currentUserSubject.next({
        id: localStorage.getItem('userId'),
        userType: localStorage.getItem('userType'),
        firstName: localStorage.getItem('firstName'),
        lastName: localStorage.getItem('lastName'),
      });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user = {
        id: payload.UserId || localStorage.getItem('userId'),
        userType: payload.UserType || localStorage.getItem('userType'),
        firstName: payload.FirstName || localStorage.getItem('firstName'),
        lastName: payload.LastName || localStorage.getItem('lastName'),
        companyName: payload.CompanyName || localStorage.getItem('companyName'),
      };
      this.currentUserSubject.next(user);
    } catch (err) {
      console.error('Failed to decode token', err);
      this.currentUserSubject.next(null);
    }
  }
}
