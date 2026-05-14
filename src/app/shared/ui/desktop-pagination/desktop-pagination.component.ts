import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-desktop-pagination',
  templateUrl: './desktop-pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopPaginationComponent {
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly resultLabel = input('Mostrando 0 resultados');
  readonly sticky = input(false);

  readonly pageChange = output<number>();

  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());
  readonly hasMultiplePages = computed(() => this.totalPages() > 1);
  readonly containerClasses = computed(() =>
    [
      'border-t border-base-300 bg-base-100 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]',
      'flex items-center justify-between gap-4',
      this.sticky() ? 'sticky bottom-0 z-10 mt-auto' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

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

  showLeadingEllipsis(page: number, index: number): boolean {
    return index > 0 && page - this.pages()[index - 1] > 1;
  }
}
