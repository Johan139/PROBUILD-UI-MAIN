// src/app/authentication/auth.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.BACKEND_URL}/Account`; // Match your backend
  public currentUserSubject = new BehaviorSubject<any>(null); // Store user info
  public currentUser$ = this.currentUserSubject.asObservable();
  public userRole = null;
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor() {
  }

  async initialize(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const userJson = localStorage.getItem('currentUser');
      console.log('Initializing AuthService with user:', userJson);
      if (!userJson) {
        return; // Not logged in, do nothing.
      }

      // If there's a user, parse and update the subject
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        // User data exists but no token, inconsistent state.
        this.logout();
        return;
      }

      try {
        const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
        const expirationDate = new Date(0);
        expirationDate.setUTCSeconds(decodedToken.exp);

        if (expirationDate.valueOf() < new Date().valueOf()) {
          // Token is expired, refresh it.
          try {
            await firstValueFrom(this.refreshToken());
          } catch (error) {
            console.error('Session expired, logging out.', error);
            this.logout(); // Logout if refresh fails
          }
        }
      } catch (error) {
        // Token is malformed or another error occurred
        console.error('Failed to process token, logging out.', error);
        this.logout();
      }
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        tap((response) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userType', response.userType);
            localStorage.setItem('firstName', response.firstName);
            localStorage.setItem('lastName', response.lastName); 
            localStorage.setItem('userId', response.id);
            localStorage.setItem('loggedIn', String(true));
          }
          this.currentUserSubject.next({
            id: response.id,
            userType: response.userType,
            firstName: response.firstName,
            lastName: response.lastName 
          });
            // Extract token and user details from response
            console.log('Login response:', response);
            const { token, refreshToken, userId, firstName, userType } = response;
            console.log('Login successful, token:', token);
            console.log('Login successful, refreshToken:', refreshToken);
            console.log('Login successful, id:', userId);
            console.log('Login successful, firstName:', firstName);
            console.log('Login successful, userType:', userType);

            // Save tokens to localStorage
            localStorage.setItem('accessToken', token);
            localStorage.setItem('refreshToken', refreshToken);

            // Create and save user object
            const user = {
              id: userId,
              firstName,
              userType,
            };
            console.log('User logged in:', user);
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Update the currentUserSubject
            this.currentUserSubject.next(user);
          }
        })
      );
  }

  changeUserRole(userType: string): void {
    localStorage.removeItem('userType');
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
        console.log('Token refreshed successfully:', response);
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        this.refreshTokenSubject.next(response.accessToken);
      })
    );
  }

  async getToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }

    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(decodedToken.exp);

      if (expirationDate.valueOf() < new Date().valueOf() + 5000) { // 5 seconds buffer
        this.refreshToken();
        return localStorage.getItem('accessToken');
      }

      return token;
    } catch (error) {
      return null;
    } finally {
    }
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('accessToken');
    }
    return false;
  }

  // New method to get role
  getUserRole(): string | null {
    return localStorage.getItem('userType') || null;
  }

  private loadUserFromToken(token: string): void {

    if (token === 'fake-dev-token-12345') {
      this.currentUserSubject.next({
        id: localStorage.getItem('userId'),
        userType: localStorage.getItem('userType'),
        firstName: localStorage.getItem('firstName'),
        lastName: localStorage.getItem('lastName')
      });

    if (!token) {

      return;
    }
    try {
      console.log('Decoding token:', token);
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserSubject.next({
        id: payload.UserId || localStorage.getItem('userId'),
        userType: payload.UserType || localStorage.getItem('userType'),
        firstName: payload.FirstName || localStorage.getItem('firstName'),
        lastName: payload.LastName || localStorage.getItem('lastName'),
        companyName: payload.CompanyName || localStorage.getItem('companyName'),
      });
    } catch (error) {
      console.error('Failed to decode token', error);
      this.currentUserSubject.next(null); // Clear user data on error
    } finally {
    }
  }
}
