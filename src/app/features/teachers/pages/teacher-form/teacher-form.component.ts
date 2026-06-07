import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import {
  getControlErrorMessage,
  shouldShowControlError,
} from '../../../../shared/forms/validation-message.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { emailFormatValidator } from '../../../../shared/validators/email-format.validator';
import { TeacherApiStatus, TeacherUiStatus } from '../../models/teacher.model';
import { TeachersService } from '../../services/teachers.service';

@Component({
  selector: 'app-teacher-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    ActionButtonComponent,
    ProcessingLoaderComponent,
    SelectFieldComponent,
  ],
  templateUrl: './teacher-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly teachersService = inject(TeachersService);

  private readonly routeTeacherId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  readonly isLoadingTeacher = signal(false);
  readonly isSubmitting = signal(false);
  readonly inputClass =
    'w-full border-0 bg-transparent p-0 text-sm text-base-content placeholder-shown:opacity-50 focus:outline-none';
  readonly statusOptions: SelectFieldOption[] = [
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
  ];

  readonly form = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    specialty: ['', [Validators.maxLength(120)]],
    email: ['', [Validators.maxLength(150), emailFormatValidator()]],
    phone: ['', [Validators.maxLength(20)]],
    status: this.fb.control<TeacherUiStatus>('Activo', [Validators.required]),
  });
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  readonly teacherId = computed(() => this.routeTeacherId());
  readonly isEditMode = computed(() => this.teacherId() !== null);
  readonly isBusy = computed(() => this.isLoadingTeacher() || this.isSubmitting());
  readonly breadcrumbLabel = computed(() =>
    this.isEditMode() ? 'Editar docente' : 'Registrar docente',
  );
  readonly formTitle = computed(() =>
    this.isEditMode() ? 'Editar docente' : 'Registrar docente',
  );
  readonly submitLabel = computed(() =>
    this.isEditMode() ? 'Guardar cambios' : 'Guardar docente',
  );
  readonly loadingLabel = computed(() =>
    this.isEditMode() ? 'Guardando cambios...' : 'Guardando docente...',
  );
  readonly blockingTitle = computed(() =>
    this.isLoadingTeacher()
      ? 'Cargando docente'
      : this.isEditMode()
        ? 'Guardando cambios'
        : 'Guardando docente',
  );
  readonly blockingDescription = computed(() =>
    this.isLoadingTeacher()
      ? 'Estamos recuperando la información actual del docente.'
      : 'Estamos guardando la información y esperando la confirmación del servidor.',
  );

  readonly dniError = computed(() => {
    this.formEvents();
    const control = this.form.controls.dni;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'El DNI es obligatorio.',
        pattern: 'El DNI debe tener 8 dígitos.',
      },
    });
  });

  readonly fullNameError = computed(() => {
    this.formEvents();
    const control = this.form.controls.fullName;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'El nombre completo es obligatorio.',
        maxlength: 'El nombre completo debe tener como máximo 160 caracteres.',
      },
    });
  });

  readonly specialtyError = computed(() => {
    this.formEvents();
    const control = this.form.controls.specialty;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        maxlength: 'La especialidad debe tener como máximo 120 caracteres.',
      },
    });
  });

  readonly emailError = computed(() => {
    this.formEvents();
    const control = this.form.controls.email;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        maxlength: 'El correo debe tener como máximo 150 caracteres.',
        emailFormat: 'Ingrese un correo electrónico válido.',
      },
    });
  });

  readonly phoneError = computed(() => {
    this.formEvents();
    const control = this.form.controls.phone;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        maxlength: 'El teléfono debe tener como máximo 20 caracteres.',
      },
    });
  });

  readonly statusError = computed(() => {
    this.formEvents();
    const control = this.form.controls.status;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione un estado.',
      },
    });
  });

  constructor() {
    effect(() => {
      if (this.isBusy()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
    });

    effect(() => {
      const teacherId = this.teacherId();
      if (!teacherId) {
        this.applyDefaults();
        return;
      }

      void this.loadTeacher(teacherId);
    });
  }

  async onSubmit() {
    if (this.isBusy()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      dni: value.dni.trim(),
      fullName: value.fullName.trim(),
      specialty: this.normalizeOptional(value.specialty),
      email: this.normalizeOptional(value.email),
      phone: this.normalizeOptional(value.phone),
      status: this.teachersService.toApiStatus(value.status),
    } satisfies {
      dni: string;
      fullName: string;
      specialty: string | null;
      email: string | null;
      phone: string | null;
      status: TeacherApiStatus;
    };

    try {
      this.isSubmitting.set(true);

      if (this.isEditMode()) {
        await firstValueFrom(this.teachersService.update(this.teacherId()!, payload));
        this.notifications.success({ message: 'Docente actualizado correctamente.' });
      } else {
        await firstValueFrom(this.teachersService.create(payload));
        this.notifications.success({ message: 'Docente registrado correctamente.' });
      }

      await this.router.navigate(['/teachers']);
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(
          error,
          this.isEditMode()
            ? 'No se pudo actualizar el docente.'
            : 'No se pudo registrar el docente.',
        ),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadTeacher(teacherId: string) {
    try {
      this.isLoadingTeacher.set(true);
      const teacher = await firstValueFrom(this.teachersService.getById(teacherId));
      this.form.reset({
        dni: teacher.dni,
        fullName: teacher.fullName,
        specialty: teacher.specialty ?? '',
        email: teacher.email ?? '',
        phone: teacher.phone ?? '',
        status: this.teachersService.toUiStatus(teacher.status),
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(error, 'No se pudo cargar la información del docente.'),
      });
      await this.router.navigate(['/teachers']);
    } finally {
      this.isLoadingTeacher.set(false);
    }
  }

  private applyDefaults() {
    if (this.isLoadingTeacher()) {
      return;
    }

    this.form.reset({
      dni: '',
      fullName: '',
      specialty: '',
      email: '',
      phone: '',
      status: 'Activo',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }
}
