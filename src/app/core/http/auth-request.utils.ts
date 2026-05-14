import { HttpContextToken } from '@angular/common/http';

export const AUTH_RETRY_ATTEMPTED = new HttpContextToken<boolean>(() => false);

export function isPublicAuthRequest(url: string): boolean {
  return /\/auth\/(login|refresh|forgot-password)$/.test(url);
}
