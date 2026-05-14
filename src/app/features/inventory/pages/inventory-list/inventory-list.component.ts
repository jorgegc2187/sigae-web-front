import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOCK_ASSET_LOCATIONS, MOCK_CATEGORY_FILTERS } from '../../../../shared/models/mock-inventory-catalog.model';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { INVENTORY_ASSETS } from '../../data/inventory.mock';
import { AssetCondition } from '../../models/inventory.model';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [RouterLink, ActionButtonComponent, DataListingComponent, SearchInputComponent, StatusBadgeComponent],
  templateUrl: './inventory-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent {
  readonly query = signal('');
  readonly categoryId = signal('all');
  readonly locationId = signal('all');
  readonly condition = signal<AssetCondition | 'all'>('all');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly categories = MOCK_CATEGORY_FILTERS;
  readonly locations = MOCK_ASSET_LOCATIONS;
  readonly conditions: AssetCondition[] = ['Bueno', 'Regular', 'Malo', 'Mantenimiento', 'Dado de baja'];

  readonly filteredAssets = computed(() => {
    const query = this.query().trim().toLowerCase();
    return INVENTORY_ASSETS.filter((asset) => {
      const matchesQuery = !query || [asset.name, asset.code, asset.serial, asset.locationName, asset.typeName]
        .some((value) => value.toLowerCase().includes(query));
      const matchesCategory = this.categoryId() === 'all' || asset.categoryId === this.categoryId();
      const matchesLocation = this.locationId() === 'all' || asset.locationId === this.locationId();
      const matchesCondition = this.condition() === 'all' || asset.condition === this.condition();
      return matchesQuery && matchesCategory && matchesLocation && matchesCondition;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAssets().length / this.pageSize)));
  readonly visibleAssets = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredAssets().slice(start, start + this.pageSize);
  });
  readonly resultLabel = computed(() => {
    const total = this.filteredAssets().length;
    if (total === 0) return 'Mostrando 0 activos';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `Mostrando ${start}-${end} de ${total} activos`;
  });

  updateQuery(value: string): void {
    this.query.set(value);
    this.currentPage.set(1);
  }

  updateCategory(event: Event): void {
    this.categoryId.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateLocation(event: Event): void {
    this.locationId.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateCondition(event: Event): void {
    this.condition.set((event.target as HTMLSelectElement).value as AssetCondition | 'all');
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
