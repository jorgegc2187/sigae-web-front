import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../shared/ui/status-badge/status-badge.component';
import { Manager } from '../../models/location.model';
import { LocationDto, LocationsService } from '../../services/locations.service';
import { UsersService } from '../../../users/services/users.service';

@Component({
  selector: 'app-location-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    ActionButtonComponent,
    ProcessingLoaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './location-form.component.html',
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LocationFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly usersService = inject(UsersService);
  private readonly locationsService = inject(LocationsService);
  private readonly usersResource = this.usersService.listResource();

  readonly searchContainer = viewChild<ElementRef>('searchContainer');
  private readonly routeLocationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  readonly isLoadingLocation = signal(false);
  readonly isSubmitting = signal(false);
  readonly selectedManagers = signal<Manager[]>([]);
  readonly userSearchQuery = signal('');
  readonly dropdownOpen = signal(false);
  readonly currentStatus = signal<'Activo' | 'Inactivo'>('Activo');
  readonly inputClass =
    'w-full border-0 bg-transparent p-0 text-sm text-base-content placeholder-shown:opacity-50 focus:outline-none';

  readonly allManagers = computed<Manager[]>(() =>
    this.usersResource.value()
      .map((user) => this.usersService.toUser(user))
      .filter((user) => user.role === 'Encargado')
      .map((user) => ({
        id: user.id,
        name: user.name,
        initials: user.initials,
      })),
  );

  readonly filteredManagers = computed(() => {
    const query = this.userSearchQuery().trim().toLowerCase();
    const selectedIds = new Set(this.selectedManagers().map((manager) => manager.id));

    return this.allManagers().filter(
      (manager) =>
        !selectedIds.has(manager.id) &&
        (!query || manager.name.toLowerCase().includes(query)),
    );
  });

  readonly locationId = computed(() => this.routeLocationId());
  readonly isEditMode = computed(() => this.locationId() !== null);
  readonly isBusy = computed(() => this.isLoadingLocation() || this.isSubmitting());
  readonly pageLabel = computed(() => (this.isEditMode() ? 'Editar ubicación' : 'Registrar ubicación'));
  readonly submitLabel = computed(() => (this.isEditMode() ? 'Guardar cambios' : 'Guardar ubicación'));
  readonly loadingLabel = computed(() => (this.isEditMode() ? 'Guardando cambios...' : 'Guardando ubicación...'));
  readonly blockingTitle = computed(() =>
    this.isLoadingLocation() ? 'Cargando ubicación' : this.isEditMode() ? 'Guardando cambios' : 'Guardando ubicación',
  );
  readonly blockingDescription = computed(() =>
    this.isLoadingLocation()
      ? 'Estamos recuperando la información actual de la ubicación.'
      : 'Estamos guardando la información y esperando la confirmación del servidor.',
  );
  readonly statusTone = computed<StatusBadgeTone>(() =>
    this.currentStatus() === 'Activo' ? 'success' : 'neutral',
  );

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  get nameControl() {
    return this.form.controls.name;
  }

  constructor() {
    effect(() => {
      const locationId = this.locationId();
      if (!locationId) {
        this.currentStatus.set('Activo');
        this.selectedManagers.set([]);
        return;
      }

      void this.loadLocation(locationId);
    });

    effect(() => {
      if (this.isBusy()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
    });
  }

  onClickOutside(event: MouseEvent) {
    const container = this.searchContainer();
    if (this.dropdownOpen() && container && !container.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  addManager(manager: Manager) {
    if (this.isBusy()) {
      return;
    }

    this.selectedManagers.update((previous) => [...previous, manager]);
    this.userSearchQuery.set('');
    this.dropdownOpen.set(false);
  }

  removeManager(userId: string) {
    if (this.isBusy()) {
      return;
    }

    this.selectedManagers.update((previous) => previous.filter((manager) => manager.id !== userId));
  }

  onSearchInput(event: Event) {
    if (this.isBusy()) {
      return;
    }

    const value = (event.target as HTMLInputElement).value;
    this.userSearchQuery.set(value);
    this.dropdownOpen.set(true);
  }

  onSearchFocus() {
    if (this.isBusy()) {
      return;
    }

    this.dropdownOpen.set(true);
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
      name: value.name.trim(),
      description: (value.description?.trim() || 'Sin descripción'),
      status: this.locationsService.toApiStatus(this.currentStatus()),
      managerIds: this.selectedManagers().map((manager) => manager.id),
    };

    try {
      this.isSubmitting.set(true);

      if (this.isEditMode()) {
        await firstValueFrom(this.locationsService.update(this.locationId()!, payload));
        this.notifications.success({ message: 'Ubicación actualizada correctamente.' });
      } else {
        await firstValueFrom(this.locationsService.create(payload));
        this.notifications.success({ message: 'Ubicación registrada correctamente.' });
      }

      await this.router.navigate(['/settings/locations']);
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(
          error,
          this.isEditMode()
            ? 'No se pudo actualizar la ubicación.'
            : 'No se pudo registrar la ubicación.',
        ),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadLocation(locationId: string) {
    try {
      this.isLoadingLocation.set(true);
      const location = await firstValueFrom(this.locationsService.getById(locationId));
      this.applyLocation(location);
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(error, 'No se pudo cargar la información de la ubicación.'),
      });
      await this.router.navigate(['/settings/locations']);
    } finally {
      this.isLoadingLocation.set(false);
    }
  }

  private applyLocation(location: LocationDto) {
    this.form.reset({
      name: location.name,
      description: location.description,
    });
    this.currentStatus.set(this.locationsService.toUiStatus(location.status));
    this.selectedManagers.set(
      location.managers.map((manager) => ({
        id: manager.id,
        name: manager.fullName,
        initials: manager.fullName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
      })),
    );
    this.userSearchQuery.set('');
    this.dropdownOpen.set(false);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }
}
