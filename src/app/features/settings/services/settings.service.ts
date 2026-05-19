import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { BrandingService } from '../../../core/services/branding.service';
import {
  InstitutionSettings,
  InstitutionSettingsResponse,
} from '../models/institution-settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly brandingService = inject(BrandingService);
  private readonly baseUrl = `${this.appConfig.apiUrl}/settings`;

  readonly settingsResource = httpResource<InstitutionSettingsResponse>(() => this.baseUrl);

  readonly settings = computed<InstitutionSettings | null>(() => {
    const response = this.settingsResource.value();
    if (!response) {
      return null;
    }

    return this.mapSettings(response);
  });

  saveInstitutionSettings(settings: Omit<InstitutionSettings, 'institutionLogoUrl'>, logoFile: File | null) {
    const formData = new FormData();
    formData.append(
      'payload',
      new Blob(
        [
          JSON.stringify({
            systemName: settings.systemName,
            address: settings.address,
            city: settings.city,
            supportPhone: settings.supportPhone,
            supportEmail: settings.supportEmail,
          }),
        ],
        { type: 'application/json' },
      ),
    );

    if (logoFile) {
      formData.append('logo', logoFile, logoFile.name);
    }

    return this.http.put<InstitutionSettingsResponse>(this.baseUrl, formData);
  }

  syncSavedSettings(response: InstitutionSettingsResponse): InstitutionSettings {
    this.settingsResource.set(response);
    this.brandingService.updateFromSettingsResponse(response);
    return this.mapSettings(response);
  }

  private mapSettings(response: InstitutionSettingsResponse): InstitutionSettings {
    return {
      systemName: response.systemName,
      institutionLogoUrl: response.hasLogo
        ? `${this.baseUrl}/logo?v=${encodeURIComponent(response.updatedAt)}`
        : null,
      address: response.address ?? '',
      city: response.city ?? '',
      supportPhone: response.supportPhone ?? '',
      supportEmail: response.supportEmail,
    };
  }
}
