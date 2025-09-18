import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom, catchError, throwError, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { TeamManagementService } from '../services/team-management.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.BACKEND_URL}/Account`;
  private teamManagementService = inject(TeamManagementService);

  public currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public userRole: string | null = null;
  private _userPermissions = new BehaviorSubject<string[]>([]);
  public userPermissions$ = this._userPermissions.asObservable();
  private inactivityTimeout: any;
private readonly INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(private router: Router) {}

  // ---- helpers: safe JWT parsing (Base64URL) ----
  private normalizeToken(token: string): string {
    return token?.startsWith('Bearer ') ? token.slice(7).trim() : token;
  }

  private base64UrlToUtf8(b64url: string): string {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const binary = atob(b64 + pad);
    // UTF-8 safe decode
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    try {
      return new TextDecoder().decode(bytes);
    } catch {
      // Fallback (ASCII)
      return binary;
    }
  }

  private parseJwt<T = any>(token: string | null): T | null {
    if (!token) return null;
    const clean = this.normalizeToken(token);
    // header.payload.signature
    if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(clean)) return null;
    const parts = clean.split('.');
    try {
      const json = this.base64UrlToUtf8(parts[1]);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  private getExp(token: string | null): number | null {
    const payload = this.parseJwt<any>(token);
    return payload?.exp ?? null;
  }
public startInactivityTimer(): void {
  this.clearInactivityTimer();

  if (!isPlatformBrowser(this.platformId)) return;

  this.inactivityTimeout = setTimeout(() => {
    console.warn('Auto-logout due to inactivity.');
    this.logout();
  }, this.INACTIVITY_LIMIT);
}

public clearInactivityTimer(): void {
  if (this.inactivityTimeout) {
    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = null;
  }
}

public resetInactivityTimer(): void {
  this.startInactivityTimer();
}
  public hasPermission(permissionKey: string): Observable<boolean> {
    const userRole = this.getUserRole();
    if (userRole === 'GENERAL_CONTRACTOR') {
      return new BehaviorSubject(true).asObservable();
    }
    return this.userPermissions$.pipe(map((permissions) => permissions.includes(permissionKey)));
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Use the token as the source of truth to populate the user
    this.loadUserFromToken(token);

    const exp = this.getExp(token);
    if (exp == null) {
      console.error('Invalid token found. Logging out.');
      this.logout();
      return;
    }

    const expiration = exp * 1000; // exp is in seconds
    if (expiration < Date.now()) {
      console.log('Access token expired, attempting to refresh...');
      try {
        await firstValueFrom(this.refreshToken());
        const newToken = localStorage.getItem('accessToken');
        if (newToken) this.loadUserFromToken(newToken);
      } catch (err) {
        console.error('Session expired. Logging out.', err);
        this.logout();
      }
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, credentials, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        switchMap((response) => this.handleSuccessfulLogin(response)),
        catchError((error: HttpErrorResponse) => {
          console.log(error.status)
          console.log(error.error)
          if (error.status === 401 && error.error.error === "Email address has not been confirmed.") {
            return throwError(() => this.handleLoginError(error));
          }
          else if(error.status === 401)
          {
            return this.loginMember(credentials);
          }
          return throwError(() => this.handleLoginError(error));
        })
      );
  }

  private handleSuccessfulLogin(response: any): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) return of(response);

    if (!response || typeof response !== 'object' || !response.token) {
      console.warn('Invalid response received. Skipping login logic.');
      return of(response);
    }

    const { token, refreshToken } = response;
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('loggedIn', 'true');

    if (response.userId) {
      const { userId, firstName, lastName, userType } = response;
      const payload = this.parseJwt<any>(token) ?? {};
      const companyName = payload.CompanyName || '';

      const user = { id: userId, firstName, lastName, userType, companyName };

      localStorage.setItem('userId', userId);
      localStorage.setItem('firstName', firstName);
      localStorage.setItem('lastName', lastName);
      localStorage.setItem('userType', userType);
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      this.startInactivityTimer(); 
      return of(response);
    } else {
      return this.fetchTeamMemberDetails(token).pipe(
        tap((memberDetails) => {
          if (memberDetails && memberDetails.id) {
            this.loadUserPermissions(memberDetails.id);
          }
        })
      );
    }
  }

  private handleLoginError(error: HttpErrorResponse): HttpErrorResponse {
    let parsed = error.error;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = {};
      }
    }
    console.error('Login error:', parsed?.error || error.message || 'Unknown error');
    return error;
  }

  loginMember(credentials: { email: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login/member`, credentials, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        switchMap((response) => this.handleSuccessfulLogin(response)),
        catchError((error: HttpErrorResponse) => throwError(() => this.handleLoginError(error)))
      );
  }

  changeUserRole(userType: string): void {
    localStorage.setItem('userType', userType);
  }

  logout(): void {
      this.clearInactivityTimer();
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

      this.router.navigate(['/login']);
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
  console.log('[DEBUG] Refresh token response:', response); // ADD THIS

  if (!response || !response.accessToken || !response.refreshToken) {
    throw new Error('Invalid refresh token response');
  }

  localStorage.setItem('accessToken', response.accessToken);
  localStorage.setItem('refreshToken', response.refreshToken);
  this.refreshTokenSubject.next(response.accessToken);
}),
  catchError((err) => {
    console.error('Token refresh failed:', err);
    this.logout();
    return throwError(() => err);
  })
);
    
  }

  async getToken(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const exp = this.getExp(token);
    if (exp == null) {
      console.error('Token decode failed (invalid format).');
      return null;
    }

    // Refresh if expiring within 5 seconds
    if (exp * 1000 < Date.now() + 5000) {
      try {
        await firstValueFrom(this.refreshToken());
        return localStorage.getItem('accessToken');
      } catch (e) {
        console.error('Refresh failed in getToken()', e);
        return null;
      }
    }

    return this.normalizeToken(token);
  }

  isLoggedIn(): boolean {
    return isPlatformBrowser(this.platformId) && !!localStorage.getItem('accessToken');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userType');
  }

  isTeamMember(): boolean {
    const token = localStorage.getItem('accessToken');
    const payload = this.parseJwt<any>(token);
    return payload?.isTeamMember === 'true';
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

    const payload = this.parseJwt<any>(token);
    if (!payload) {
      console.error('Failed to decode token');
      this.currentUserSubject.next(null);
      return;
    }

    if (payload.isTeamMember === 'true') {
      const teamMemberId = (payload.team || '').split(':')[0];
      if (!teamMemberId) {
        console.warn('Missing team member id in token');
        this.currentUserSubject.next(null);
        return;
      }
      this.teamManagementService.getTeamMemberById(teamMemberId).subscribe({
        next: (teamMember) => {
          const user = {
            id: teamMemberId,
            inviterId: teamMember.inviterId,
            firstName: teamMember.firstName,
            lastName: teamMember.lastName,
            email: teamMember.email,
            userType: teamMember.role,
            isTeamMember: true,
          };
          if (user.inviterId) {
            this.currentUserSubject.next(user);
          } else {
            console.warn('Team member data is incomplete. Waiting for inviterId.');
          }
          this.loadUserPermissions(teamMemberId);
        },
        error: (err) => {
          console.error('Failed to fetch team member details', err);
          this.currentUserSubject.next(null);
        },
      });
    } else {
      const user = {
        id: payload.UserId || localStorage.getItem('userId'),
        userType: payload.UserType || localStorage.getItem('userType'),
        firstName: payload.FirstName || localStorage.getItem('firstName'),
        lastName: payload.LastName || localStorage.getItem('lastName'),
        companyName: payload.CompanyName || localStorage.getItem('companyName'),
      };
      this.currentUserSubject.next(user);
    }
  }

  fetchTeamMemberDetails(token: string): Observable<any> {
    const payload = this.parseJwt<any>(token);
    const teamInfo = payload?.team;
    if (!teamInfo) {
      return throwError(() => new Error('Not a team member token'));
    }
    const teamMemberId = teamInfo.split(':')[0];

    return this.teamManagementService.getTeamMemberById(teamMemberId).pipe(
      tap((memberDetails) => {
        const user = {
          id: memberDetails.id,
          inviterId: memberDetails.inviterId,
          firstName: memberDetails.firstName,
          lastName: memberDetails.lastName,
          role: memberDetails.role,
        };
        localStorage.setItem('userId', user.id);
        localStorage.setItem('firstName', user.firstName);
        localStorage.setItem('lastName', user.lastName);
        localStorage.setItem('userType', user.role);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  private loadUserPermissions(teamMemberId: string): void {
    this.teamManagementService.getPermissions(teamMemberId).subscribe({
      next: (permissions) => {
        this._userPermissions.next(permissions);
        console.log('Permissions loaded:', this._userPermissions.getValue());
      },
      error: (err) => {
        console.error('Failed to load user permissions', err);
        this._userPermissions.next([]);
      },
    });
  }
}
