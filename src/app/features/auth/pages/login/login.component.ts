import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { APP_CONFIG } from '../../../../core/config/app.tokens';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ActionButtonComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private appConfig = inject(APP_CONFIG);

  readonly appName = this.appConfig.appName;
  isSubmitting = signal(false);
  showPassword = signal(false);
  loginError = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  emailError = computed(() => {
    const c = this.form.get('email');
    if (!c?.dirty || !c.errors) return null;
    if (c.errors['required']) return 'El correo es requerido.';
    if (c.errors['email']) return 'Ingrese un correo electrónico válido.';
    return null;
  });

  passwordError = computed(() => {
    const c = this.form.get('password');
    if (!c?.dirty || !c.errors) return null;
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

    // TODO: Reemplazar con llamada real al AuthService usando appConfig.apiUrl.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (this.appConfig.enableMockAuth) {
      this.router.navigate(['/dashboard']);
    } else {
      this.loginError.set('La autenticación con API aún no está conectada.');
    }

    this.isSubmitting.set(false);
  }
}
