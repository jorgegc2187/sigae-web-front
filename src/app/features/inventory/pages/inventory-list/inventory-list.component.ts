import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { CategoriesService } from '../../../categories/services/categories.service';
import { InventoryAssetGroup } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-inventory-list',
  imports: [
    DatePipe,
    RouterLink,
    ActionButtonComponent,
    DesktopPaginationComponent,
    SearchInputComponent,
  ],
  templateUrl: './inventory-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly categoriesService = inject(CategoriesService);

  readonly query = signal('');
  readonly categoryId = signal('all');
  readonly currentPage = signal(1);
  readonly selectedGroupIds = signal<string[]>([]);
  readonly pageSize = 10;

  readonly groupedAssetsResource = this.assetsService.listGroupedResource(this.query, this.categoryId);
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly groupedAssets = computed(() => this.groupedAssetsResource.value());
  readonly isLoading = computed(() => this.groupedAssetsResource.isLoading());
  readonly isEmpty = computed(() => !this.isLoading() && this.groupedAssets().length === 0);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.groupedAssets().length / this.pageSize)));
  readonly visibleGroups = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.groupedAssets().slice(start, start + this.pageSize);
  });
  readonly resultLabel = computed(() => {
    const total = this.groupedAssets().length;
    if (total === 0) return 'Mostrando 0 familias de activos';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `Mostrando ${start} a ${end} de ${total} familias de activos`;
  });

  updateQuery(value: string): void {
    this.query.set(value);
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  updateCategory(event: Event): void {
    this.categoryId.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  clearFilters(): void {
    this.query.set('');
    this.categoryId.set('all');
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedGroupIds.set(checked ? this.visibleGroups().map((group) => group.groupId) : []);
  }

  toggleGroupSelection(groupId: string, checked: boolean): void {
    this.selectedGroupIds.update((current) =>
      checked ? [...new Set([...current, groupId])] : current.filter((id) => id !== groupId),
    );
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds().includes(groupId);
  }

  areAllVisibleSelected(): boolean {
    const visibleGroupIds = this.visibleGroups().map((group) => group.groupId);
    return visibleGroupIds.length > 0 && visibleGroupIds.every((groupId) => this.selectedGroupIds().includes(groupId));
  }

  categoryBadgeClass(categoryName: string): string {
    const normalizedCategory = categoryName.toLowerCase();

    if (normalizedCategory.includes('mobili')) {
      return 'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700';
    }

    if (normalizedCategory.includes('cómput') || normalizedCategory.includes('comput')) {
      return 'inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700';
    }

    if (normalizedCategory.includes('laborat')) {
      return 'inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700';
    }

    if (normalizedCategory.includes('av') || normalizedCategory.includes('audio') || normalizedCategory.includes('video')) {
      return 'inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700';
    }

    return 'inline-flex items-center rounded-full border border-base-300 bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/70';
  }
}
