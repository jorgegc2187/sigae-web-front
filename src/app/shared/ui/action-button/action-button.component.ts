import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

type ActionButtonVariant = 'primary' | 'outline' | 'ghost';
type ActionButtonSize = 'sm' | 'md' | 'lg';
type ActionButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './action-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent {
  readonly label = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly variant = input<ActionButtonVariant>('primary');
  readonly size = input<ActionButtonSize>('md');
  readonly fullWidth = input(false);
  readonly disabled = input(false);
  readonly href = input<string | null>(null);
  readonly routerLink = input<string | string[] | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly type = input<ActionButtonType>('button');

  readonly clicked = output<MouseEvent>();

  readonly classes = computed(() => {
    const sizeClass =
      this.size() === 'sm'
        ? 'h-9 rounded-lg px-4 text-sm gap-2'
        : this.size() === 'lg'
          ? 'h-12 rounded-xl px-5 text-sm gap-2'
          : 'h-10 rounded-lg px-4 text-sm gap-2';

    const variantClass =
      this.variant() === 'outline'
        ? 'border border-primary bg-base-100 text-primary shadow-sm hover:bg-primary/5'
        : this.variant() === 'ghost'
          ? 'border border-transparent bg-transparent text-base-content/70 hover:bg-base-200/70 hover:text-base-content'
          : 'border border-primary bg-primary text-primary-content shadow-sm hover:bg-primary/90';

    const widthClass = this.fullWidth() ? 'w-full' : '';
    const disabledClass = this.disabled()
      ? 'cursor-not-allowed border-base-300 bg-base-300 text-base-content/45 shadow-none pointer-events-none'
      : '';

    return `inline-flex items-center justify-center font-semibold transition-colors ${sizeClass} ${variantClass} ${widthClass} ${disabledClass}`;
  });

  readonly iconClass = computed(() =>
    this.size() === 'sm' ? 'material-symbols-outlined text-[18px]' : 'material-symbols-outlined text-[20px]',
  );

  readonly isLink = computed(() => Boolean(this.routerLink() || this.href()));
  readonly resolvedAriaLabel = computed(() => this.ariaLabel() ?? this.label());

  onClick(event: MouseEvent) {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
