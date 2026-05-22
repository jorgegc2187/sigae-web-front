import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { BrandingService } from '../../../../core/services/branding.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-mfa-verify',
  imports: [ReactiveFormsModule, FormFieldComponent, ActionButtonComponent],
  templateUrl: './mfa-verify.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaVerifyComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly branding = inject(BrandingService);

  readonly appName = this.branding.systemName;
  readonly logoUrl = this.branding.logoUrl;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  readonly codeError = computed(() => {
    this.formEvents();
    const control = this.form.controls.code;
    if ((!control.dirty && !control.touched) || !control.errors) return null;
    if (control.errors['required']) return 'Ingrese el código de 6 dígitos.';
    if (control.errors['pattern']) return 'El código debe tener exactamente 6 dígitos.';
    return null;
  });

  constructor() {
    const challenge = this.auth.mfaChallenge();
    if (!challenge || challenge.type !== 'MFA_CHALLENGE_REQUIRED') {
      void this.router.navigate(['/auth/login']);
    }
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const challenge = this.auth.mfaChallenge();
    if (!challenge || challenge.type !== 'MFA_CHALLENGE_REQUIRED') {
      await this.router.navigate(['/auth/login']);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.verifyMfa(challenge.challengeToken, this.form.getRawValue().code);
      await this.router.navigate(['/dashboard']);
    } catch {
      this.errorMessage.set('El código no es válido o expiró. Inténtelo nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async cancel(): Promise<void> {
    this.auth.clearMfaChallenge();
    await this.router.navigate(['/auth/login']);
  }
}
