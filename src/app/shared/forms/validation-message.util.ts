import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';

export interface ValidationMessageDictionary {
  defaultMessage?: string;
  messages?: Partial<Record<string, string | ((errorValue: unknown) => string)>>;
}

export function shouldShowControlError(
  control: AbstractControl | null | undefined,
): boolean {
  return !!control && !!control.errors && (control.touched || control.dirty);
}

export function getControlErrorMessage(
  control: AbstractControl | null | undefined,
  dictionary: ValidationMessageDictionary = {},
): string | null {
  if (!control?.errors) {
    return null;
  }

  return getValidationErrorMessage(control.errors, dictionary);
}

export function getGroupErrorMessage(
  group: FormGroup | null | undefined,
  errorKey: string,
  message: string,
): string | null {
  if (!group?.errors?.[errorKey]) {
    return null;
  }

  return group.touched || group.dirty ? message : null;
}

export function getValidationErrorMessage(
  errors: ValidationErrors,
  dictionary: ValidationMessageDictionary = {},
): string | null {
  for (const key of Object.keys(errors)) {
    const configuredMessage = dictionary.messages?.[key];
    if (typeof configuredMessage === 'string') {
      return configuredMessage;
    }

    if (typeof configuredMessage === 'function') {
      return configuredMessage(errors[key]);
    }

    switch (key) {
      case 'required':
        return 'Este campo es obligatorio.';
      case 'minlength':
        return `Debe tener al menos ${errors[key].requiredLength} caracteres.`;
      case 'maxlength':
        return `Debe tener como máximo ${errors[key].requiredLength} caracteres.`;
      case 'emailFormat':
        return 'Ingrese un correo electrónico válido.';
      case 'passwordPolicy':
        return 'La contraseña debe cumplir con los requisitos de seguridad.';
      case 'fieldsMismatch':
        return 'Los campos no coinciden.';
      default:
        return dictionary.defaultMessage ?? 'Error de validación no controlado.';
    }
  }

  return null;
}
