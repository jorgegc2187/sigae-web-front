import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  getControlErrorMessage,
  shouldShowControlError,
} from '../../../../shared/forms/validation-message.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { ToggleSwitchComponent } from '../../../../shared/ui/toggle-switch/toggle-switch.component';
import { emailFormatValidator } from '../../../../shared/validators/email-format.validator';
import {
  evaluatePasswordPolicy,
  passwordPolicyValidator,
} from '../../../../shared/validators/password-policy.validator';
import { UserResponse, UserRole } from '../../models/user.model';
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
    SelectFieldComponent,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly locationsService = inject(LocationsService);
  private readonly notifications = inject(NotificationService);

  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');

  readonly roles: UserRole[] = ['Administrador', 'Encargado', 'Solo Lectura'];
  readonly roleOptions: SelectFieldOption[] = this.roles.map((role) => ({
    value: role,
    label: role,
  }));
  private readonly locationsResource = this.locationsService.listResource();
  readonly locations = computed<LocationOption[]>(() =>
    this.locationsResource.value().map((location) => ({ id: location.id, name: location.name })),
  );
  readonly selectedLocations = signal<LocationOption[]>([]);
  readonly locationQuery = signal('');
  readonly isLocationDropdownOpen = signal(false);
  readonly isLoadingUser = signal(false);
  readonly isSubmitting = signal(false);
  readonly inputClass =
    'w-full border-0 bg-transparent p-0 text-sm text-base-content placeholder-shown:opacity-50 focus:outline-none';

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
  private readonly routeUserId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });
  private readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly userId = computed(() => this.routeUserId());
  readonly isEditMode = computed(() => this.userId() !== null);
  readonly isEditingCurrentUser = computed(() => {
    const userId = this.userId();
    const currentUserId = this.authService.currentUser()?.id;
    return !!userId && !!currentUserId && userId === currentUserId;
  });
  readonly isBusy = computed(() => this.isSubmitting() || this.isLoadingUser());
  readonly breadcrumbLabel = computed(() =>
    this.isEditMode() ? 'Editar Usuario' : 'Crear Nuevo Usuario',
  );
  readonly formTitle = computed(() =>
    this.isEditMode() ? 'Editar Usuario' : 'Crear Nuevo Usuario',
  );
  readonly submitLabel = computed(() =>
    this.isEditMode() ? 'Guardar Cambios' : 'Crear Usuario',
  );
  readonly loadingLabel = computed(() =>
    this.isEditMode() ? 'Guardando cambios...' : 'Creando usuario...',
  );
  readonly blockingTitle = computed(() =>
    this.isLoadingUser()
      ? 'Cargando usuario'
      : this.isEditMode()
        ? 'Guardando cambios'
        : 'Creando usuario',
  );
  readonly blockingDescription = computed(() =>
    this.isLoadingUser()
      ? 'Estamos recuperando la información actual del usuario.'
      : 'Estamos guardando la información y esperando la confirmación del servidor.',
  );

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
  readonly roleHint = computed(() =>
    this.isEditingCurrentUser() ? 'No puedes cambiar tu propio rol.' : null,
  );
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
    return !this.isEditMode() && this.sendInvitationControl.value === false;
  }

  constructor() {
    effect(() => {
      const userId = this.userId();
      this.configurePasswordForCurrentMode();

      if (!userId) {
        return;
      }

      void this.loadUser(userId);
    });

    effect(() => {
      if (this.usesGlobalLocationAccess()) {
        this.isLocationDropdownOpen.set(false);
        this.locationQuery.set('');
      }
    });

    effect(() => {
      if (this.isBusy()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
      this.syncRoleControlAvailability();
    });
  }

  onLocationInput(event: Event): void {
    if (this.isBusy()) {
      return;
    }
    this.locationQuery.set((event.target as HTMLInputElement).value);
    this.isLocationDropdownOpen.set(true);
  }

  onLocationFocus(): void {
    if (this.isBusy()) {
      return;
    }
    this.isLocationDropdownOpen.set(true);
  }

  addLocation(location: LocationOption): void {
    if (this.isBusy()) {
      return;
    }
    this.selectedLocations.update((locations) => [...locations, location]);
    this.locationQuery.set('');
    this.isLocationDropdownOpen.set(false);
    this.syncLocationAssignments({ markAsInteracted: true });
  }

  removeLocation(locationId: string): void {
    if (this.isBusy()) {
      return;
    }
    this.selectedLocations.update((locations) =>
      locations.filter((location) => location.id !== locationId),
    );
    this.syncLocationAssignments({ markAsInteracted: true });
  }

  onSendInvitationChange(checked: boolean): void {
    if (this.isBusy() || this.isEditMode()) {
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
    if (this.isBusy()) {
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
      if (this.isEditMode()) {
        const user = await this.updateUser(fullName, value.email, value.role as UserRole, value.locationIds);
        this.notifications.success({
          message: `Usuario "${user.fullName}" actualizado correctamente.`,
        });
      } else {
        const user = await this.createUser(fullName, value.email, value.role as UserRole, value.sendInvitation, value.password, value.locationIds);
        this.notifications.success({
          message: value.sendInvitation
            ? `Usuario "${user.fullName}" creado correctamente. Se envió una invitación por correo para configurar su contraseña.`
            : `Usuario "${user.fullName}" creado correctamente.`,
        });
      }

      await this.router.navigate(['/settings/users']);
    } catch (error: unknown) {
      const status = (error as { status?: unknown })?.status;
      const backendMessage =
        typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
          ? ((error as { error: { message: string } }).error.message)
          : status === 503
            ? 'No se pudo enviar el correo de invitación. Verifique la configuración SMTP e intente nuevamente.'
            : this.isEditMode()
              ? 'No se pudo actualizar el usuario.'
              : 'No se pudo crear el usuario.';

      this.notifications.error({ message: backendMessage });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async createUser(
    fullName: string,
    email: string,
    role: UserRole,
    sendInvitation: boolean,
    password: string,
    locationIds: string[],
  ): Promise<UserResponse> {
    const payload = {
      fullName,
      email,
      role: this.usersService.toApiRole(role),
      sendInvitation,
      ...(this.usesGlobalLocationAccess() ? {} : { locationIds }),
      ...(sendInvitation ? {} : { password }),
    };

    return firstValueFrom(this.usersService.create(payload));
  }

  private async updateUser(
    fullName: string,
    email: string,
    role: UserRole,
    locationIds: string[],
  ): Promise<UserResponse> {
    const userId = this.userId();
    if (!userId) {
      throw new Error('No se encontró el usuario a editar.');
    }

    const payload = {
      fullName,
      email,
      role: this.usersService.toApiRole(role),
      ...(this.usesGlobalLocationAccess() ? {} : { locationIds }),
    };

    return firstValueFrom(this.usersService.update(userId, payload));
  }

  private async loadUser(userId: string): Promise<void> {
    try {
      this.isLoadingUser.set(true);
      const user = await firstValueFrom(this.usersService.getById(userId));
      const nameParts = splitFullName(user.fullName);
      const selectedLocations = user.locationIds.map((id, index) => ({
        id,
        name: user.locationNames[index] ?? this.findLocationName(id),
      }));

      this.selectedLocations.set(selectedLocations);
      this.form.reset({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: user.email,
        role: this.usersService.toUser(user).role,
        sendInvitation: true,
        password: '',
        locationIds: user.locationIds,
      });
      this.locationQuery.set('');
      this.isLocationDropdownOpen.set(false);
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.syncLocationAssignments({ markAsInteracted: false });
    } catch (error) {
      const message =
        typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : 'No se pudo cargar la información del usuario.';

      this.notifications.error({ message });
      await this.router.navigate(['/settings/users']);
    } finally {
      this.isLoadingUser.set(false);
    }
  }

  private findLocationName(locationId: string): string {
    return this.locations().find((location) => location.id === locationId)?.name ?? 'Ubicación';
  }

  private configurePasswordForCurrentMode(): void {
    if (this.isEditMode()) {
      this.passwordControl.clearValidators();
      this.passwordControl.setValue('', { emitEvent: false });
      this.passwordControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    this.syncPasswordValidators(this.sendInvitationControl.value);
  }

  private syncRoleControlAvailability(): void {
    if (this.isEditingCurrentUser()) {
      this.roleControl.disable({ emitEvent: false });
      return;
    }

    this.roleControl.enable({ emitEvent: false });
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

  private syncLocationAssignments(options: { markAsInteracted: boolean }): void {
    this.locationIdsControl.setValue(this.selectedLocations().map((location) => location.id));

    if (options.markAsInteracted) {
      this.locationIdsControl.markAsDirty();
      this.locationIdsControl.markAsTouched();
    }

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

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
