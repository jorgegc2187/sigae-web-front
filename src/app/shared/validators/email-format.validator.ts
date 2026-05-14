import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailFormatValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value.trim();

    if (!value) {
      return null;
    }

    return EMAIL_FORMAT_PATTERN.test(value) ? null : { emailFormat: true };
  };
}
