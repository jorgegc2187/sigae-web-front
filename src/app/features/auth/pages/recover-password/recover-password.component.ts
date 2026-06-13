import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { BrandingService } from '../../../../core/services/branding.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { emailFormatValidator } from '../../../../shared/validators/email-format.validator';

@Component({
  selector: 'app-recover-password',
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ActionButtonComponent],
  templateUrl: './recover-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoverPasswordComponent {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private branding = inject(BrandingService);

  readonly appName = this.branding.systemName;
  readonly logoUrl = this.branding.logoUrl;
  isSubmitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, emailFormatValidator()]],
  });
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  emailError = computed(() => {
    this.formEvents();
    const c = this.form.controls.email;
    if ((!c.dirty && !c.touched) || !c.errors) return null;
    if (c.errors['required']) return 'El correo es requerido.';
    if (c.errors['emailFormat']) return 'Ingrese un correo electrónico válido.';
    return null;
  });

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      const credentials = this.form.getRawValue();
      await this.auth.requestPasswordReset(credentials.email);
      this.successMessage.set(
        'Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.'
      );
      this.form.reset();
    } catch (error) {
      const authError = this.auth.getPublicAuthErrorPayload(error);
      if (error instanceof HttpErrorResponse && error.status === 429 && authError.message) {
        this.errorMessage.set(authError.message);
      } else {
        this.errorMessage.set(
          'No pudimos procesar tu solicitud en este momento. Intenta nuevamente en unos minutos.'
        );
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
