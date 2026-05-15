import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordPolicyState {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordPolicy(value: string): PasswordPolicyState {
  return {
    hasMinLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9\s]/.test(value),
  };
}

export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value.trim();

    if (!value) {
      return null;
    }

    const evaluation = evaluatePasswordPolicy(value);
    const isValid = Object.values(evaluation).every(Boolean);
    return isValid ? null : { passwordPolicy: evaluation };
  };
}
