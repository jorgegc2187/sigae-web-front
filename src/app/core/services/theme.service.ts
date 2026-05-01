import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'sigae-light' | 'sigae-dark'>('sigae-light');

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
  }

  toggle() {
    this.theme.update(t => t === 'sigae-light' ? 'sigae-dark' : 'sigae-light');
  }
}
