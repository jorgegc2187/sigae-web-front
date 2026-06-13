import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import QRCode from 'qrcode';
import { AuthService } from '../../../../core/auth/auth.service';
import { MfaEnrollStartResponse } from '../../../../core/auth/auth.models';
import { BrandingService } from '../../../../core/services/branding.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { VerificationCodeInputComponent } from '../../../../shared/ui/verification-code-input/verification-code-input.component';

@Component({
  selector: 'app-mfa-enroll',
  imports: [ReactiveFormsModule, VerificationCodeInputComponent, ActionButtonComponent],
  templateUrl: './mfa-enroll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaEnrollComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly branding = inject(BrandingService);

  readonly appName = this.branding.systemName;
  readonly logoUrl = this.branding.logoUrl;
  readonly enrollData = signal<MfaEnrollStartResponse | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly isLoading = signal(true);
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
    void this.startEnrollment();
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const challenge = this.auth.mfaChallenge();
    if (!challenge || challenge.type !== 'MFA_ENROLL_REQUIRED') {
      await this.router.navigate(['/auth/login']);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.confirmMfaEnrollment(challenge.challengeToken, this.form.getRawValue().code);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      const authError = this.auth.getPublicAuthErrorPayload(error);
      if (error instanceof HttpErrorResponse && error.status === 429 && authError.message) {
        this.errorMessage.set(authError.message);
      } else {
        this.errorMessage.set('El código no es válido o expiró. Revise su app autenticadora e inténtelo nuevamente.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async cancel(): Promise<void> {
    this.auth.clearMfaChallenge();
    await this.router.navigate(['/auth/login']);
  }

  private async startEnrollment(): Promise<void> {
    const challenge = this.auth.mfaChallenge();
    if (!challenge || challenge.type !== 'MFA_ENROLL_REQUIRED') {
      await this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const data = await this.auth.startMfaEnrollment(challenge.challengeToken);
      this.enrollData.set(data);
      this.qrDataUrl.set(await QRCode.toDataURL(data.otpauthUri, { margin: 1, width: 220 }));
    } catch (error) {
      const authError = this.auth.getPublicAuthErrorPayload(error);
      if (error instanceof HttpErrorResponse && error.status === 429 && authError.message) {
        this.errorMessage.set(authError.message);
      } else {
        this.errorMessage.set('No pudimos iniciar la configuración 2FA. Vuelva a iniciar sesión.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
