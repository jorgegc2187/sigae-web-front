import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { AssetQrScannerModalComponent } from '../../../../shared/ui/asset-qr-scanner-modal/asset-qr-scanner-modal.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { CategoriesService } from '../../../categories/services/categories.service';
import { AssetCondition } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';
import { openInventoryLabelPrint } from '../../utils/inventory-label-print.util';

type InventoryView = 'grouped' | 'list';

@Component({
  selector: 'app-inventory-list',
  imports: [
    DatePipe,
    RouterLink,
    AssetQrScannerModalComponent,
    ActionButtonComponent,
    DesktopPaginationComponent,
    SearchInputComponent,
    SelectFieldComponent,
  ],
  templateUrl: './inventory-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly query = signal('');
  readonly categoryId = signal('all');
  readonly currentPage = signal(1);
  readonly selectedGroupIds = signal<string[]>([]);
  readonly listQuery = signal('');
  readonly listCategoryId = signal('all');
  readonly listStatus = signal<'all' | AssetCondition>('all');
  readonly listLocationId = signal('all');
  readonly listCurrentPage = signal(1);
  readonly selectedAssetIds = signal<string[]>([]);
  readonly isQrScannerOpen = signal(false);
  readonly pageSize = 10;
  readonly listPageSize = 10;
  readonly activeView = toSignal(
    this.route.queryParamMap,
    { initialValue: this.route.snapshot.queryParamMap },
  );

  readonly groupedAssetsResource = this.assetsService.listGroupedResource(this.query, this.categoryId);
  readonly assets = toSignal(this.assetsService.list(), { initialValue: [] });
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly currentView = computed<InventoryView>(() =>
    this.activeView().get('view') === 'grouped' ? 'grouped' : 'list',
  );
  readonly categoryOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las categorías' },
    ...this.categories().map((category) => ({ value: category.id, label: category.name })),
  ]);
  readonly groupedAssets = computed(() =>
    this.groupedAssetsResource.hasValue() ? this.groupedAssetsResource.value() : [],
  );
  readonly isLoading = computed(() => this.groupedAssetsResource.isLoading());
  readonly isEmpty = computed(() => !this.isLoading() && this.groupedAssets().length === 0);
  readonly listLocationOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las ubicaciones' },
    ...Array.from(
      new Map(
        this.assets().map((asset) => [asset.locationId, { value: asset.locationId, label: asset.locationName }]),
      ).values(),
    ).sort((left, right) => left.label.localeCompare(right.label, 'es')),
  ]);
  readonly listStatusOptions: SelectFieldOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Malo', label: 'Malo' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Dado de baja', label: 'Dado de baja' },
  ];

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
  readonly hasSelectedGroups = computed(() => this.selectedGroupIds().length > 0);
  readonly filteredAssets = computed(() => {
    const query = this.listQuery().trim().toLowerCase();
    const categoryId = this.listCategoryId();
    const status = this.listStatus();
    const locationId = this.listLocationId();

    return this.assets().filter((asset) => {
      const matchesQuery =
        !query
        || asset.name.toLowerCase().includes(query)
        || asset.code.toLowerCase().includes(query)
        || asset.serial?.toLowerCase().includes(query)
        || asset.barcode?.toLowerCase().includes(query)
        || asset.locationName.toLowerCase().includes(query);
      const matchesCategory = categoryId === 'all' || asset.categoryId === categoryId;
      const matchesStatus = status === 'all' || asset.condition === status;
      const matchesLocation = locationId === 'all' || asset.locationId === locationId;
      return matchesQuery && matchesCategory && matchesStatus && matchesLocation;
    });
  });
  readonly listTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredAssets().length / this.listPageSize)));
  readonly visibleAssets = computed(() => {
    const start = (this.listCurrentPage() - 1) * this.listPageSize;
    return this.filteredAssets().slice(start, start + this.listPageSize);
  });
  readonly listResultLabel = computed(() => {
    const total = this.filteredAssets().length;
    if (total === 0) return 'Mostrando 0 activos';
    const start = (this.listCurrentPage() - 1) * this.listPageSize + 1;
    const end = Math.min(start + this.listPageSize - 1, total);
    return `Mostrando ${start} a ${end} de ${total} activos`;
  });
  readonly hasSelectedAssets = computed(() => this.selectedAssetIds().length > 0);

  constructor() {
    effect(() => {
      const currentView = this.activeView().get('view');
      if (currentView === 'grouped' || currentView === 'list') {
        return;
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: 'list' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  updateQuery(value: string): void {
    this.query.set(value);
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  updateCategory(categoryId: string): void {
    this.categoryId.set(categoryId);
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  clearFilters(): void {
    this.query.set('');
    this.categoryId.set('all');
    this.currentPage.set(1);
    this.selectedGroupIds.set([]);
  }

  updateListQuery(value: string): void {
    this.listQuery.set(value);
    this.listCurrentPage.set(1);
    this.selectedAssetIds.set([]);
  }

  updateListCategory(categoryId: string): void {
    this.listCategoryId.set(categoryId);
    this.listCurrentPage.set(1);
    this.selectedAssetIds.set([]);
  }

  updateListStatus(status: string): void {
    this.listStatus.set(status as 'all' | AssetCondition);
    this.listCurrentPage.set(1);
    this.selectedAssetIds.set([]);
  }

  updateListLocation(locationId: string): void {
    this.listLocationId.set(locationId);
    this.listCurrentPage.set(1);
    this.selectedAssetIds.set([]);
  }

  clearListFilters(): void {
    this.listQuery.set('');
    this.listCategoryId.set('all');
    this.listStatus.set('all');
    this.listLocationId.set('all');
    this.listCurrentPage.set(1);
    this.selectedAssetIds.set([]);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  goToListPage(page: number): void {
    this.listCurrentPage.set(page);
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

  toggleSelectAllAssets(checked: boolean): void {
    this.selectedAssetIds.set(checked ? this.visibleAssets().map((asset) => asset.id) : []);
  }

  toggleAssetSelection(assetId: string, checked: boolean): void {
    this.selectedAssetIds.update((current) =>
      checked ? [...new Set([...current, assetId])] : current.filter((id) => id !== assetId),
    );
  }

  isAssetSelected(assetId: string): boolean {
    return this.selectedAssetIds().includes(assetId);
  }

  areAllVisibleAssetsSelected(): boolean {
    const visibleAssetIds = this.visibleAssets().map((asset) => asset.id);
    return visibleAssetIds.length > 0 && visibleAssetIds.every((assetId) => this.selectedAssetIds().includes(assetId));
  }

  openQrScanner(): void {
    this.isQrScannerOpen.set(true);
  }

  printSelectedLabels(): void {
    const selectedGroupIds = this.selectedGroupIds();
    if (selectedGroupIds.length === 0) {
      return;
    }

    openInventoryLabelPrint(this.router, {
      groupIds: selectedGroupIds.join(','),
    });
  }

  printSelectedAssetLabels(): void {
    const selectedAssetIds = this.selectedAssetIds();
    if (selectedAssetIds.length === 0) {
      return;
    }

    openInventoryLabelPrint(this.router, {
      assetIds: selectedAssetIds.join(','),
    });
  }

  printAssetLabel(assetId: string): void {
    openInventoryLabelPrint(this.router, {
      assetIds: assetId,
    });
  }

  async setActiveView(view: InventoryView): Promise<void> {
    const currentView = this.currentView();
    if (currentView === view) {
      return;
    }

    if (currentView === 'grouped') {
      this.selectedGroupIds.set([]);
    } else {
      this.selectedAssetIds.set([]);
    }

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge',
    });
  }

  closeQrScanner(): void {
    this.isQrScannerOpen.set(false);
  }

  async onQrCodeDetected(rawCode: string): Promise<void> {
    this.closeQrScanner();

    try {
      const asset = await firstValueFrom(this.assetsService.lookupByScanValue(rawCode));
      await this.router.navigate(['/inventory', asset.id]);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.notifications.error({ message: 'No se encontró un activo asociado al código QR escaneado.' });
        return;
      }

      this.notifications.error({ message: 'No se pudo resolver el activo escaneado. Intente nuevamente.' });
    }
  }

  getAssetStatusClass(condition: AssetCondition): string {
    if (condition === 'Bueno') return 'border-success/20 bg-success/10 text-success';
    if (condition === 'Regular') return 'border-warning/20 bg-warning/10 text-warning';
    if (condition === 'Mantenimiento') return 'border-info/20 bg-info/10 text-info';
    if (condition === 'Malo') return 'border-error/20 bg-error/10 text-error';
    return 'border-base-300 bg-base-200 text-base-content/60';
  }
}
