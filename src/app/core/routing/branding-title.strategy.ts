import { effect, inject, Injectable, signal } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BrandingService } from '../services/branding.service';

@Injectable()
export class BrandingTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly brandingService = inject(BrandingService);
  private readonly pageTitle = signal<string | undefined>(undefined);

  constructor() {
    super();

    effect(() => {
      this.applyTitle(this.pageTitle(), this.brandingService.systemName());
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pageTitle.set(this.buildTitle(snapshot) ?? undefined);
  }

  private applyTitle(pageTitle: string | undefined, institutionName: string): void {
    const normalizedInstitutionName = institutionName.trim();
    const normalizedPageTitle = pageTitle?.trim();

    if (!normalizedPageTitle) {
      this.title.setTitle(normalizedInstitutionName);
      return;
    }

    this.title.setTitle(`${normalizedPageTitle} - ${normalizedInstitutionName}`);
  }
}
