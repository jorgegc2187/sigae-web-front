import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  input,
  numberAttribute,
  signal,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextVerificationCodeInputId = 0;

@Component({
  selector: 'app-verification-code-input',
  imports: [],
  templateUrl: './verification-code-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VerificationCodeInputComponent),
      multi: true,
    },
  ],
})
export class VerificationCodeInputComponent implements ControlValueAccessor {
  readonly length = input(6, { transform: numberAttribute });
  readonly label = input('Código de verificación');
  readonly hint = input('Ingresar 6 dígitos');
  readonly error = input<string | null>(null);
  readonly disabled = input(false);
  readonly fieldId = input<string | null>(null);

  private readonly generatedId = `verification-code-${nextVerificationCodeInputId++}`;
  private readonly inputRefs = viewChildren<ElementRef<HTMLInputElement>>('digitInput');
  private readonly controlDisabled = signal(false);

  readonly normalizedLength = computed(() => Math.max(1, this.length() || 6));
  readonly indexes = computed(() => Array.from({ length: this.normalizedLength() }, (_, index) => index));
  readonly baseId = computed(() => this.fieldId() ?? this.generatedId);
  readonly digits = signal<string[]>(this.emptyDigits(6));
  readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  readonly hasError = computed(() => !!this.error());
  readonly inputClass = computed(() => {
    const stateClasses = this.hasError()
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-base-300 focus:border-primary focus:ring-primary/20';

    return [
      'h-14 w-12 rounded-xl border bg-base-100 text-center font-mono text-xl font-semibold text-base-content shadow-sm transition-all',
      'placeholder:text-base-content/25 placeholder-shown:opacity-50 focus:outline-none focus:ring-2',
      'disabled:cursor-not-allowed disabled:bg-base-200 disabled:text-base-content/40',
      'sm:h-16 sm:w-14 sm:text-2xl',
      stateClasses,
    ].join(' ');
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const length = this.normalizedLength();
      const current = this.digits();

      if (current.length === length) return;

      this.digits.set([...current.slice(0, length), ...this.emptyDigits(Math.max(0, length - current.length))]);
    });
  }

  writeValue(value: string | null): void {
    this.setDigitsFromValue(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  handleInput(event: Event, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const nextValue = this.onlyDigits(inputElement.value);

    if (!nextValue) {
      this.updateDigit(index, '');
      return;
    }

    this.distributeDigits(nextValue, index);
    this.focusInput(Math.min(index + nextValue.length, this.normalizedLength() - 1));
  }

  handleKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const currentDigits = this.digits();

      if (currentDigits[index]) {
        this.updateDigit(index, '');
        return;
      }

      if (index > 0) {
        this.focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.normalizedLength() - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  handlePaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pastedDigits = this.onlyDigits(event.clipboardData?.getData('text') ?? '');

    if (!pastedDigits) return;

    this.distributeDigits(pastedDigits, index);
    this.focusInput(Math.min(index + pastedDigits.length, this.normalizedLength() - 1));
  }

  markAsTouched(): void {
    this.onTouched();
  }

  private updateDigit(index: number, value: string): void {
    const currentDigits = [...this.digits()];
    currentDigits[index] = this.onlyDigits(value).slice(0, 1);
    this.digits.set(currentDigits);
    this.emitValue();
  }

  private distributeDigits(value: string, startIndex: number): void {
    const nextDigits = [...this.digits()];
    const digits = this.onlyDigits(value).slice(0, this.normalizedLength() - startIndex);

    for (const [offset, digit] of [...digits].entries()) {
      nextDigits[startIndex + offset] = digit;
    }

    this.digits.set(nextDigits);
    this.emitValue();
  }

  private setDigitsFromValue(value: string): void {
    const nextDigits = this.emptyDigits(this.normalizedLength());
    const digits = this.onlyDigits(value).slice(0, this.normalizedLength());

    for (const [index, digit] of [...digits].entries()) {
      nextDigits[index] = digit;
    }

    this.digits.set(nextDigits);
  }

  private emitValue(): void {
    this.onChange(this.digits().join(''));
  }

  private focusInput(index: number): void {
    queueMicrotask(() => this.inputRefs()[index]?.nativeElement.focus());
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private emptyDigits(length: number): string[] {
    return Array.from({ length }, () => '');
  }
}
