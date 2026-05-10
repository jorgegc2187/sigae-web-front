import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { ListQueryState } from '../../../../shared/models/list-query-state.model';
import { Loan, LoanStatus, LoanStatusTab, MOCK_LOANS } from '../../models/loan.model';
import { LoanStatusBadgeComponent } from '../../components/loan-status-badge/loan-status-badge.component';
interface LoanListQueryState extends ListQueryState<LoanStatusTab> {
  selectedIds: string[];
}

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [NgClass, DataListingComponent, LoanStatusBadgeComponent],
  templateUrl: './loan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanListComponent {
  readonly pageSize = 5;
  private readonly router = inject(Router);
  private readonly dateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  private readonly loans = signal<Loan[]>(MOCK_LOANS);

  readonly queryState = signal<LoanListQueryState>({
    search: '',
    page: 1,
    pageSize: this.pageSize,
    status: 'all',
    sort: undefined,
    direction: undefined,
    selectedIds: [],
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

  readonly selectedIds = computed(() => this.queryState().selectedIds);

  readonly allVisibleSelected = computed(() => {
    const visibleIds = this.paginatedLoans().map((loan) => loan.id);
    return visibleIds.length > 0 && visibleIds.every((id) => this.selectedIds().includes(id));
  });

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.queryState.update((state) => ({
      ...state,
      search: value,
      page: 1,
    }));
  }

  onStatusTabChange(status: LoanStatusTab) {
    this.queryState.update((state) => ({
      ...state,
      status,
      page: 1,
    }));
  }

  onPageChange(page: number) {
    this.queryState.update((state) => ({
      ...state,
      page,
    }));
  }

  onToggleSelectAll(checked: boolean) {
    const visibleIds = this.paginatedLoans().map((loan) => loan.id);

    this.queryState.update((state) => {
      const selectedIds = new Set(state.selectedIds);

      if (checked) {
        visibleIds.forEach((id) => selectedIds.add(id));
      } else {
        visibleIds.forEach((id) => selectedIds.delete(id));
      }

      return {
        ...state,
        selectedIds: Array.from(selectedIds),
      };
    });
  }

  onToggleLoanSelection(loanId: string, checked: boolean) {
    this.queryState.update((state) => {
      const selectedIds = new Set(state.selectedIds);

      if (checked) {
        selectedIds.add(loanId);
      } else {
        selectedIds.delete(loanId);
      }

      return {
        ...state,
        selectedIds: Array.from(selectedIds),
      };
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
      return 'bg-error/5 hover:bg-error/10';
    }

    if (status === 'Devuelto') {
      return 'opacity-75 hover:bg-base-200/35';
    }

    return 'hover:bg-base-200/35';
  }

  getPrimaryAssetName(loan: Loan): string {
    return loan.assets[0]?.name ?? 'Sin activos registrados';
  }

  getExtraAssets(loan: Loan) {
    return loan.assets.slice(1);
  }

  getAssetsCountLabel(loan: Loan): string {
    const count = loan.assets.length;
    return `${count} activo${count === 1 ? '' : 's'}`;
  }

  getAssetsCountAriaLabel(loan: Loan): string {
    return `Ver ${this.getAssetsCountLabel(loan).toLowerCase()} del préstamo`;
  }

  getExtraAssetsLabel(loan: Loan): string {
    const count = this.getExtraAssets(loan).length;
    return `Ver ${count} activo${count === 1 ? '' : 's'} adicional${count === 1 ? '' : 'es'}`;
  }

  getExtraAssetsPopoverId(loanId: string): string {
    return `loan-extra-assets-${loanId}`;
  }

  getExtraAssetsAnchorName(loanId: string): string {
    return `--loan-extra-assets-${loanId}`;
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
}
