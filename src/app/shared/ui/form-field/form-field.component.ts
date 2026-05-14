import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type FormFieldControlType = 'input' | 'select' | 'textarea';
type FormFieldSize = 'md' | 'compact';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input<string>('');
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input<boolean>(false);
  readonly controlType = input<FormFieldControlType>('input');
  readonly size = input<FormFieldSize>('md');
  readonly prefixIcon = input<string | null>(null);
  readonly fieldId = input<string | null>(null);

  readonly wrapperClass = computed(() => {
    const controlKind = this.controlType();
    const size = this.size();
    const invalid = !!this.error();

    const stateClass = invalid
      ? 'border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error'
      : 'border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary';

    if (controlKind === 'textarea') {
      return `w-full rounded-lg border bg-base-100 px-4 shadow-sm transition-all ${stateClass}`;
    }

    const heightClass = size === 'compact' ? 'h-10 px-3' : 'h-11 px-4';
    return `flex w-full items-center gap-2 rounded-lg border bg-base-100 text-base-content shadow-sm transition-all ${stateClass} ${heightClass}`;
  });

  readonly labelClass = computed(() =>
    this.label()
      ? 'fieldset-legend'
      : 'sr-only',
  );

  readonly prefixIconClass = computed(() =>
    this.size() === 'compact'
      ? 'material-symbols-outlined shrink-0 text-[18px] text-base-content/40'
      : 'material-symbols-outlined shrink-0 text-[18px] text-base-content/40',
  );

  readonly helperTextClass = computed(() =>
    this.error() ? 'fieldset-label text-error mt-1' : 'fieldset-label',
  );
}
