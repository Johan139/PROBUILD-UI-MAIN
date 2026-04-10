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
  private readonly ANALYSIS_PROTECTION_UNTIL_KEY =
    'pb_analysis_protection_until_ms';
  private readonly AUTH_TRACE_BUFFER_KEY = '__pbAuthTrace';
  private readonly AUTH_TRACE_MAX = 80;
  private authLimboSinceMs: number | null = null;
  private authTraceBuffer: Array<{
    at: string;
    event: string;
    details?: Record<string, unknown>;
  }> = [];
  private isLogoutInProgress = false;
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
  private analysisProtectionGraceUntilMs = 0;
  private readonly ANALYSIS_PROTECTION_GRACE_MS =
    (environment as { analysisAuthProtectionGraceMs?: number })
      .analysisAuthProtectionGraceMs ?? 10 * 60 * 1000;
  /** Used when refresh runs during normal app use (e.g. getToken / interceptor). */
  private readonly refreshTimeoutMs =
    environment.refreshTokenRequestTimeoutMs ?? 10_000;
  private lastGetTokenRefreshFailureLogAt = 0;
  /** After a failed refresh while the access token is still valid, brief pause before retry. */
  private readonly REFRESH_RETRY_COOLDOWN_MS = 15_000;
  private readonly REFRESH_FAILURE_WINDOW_MS = 120_000;
  private readonly MAX_CONSECUTIVE_REFRESH_AUTH_FAILURES = 5;
  /** Refresh access token this long before JWT exp (short server lifetimes need more headroom). */
  private readonly PROACTIVE_REFRESH_LEEWAY_MS = 120_000;
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

  /** True when access token is past JWT exp (must refresh or re-login). */
  private accessTokenIsExpired(token: string | null): boolean {
    if (!token) return true;
    const exp = this.getExp(token);
    if (exp == null) return true;
    return exp * 1000 <= Date.now();
  }

  /** RxJS timeout uses name TimeoutError; legacy wrapper used message "Refresh token timeout". */
  private isRefreshTimeoutError(err: unknown): boolean {
    if (err instanceof Error && err.message.includes('Refresh token timeout')) {
      return true;
    }
    return (
      !!err &&
      typeof err === 'object' &&
      (err as { name?: string }).name === 'TimeoutError'
    );
  }

  private coldStartExtendedRefreshTimeoutMs(): number {
    const extra = (environment as { coldStartRefreshTimeoutMs?: number })
      .coldStartRefreshTimeoutMs;
    if (typeof extra === 'number' && extra > 0) {
      return extra;
    }
    return Math.max(this.refreshTimeoutMs * 2, 45_000);
  }

  /**
   * Runs after bootstrap when the access token is already expired.
   * Must not block APP_INITIALIZER — otherwise the whole shell (including /login) waits on refresh timeouts.
   */
  private async performColdStartRefresh(): Promise<void> {
    try {
      await firstValueFrom(this.refreshToken());
      const newToken = localStorage.getItem('accessToken');
      if (newToken) this.loadUserFromToken(newToken);
    } catch (err) {
      if (this.isRefreshTimeoutError(err)) {
        try {
          await firstValueFrom(
            this.refreshToken(this.coldStartExtendedRefreshTimeoutMs()),
          );
          const newToken = localStorage.getItem('accessToken');
          if (newToken) {
            this.loadUserFromToken(newToken);
            return;
          }
        } catch (retryErr) {
          console.warn(
            'Cold-start token refresh failed after extended retry; logging in again is required.',
            retryErr,
          );
          this.logoutWithReason('refresh_invalid');
          return;
        }
      }

      if (!this.shouldForceLogoutOnRefreshFailure(err)) {
        // Cold start only runs when the access token is already expired — do not
        // leave the user in a state where every request 401s and hammers refresh.
        console.warn(
          'Token refresh failed during cold start; logging out.',
          err,
        );
        this.logoutWithReason('refresh_invalid');
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

  private getPersistedAnalysisProtectionUntilMs(): number {
    if (!isPlatformBrowser(this.platformId)) {
      return 0;
    }

    const raw = localStorage.getItem(this.ANALYSIS_PROTECTION_UNTIL_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private setPersistedAnalysisProtectionUntilMs(untilMs: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.ANALYSIS_PROTECTION_UNTIL_KEY, String(untilMs));
  }

  private clearPersistedAnalysisProtection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.ANALYSIS_PROTECTION_UNTIL_KEY);
  }

  private hasActiveAnalysisPauseSource(): boolean {
    return (
      this.inactivityPauseSources.has('job-analysis') ||
      this.inactivityPauseSources.has('job-analysis-walkthrough')
    );
  }

  private isAnalysisInactivityProtected(): boolean {
    const persistedUntilMs = this.getPersistedAnalysisProtectionUntilMs();
    const effectiveUntilMs = Math.max(
      this.analysisProtectionGraceUntilMs,
      persistedUntilMs,
    );
    this.analysisProtectionGraceUntilMs = effectiveUntilMs;

    return (
      this.hasActiveAnalysisPauseSource() || Date.now() < effectiveUntilMs
    );
  }

  public extendAnalysisProtectionGrace(source: string, durationMs?: number): void {
    const requestedMs = Number(durationMs ?? this.ANALYSIS_PROTECTION_GRACE_MS);
    const safeMs = Number.isFinite(requestedMs) && requestedMs > 0
      ? requestedMs
      : this.ANALYSIS_PROTECTION_GRACE_MS;
    const nextUntil = Date.now() + safeMs;
    this.analysisProtectionGraceUntilMs = Math.max(
      this.analysisProtectionGraceUntilMs,
      nextUntil,
    );
    this.setPersistedAnalysisProtectionUntilMs(this.analysisProtectionGraceUntilMs);
    this.pushAuthTrace('analysis.protection_grace.extend', {
      source,
      durationMs: safeMs,
      untilMs: this.analysisProtectionGraceUntilMs,
    });
  }

  private logoutWithReason(
    reason: 'manual' | 'inactivity' | 'refresh_invalid' | 'token_invalid',
  ): void {
    this.pushAuthTrace('logoutWithReason', { reason });
    this.logout(reason);
  }

  public pushAuthTrace(event: string, details?: Record<string, unknown>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const entry = {
      at: new Date().toISOString(),
      event,
      details,
    };
    this.authTraceBuffer.push(entry);
    if (this.authTraceBuffer.length > this.AUTH_TRACE_MAX) {
      this.authTraceBuffer.splice(0, this.authTraceBuffer.length - this.AUTH_TRACE_MAX);
    }
    (window as any)[this.AUTH_TRACE_BUFFER_KEY] = [...this.authTraceBuffer];
  }

  public noteAuthTokenObserved(
    hasToken: boolean,
    source: string,
    details?: Record<string, unknown>,
  ): void {
    this.pushAuthTrace('auth.tokenObserved', {
      source,
      hasToken,
      ...(details || {}),
    });

    if (!isPlatformBrowser(this.platformId)) return;

    const hasRefreshToken = !!localStorage.getItem('refreshToken');
    const path = window.location.pathname || '';
    const isPublicAuthRoute =
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/confirm-email') ||
      path.startsWith('/trial-registration');

    if (hasToken || !this.isLoggedIn() || !hasRefreshToken || isPublicAuthRoute) {
      this.authLimboSinceMs = null;
      return;
    }
    // No limbo holding pattern: missing bearer while "logged in" should fail fast
    // through normal 401/refresh handling, not delay UI in partial-auth state.
    this.authLimboSinceMs = null;
  }

  public startInactivityTimer(): void {
    this.clearInactivityTimer();

    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.isLoggedIn()) return;
    if (this.isAnalysisInactivityProtected()) return;
    if (this.inactivityPauseSources.size > 0) return;

    this.inactivityTimeout = setTimeout(() => {
      console.warn('Auto-logout due to inactivity.');
      this.pushAuthTrace('inactivity.timeout.logout', {
        pausedSources: this.inactivityPauseSources.size,
      });
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
    if (this.isAnalysisInactivityProtected()) {
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
    if (key === 'job-analysis' || key === 'job-analysis-walkthrough') {
      this.extendAnalysisProtectionGrace(`pause:${key}`);
    }
    this.pushAuthTrace('inactivity.pause', {
      source: key,
      pausedSources: this.inactivityPauseSources.size,
    });
    this.clearInactivityTimer();
  }

  public resumeInactivityTimer(source: string): void {
    const key = String(source || '').trim() || 'unknown';
    this.inactivityPauseSources.delete(key);
    this.pushAuthTrace('inactivity.resume', {
      source: key,
      pausedSources: this.inactivityPauseSources.size,
    });
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

    const exp = this.getExp(token);
    if (exp == null) {
      console.error('Invalid token found. Logging out.');
      this.logoutWithReason('token_invalid');
      return;
    }

    const expiration = exp * 1000; // exp is in seconds
    if (expiration < Date.now()) {
      // During app bootstrap (APP_INITIALIZER), avoid a forced hard reload.
      // A hard reload here causes a visible white-screen double-load.
      this.pushAuthTrace('initialize.expired_token_soft_logout');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
      this.resetRefreshAuthFailureState();
      void this.router.navigate(['/login']);
      return;
    }

    // Use the token as the source of truth to populate the user
    this.loadUserFromToken(token);

    // Start inactivity timer for already logged-in users
    this.startInactivityTimer();
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
    if (this.isLogoutInProgress) return;

    this.pushAuthTrace('logout.begin', { reason });
    this.isLogoutInProgress = true;
    this.authLimboSinceMs = null;
    this.analysisProtectionGraceUntilMs = 0;
    this.clearPersistedAnalysisProtection();
    this.inactivityPauseSources.clear();
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

    const shouldHardReload =
      reason === 'inactivity' ||
      reason === 'refresh_invalid' ||
      reason === 'token_invalid';

    // Hard reload prevents any in-flight UI loaders/spinners from getting
    // stuck in an authenticated state after session expiry.
    if (isPlatformBrowser(this.platformId) && shouldHardReload) {
      window.location.replace('/login');
      // If navigation is blocked, release the guard so a retry/manual logout works.
      setTimeout(() => {
        this.isLogoutInProgress = false;
      }, 4000);
      return;
    }

    void this.router.navigate(['/login']).finally(() => {
      this.isLogoutInProgress = false;
    });
  }

  refreshToken(timeoutOverrideMs?: number): Observable<any> {
    const requestTimeoutMs = timeoutOverrideMs ?? this.refreshTimeoutMs;
    this.pushAuthTrace('refresh.start', {
      timeoutMs: requestTimeoutMs,
      isRefreshing: this.isRefreshing,
    });

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
      this.pushAuthTrace('refresh.missing_refresh_token');
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
        timeout(requestTimeoutMs),
        tap((response: any) => {
          if (response && response.token && response.refreshToken) {
            localStorage.setItem('accessToken', response.token);
            localStorage.setItem('refreshToken', response.refreshToken);
            this.loadUserFromToken(response.token);
            this.resetRefreshAuthFailureState();
            this.pushAuthTrace('refresh.success');
            this.refreshTokenSubject.next(response);
          } else {
            this.pushAuthTrace('refresh.invalid_payload');
            this.refreshTokenSubject.next({
              failed: true,
              error: new Error('Invalid refresh token response'),
            });
            // Do not use auth-failure strike counter here (200 + bad shape can be transient).
            throw new Error('Invalid refresh token response');
          }
        }),
        catchError((err) => {
          this.pushAuthTrace('refresh.error', {
            status: err instanceof HttpErrorResponse ? err.status : null,
            name: (err as any)?.name || null,
          });
          this.refreshTokenSubject.next({ failed: true, error: err });
          if (this.shouldForceLogoutOnRefreshFailure(err)) {
            this.logoutWithReason('refresh_invalid');
            return throwError(() => err);
          }

          if (err instanceof HttpErrorResponse && err.status >= 500) {
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
    if (!token) {
      this.noteAuthTokenObserved(false, 'getToken:no_access_token');
      return null;
    }

    const exp = this.getExp(token);
    if (exp == null) {
      console.error('Token decode failed (invalid format).');
      return null;
    }

    const expiresAtMs = exp * 1000;
    const now = Date.now();
    const isExpired = this.accessTokenIsExpired(token);
    const needsProactiveRefresh =
      expiresAtMs < now + this.PROACTIVE_REFRESH_LEEWAY_MS;

    // Never keep an expired access token alive. Fail fast to login.
    if (isExpired) {
      try {
        await firstValueFrom(this.refreshToken(8_000));
        this.refreshRetryCooldownUntil = 0;
        this.noteAuthTokenObserved(true, 'getToken:expired_refresh_success');
        return localStorage.getItem('accessToken');
      } catch (e) {
        console.warn(
          'Expired token refresh failed; logging out immediately.',
          e,
        );
        this.logoutWithReason('refresh_invalid');
        return null;
      }
    }

    if (!needsProactiveRefresh) {
      this.noteAuthTokenObserved(true, 'getToken:token_valid_no_refresh');
      return this.normalizeToken(token);
    }

    if (!isExpired && this.isAnalysisInactivityProtected()) {
      this.noteAuthTokenObserved(
        true,
        'getToken:analysis_protected_skip_proactive_refresh_keep_token',
      );
      return this.normalizeToken(token);
    }

    if (now < this.refreshRetryCooldownUntil) {
      this.noteAuthTokenObserved(true, 'getToken:cooldown_keep_token');
      return this.normalizeToken(token);
    }

    try {
      await firstValueFrom(this.refreshToken());
      this.refreshRetryCooldownUntil = 0;
      this.noteAuthTokenObserved(true, 'getToken:refresh_success');
      return localStorage.getItem('accessToken');
    } catch (e) {
      const t = Date.now();
      if (t - this.lastGetTokenRefreshFailureLogAt > 2500) {
        this.lastGetTokenRefreshFailureLogAt = t;
        const isTimeout =
          e &&
          typeof e === 'object' &&
          (e as { name?: string }).name === 'TimeoutError';
        if (isTimeout) {
          console.warn(
            'Token refresh timed out in getToken(); token still valid briefly — retry after cooldown. Check API / refresh-token or environment.refreshTokenRequestTimeoutMs.',
            e,
          );
        } else {
          console.error('Refresh failed in getToken()', e);
        }
      }
      this.refreshRetryCooldownUntil = t + this.REFRESH_RETRY_COOLDOWN_MS;
      this.noteAuthTokenObserved(true, 'getToken:non_expired_refresh_failed_keep_token');
      return this.normalizeToken(token);
    }
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
