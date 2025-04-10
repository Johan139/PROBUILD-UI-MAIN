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
  private apiUrl = `${environment.apiUrl}/api/Account`; // Match your backend
  public currentUserSubject = new BehaviorSubject<any>(null); // Store user info
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        this.loadUserFromToken(token);
      }
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
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

  private loadUserFromToken(token: string): void {
    // Assuming your JWT payload contains user info; use a library like jwt-decode for production
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.currentUserSubject.next({
      id: payload.id || localStorage.getItem('userId'),
      userType: payload.userType || localStorage.getItem('userType'),
      firstName: payload.firstName || localStorage.getItem('firstName'),
    });
  }
}