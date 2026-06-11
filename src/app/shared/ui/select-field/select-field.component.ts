import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormFieldComponent } from '../form-field/form-field.component';

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type SelectFieldAppearance = 'form' | 'toolbar';

@Component({
  selector: 'app-select-field',
  imports: [FormFieldComponent],
  templateUrl: './select-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true,
    },
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class SelectFieldComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false);
  readonly fieldId = input<string | null>(null);
  readonly placeholder = input('Seleccione una opción');
  readonly size = input<'md' | 'compact'>('md');
  readonly appearance = input<SelectFieldAppearance>('form');
  readonly options = input<SelectFieldOption[]>([]);
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly valueChange = output<string>();

  private readonly container = viewChild<ElementRef<HTMLElement>>('container');
  readonly internalValue = signal('');
  private readonly internalDisabled = signal(false);
  private readonly isCvaBound = signal(false);
  readonly isOpen = signal(false);
  readonly highlightedIndex = signal(-1);
  readonly menuId = `app-select-field-menu-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

  readonly isToolbar = computed(() => this.appearance() === 'toolbar');
  readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.internalValue()) ?? null,
  );
  readonly displayLabel = computed(() => this.selectedOption()?.label ?? this.placeholder());
  readonly hasSelection = computed(() => this.selectedOption() !== null);
  readonly isDisabled = computed(() => this.disabled() || this.internalDisabled());
  readonly chevronClass = computed(() =>
    `material-symbols-outlined text-[20px] text-base-content/45 transition-transform duration-200 ease-out ${this.isOpen() ? 'rotate-180' : ''}`,
  );
  readonly triggerClass = computed(() =>
    `flex w-full items-center justify-between gap-3 border-0 bg-transparent p-0 text-left text-sm outline-none ${
      this.isDisabled() ? 'cursor-not-allowed text-base-content/40' : 'cursor-pointer'
    }`,
  );
  readonly toolbarLabelClass = computed(() =>
    this.label() ? 'mb-1.5 block text-sm font-medium text-base-content/70' : 'sr-only',
  );
  readonly toolbarWrapperClass = computed(() => {
    const invalid = !!this.error();
    const stateClass = invalid
      ? 'border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error'
      : 'border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary';

    return `flex h-11 w-full items-center gap-2 rounded-lg border bg-base-100 px-4 text-base-content shadow-sm transition-all ${stateClass}`;
  });
  readonly helperTextClass = computed(() =>
    this.error() ? 'mt-1 text-sm text-error' : 'mt-1 text-sm text-base-content/55',
  );
  readonly valueClass = computed(() =>
    this.hasSelection() ? 'block truncate text-base-content' : 'block truncate text-base-content/45',
  );
  readonly menuClass = computed(() =>
    `absolute left-0 top-[calc(100%+0.375rem)] z-[70] w-full origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_36px_-16px_rgba(15,23,42,0.35)] ${
      this.isOpen() ? 'app-select-menu-enter' : 'hidden'
    }`,
  );
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      if (this.isCvaBound()) {
        return;
      }

      const nextValue = this.value() ?? '';
      if (nextValue !== this.internalValue()) {
        this.internalValue.set(nextValue);
      }
    });
  }

  writeValue(value: string | null): void {
    this.isCvaBound.set(true);
    this.internalValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
    if (isDisabled) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    if (this.isDisabled()) {
      return;
    }

    if (this.isOpen()) {
      this.closeMenu();
      return;
    }

    this.openMenu();
  }

  openMenu(): void {
    if (this.isDisabled()) {
      return;
    }

    this.highlightedIndex.set(this.getInitialHighlightedIndex());
    this.isOpen.set(true);
  }

  closeMenu(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }

    if (!this.isOpen() && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.openMenu();
      return;
    }

    if (!this.isOpen()) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.set(this.getAdjacentEnabledIndex(this.highlightedIndex(), 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.set(this.getAdjacentEnabledIndex(this.highlightedIndex(), -1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.highlightedIndex.set(this.getFirstEnabledIndex());
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.highlightedIndex.set(this.getLastEnabledIndex());
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = this.options()[this.highlightedIndex()];
      if (option && !option.disabled) {
        this.selectOption(option);
      }
    }
  }

  onOptionMouseEnter(index: number): void {
    if (this.options()[index]?.disabled) {
      return;
    }

    this.highlightedIndex.set(index);
  }

  selectOption(option: SelectFieldOption): void {
    if (this.isDisabled() || option.disabled) {
      return;
    }

    this.internalValue.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.valueChange.emit(option.value);
    this.closeMenu();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const host = this.container()?.nativeElement;
    if (host && !host.contains(event.target as Node)) {
      this.closeMenu();
      this.onTouched();
    }
  }

  optionClass(index: number, option: SelectFieldOption): string {
    const isSelected = option.value === this.internalValue();
    const isHighlighted = index === this.highlightedIndex();
    const isDisabled = !!option.disabled;

    if (isDisabled) {
      return 'flex w-full items-center justify-between gap-3 px-4 py-[10px] text-left text-sm text-base-content/35';
    }

    const stateClass = isSelected
      ? 'bg-[#EFF6FF] font-semibold text-[#1D4ED8]'
      : isHighlighted
        ? 'bg-[#EFF6FF] text-[#1D4ED8]'
        : 'text-base-content hover:bg-[#EFF6FF] hover:text-[#1D4ED8]';

    return `flex w-full items-center justify-between gap-3 px-4 py-[10px] text-left text-sm transition-colors ${stateClass}`;
  }

  checkIconClass(option: SelectFieldOption): string {
    return `material-symbols-outlined text-[18px] text-[#1D4ED8] ${
      option.value === this.internalValue() ? 'visible' : 'invisible'
    }`;
  }

  private getInitialHighlightedIndex(): number {
    const selectedIndex = this.options().findIndex(
      (option) => option.value === this.internalValue() && !option.disabled,
    );

    return selectedIndex >= 0 ? selectedIndex : this.getFirstEnabledIndex();
  }

  private getFirstEnabledIndex(): number {
    return this.options().findIndex((option) => !option.disabled);
  }

  private getLastEnabledIndex(): number {
    const options = this.options();
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index]?.disabled) {
        return index;
      }
    }

    return -1;
  }

  private getAdjacentEnabledIndex(currentIndex: number, direction: 1 | -1): number {
    const options = this.options();
    if (options.length === 0) {
      return -1;
    }

    let nextIndex = currentIndex;
    for (let i = 0; i < options.length; i += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        return nextIndex;
      }
    }

    return currentIndex;
  }
}
