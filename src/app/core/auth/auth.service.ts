import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app.tokens';
import {
  AuthResponse,
  AuthUser,
  AuthUserResponsePayload,
  ForgotPasswordPayload,
  LoginCredentials,
  LoginResponse,
  MfaChallengeResponse,
  MfaChallengeSession,
  MfaEnrollStartResponse,
  ResetPasswordPayload,
  SessionStatus,
  ApiUserRole,
  ApiUserStatus,
  UserRole,
  UserStatus,
  AuthPublicErrorPayload,
} from './auth.models';

const ACCESS_TOKEN_KEY = 'sigae.accessToken';
const REFRESH_TOKEN_KEY = 'sigae.refreshToken';
const USER_KEY = 'sigae.user';
const MFA_CHALLENGE_KEY = 'sigae.mfaChallenge';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly accessTokenState = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refreshTokenState = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  private readonly userState = signal<AuthUser | null>(this.readStoredUser());
  private readonly mfaChallengeState = signal<MfaChallengeSession | null>(this.readStoredMfaChallenge());
  private readonly sessionStatusState = signal<SessionStatus>('unknown');
  private refreshInFlight: Promise<boolean> | null = null;
  private sessionFailureNavigationInFlight = false;

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly currentUser = this.userState.asReadonly();
  readonly mfaChallenge = this.mfaChallengeState.asReadonly();
  readonly sessionStatus = this.sessionStatusState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionStatusState() === 'authenticated');
  readonly hasActiveSession = computed(() =>
    Boolean(this.accessTokenState() || this.refreshTokenState() || this.userState()),
  );

  constructor() {
    if (!this.refreshTokenState()) {
      if (this.accessTokenState() || this.userState()) {
        this.clearSession();
      }
      this.sessionStatusState.set('anonymous');
    }
  }

  async initializeSession(): Promise<void> {
    if (this.sessionStatusState() !== 'unknown') {
      return;
    }

    if (!this.refreshTokenState()) {
      this.clearSession();
      this.sessionStatusState.set('anonymous');
      return;
    }

    const restored = await this.refreshSession();
    this.sessionStatusState.set(restored ? 'authenticated' : 'anonymous');
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.appConfig.apiUrl}/auth/login`, credentials),
    );
    if (this.isMfaChallengeResponse(response)) {
      this.storeMfaChallenge(response);
      this.clearSession();
      this.sessionStatusState.set('anonymous');
      return response;
    }

    this.clearMfaChallenge();
    this.persistSession(response);
    this.sessionStatusState.set('authenticated');
    return response;
  }

  async startMfaEnrollment(challengeToken: string): Promise<MfaEnrollStartResponse> {
    return firstValueFrom(
      this.http.post<MfaEnrollStartResponse>(`${this.appConfig.apiUrl}/auth/mfa/enroll/start`, { challengeToken }),
    );
  }

  async confirmMfaEnrollment(challengeToken: string, code: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/mfa/enroll/confirm`, { challengeToken, code }),
    );
    this.completeMfaAuthentication(response);
  }

  async verifyMfa(challengeToken: string, code: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/mfa/verify`, { challengeToken, code }),
    );
    this.completeMfaAuthentication(response);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const payload: ForgotPasswordPayload = { email };
    await firstValueFrom(
      this.http.post(`${this.appConfig.apiUrl}/auth/forgot-password`, payload),
    );
  }

  async validateResetPasswordToken(token: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.appConfig.apiUrl}/auth/reset-password/validate`, { token }),
    );
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.appConfig.apiUrl}/auth/reset-password`, payload),
    );
  }

  getPublicAuthErrorPayload(error: unknown): AuthPublicErrorPayload {
    if (!(error instanceof HttpErrorResponse) || typeof error.error !== 'object' || error.error === null) {
      return {
        message: null,
        code: null,
        retryAfterSeconds: null,
      };
    }

    const apiError = error.error as {
      message?: unknown;
      code?: unknown;
      retryAfterSeconds?: unknown;
    };

    return {
      message: typeof apiError.message === 'string' ? apiError.message : null,
      code: typeof apiError.code === 'string' ? apiError.code : null,
      retryAfterSeconds:
        typeof apiError.retryAfterSeconds === 'number' ? apiError.retryAfterSeconds : null,
    };
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshed = await this.refreshSession();
    return refreshed ? this.accessTokenState() : null;
  }

  async logout(redirect = true): Promise<void> {
    const refreshToken = this.refreshTokenState();
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post(`${this.appConfig.apiUrl}/auth/logout`, { refreshToken }));
      } catch {
        // El cierre local debe ocurrir incluso si la API no responde.
      }
    }

    this.clearSession();
    this.sessionStatusState.set('anonymous');
    if (redirect) {
      await this.router.navigate(['/auth/login']);
    }
  }

  async handleSessionExpired(): Promise<void> {
    this.clearSession();
    this.sessionStatusState.set('anonymous');

    if (this.sessionFailureNavigationInFlight) {
      return;
    }

    this.sessionFailureNavigationInFlight = true;

    try {
      await this.router.navigate(['/auth/login']);
    } finally {
      this.sessionFailureNavigationInFlight = false;
    }
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const user = this.userState();
    return Boolean(user && roles.includes(user.role));
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.refreshTokenState();
    if (!refreshToken) {
      this.clearSession();
      return false;
    }

    this.refreshInFlight = (async () => {
      try {
        const response = await firstValueFrom(
          this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/refresh`, { refreshToken }),
        );
        this.persistSession(response);

        const user = await firstValueFrom(
          this.http.get<AuthUserResponsePayload>(`${this.appConfig.apiUrl}/auth/me`),
        );
        const normalizedUser = this.normalizeUser(user);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        this.userState.set(normalizedUser);
        this.sessionStatusState.set('authenticated');
        return true;
      } catch {
        this.clearSession();
        this.sessionStatusState.set('anonymous');
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  private persistSession(response: AuthResponse): void {
    const normalizedUser = this.normalizeUser(response.user);
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    this.accessTokenState.set(response.accessToken);
    this.refreshTokenState.set(response.refreshToken);
    this.userState.set(normalizedUser);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.accessTokenState.set(null);
    this.refreshTokenState.set(null);
    this.userState.set(null);
  }

  private completeMfaAuthentication(response: AuthResponse): void {
    this.clearMfaChallenge();
    this.persistSession(response);
    this.sessionStatusState.set('authenticated');
  }

  private isMfaChallengeResponse(response: LoginResponse): response is MfaChallengeResponse {
    return response.type === 'MFA_ENROLL_REQUIRED' || response.type === 'MFA_CHALLENGE_REQUIRED';
  }

  private storeMfaChallenge(response: MfaChallengeResponse): void {
    const challenge: MfaChallengeSession = {
      type: response.type,
      challengeToken: response.challengeToken,
      expiresAt: Date.now() + response.expiresIn * 1000,
    };
    sessionStorage.setItem(MFA_CHALLENGE_KEY, JSON.stringify(challenge));
    this.mfaChallengeState.set(challenge);
  }

  clearMfaChallenge(): void {
    sessionStorage.removeItem(MFA_CHALLENGE_KEY);
    this.mfaChallengeState.set(null);
  }

  private readStoredMfaChallenge(): MfaChallengeSession | null {
    const rawChallenge = sessionStorage.getItem(MFA_CHALLENGE_KEY);
    if (!rawChallenge) return null;

    try {
      const challenge = JSON.parse(rawChallenge) as MfaChallengeSession;
      if (!challenge.challengeToken || challenge.expiresAt <= Date.now()) {
        sessionStorage.removeItem(MFA_CHALLENGE_KEY);
        return null;
      }
      return challenge;
    } catch {
      sessionStorage.removeItem(MFA_CHALLENGE_KEY);
      return null;
    }
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;

    try {
      return this.normalizeUser(JSON.parse(rawUser) as AuthUserResponsePayload);
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  private normalizeUser(user: AuthUserResponsePayload): AuthUser {
    return {
      ...user,
      role: this.normalizeRole(user.role),
      status: user.status ? this.normalizeStatus(user.status) : undefined,
    };
  }

  private normalizeRole(role: UserRole | ApiUserRole): UserRole {
    if (role === 'ADMINISTRADOR' || role === 'Administrador') {
      return 'Administrador';
    }

    if (role === 'ENCARGADO' || role === 'Encargado') {
      return 'Encargado';
    }

    return 'Solo Lectura';
  }

  private normalizeStatus(status: UserStatus | ApiUserStatus): UserStatus {
    if (status === 'ACTIVE' || status === 'Activo') {
      return 'Activo';
    }

    if (status === 'PENDING' || status === 'Pendiente') {
      return 'Pendiente';
    }

    return 'Inactivo';
  }
}
