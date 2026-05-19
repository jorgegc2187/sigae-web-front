import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { InstitutionSettings } from '../models/institution-settings.model';

const DEFAULT_LOGO_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231d4ed8'/%3E%3Cstop offset='100%25' stop-color='%233b82f6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='128' height='128' rx='32' fill='url(%23bg)'/%3E%3Cpath d='M64 24 94 36v24c0 19.4-12.5 37-30 42-17.5-5-30-22.6-30-42V36l30-12Z' fill='white' fill-opacity='.18'/%3E%3Cpath d='M64 34 86 42v18c0 14.1-8.7 27-22 31-13.3-4-22-16.9-22-31V42l22-8Z' fill='white'/%3E%3Cpath d='M52 50h24v6H52zm0 12h24v6H52zm0 12h16v6H52z' fill='%231d4ed8'/%3E%3C/svg%3E";

const DEFAULT_SETTINGS: InstitutionSettings = {
  systemName: 'I.E. Simón Rodríguez - Nasca',
  institutionLogoUrl: DEFAULT_LOGO_DATA_URL,
  address: 'Av. Principal 123, Nasca',
  city: 'Nasca',
  supportPhone: '+51 999 999 999',
  supportEmail: 'contacto@colegio.edu.pe',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settings: InstitutionSettings = { ...DEFAULT_SETTINGS };

  getInstitutionSettings(): Observable<InstitutionSettings> {
    return of(this.cloneSettings(this.settings)).pipe(delay(120));
  }

  saveInstitutionSettings(settings: InstitutionSettings): Observable<InstitutionSettings> {
    this.settings = this.cloneSettings(settings);
    return of(this.cloneSettings(this.settings)).pipe(delay(180));
  }

  private cloneSettings(settings: InstitutionSettings): InstitutionSettings {
    return { ...settings };
  }
}
