import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app.tokens';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideHttpClient(),
    { provide: APP_CONFIG, useValue: environment },
  ]
};
