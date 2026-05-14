import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-data-listing',
  templateUrl: './data-listing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataListingComponent {
  title = input<string>();
  isLoading = input(false);
  isEmpty = input(false);
  resultLabel = input('Mostrando 0 resultados');
  currentPage = input(1);
  totalPages = input(1);
  selectionEnabled = input(false);
  allSelected = input(false);
  selectedCount = input(0);

  pageChange = output<number>();
  toggleSelectAll = output<boolean>();

  readonly pages = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();

    if (totalPages <= 1) {
      return [1];
    }

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage]);

    if (currentPage > 2) {
      pages.add(currentPage - 1);
    }

    if (currentPage < totalPages - 1) {
      pages.add(currentPage + 1);
    }

    if (currentPage <= 2) {
      pages.add(2);
      pages.add(3);
    }

    if (currentPage >= totalPages - 1) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  });

  readonly hasMultiplePages = computed(() => this.totalPages() > 1);
  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());

  onPreviousPage() {
    if (this.canGoPrevious()) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  onNextPage() {
    if (this.canGoNext()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  onSelectAll(event: Event) {
    this.toggleSelectAll.emit((event.target as HTMLInputElement).checked);
  }

  showLeadingEllipsis(page: number, index: number): boolean {
    return index > 0 && page - this.pages()[index - 1] > 1;
  }
}
