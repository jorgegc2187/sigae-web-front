import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../config/app.tokens';
import { AuthResponse, AuthUser, LoginCredentials, UserRole } from './auth.models';

const ACCESS_TOKEN_KEY = 'sigae.accessToken';
const REFRESH_TOKEN_KEY = 'sigae.refreshToken';
const USER_KEY = 'sigae.user';
const MOCK_ACCESS_TOKEN = 'mock-access-token';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token';

const MOCK_USER: AuthUser = {
  id: 'mock-admin',
  fullName: 'Administrador SIGAE',
  email: 'admin@sigae.edu.pe',
  role: 'Administrador',
  status: 'Activo',
  locationIds: [],
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly accessTokenState = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refreshTokenState = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  private readonly userState = signal<AuthUser | null>(this.readStoredUser());

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.accessTokenState() && this.userState()));

  constructor() {
    if (!this.appConfig.enableMockAuth && this.isLegacyMockSession()) {
      this.clearSession();
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    if (this.appConfig.enableMockAuth) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.persistSession({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { ...MOCK_USER, email: credentials.email || MOCK_USER.email },
      });
      return;
    }

    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/login`, credentials),
    );
    this.persistSession(response);
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.refreshTokenState();
    if (!refreshToken || this.appConfig.enableMockAuth) {
      return this.accessTokenState();
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/refresh`, { refreshToken }),
      );
      this.persistSession(response);
      return response.accessToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.refreshTokenState();
    if (refreshToken && !this.appConfig.enableMockAuth) {
      try {
        await firstValueFrom(this.http.post(`${this.appConfig.apiUrl}/auth/logout`, { refreshToken }));
      } catch {
        // El cierre local debe ocurrir incluso si la API no responde.
      }
    }

    this.clearSession();
    await this.router.navigate(['/login']);
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const user = this.userState();
    return Boolean(user && roles.includes(user.role));
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

  private isLegacyMockSession(): boolean {
    return this.accessTokenState() === MOCK_ACCESS_TOKEN || this.refreshTokenState() === MOCK_REFRESH_TOKEN;
  }
}
