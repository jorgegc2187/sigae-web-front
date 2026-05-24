import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { MobilePaginationComponent } from '../../../../shared/ui/mobile-pagination/mobile-pagination.component';
import { ListQueryState } from '../../../../shared/models/list-query-state.model';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import {
  SegmentedFilterTabItem,
  SegmentedFilterTabsComponent,
} from '../../../../shared/ui/segmented-filter-tabs/segmented-filter-tabs.component';
import { LoanStatus, LoanStatusTab, LoanSummary } from '../../models/loan.model';
import { LoanStatusBadgeComponent } from '../../components/loan-status-badge/loan-status-badge.component';
import { LoansService } from '../../services/loans.service';

type AssetsPopoverContext = 'desktop' | 'mobile';
type LoanListQueryState = ListQueryState<LoanStatusTab>;

@Component({
  selector: 'app-loan-list',
  imports: [
    DesktopPaginationComponent,
    LoanStatusBadgeComponent,
    MobilePaginationComponent,
    SearchInputComponent,
    ActionButtonComponent,
    SelectFieldComponent,
    SegmentedFilterTabsComponent,
  ],
  templateUrl: './loan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanListComponent {
  readonly pageSize = 5;
  private readonly router = inject(Router);
  private readonly loansService = inject(LoansService);
  private readonly notifications = inject(NotificationService);
  private readonly dateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  readonly queryState = signal<LoanListQueryState>({
    search: '',
    page: 1,
    pageSize: this.pageSize,
    status: 'all',
    sort: undefined,
    direction: undefined,
  });
  readonly selectedLoanIds = signal<string[]>([]);
  private readonly loansResource = this.loansService.listResource(computed(() => ({
    search: this.queryState().search || undefined,
    status: this.queryState().status === 'all' ? undefined : this.queryState().status,
  })));
  readonly loans = computed(() => (this.loansResource.hasValue() ? this.loansResource.value() : []));
  readonly isLoading = computed(() => {
    const status = this.loansResource.status();
    return status === 'loading' || status === 'reloading';
  });
  readonly modulePending = computed(() =>
    this.loansService.isCollectionEndpointMissing(this.loansResource.error()),
  );
  readonly unexpectedError = computed(
    () => !!this.loansResource.error() && !this.modulePending(),
  );
  readonly stateTitle = computed(() => {
    if (this.modulePending()) {
      return 'Módulo de préstamos pendiente';
    }

    return 'No se pudo cargar la vista de préstamos';
  });
  readonly stateMessage = computed(() => {
    if (this.modulePending()) {
      return 'El módulo de préstamos aún no está disponible en la API. La vista seguirá visible mientras se implementa el backend.';
    }

    return 'Ocurrió un problema al consultar la API de préstamos. Intenta recargar esta pantalla nuevamente.';
  });

  readonly filteredLoans = computed(() => {
    const { search, status } = this.queryState();
    const normalizedQuery = search.toLowerCase().trim();

    return this.loans().filter((loan) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && loan.status === 'Activo') ||
        (status === 'overdue' && loan.status === 'Vencido') ||
        (status === 'returned' && loan.status === 'Devuelto');

      const matchesSearch =
        !normalizedQuery ||
        loan.teacher.name.toLowerCase().includes(normalizedQuery) ||
        loan.teacher.dni.toLowerCase().includes(normalizedQuery) ||
        loan.destination.toLowerCase().includes(normalizedQuery) ||
        loan.code.toLowerCase().includes(normalizedQuery) ||
        loan.assets.some(
          (asset) =>
            asset.name.toLowerCase().includes(normalizedQuery) ||
            asset.code.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesSearch;
    });
  });

  readonly totalResults = computed(() => this.filteredLoans().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalResults() / this.pageSize)));

  readonly paginatedLoans = computed(() => {
    const { page, pageSize } = this.queryState();
    const start = (page - 1) * pageSize;
    return this.filteredLoans().slice(start, start + pageSize);
  });

  readonly startItem = computed(() => {
    if (this.totalResults() === 0) {
      return 0;
    }

    return (this.queryState().page - 1) * this.queryState().pageSize + 1;
  });

  readonly endItem = computed(() =>
    Math.min(this.startItem() + this.paginatedLoans().length - 1, this.totalResults()),
  );

  readonly resultLabel = computed(
    () => `Mostrando ${this.startItem()} a ${this.endItem()} de ${this.totalResults()} resultados`,
  );

  readonly overdueCount = computed(
    () => this.loans().filter((loan) => loan.status === 'Vencido').length,
  );

  readonly statusTabs = computed<SegmentedFilterTabItem[]>(() => [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'overdue', label: 'Vencidos', badgeCount: this.overdueCount() },
    { value: 'returned', label: 'Devueltos' },
  ]);
  readonly statusOptions = computed<SelectFieldOption[]>(() =>
    this.statusTabs().map((tab) => ({
      value: tab.value,
      label: tab.badgeCount === undefined ? tab.label : `${tab.label} (${tab.badgeCount})`,
    })),
  );

  readonly selectedIds = computed(() => this.selectedLoanIds());

  readonly allVisibleSelected = computed(() => {
    const visibleIds = this.paginatedLoans().map((loan) => loan.id);
    return visibleIds.length > 0 && visibleIds.every((id) => this.selectedIds().includes(id));
  });

  onSearch(value: string) {
    this.queryState.update((state) => ({
      ...state,
      search: value,
      page: 1,
    }));
    this.selectedLoanIds.set([]);
  }

  onStatusTabChange(status: LoanStatusTab) {
    this.queryState.update((state) => ({
      ...state,
      status,
      page: 1,
    }));
    this.selectedLoanIds.set([]);
  }

  onStatusTabSelect(status: string) {
    this.onStatusTabChange(status as LoanStatusTab);
  }

  onPageChange(page: number) {
    this.queryState.update((state) => ({
      ...state,
      page,
    }));
  }

  onToggleSelectAll(checked: boolean) {
    const visibleIds = this.paginatedLoans().map((loan) => loan.id);
    this.selectedLoanIds.update((current) => {
      const selectedIds = new Set(current);

      if (checked) {
        visibleIds.forEach((id) => selectedIds.add(id));
      } else {
        visibleIds.forEach((id) => selectedIds.delete(id));
      }

      return Array.from(selectedIds);
    });
  }

  onToggleLoanSelection(loanId: string, checked: boolean) {
    this.selectedLoanIds.update((current) => {
      const selectedIds = new Set(current);

      if (checked) {
        selectedIds.add(loanId);
      } else {
        selectedIds.delete(loanId);
      }

      return Array.from(selectedIds);
    });
  }

  isSelected(loanId: string): boolean {
    return this.selectedIds().includes(loanId);
  }

  isStatusTabActive(status: LoanStatusTab): boolean {
    return this.queryState().status === status;
  }

  getTeacherAvatarClass(status: LoanStatus): string {
    if (status === 'Vencido') {
      return 'bg-error/10 text-error';
    }

    if (status === 'Devuelto') {
      return 'bg-secondary/10 text-secondary';
    }

    return 'bg-primary/10 text-primary';
  }

  getLoanRowClass(status: LoanStatus): string {
    if (status === 'Vencido') {
      return 'transition-colors bg-error/5 hover:bg-error/10';
    }

    if (status === 'Devuelto') {
      return 'transition-colors opacity-75 hover:bg-base-200/35';
    }

    return 'transition-colors hover:bg-base-200/35';
  }

  getPrimaryAssetName(loan: LoanSummary): string {
    return loan.assets[0]?.name ?? 'Sin activos registrados';
  }

  getExtraAssets(loan: LoanSummary) {
    return loan.assets.slice(1);
  }

  getAssetsCountLabel(loan: LoanSummary): string {
    const count = loan.assets.length;
    return `${count} activo${count === 1 ? '' : 's'}`;
  }

  getAssetsCountAriaLabel(loan: LoanSummary): string {
    return `Ver ${this.getAssetsCountLabel(loan).toLowerCase()} del préstamo`;
  }

  getExtraAssetsLabel(loan: LoanSummary): string {
    const count = this.getExtraAssets(loan).length;
    return `Ver ${count} activo${count === 1 ? '' : 's'} adicional${count === 1 ? '' : 'es'}`;
  }

  getAssetsPopoverId(loanId: string, context: AssetsPopoverContext): string {
    return `loan-assets-${context}-${loanId}`;
  }

  getAssetsAnchorName(loanId: string, context: AssetsPopoverContext): string {
    return `--loan-assets-${context}-${loanId}`;
  }

  getMobileStatusCardClass(status: LoanStatus): string {
    if (status === 'Vencido') {
      return 'border-error/20 bg-error/5';
    }

    return 'border-base-300 bg-base-100';
  }

  formatDate(dateIso: string): string {
    return this.dateFormatter.format(new Date(dateIso));
  }

  onCreateLoan() {
    this.router.navigate(['/loans/new']);
  }

  onViewLoan(loanId: string) {
    this.router.navigate(['/loans', loanId]);
  }

  reloadLoans() {
    this.loansResource.reload();
    if (this.modulePending()) {
      this.notifications.info({
        message: 'El backend de préstamos aún no está disponible en la API.',
      });
    }
  }
}
