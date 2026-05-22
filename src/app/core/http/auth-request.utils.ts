import { HttpContextToken } from '@angular/common/http';

export const AUTH_RETRY_ATTEMPTED = new HttpContextToken<boolean>(() => false);

export function isPublicAuthRequest(url: string): boolean {
  return /\/auth\/(login|refresh|mfa\/enroll\/start|mfa\/enroll\/confirm|mfa\/verify|forgot-password|reset-password(?:\/validate)?)$/.test(url);
}
