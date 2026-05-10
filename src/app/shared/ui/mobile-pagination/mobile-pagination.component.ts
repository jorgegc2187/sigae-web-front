import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-mobile-pagination',
  standalone: true,
  templateUrl: './mobile-pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobilePaginationComponent {
  currentPage = input(1);
  totalPages = input(1);
  pageLabel = input<string>();

  pageChange = output<number>();

  readonly canGoPrevious = computed(() => this.currentPage() > 1);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages());
  readonly resolvedPageLabel = computed(
    () => this.pageLabel() ?? `${this.currentPage()} de ${this.totalPages()}`,
  );

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
}
