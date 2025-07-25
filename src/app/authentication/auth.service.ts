import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { TeamManagementService } from '../services/team-management.service';

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
  private userPermissions: string[] = [];

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor() {}

  public hasPermission(permissionKey: string): boolean {
    const userRole = this.getUserRole();
    if (userRole === 'GENERAL_CONTRACTOR') {
      return true;
    }
    return this.userPermissions.includes(permissionKey);
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      return; // No token, not logged in
    }

    // Use the token as the source of truth to populate the user
    this.loadUserFromToken(token);

    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      const expiration = new Date(0);
      expiration.setUTCSeconds(decodedToken.exp);

      // Check if the token is expired and refresh it if necessary
      if (expiration.valueOf() < Date.now()) {
        console.log('Access token expired, attempting to refresh...');
        try {
          await firstValueFrom(this.refreshToken());
          const newToken = localStorage.getItem('accessToken');
          if (newToken) {
            // Reload user data from the new token
            this.loadUserFromToken(newToken);
          }
        } catch (err) {
          console.error('Session expired. Logging out.', err);
          this.logout();
        }
      }
    } catch (err) {
      console.error('Invalid token found. Logging out.', err);
      this.logout();
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        tap((response) => this.handleSuccessfulLogin(response)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            // If the first login fails with 401, try the member login
            return this.loginMember(credentials);
          }
          // For other errors, show the error
          return throwError(() => this.handleLoginError(error));
        })
      );
  }

  private handleSuccessfulLogin(response: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!response || typeof response !== 'object' || !response.token) {
      console.warn('Invalid response received. Skipping login logic.');
      return;
    }

    const { token, refreshToken } = response;
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('loggedIn', 'true');

    if (response.userId) {
      const { userId, firstName, lastName, userType } = response;
      const user = { id: userId, firstName, lastName, userType };
      localStorage.setItem('userId', userId);
      localStorage.setItem('firstName', firstName);
      localStorage.setItem('lastName', lastName);
      localStorage.setItem('userType', userType);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } else {
      this.fetchTeamMemberDetails(token).subscribe({
        next: (memberDetails) => {
          if (memberDetails && memberDetails.id) {
            this.loadUserPermissions(memberDetails.id);
          }
        },
      });
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
      .post<any>(`${this.apiUrl}/login/member`, credentials, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        tap((response) => this.handleSuccessfulLogin(response)),
        catchError((error: HttpErrorResponse) => {
          return throwError(() => this.handleLoginError(error));
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

  isTeamMember(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.isTeamMember === 'true';
    } catch (e) {
      return false;
    }
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
      console.log('DELETE ME: Decoded token payload:', payload);

      if (payload.isTeamMember === 'true') {
        const teamMemberId = payload.team.split(':')[0];
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
        console.log('DELETE ME: Payload:', payload);
        const user = {
          id: payload.UserId || localStorage.getItem('userId'),
          userType: payload.UserType || localStorage.getItem('userType'),
          firstName: payload.FirstName || localStorage.getItem('firstName'),
          lastName: payload.LastName || localStorage.getItem('lastName'),
          companyName: payload.CompanyName || localStorage.getItem('companyName'),
        };
        this.currentUserSubject.next(user);
      }
    } catch (err) {
      console.error('Failed to decode token', err);
      this.currentUserSubject.next(null);
    }
  }

  fetchTeamMemberDetails(token: string): Observable<any> {
    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      const teamInfo = decodedToken.team;
      if (!teamInfo) {
        return throwError(() => new Error('Not a team member token'));
      }
      const teamMemberId = teamInfo.split(':')[1];

      return this.teamManagementService.getTeamMemberById(teamMemberId).pipe(
        tap(memberDetails => {
          const user = {
            id: memberDetails.id,
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
    } catch (err) {
      console.error('Failed to decode token or fetch team member details', err);
      return throwError(() => new Error('Invalid token'));
    }
  }

  private loadUserPermissions(teamMemberId: string): void {
    this.teamManagementService.getPermissions(teamMemberId).subscribe({
      next: (permissions) => {
        this.userPermissions = permissions;
        console.log('Permissions loaded:', this.userPermissions);
      },
      error: (err) => {
        console.error('Failed to load user permissions', err);
        this.userPermissions = [];
      },
    });
  }
}
