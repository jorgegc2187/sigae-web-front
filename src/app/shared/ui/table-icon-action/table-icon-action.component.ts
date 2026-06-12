import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

type TableIconActionTone = 'view' | 'edit' | 'print' | 'history' | 'deactivate' | 'activate';
type TableIconActionType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-table-icon-action',
  imports: [RouterLink],
  templateUrl: './table-icon-action.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableIconActionComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly tone = input<TableIconActionTone>('view');
  readonly routerLink = input<string | string[] | null>(null);
  readonly fragment = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<TableIconActionType>('button');

  readonly clicked = output<MouseEvent>();

  readonly isLink = computed(() => Boolean(this.routerLink()));
  readonly buttonClasses = computed(() => {
    const toneClass =
      this.tone() === 'edit'
        ? 'border-info/15 bg-info/8 text-info hover:border-info/25 hover:bg-info/14'
        : this.tone() === 'print'
          ? 'border-secondary/15 bg-secondary/8 text-secondary hover:border-secondary/25 hover:bg-secondary/14'
          : this.tone() === 'history'
            ? 'border-base-300 bg-base-100 text-base-content/60 hover:border-primary/20 hover:bg-primary/6 hover:text-primary'
            : this.tone() === 'deactivate'
              ? 'border-error/15 bg-error/8 text-error hover:border-error/25 hover:bg-error/14'
              : this.tone() === 'activate'
                ? 'border-success/15 bg-success/8 text-success hover:border-success/25 hover:bg-success/14'
                : 'border-primary/15 bg-primary/8 text-primary hover:border-primary/25 hover:bg-primary/14';

    const disabledClass = this.disabled()
      ? 'cursor-not-allowed border-base-300 bg-base-200 text-base-content/35 pointer-events-none'
      : 'cursor-pointer';

    return `inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20 ${toneClass} ${disabledClass}`.trim();
  });

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
