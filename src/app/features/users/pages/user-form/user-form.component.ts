import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ToggleSwitchComponent } from '../../../../shared/ui/toggle-switch/toggle-switch.component';
import { UserRole } from '../../models/user.model';
import { UsersMockStore } from '../../services/users-mock-store.service';

interface LocationOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly usersStore = inject(UsersMockStore);
  private readonly notifications = inject(NotificationService);

  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');

  readonly roles: UserRole[] = ['Administrador', 'Encargado', 'Solo Lectura'];
  readonly locations = signal<LocationOption[]>([
    { id: 'location-1', name: 'Aula de Cómputo' },
    { id: 'location-2', name: 'Biblioteca' },
    { id: 'location-3', name: 'Dirección' },
    { id: 'location-4', name: 'Sala de Profesores' },
    { id: 'location-5', name: 'Aula 1A' },
    { id: 'location-6', name: 'Laboratorio de Ciencias' },
  ]);
  readonly selectedLocations = signal<LocationOption[]>([
    { id: 'location-1', name: 'Aula de Cómputo' },
  ]);
  readonly locationQuery = signal('');
  readonly isLocationDropdownOpen = signal(false);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['', [Validators.required]],
    sendInvitation: [true],
    password: [''],
  });

  readonly filteredLocations = computed(() => {
    const query = this.locationQuery().trim().toLowerCase();
    const selectedIds = new Set(this.selectedLocations().map((location) => location.id));

    return this.locations().filter(
      (location) =>
        !selectedIds.has(location.id) &&
        (!query || location.name.toLowerCase().includes(query)),
    );
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

  get shouldShowPassword() {
    return this.sendInvitationControl.value === false;
  }

  onLocationInput(event: Event): void {
    this.locationQuery.set((event.target as HTMLInputElement).value);
    this.isLocationDropdownOpen.set(true);
  }

  onLocationFocus(): void {
    this.isLocationDropdownOpen.set(true);
  }

  addLocation(location: LocationOption): void {
    this.selectedLocations.update((locations) => [...locations, location]);
    this.locationQuery.set('');
    this.isLocationDropdownOpen.set(false);
  }

  removeLocation(locationId: string): void {
    this.selectedLocations.update((locations) =>
      locations.filter((location) => location.id !== locationId),
    );
  }

  onSendInvitationChange(checked: boolean): void {
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const user = this.usersStore.createUser({
      firstName: value.firstName ?? '',
      lastName: value.lastName ?? '',
      email: value.email ?? '',
      role: value.role as UserRole,
      locations: this.selectedLocations().map((location) => location.name),
      password: value.sendInvitation ? undefined : (value.password ?? ''),
    });

    this.notifications.success({ message: `Usuario "${user.name}" creado correctamente.` });
    this.router.navigate(['/settings/users']);
  }

  private syncPasswordValidators(sendInvitation: boolean): void {
    if (sendInvitation) {
      this.passwordControl.clearValidators();
      this.passwordControl.reset('');
    } else {
      this.passwordControl.setValidators([Validators.required, Validators.minLength(8)]);
    }

    this.passwordControl.updateValueAndValidity();
  }
}
