import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-bulk-selection-banner',
  templateUrl: './bulk-selection-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
})
export class BulkSelectionBannerComponent {
  readonly visibleSelectedCount = input.required<number>();
  readonly totalFilteredCount = input.required<number>();
  readonly itemLabelSingular = input.required<string>();
  readonly itemLabelPlural = input.required<string>();
  readonly allFilteredSelected = input(false);
  readonly scopeLabel = input<string | null>(null);

  readonly selectAllRequested = output<void>();
  readonly clearRequested = output<void>();

  readonly visibleLabel = computed(() =>
    this.visibleSelectedCount() === 1 ? this.itemLabelSingular() : this.itemLabelPlural(),
  );

  readonly totalLabel = computed(() =>
    this.totalFilteredCount() === 1 ? this.itemLabelSingular() : this.itemLabelPlural(),
  );

  readonly normalizedScopeLabel = computed(() => this.scopeLabel()?.trim() || null);

  readonly message = computed(() => {
    if (this.allFilteredSelected()) {
      return `Están seleccionados los ${this.totalFilteredCount()} ${this.totalLabel()} filtrados.`;
    }

    return `Se seleccionaron los ${this.visibleSelectedCount()} ${this.visibleLabel()} de esta página.`;
  });

  readonly selectAllLabel = computed(() => {
    const scopeSuffix = this.normalizedScopeLabel();
    return scopeSuffix
      ? `Seleccionar los ${this.totalFilteredCount()} ${this.totalLabel()} ${scopeSuffix}`
      : `Seleccionar los ${this.totalFilteredCount()} ${this.totalLabel()} filtrados`;
  });

  readonly secondaryActionLabel = computed(() =>
    this.allFilteredSelected() ? 'Limpiar selección' : this.selectAllLabel(),
  );
}
