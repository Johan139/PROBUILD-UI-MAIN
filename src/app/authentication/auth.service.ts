// src/app/authentication/auth.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
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

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        this.loadUserFromToken(token);
      }
    }
  }

  login(credentials: { email: string; password: string;}): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        tap((response: any) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userType', response.userType);
            localStorage.setItem('firstName', response.firstName);
            localStorage.setItem('userId', response.id);
            localStorage.setItem('loggedIn', String(true));
          }
          this.currentUserSubject.next({
            id: response.id,
            userType: response.userType,
            firstName: response.firstName,
          });
        })
      );
  }

  changeUserRole(userType: string): void {
    localStorage.removeItem('userType');
    localStorage.setItem('userType', userType);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userType');
      localStorage.removeItem('firstName');
      localStorage.removeItem('userId');
      localStorage.removeItem('loggedIn');
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // New method to get role
  getUserRole(): string | null {
    return localStorage.getItem('userType') || null;
  }

  private loadUserFromToken(token: string): void {
    try {
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
    }
  }
}
