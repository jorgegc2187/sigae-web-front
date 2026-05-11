import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent],
  templateUrl: './recover-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoverPasswordComponent {
  private fb = inject(FormBuilder);

  isSubmitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  emailError = computed(() => {
    const c = this.form.get('email');
    if (!c?.dirty || !c.errors) return null;
    if (c.errors['required']) return 'El correo es requerido.';
    if (c.errors['email']) return 'Ingrese un correo electrónico válido.';
    return null;
  });

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    // TODO: Reemplazar con llamada real al AuthService
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulación: siempre muestra éxito (comportamiento de seguridad)
    this.successMessage.set(
      'Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.'
    );
    this.form.reset();
    this.isSubmitting.set(false);
  }
}
