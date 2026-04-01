import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  tap,
  firstValueFrom,
  catchError,
  throwError,
  map,
  of,
  switchMap,
  filter,
  take,
  finalize,
  timeout,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { TeamManagementService } from '../services/team-management.service';
import { Router } from '@angular/router';
import { UserAddressStoreService } from '../services/UserAddressStoreService';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly LOGOUT_REASON_KEY = 'pb_logout_reason';
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
  private inactivityPauseSources = new Set<string>();
  /** Used when refresh runs during normal app use (e.g. getToken / interceptor). */
  private readonly refreshTimeoutMs =
    environment.refreshTokenRequestTimeoutMs ?? 10_000;
  private lastGetTokenRefreshFailureLogAt = 0;
  private readonly REFRESH_RETRY_COOLDOWN_MS = 30000;
  private readonly REFRESH_FAILURE_WINDOW_MS = 60000;
  private readonly MAX_CONSECUTIVE_REFRESH_AUTH_FAILURES = 3;
  private isRefreshing = false;
  private refreshRetryCooldownUntil = 0;
  private refreshAuthFailureCount = 0;
  private refreshAuthFailureWindowStartedAt = 0;
  private refreshTokenSubject = new BehaviorSubject<
    | { token: string; refreshToken: string }
    | { failed: true; error: unknown }
    | null
  >(null);

  constructor(
    private router: Router,
    private addressStore: UserAddressStoreService,
  ) {}

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
    if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(clean))
      return null;
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

  private async refreshWithTimeout(
    timeoutMs: number = this.refreshTimeoutMs,
  ): Promise<void> {
    await Promise.race([
      firstValueFrom(this.refreshToken()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Refresh token timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Runs after bootstrap when the access token is already expired.
   * Must not block APP_INITIALIZER — otherwise the whole shell (including /login) waits on refresh timeouts.
   */
  private async performColdStartRefresh(): Promise<void> {
    try {
      await this.refreshWithTimeout();
      const newToken = localStorage.getItem('accessToken');
      if (newToken) this.loadUserFromToken(newToken);
    } catch (err) {
      const isTimeout =
        err instanceof Error &&
        String(err.message).includes('Refresh token timeout');

      if (isTimeout) {
        try {
          await this.refreshWithTimeout();
          const newToken = localStorage.getItem('accessToken');
          if (newToken) {
            this.loadUserFromToken(newToken);
            return;
          }
        } catch (retryErr) {
          // Startup timeout/retry timeout should not force logout.
          // Keep session state and let normal request flow attempt refresh again.
          console.warn(
            'Cold-start refresh retry timed out; keeping session and continuing startup.',
            retryErr,
          );
          return;
        }
      }

      if (!this.shouldForceLogoutOnRefreshFailure(err)) {
        console.warn(
          'Token refresh failed during cold start due to transient error; preserving session.',
          err,
        );
        return;
      }

      console.error('Session expired. Logging out.', err);
      this.logoutWithReason('refresh_invalid');
    }
  }

  private shouldForceLogoutOnRefreshFailure(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    return error.status === 400 || error.status === 401 || error.status === 403;
  }

  private shouldLogoutNowForRefreshAuthFailure(): boolean {
    const now = Date.now();
    if (
      !this.refreshAuthFailureWindowStartedAt ||
      now - this.refreshAuthFailureWindowStartedAt > this.REFRESH_FAILURE_WINDOW_MS
    ) {
      this.refreshAuthFailureWindowStartedAt = now;
      this.refreshAuthFailureCount = 1;
      return false;
    }

    this.refreshAuthFailureCount += 1;
    return this.refreshAuthFailureCount >= this.MAX_CONSECUTIVE_REFRESH_AUTH_FAILURES;
  }

  private resetRefreshAuthFailureState(): void {
    this.refreshAuthFailureCount = 0;
    this.refreshAuthFailureWindowStartedAt = 0;
  }

  private logoutWithReason(
    reason: 'manual' | 'inactivity' | 'refresh_invalid' | 'token_invalid',
  ): void {
    this.logout(reason);
  }

  public startInactivityTimer(): void {
    this.clearInactivityTimer();

    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isLoggedIn()) return;
    if (this.inactivityPauseSources.size > 0) return;

    this.inactivityTimeout = setTimeout(() => {
      console.warn('Auto-logout due to inactivity.');
      if (this.isLoggedIn()) {
        this.logoutWithReason('inactivity');
      }
    }, this.INACTIVITY_LIMIT);
  }

  public clearInactivityTimer(): void {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
  }

  public resetInactivityTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isLoggedIn()) {
      this.clearInactivityTimer();
      return;
    }
    if (this.inactivityPauseSources.size > 0) {
      this.clearInactivityTimer();
      return;
    }
    this.startInactivityTimer();
  }

  public pauseInactivityTimer(source: string): void {
    const key = String(source || '').trim() || 'unknown';
    this.inactivityPauseSources.add(key);
    this.clearInactivityTimer();
  }

  public resumeInactivityTimer(source: string): void {
    const key = String(source || '').trim() || 'unknown';
    this.inactivityPauseSources.delete(key);
    if (this.inactivityPauseSources.size === 0) {
      this.startInactivityTimer();
    }
  }

  public hasPermission(permissionKey: string): Observable<boolean> {
    if (this.isAdmin()) {
      return new BehaviorSubject(true).asObservable();
    }
    return this.userPermissions$.pipe(
      map((permissions) => permissions.includes(permissionKey)),
    );
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.getValue();
    if (user && typeof user.isAdmin === 'boolean') return user.isAdmin;
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem('isAdmin') === 'true';
  }

  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Use the token as the source of truth to populate the user
    this.loadUserFromToken(token);

    // Start inactivity timer for already logged-in users
    this.startInactivityTimer();

    const exp = this.getExp(token);
    if (exp == null) {
      console.error('Invalid token found. Logging out.');
      this.logoutWithReason('token_invalid');
      return;
    }

    const expiration = exp * 1000; // exp is in seconds
    if (expiration < Date.now()) {
      // Do not await: APP_INITIALIZER would block first paint for the full refresh timeout (+ retry).
      void this.performColdStartRefresh();
    }
  }
  googleLogin(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/google-login`, { idToken }).pipe(
      switchMap((response) => {
        if (!response.requiresRegistration) {
          return this.handleSuccessfulLogin(response);
        }
        return of(response);
      }),
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          error.error.error ===
            'Email address has not been verified. Please check your inbox and spam folder.'
        ) {
          return throwError(() => this.handleLoginError(error));
        }
        return throwError(() => this.handleLoginError(error));
      }),
    );
  }

  resendverificationemail(email: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/resend-email-verification/${email}`,
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        switchMap((response) => this.handleSuccessfulLogin(response)),
        catchError((error: HttpErrorResponse) => {
          // console.log(error.status)
          // console.log(error.error)
          if (
            error.status === 401 &&
            error.error.error ===
              'Email address has not been verified. Please check your inbox and spam folder.'
          ) {
            return throwError(() => this.handleLoginError(error));
          } //else if (error.status === 401) {
          //return this.loginMember(credentials);
          //}
          return throwError(() => this.handleLoginError(error));
        }),
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
      const { userId, firstName, lastName, userType, email } = response;

      const payload = this.parseJwt<any>(token) ?? {};
      const companyName = payload.CompanyName || '';
      const isAdmin =
        response.isAdmin ?? payload.IsAdmin ?? payload.isAdmin ?? false;

      const user = {
        id: userId,
        firstName,
        lastName,
        userType,
        companyName,
        email,
        isAdmin: !!isAdmin,
      };

      localStorage.setItem('userId', userId);
      localStorage.setItem('firstName', firstName);
      localStorage.setItem('lastName', lastName);
      localStorage.setItem('userType', userType);
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('email', email);
      localStorage.setItem('isAdmin', String(!!isAdmin));
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
        }),
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
    console.error(
      'Login error:',
      parsed?.error || error.message || 'Unknown error',
    );
    return error;
  }

  // loginMember(credentials: {
  //   email: string;
  //   password: string;
  // }): Observable<any> {
  //   return this.http
  //     .post<any>(`${this.apiUrl}/login/member`, credentials, {
  //       headers: { 'Content-Type': 'application/json' },
  //     })
  //     .pipe(
  //       switchMap((response) => this.handleSuccessfulLogin(response)),
  //       catchError((error: HttpErrorResponse) =>
  //         throwError(() => this.handleLoginError(error)),
  //       ),
  //     );
  // }

  updateCompanyName(companyName: string) {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const updatedUser = {
      ...user,
      companyName,
    };

    // Update observable
    this.currentUserSubject.next(updatedUser);

    // Keep localStorage in sync (important for refresh)
    localStorage.setItem('companyName', companyName);
  }

  changeUserRole(userType: string): void {
    localStorage.setItem('userType', userType);
  }

  logout(
    reason:
      | 'manual'
      | 'inactivity'
      | 'refresh_invalid'
      | 'token_invalid' = 'manual',
  ): void {
    this.clearInactivityTimer();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.LOGOUT_REASON_KEY, reason);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('fw_selectedAddressId');
      localStorage.removeItem('findWorkFilters');
      this.addressStore.clear();
    }
    this.currentUserSubject.next(null);
    this.resetRefreshAuthFailureState();

    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((tokenResponse) => tokenResponse !== null),
        take(1),
        switchMap((tokenResponse) => {
          if ((tokenResponse as any)?.failed) {
            return throwError(
              () =>
                ((tokenResponse as { failed: true; error: unknown }).error ??
                  new Error('Refresh token request failed.')),
            );
          }
          return of(tokenResponse);
        }),
      );
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.refreshTokenSubject.next({
        failed: true,
        error: new Error('No refresh token available.'),
      });
      this.logoutWithReason('refresh_invalid');
      return throwError(() => new Error('No refresh token available.'));
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.http
      .post(`${this.apiUrl}/refresh-token`, { refreshToken })
      .pipe(
        timeout(this.refreshTimeoutMs),
        tap((response: any) => {
          if (response && response.token && response.refreshToken) {
            localStorage.setItem('accessToken', response.token);
            localStorage.setItem('refreshToken', response.refreshToken);
            this.loadUserFromToken(response.token);
            this.resetRefreshAuthFailureState();
            this.refreshTokenSubject.next(response);
          } else {
            this.refreshTokenSubject.next({
              failed: true,
              error: new Error('Invalid refresh token response'),
            });
            if (this.shouldLogoutNowForRefreshAuthFailure()) {
              this.logoutWithReason('refresh_invalid');
            }
            throw new Error('Invalid refresh token response');
          }
        }),
        catchError((err) => {
          this.refreshTokenSubject.next({ failed: true, error: err });
          if (this.shouldForceLogoutOnRefreshFailure(err)) {
            if (this.shouldLogoutNowForRefreshAuthFailure()) {
              this.logoutWithReason('refresh_invalid');
            }
          }
          return throwError(() => err);
        }),
        finalize(() => {
          this.isRefreshing = false;
        }),
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
      if (Date.now() < this.refreshRetryCooldownUntil) {
        return this.normalizeToken(token);
      }
      try {
        await firstValueFrom(this.refreshToken());
        this.refreshRetryCooldownUntil = 0;
        return localStorage.getItem('accessToken');
      } catch (e) {
        const now = Date.now();
        if (now - this.lastGetTokenRefreshFailureLogAt > 2500) {
          this.lastGetTokenRefreshFailureLogAt = now;
          const isTimeout =
            e &&
            typeof e === 'object' &&
            (e as { name?: string }).name === 'TimeoutError';
          if (isTimeout) {
            console.warn(
              'Token refresh timed out in getToken(); using previous access token until cooldown. If this persists, check API / refresh-token speed or environment.refreshTokenRequestTimeoutMs.',
              e,
            );
          } else {
            console.error('Refresh failed in getToken()', e);
          }
        }
        this.refreshRetryCooldownUntil =
          Date.now() + this.REFRESH_RETRY_COOLDOWN_MS;
        // Best effort fallback: keep using current token temporarily to avoid
        // request storms / SignalR negotiation loops during transient outages.
        return this.normalizeToken(token);
      }
    }

    return this.normalizeToken(token);
  }

  getAccessTokenFast(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem('accessToken');
    return token ? this.normalizeToken(token) : null;
  }

  isLoggedIn(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      !!localStorage.getItem('accessToken')
    );
  }

  getUserRole(): string | null {
    return localStorage.getItem('userType');
  }

  getUserId(): string | null {
    const user = this.currentUserSubject.getValue();
    return user ? user.id : null;
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
        isAdmin: localStorage.getItem('isAdmin') === 'true',
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
            isAdmin:
              teamMember.isAdmin ??
              payload.IsAdmin ??
              payload.isAdmin ??
              localStorage.getItem('isAdmin') === 'true',
          };
          if (user.inviterId) {
            this.currentUserSubject.next(user);
          } else {
            console.warn(
              'Team member data is incomplete. Waiting for inviterId.',
            );
          }
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('isAdmin', String(!!user.isAdmin));
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
        email:
          payload.Email ||
          payload.email ||
          payload.unique_name ||
          localStorage.getItem('email'),
        isAdmin:
          payload.IsAdmin ??
          payload.isAdmin ??
          localStorage.getItem('isAdmin') === 'true',
      };
      this.currentUserSubject.next(user);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('isAdmin', String(!!user.isAdmin));
      }
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
        const isAdmin =
          memberDetails.isAdmin ??
          payload?.IsAdmin ??
          payload?.isAdmin ??
          false;
        const user = {
          id: memberDetails.id,
          inviterId: memberDetails.inviterId,
          firstName: memberDetails.firstName,
          lastName: memberDetails.lastName,
          role: memberDetails.role,
          isAdmin: !!isAdmin,
        };
        localStorage.setItem('userId', user.id);
        localStorage.setItem('firstName', user.firstName);
        localStorage.setItem('lastName', user.lastName);
        localStorage.setItem('userType', user.role);
        localStorage.setItem('isAdmin', String(!!isAdmin));
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
    );
  }

  private loadUserPermissions(teamMemberId: string): void {
    this.teamManagementService.getPermissions(teamMemberId).subscribe({
      next: (permissions) => {
        this._userPermissions.next(permissions);
        // console.log('Permissions loaded:', this._userPermissions.getValue());
      },
      error: (err) => {
        console.error('Failed to load user permissions', err);
        this._userPermissions.next([]);
      },
    });
  }
}
