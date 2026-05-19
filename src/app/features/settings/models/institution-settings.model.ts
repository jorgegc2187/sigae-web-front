export interface InstitutionSettings {
  systemName: string;
  institutionLogoUrl: string | null;
  address: string;
  city: string;
  supportPhone: string;
  supportEmail: string;
}

export interface InstitutionBranding {
  systemName: string;
  logoUrl: string | null;
}

export interface InstitutionBrandingResponse {
  systemName: string;
  hasLogo: boolean;
  updatedAt: string;
}

export interface InstitutionSettingsResponse {
  systemName: string;
  address: string | null;
  city: string | null;
  supportPhone: string | null;
  supportEmail: string;
  hasLogo: boolean;
  updatedAt: string;
}
