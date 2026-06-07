import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { InventoryAsset } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';
import { SettingsService } from '../../../settings/services/settings.service';

interface PrintableInventoryLabel {
  asset: InventoryAsset;
  qrDataUrl: string;
}

@Component({
  selector: 'app-inventory-label-print',
  imports: [
    DatePipe,
    RouterLink,
    ActionButtonComponent,
    ProcessingLoaderComponent,
  ],
  templateUrl: './inventory-label-print.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: oklch(var(--b2));
    }

    .label-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
      align-items: start;
    }

    .inventory-label-card {
      width: 100%;
      max-width: 430px;
      background: white;
      color: #111827;
    }

    @media print {
      :host {
        min-height: auto;
        background: white;
      }

      .print-toolbar {
        display: none !important;
      }

      .label-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6mm;
      }

      .inventory-label-card {
        max-width: none;
        break-inside: avoid;
        page-break-inside: avoid;
        box-shadow: none !important;
      }
    }
  `,
})
export class InventoryLabelPrintComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assetsService = inject(AssetsService);
  private readonly settingsService = inject(SettingsService);

  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly labels = signal<PrintableInventoryLabel[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly isLoadingLabels = signal(true);

  readonly settings = this.settingsService.settings;
  readonly hasSettings = computed(() => this.settings() !== null);
  readonly isLoading = computed(() => this.isLoadingLabels() || this.settingsService.settingsResource.isLoading());
  readonly hasError = computed(() => this.loadError() !== null);
  readonly hasLabels = computed(() => this.labels().length > 0);
  readonly institutionName = computed(() => this.settings()?.systemName || 'Institución educativa');
  readonly institutionAddressLine = computed(() => {
    const settings = this.settings();
    if (!settings) {
      return 'Dirección institucional no configurada';
    }

    const line = [settings.address, settings.city]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' · ');

    return line || 'Dirección institucional no configurada';
  });
  readonly logoUrl = computed(() => this.settings()?.institutionLogoUrl ?? null);

  constructor() {
    effect(() => {
      const queryParams = this.queryParams();
      void this.loadLabels(
        this.parseIdList(queryParams.get('assetIds')),
        this.parseIdList(queryParams.get('groupIds')),
      );
    });
  }

  async printNow(): Promise<void> {
    if (!this.hasLabels() || this.isLoading()) {
      return;
    }

    window.print();
  }

  async goBack(): Promise<void> {
    await this.router.navigate(['/inventory']);
  }

  private parseIdList(value: string | null): string[] {
    if (!value) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    );
  }

  private async loadLabels(assetIds: string[], groupIds: string[]): Promise<void> {
    this.isLoadingLabels.set(true);
    this.loadError.set(null);

    try {
      const resolvedAssetIds = await this.resolveAssetIds(assetIds, groupIds);
      if (resolvedAssetIds.length === 0) {
        this.labels.set([]);
        this.loadError.set('No se encontraron activos para imprimir tarjetas.');
        return;
      }

      const assets = await firstValueFrom(this.assetsService.getManyByIds(resolvedAssetIds));
      const labels = await Promise.all(
        assets
          .slice()
          .sort((left, right) => left.code.localeCompare(right.code, 'es'))
          .map(async (asset) => ({
            asset,
            qrDataUrl: await QRCode.toDataURL(asset.code, {
              width: 180,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            }),
          })),
      );

      this.labels.set(labels);
    } catch {
      this.labels.set([]);
      this.loadError.set('No se pudieron preparar las tarjetas de impresión.');
    } finally {
      this.isLoadingLabels.set(false);
    }
  }

  private async resolveAssetIds(assetIds: string[], groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) {
      return assetIds;
    }

    const groups = await Promise.all(
      groupIds.map((groupId) => firstValueFrom(this.assetsService.getGroupById(groupId))),
    );

    const groupUnitIds = groups.flatMap((group) => group.units.map((unit) => unit.id));
    return Array.from(new Set([...assetIds, ...groupUnitIds]));
  }
}
