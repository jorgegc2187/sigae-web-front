import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  getControlErrorMessage,
  shouldShowControlError,
} from '../../../../shared/forms/validation-message.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ToggleSwitchComponent } from '../../../../shared/ui/toggle-switch/toggle-switch.component';
import { emailFormatValidator } from '../../../../shared/validators/email-format.validator';
import {
  evaluatePasswordPolicy,
  passwordPolicyValidator,
} from '../../../../shared/validators/password-policy.validator';
import { UserRole } from '../../models/user.model';
import { UsersService } from '../../services/users.service';
import { LocationsService } from '../../../locations/services/locations.service';

interface LocationOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    ActionButtonComponent,
    ToggleSwitchComponent,
  ],
  templateUrl: './user-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class UserFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly locationsService = inject(LocationsService);
  private readonly notifications = inject(NotificationService);

  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');

  readonly roles: UserRole[] = ['Administrador', 'Encargado', 'Solo Lectura'];
  private readonly locationsResource = this.locationsService.listResource();
  readonly locations = computed<LocationOption[]>(() =>
    this.locationsResource.value().map((location) => ({ id: location.id, name: location.name })),
  );
  readonly selectedLocations = signal<LocationOption[]>([]);
  readonly locationQuery = signal('');
  readonly isLocationDropdownOpen = signal(false);
  readonly isSubmitting = signal(false);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, emailFormatValidator()]],
    role: this.fb.control<UserRole | ''>('', [Validators.required]),
    sendInvitation: [true],
    password: [''],
    locationIds: this.fb.control<string[]>([]),
  }, {
    validators: [locationAssignmentValidator],
  });
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });
  private readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });

  readonly usesGlobalLocationAccess = computed(() => this.roleValue() === 'Administrador');

  readonly filteredLocations = computed(() => {
    const query = this.locationQuery().trim().toLowerCase();
    const selectedIds = new Set(this.selectedLocations().map((location) => location.id));

    return this.locations().filter(
      (location) =>
        !selectedIds.has(location.id) &&
        (!query || location.name.toLowerCase().includes(query)),
    );
  });
  readonly passwordRequirements = computed(() => evaluatePasswordPolicy(this.passwordValue()));
  readonly firstNameError = computed(() => {
    this.formEvents();
    const control = this.form.controls.firstName;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'El nombre es obligatorio.',
      },
    });
  });
  readonly lastNameError = computed(() => {
    this.formEvents();
    const control = this.form.controls.lastName;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'El apellido es obligatorio.',
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
        required: 'El correo es obligatorio.',
        emailFormat: 'Ingrese un correo electrónico válido.',
      },
    });
  });
  readonly roleError = computed(() => {
    this.formEvents();
    const control = this.form.controls.role;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione un rol.',
      },
    });
  });
  readonly locationAssignmentError = computed(() => {
    this.formEvents();
    if (this.usesGlobalLocationAccess()) {
      return null;
    }

    if (!this.form.errors?.['locationAssignmentRequired']) {
      return null;
    }

    return this.form.touched || this.form.dirty
      ? 'Asigne al menos una ubicación para este rol.'
      : null;
  });
  readonly passwordError = computed(() => {
    this.formEvents();
    const control = this.form.controls.password;
    if (!shouldShowPasswordError(this.shouldShowPassword, control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'La contraseña temporal es obligatoria.',
        passwordPolicy: 'La contraseña debe cumplir con los requisitos de seguridad.',
      },
    });
  });

  get firstNameControl() {
    return this.form.controls.firstName;
  }

  get lastNameControl() {
    return this.form.controls.lastName;
  }

  get emailControl() {
    return this.form.controls.email;
  }

  get roleControl() {
    return this.form.controls.role;
  }

  get sendInvitationControl() {
    return this.form.controls.sendInvitation;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  get locationIdsControl() {
    return this.form.controls.locationIds;
  }

  get shouldShowPassword() {
    return this.sendInvitationControl.value === false;
  }

  constructor() {
    effect(() => {
      if (this.usesGlobalLocationAccess()) {
        this.isLocationDropdownOpen.set(false);
        this.locationQuery.set('');
      }
    });

    effect(() => {
      if (this.isSubmitting()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
    });
  }

  onLocationInput(event: Event): void {
    if (this.isSubmitting()) {
      return;
    }
    this.locationQuery.set((event.target as HTMLInputElement).value);
    this.isLocationDropdownOpen.set(true);
  }

  onLocationFocus(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.isLocationDropdownOpen.set(true);
  }

  addLocation(location: LocationOption): void {
    if (this.isSubmitting()) {
      return;
    }
    this.selectedLocations.update((locations) => [...locations, location]);
    this.locationQuery.set('');
    this.isLocationDropdownOpen.set(false);
    this.syncLocationAssignments();
  }

  removeLocation(locationId: string): void {
    if (this.isSubmitting()) {
      return;
    }
    this.selectedLocations.update((locations) =>
      locations.filter((location) => location.id !== locationId),
    );
    this.syncLocationAssignments();
  }

  onSendInvitationChange(checked: boolean): void {
    if (this.isSubmitting()) {
      return;
    }
    this.sendInvitationControl.setValue(checked);
    this.syncPasswordValidators(checked);
  }

  onClickOutside(event: MouseEvent): void {
    const container = this.locationSearchContainer();
    if (
      this.isLocationDropdownOpen() &&
      container &&
      !container.nativeElement.contains(event.target)
    ) {
      this.isLocationDropdownOpen.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const fullName = `${value.firstName.trim()} ${value.lastName.trim()}`.trim();

    try {
      this.isSubmitting.set(true);
      this.isLocationDropdownOpen.set(false);
      const payload = {
        fullName,
        email: value.email,
        role: this.usersService.toApiRole(value.role as UserRole),
        status: 'ACTIVE' as const,
        sendInvitation: value.sendInvitation,
        ...(this.usesGlobalLocationAccess() ? {} : { locationIds: value.locationIds }),
        ...(value.sendInvitation ? {} : { password: value.password }),
      };

      const user = await firstValueFrom(this.usersService.create(payload));

      this.notifications.success({
        message: value.sendInvitation
          ? `Usuario "${user.fullName}" creado correctamente. Se envió una invitación por correo para configurar su contraseña.`
          : `Usuario "${user.fullName}" creado correctamente.`,
      });
      await this.router.navigate(['/settings/users']);
    } catch (error: unknown) {
      const status = (error as { status?: unknown })?.status;
      const backendMessage =
        typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
          ? ((error as { error: { message: string } }).error.message)
          : status === 503
            ? 'No se pudo enviar el correo de invitación. Verifique la configuración SMTP e intente nuevamente.'
            : 'No se pudo crear el usuario.';

      this.notifications.error({ message: backendMessage });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private syncPasswordValidators(sendInvitation: boolean): void {
    if (sendInvitation) {
      this.passwordControl.clearValidators();
      this.passwordControl.reset('');
    } else {
      this.passwordControl.setValidators([Validators.required, passwordPolicyValidator()]);
    }

    this.passwordControl.updateValueAndValidity();
  }

  private syncLocationAssignments(): void {
    this.locationIdsControl.setValue(this.selectedLocations().map((location) => location.id));
    this.locationIdsControl.markAsDirty();
    this.locationIdsControl.markAsTouched();
    this.form.updateValueAndValidity();
  }
}

function shouldShowPasswordError(shouldShowPassword: boolean, control: { errors: unknown; touched: boolean; dirty: boolean }): boolean {
  return shouldShowPassword && !!control.errors && (control.touched || control.dirty);
}

function locationAssignmentValidator(control: AbstractControl): ValidationErrors | null {
  const role = control.get('role')?.value as UserRole | '' | undefined;
  const locationIds = control.get('locationIds')?.value as string[] | undefined;

  if (role === 'Administrador' || !role) {
    return null;
  }

  return locationIds && locationIds.length > 0 ? null : { locationAssignmentRequired: true };
}
