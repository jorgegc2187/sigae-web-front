import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { AssetCondition } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';
import { openInventoryLabelPrint } from '../../utils/inventory-label-print.util';

@Component({
  selector: 'app-inventory-group-detail',
  imports: [
    RouterLink,
    DatePipe,
    ActionButtonComponent,
    DesktopPaginationComponent,
    SearchInputComponent,
    SelectFieldComponent,
  ],
  templateUrl: './inventory-group-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryGroupDetailComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly router = inject(Router);

  readonly groupId = input.required<string>();
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<'all' | AssetCondition>('all');
  readonly selectedUnitIds = signal<string[]>([]);
  readonly statusOptions: SelectFieldOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Malo', label: 'Malo' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Dado de baja', label: 'Dado de baja' },
  ];
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly groupResource = this.assetsService.groupedDetailResource(this.groupId);
  readonly isLoading = computed(() => this.groupResource.isLoading());
  readonly hasError = computed(() => this.groupResource.status() === 'error');
  readonly group = computed(() => this.groupResource.hasValue() ? this.groupResource.value() : null);

  readonly filteredUnits = computed(() => {
    const group = this.group();
    if (!group) {
      return [];
    }

    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return group.units.filter((unit) => {
      const matchesQuery = !query
        || unit.code.toLowerCase().includes(query)
        || unit.locationName.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || unit.condition === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUnits().length / this.pageSize)));
  readonly paginatedUnits = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUnits().slice(start, start + this.pageSize);
  });
  readonly isEmpty = computed(() => !this.isLoading() && !this.hasError() && this.filteredUnits().length === 0);
  readonly resultLabel = computed(() => {
    const total = this.filteredUnits().length;
    if (total === 0) {
      return 'Mostrando 0 unidades';
    }

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `Mostrando ${start} a ${end} de ${total} unidades`;
  });
  readonly hasSelectedUnits = computed(() => this.selectedUnitIds().length > 0);

  updateQuery(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.selectedUnitIds.set([]);
  }

  updateStatusFilter(status: string): void {
    this.selectedStatus.set(status as 'all' | AssetCondition);
    this.currentPage.set(1);
    this.selectedUnitIds.set([]);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('all');
    this.currentPage.set(1);
    this.selectedUnitIds.set([]);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedUnitIds.set(checked ? this.paginatedUnits().map((unit) => unit.id) : []);
  }

  toggleUnitSelection(unitId: string, checked: boolean): void {
    this.selectedUnitIds.update((current) =>
      checked ? [...new Set([...current, unitId])] : current.filter((id) => id !== unitId),
    );
  }

  isUnitSelected(unitId: string): boolean {
    return this.selectedUnitIds().includes(unitId);
  }

  areAllVisibleSelected(): boolean {
    const visibleUnitIds = this.paginatedUnits().map((unit) => unit.id);
    return visibleUnitIds.length > 0 && visibleUnitIds.every((unitId) => this.selectedUnitIds().includes(unitId));
  }

  printSelectedLabels(): void {
    const selectedUnitIds = this.selectedUnitIds();
    if (selectedUnitIds.length === 0) {
      return;
    }

    openInventoryLabelPrint(this.router, {
      assetIds: selectedUnitIds.join(','),
    });
  }

  printUnitLabel(assetId: string): void {
    openInventoryLabelPrint(this.router, {
      assetIds: assetId,
    });
  }

  getAssetStatusClass(condition: AssetCondition): string {
    const map: Record<AssetCondition, string> = {
      Bueno: 'border-success/20 bg-success/10 text-success',
      Regular: 'border-warning/20 bg-warning/10 text-warning',
      Malo: 'border-error/20 bg-error/10 text-error',
      Mantenimiento: 'border-info/20 bg-info/10 text-info',
      'Dado de baja': 'border-base-300 bg-base-200 text-base-content/60',
    };

    return map[condition];
  }
}
