import 'cally';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextDatePickerId = 0;

@Component({
  selector: 'app-date-picker',
  standalone: true,
  templateUrl: './date-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
})
export class DatePickerComponent implements ControlValueAccessor {
  private readonly displayDateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

  readonly placeholder = input('Seleccionar fecha');
  readonly disabled = input(false);
  readonly min = input<string>();
  readonly max = input<string>();
  readonly required = input(false);
  readonly invalid = input(false);

  readonly valueChange = output<string>();

  readonly popoverRef = viewChild<ElementRef<HTMLDivElement>>('popover');
  readonly calendarRef = viewChild<ElementRef<HTMLElement>>('calendar');

  readonly valueSignal = signal('');
  private readonly controlDisabled = signal(false);
  private readonly baseId = `date-picker-${nextDatePickerId++}`;

  readonly triggerId = `${this.baseId}-trigger`;
  readonly popoverId = `${this.baseId}-popover`;
  readonly anchorName = `--${this.baseId}-anchor`;

  readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  readonly displayValue = computed(() => {
    const value = this.valueSignal();
    return value ? this.formatDisplayDate(value) : this.placeholder();
  });
  readonly hasValue = computed(() => !!this.valueSignal());

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const normalizedValue = value ?? '';
    this.valueSignal.set(normalizedValue);
    this.syncCalendarValue(normalizedValue);
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

  onCalendarChange(event: Event) {
    const nextValue = ((event.target as { value?: string }).value ?? '').trim();
    this.valueSignal.set(nextValue);
    this.onChange(nextValue);
    this.onTouched();
    this.valueChange.emit(nextValue);
    this.popoverRef()?.nativeElement.hidePopover();
  }

  onTriggerBlur() {
    this.onTouched();
  }

  private syncCalendarValue(value: string) {
    const calendar = this.calendarRef()?.nativeElement as { value?: string } | undefined;
    if (!calendar) {
      return;
    }

    calendar.value = value;
  }

  private formatDisplayDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.displayDateFormatter.format(date);
  }
}
