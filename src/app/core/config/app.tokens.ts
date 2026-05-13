import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const APP_CONFIG = new InjectionToken<typeof environment>('APP_CONFIG');
