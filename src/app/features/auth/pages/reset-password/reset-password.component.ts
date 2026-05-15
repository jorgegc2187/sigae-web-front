import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { APP_CONFIG } from '../../../../core/config/app.tokens';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { matchingFieldsValidator } from '../../../../shared/validators/matching-fields.validator';
import {
  evaluatePasswordPolicy,
  passwordPolicyValidator,
} from '../../../../shared/validators/password-policy.validator';

type ResetPasswordState = 'idle' | 'invalid' | 'success';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ActionButtonComponent],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly appConfig = inject(APP_CONFIG);

  readonly token = input('');
  readonly appName = this.appConfig.appName;
  readonly isSubmitting = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly submissionError = signal<string | null>(null);
  readonly invalidMessage = signal<string | null>(null);
  private readonly resetState = signal<ResetPasswordState>('idle');

  readonly form = this.fb.group(
    {
      newPassword: ['', [Validators.required, passwordPolicyValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [matchingFieldsValidator('newPassword', 'confirmPassword')],
    },
  );
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  readonly passwordRequirements = computed(() =>
    evaluatePasswordPolicy(this.form.controls.newPassword.value),
  );

  readonly viewState = computed<'form' | 'invalid' | 'success'>(() => {
    if (!this.token().trim()) {
      return 'invalid';
    }

    if (this.resetState() === 'invalid') {
      return 'invalid';
    }

    if (this.resetState() === 'success') {
      return 'success';
    }

    return 'form';
  });

  readonly invalidStateMessage = computed(() =>
    this.invalidMessage() ??
    (this.token().trim()
      ? 'El enlace de recuperación es inválido o ya expiró. Solicita uno nuevo para continuar.'
      : 'El enlace de recuperación no es válido o está incompleto. Solicita uno nuevo para continuar.'),
  );

  readonly newPasswordError = computed(() => {
    this.formEvents();
    const control = this.form.controls.newPassword;
    if ((!control.dirty && !control.touched) || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'La nueva contraseña es requerida.';
    }

    if (control.errors['passwordPolicy']) {
      return 'La contraseña debe cumplir con los requisitos de seguridad.';
    }

    return null;
  });

  readonly confirmPasswordError = computed(() => {
    this.formEvents();
    const control = this.form.controls.confirmPassword;
    if ((!control.dirty && !control.touched) || (!control.errors && !this.form.errors)) {
      return null;
    }

    if (control.errors?.['required']) {
      return 'Debe confirmar la nueva contraseña.';
    }

    if (this.form.errors?.['fieldsMismatch']) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  });

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.token().trim()) {
      if (!this.token().trim()) {
        this.resetState.set('invalid');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.submissionError.set(null);

    try {
      const values = this.form.getRawValue();
      await this.auth.resetPassword({
        token: this.token(),
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      this.form.reset();
      this.resetState.set('success');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) {
        const backendMessage =
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'El enlace de recuperación es inválido o ya expiró.';
        this.invalidMessage.set(backendMessage);
        this.resetState.set('invalid');
      } else {
        this.submissionError.set(
          'No pudimos restablecer tu contraseña en este momento. Intenta nuevamente en unos minutos.',
        );
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
