import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { ListQueryState } from '../../../../shared/models/list-query-state.model';
import { Loan, LoanStatus, LoanStatusTab, MOCK_LOANS } from '../../models/loan.model';

interface LoanListQueryState extends ListQueryState<LoanStatusTab> {
  selectedIds: string[];
}

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [NgClass, DataListingComponent],
  templateUrl: './loan-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanListComponent {
  readonly pageSize = 5;

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
        loan.teacher.toLowerCase().includes(normalizedQuery) ||
        loan.assetsSummary.toLowerCase().includes(normalizedQuery) ||
        loan.location.toLowerCase().includes(normalizedQuery);

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

  getStatusBadgeClass(status: LoanStatus): string {
    const map: Record<LoanStatus, string> = {
      Activo: 'text-success bg-success/10',
      Vencido: 'text-error bg-error/10',
      Devuelto: 'text-base-content/60 bg-base-300/60',
    };

    return map[status];
  }

  getStatusDotClass(status: LoanStatus): string {
    const map: Record<LoanStatus, string> = {
      Activo: 'bg-success',
      Vencido: 'bg-error',
      Devuelto: 'bg-base-content/30',
    };

    return map[status];
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

  getExtraAssetsLabel(loan: Loan): string {
    const count = loan.extraAssets.length;
    return `Ver ${count} activo${count === 1 ? '' : 's'} adicional${count === 1 ? '' : 'es'}`;
  }

  getExtraAssetsPopoverId(loanId: string): string {
    return `loan-extra-assets-${loanId}`;
  }

  getExtraAssetsAnchorName(loanId: string): string {
    return `--loan-extra-assets-${loanId}`;
  }

  onCreateLoan() {
    console.log('Nuevo préstamo');
  }

  onViewLoan(loanId: string) {
    console.log('Ver préstamo', loanId);
  }
}
