import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { computed, effect, Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app.tokens';
import {
  InstitutionBranding,
  InstitutionBrandingResponse,
  InstitutionSettingsResponse,
} from '../../features/settings/models/institution-settings.model';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly document = inject(DOCUMENT);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/settings`;
  private readonly defaultFaviconHref = 'favicon.ico';

  readonly brandingResource = httpResource<InstitutionBrandingResponse>(() => `${this.baseUrl}/branding`);

  readonly branding = computed<InstitutionBranding>(() => {
    const response = this.brandingResource.value();

    return {
      systemName: response?.systemName ?? this.appConfig.appName,
      logoUrl: response ? this.buildLogoUrl(response.hasLogo, response.updatedAt) : null,
    };
  });

  readonly systemName = computed(() => this.branding().systemName);
  readonly logoUrl = computed(() => this.branding().logoUrl);

  constructor() {
    effect(() => {
      this.syncFavicon(this.logoUrl());
    });
  }

  reload(): void {
    this.brandingResource.reload();
  }

  updateFromSettingsResponse(response: InstitutionSettingsResponse): void {
    this.brandingResource.set({
      systemName: response.systemName,
      hasLogo: response.hasLogo,
      updatedAt: response.updatedAt,
    });
  }

  private buildLogoUrl(hasLogo: boolean, updatedAt: string): string | null {
    if (!hasLogo) {
      return null;
    }

    return `${this.baseUrl}/logo?v=${encodeURIComponent(updatedAt)}`;
  }

  private syncFavicon(logoUrl: string | null): void {
    const faviconLink = this.getOrCreateFaviconLink();
    faviconLink.href = logoUrl ?? this.defaultFaviconHref;
    faviconLink.type = this.resolveFaviconMimeType(faviconLink.href);
  }

  private getOrCreateFaviconLink(): HTMLLinkElement {
    const existingLink = this.document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (existingLink) {
      return existingLink;
    }

    const link = this.document.createElement('link');
    link.rel = 'icon';
    this.document.head.appendChild(link);
    return link;
  }

  private resolveFaviconMimeType(href: string): string {
    const normalizedHref = href.toLowerCase();
    if (normalizedHref.includes('.png')) {
      return 'image/png';
    }
    if (normalizedHref.includes('.svg')) {
      return 'image/svg+xml';
    }
    if (normalizedHref.includes('.jpg') || normalizedHref.includes('.jpeg')) {
      return 'image/jpeg';
    }

    return 'image/x-icon';
  }
}
