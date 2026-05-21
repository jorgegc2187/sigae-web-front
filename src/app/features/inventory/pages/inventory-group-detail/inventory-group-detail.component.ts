import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { AssetCondition } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-inventory-group-detail',
  imports: [
    RouterLink,
    DatePipe,
    ActionButtonComponent,
    DataListingComponent,
    SearchInputComponent,
    SelectFieldComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './inventory-group-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryGroupDetailComponent {
  private readonly assetsService = inject(AssetsService);

  readonly groupId = input.required<string>();
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<'all' | AssetCondition>('all');
  readonly statusOptions: SelectFieldOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Bueno', label: 'Operativo' },
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
    return `Mostrando ${start}-${end} de ${total} unidades`;
  });

  updateQuery(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  updateStatusFilter(status: string): void {
    this.selectedStatus.set(status as 'all' | AssetCondition);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  conditionTone(condition: AssetCondition): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
    if (condition === 'Bueno') return 'success';
    if (condition === 'Regular') return 'warning';
    if (condition === 'Mantenimiento') return 'info';
    if (condition === 'Malo') return 'error';
    return 'neutral';
  }
}
