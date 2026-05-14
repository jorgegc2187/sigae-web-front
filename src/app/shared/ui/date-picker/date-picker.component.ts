import 'cally';

import {
  CUSTOM_ELEMENTS_SCHEMA,
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

export type DatePickerMode = 'single' | 'range';

export interface DateRangeValue {
  start: string;
  end: string;
}

export type DatePickerValue = string | DateRangeValue | null;

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

  readonly mode = input<DatePickerMode>('single');
  readonly placeholder = input('Seleccionar fecha');
  readonly disabled = input(false);
  readonly min = input<string>();
  readonly max = input<string>();
  readonly required = input(false);
  readonly invalid = input(false);
  readonly value = input<DatePickerValue | undefined>(undefined);

  readonly valueChange = output<DatePickerValue>();

  readonly popoverRef = viewChild<ElementRef<HTMLDivElement>>('popover');
  readonly calendarRef = viewChild<ElementRef<HTMLElement>>('calendar');

  readonly valueSignal = signal('');
  private readonly controlDisabled = signal(false);
  private readonly baseId = `date-picker-${nextDatePickerId++}`;

  readonly triggerId = `${this.baseId}-trigger`;
  readonly popoverId = `${this.baseId}-popover`;
  readonly anchorName = `--${this.baseId}-anchor`;

  readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  readonly hasValue = computed(() => !!this.valueSignal());
  readonly displayValue = computed(() => {
    const value = this.valueSignal();
    return value ? this.formatDisplayValue(value) : this.placeholder();
  });
  readonly calendarClass = computed(() =>
    this.mode() === 'range'
      ? 'cally cally--range rounded-box border border-base-300 bg-base-100'
      : 'cally rounded-box border border-base-300 bg-base-100',
  );

  private onChange: (value: DatePickerValue) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const externalValue = this.value();
      if (externalValue === undefined) {
        return;
      }

      this.applyIncomingValue(externalValue);
    });
  }

  writeValue(value: DatePickerValue): void {
    this.applyIncomingValue(value);
  }

  registerOnChange(fn: (value: DatePickerValue) => void): void {
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

    const emittedValue = this.toOutputValue(nextValue);
    this.onChange(emittedValue);
    this.onTouched();
    this.valueChange.emit(emittedValue);

    if (this.mode() === 'single' || this.parseRangeValue(nextValue)) {
      this.popoverRef()?.nativeElement.hidePopover();
    }
  }

  onTriggerBlur() {
    this.onTouched();
  }

  private applyIncomingValue(value: DatePickerValue): void {
    const normalizedValue = this.normalizeValue(value);
    this.valueSignal.set(normalizedValue);
    this.syncCalendarValue(normalizedValue);
  }

  private syncCalendarValue(value: string) {
    const calendar = this.calendarRef()?.nativeElement as { value?: string } | undefined;
    if (!calendar) {
      return;
    }

    calendar.value = value;
  }

  private normalizeValue(value: DatePickerValue): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (value.start && value.end) {
      return `${value.start}/${value.end}`;
    }

    return '';
  }

  private toOutputValue(value: string): DatePickerValue {
    if (!value) {
      return null;
    }

    if (this.mode() === 'range') {
      return this.parseRangeValue(value);
    }

    return value;
  }

  private parseRangeValue(value: string): DateRangeValue | null {
    const [start, end] = value.split('/');
    if (!start || !end) {
      return null;
    }

    return { start, end };
  }

  private formatDisplayValue(value: string): string {
    if (this.mode() === 'range') {
      const range = this.parseRangeValue(value);
      if (!range) {
        return value;
      }

      return `${this.formatSingleDate(range.start)} - ${this.formatSingleDate(range.end)}`;
    }

    return this.formatSingleDate(value);
  }

  private formatSingleDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.displayDateFormatter.format(date);
  }
}
