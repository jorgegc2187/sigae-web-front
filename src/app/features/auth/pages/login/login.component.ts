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
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

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

    // TODO: Reemplazar con llamada real al AuthService
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulación: credenciales mock
    const { email, password } = this.form.getRawValue();
    if (email === 'admin@sigae.edu.pe' && password === 'admin123') {
      this.router.navigate(['/dashboard']);
    } else {
      this.loginError.set('Credenciales incorrectas. Intente nuevamente.');
    }

    this.isSubmitting.set(false);
  }
}
