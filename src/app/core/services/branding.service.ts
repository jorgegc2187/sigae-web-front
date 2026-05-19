import { HttpClient, httpResource } from '@angular/common/http';
import { computed, Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app.tokens';
import {
  InstitutionBranding,
  InstitutionBrandingResponse,
  InstitutionSettingsResponse,
} from '../../features/settings/models/institution-settings.model';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/settings`;

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
}
