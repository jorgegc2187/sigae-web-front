import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

type ActionButtonVariant = 'primary' | 'outline' | 'ghost' | 'neutral';
type ActionButtonSize = 'sm' | 'md' | 'lg';
type ActionButtonType = 'button' | 'submit' | 'reset';
type ActionButtonIconPosition = 'start' | 'end';

@Component({
  selector: 'app-action-button',
  imports: [RouterLink],
  templateUrl: './action-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class ActionButtonComponent {
  readonly label = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly iconPosition = input<ActionButtonIconPosition>('start');
  readonly variant = input<ActionButtonVariant>('primary');
  readonly size = input<ActionButtonSize>('md');
  readonly fullWidth = input(false);
  readonly disabled = input(false);
  readonly showPointer = input(true, { transform: booleanAttribute });
  readonly loading = input(false);
  readonly loadingLabel = input<string | null>(null);
  readonly href = input<string | null>(null);
  readonly routerLink = input<string | string[] | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly type = input<ActionButtonType>('button');
  readonly hostClass = input('');
  readonly className = input('');

  readonly clicked = output<MouseEvent>();

  readonly isDisabled = computed(() => this.disabled() || this.loading());

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
        : this.variant() === 'neutral'
          ? 'border border-base-300 bg-base-100 text-base-content shadow-sm hover:bg-base-200/70'
        : this.variant() === 'ghost'
          ? 'border border-transparent bg-transparent text-base-content/70 hover:bg-base-200/70 hover:text-base-content'
          : 'border border-primary bg-primary text-primary-content shadow-sm hover:bg-primary/90';

    const widthClass = this.fullWidth() ? 'w-full' : '';
    const pointerClass = !this.isDisabled() && this.showPointer() ? 'cursor-pointer' : '';
    const disabledClass = this.isDisabled()
      ? 'cursor-not-allowed border-base-300 bg-base-300 text-base-content/45 shadow-none pointer-events-none'
      : '';
    const extraClass = this.className().trim();

    return `inline-flex items-center justify-center font-semibold transition-colors ${sizeClass} ${variantClass} ${widthClass} ${pointerClass} ${disabledClass} ${extraClass}`.trim();
  });

  readonly iconClass = computed(() =>
    this.size() === 'sm' ? 'material-symbols-outlined text-[18px]' : 'material-symbols-outlined text-[20px]',
  );
  readonly spinnerClass = computed(() =>
    this.size() === 'sm' ? 'loading loading-spinner loading-xs' : 'loading loading-spinner loading-sm',
  );

  readonly isLink = computed(() => Boolean(this.routerLink() || this.href()));
  readonly resolvedAriaLabel = computed(() => this.ariaLabel() ?? this.label());
  readonly displayLabel = computed(() => this.loadingLabel() ?? this.label());

  readonly hostClasses = computed(() => `block ${this.hostClass().trim()}`.trim());

  onClick(event: MouseEvent) {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
