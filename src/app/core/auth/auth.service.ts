import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app.tokens';
import { AuthResponse, AuthUser, LoginCredentials, SessionStatus, UserRole } from './auth.models';

const ACCESS_TOKEN_KEY = 'sigae.accessToken';
const REFRESH_TOKEN_KEY = 'sigae.refreshToken';
const USER_KEY = 'sigae.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly accessTokenState = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refreshTokenState = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  private readonly userState = signal<AuthUser | null>(this.readStoredUser());
  private readonly sessionStatusState = signal<SessionStatus>('unknown');
  private refreshInFlight: Promise<boolean> | null = null;
  private sessionFailureNavigationInFlight = false;

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly currentUser = this.userState.asReadonly();
  readonly sessionStatus = this.sessionStatusState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionStatusState() === 'authenticated');

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

  async login(credentials: LoginCredentials): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/login`, credentials),
    );
    this.persistSession(response);
    this.sessionStatusState.set('authenticated');
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshed = await this.refreshSession();
    return refreshed ? this.accessTokenState() : null;
  }

  async logout(): Promise<void> {
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
    await this.router.navigate(['/auth/login']);
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
          this.http.get<AuthUser>(`${this.appConfig.apiUrl}/auth/me`),
        );
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userState.set(user);
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
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.accessTokenState.set(response.accessToken);
    this.refreshTokenState.set(response.refreshToken);
    this.userState.set(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.accessTokenState.set(null);
    this.refreshTokenState.set(null);
    this.userState.set(null);
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
