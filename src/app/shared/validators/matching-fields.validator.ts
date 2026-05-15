import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchingFieldsValidator(
  primaryField: string,
  confirmationField: string,
  errorKey = 'fieldsMismatch'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const primaryValue = control.get(primaryField)?.value;
    const confirmationValue = control.get(confirmationField)?.value;

    if (!primaryValue || !confirmationValue) {
      return null;
    }

    return primaryValue === confirmationValue ? null : { [errorKey]: true };
  };
}
