import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { APP_CONFIG } from '../../../../core/config/app.tokens';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { emailFormatValidator } from '../../../../shared/validators/email-format.validator';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ActionButtonComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private appConfig = inject(APP_CONFIG);
  private auth = inject(AuthService);

  readonly appName = this.appConfig.appName;
  isSubmitting = signal(false);
  showPassword = signal(false);
  loginError = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, emailFormatValidator()]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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

  passwordError = computed(() => {
    this.formEvents();
    const c = this.form.controls.password;
    if ((!c.dirty && !c.touched) || !c.errors) return null;
    if (c.errors['required']) return 'La contraseña es requerida.';
    if (c.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres.';
    return null;
  });

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.loginError.set(null);

    try {
      const credentials = this.form.getRawValue();
      await this.auth.login({
        email: credentials.email,
        password: credentials.password,
      });
      this.router.navigate(['/dashboard']);
    } catch {
      this.loginError.set('No pudimos iniciar sesión con esas credenciales.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
