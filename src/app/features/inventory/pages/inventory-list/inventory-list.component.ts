import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { AssetQrScannerModalComponent } from '../../../../shared/ui/asset-qr-scanner-modal/asset-qr-scanner-modal.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { CategoriesService } from '../../../categories/services/categories.service';
import { AssetsService } from '../../services/assets.service';

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

  readonly query = signal('');
  readonly categoryId = signal('all');
  readonly currentPage = signal(1);
  readonly selectedGroupIds = signal<string[]>([]);
  readonly isQrScannerOpen = signal(false);
  readonly pageSize = 10;

  readonly groupedAssetsResource = this.assetsService.listGroupedResource(this.query, this.categoryId);
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly categoryOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las categorías' },
    ...this.categories().map((category) => ({ value: category.id, label: category.name })),
  ]);
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

  openQrScanner(): void {
    this.isQrScannerOpen.set(true);
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
}
