import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import {
  ConfirmationModalComponent,
  ConfirmationModalTone,
} from '../../../../shared/ui/confirmation-modal/confirmation-modal.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { LocationCardComponent } from '../../components/location-card/location-card.component';
import { Location } from '../../models/location.model';
import { LocationsService } from '../../services/locations.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-location-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LocationCardComponent,
    SearchInputComponent,
    ActionButtonComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './location-list.component.html',
})
export class LocationListComponent {
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly locationsService = inject(LocationsService);

  private readonly locationsResource = this.locationsService.listResource();

  readonly searchQuery = signal('');
  readonly pendingStatusLocation = signal<Location | null>(null);
  readonly isUpdatingStatus = signal(false);
  readonly locations = computed(() =>
    this.locationsResource.value().map((location) => this.locationsService.toLocation(location)),
  );
  readonly isLoading = computed(() => this.locationsResource.isLoading());

  readonly filteredLocations = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.locations();
    }

    return this.locations().filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.description.toLowerCase().includes(query) ||
        location.managersText.toLowerCase().includes(query),
    );
  });

  readonly pendingStatusTitle = computed(() => {
    const location = this.pendingStatusLocation();
    if (!location) {
      return '';
    }

    return location.status === 'Activo' ? 'Desactivar ubicación' : 'Activar ubicación';
  });

  readonly pendingStatusMessage = computed(() => {
    const location = this.pendingStatusLocation();
    if (!location) {
      return '';
    }

    return location.status === 'Activo'
      ? `La ubicación ${location.name} dejará de estar disponible para nuevas selecciones operativas, pero se conservará en históricos y reportes.`
      : `La ubicación ${location.name} volverá a estar disponible para nuevas selecciones operativas.`;
  });

  readonly pendingStatusLabel = computed(() => {
    const location = this.pendingStatusLocation();
    if (!location) {
      return 'Confirmar';
    }

    return location.status === 'Activo' ? 'Desactivar ubicación' : 'Activar ubicación';
  });

  readonly pendingStatusTone = computed<ConfirmationModalTone>(() =>
    this.pendingStatusLocation()?.status === 'Activo' ? 'warning' : 'info',
  );

  readonly pendingStatusIcon = computed(() =>
    this.pendingStatusLocation()?.status === 'Activo' ? 'block' : 'restart_alt',
  );

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  onEdit(id: string) {
    void this.router.navigate(['/settings/locations', id, 'edit']);
  }

  onToggleStatus(id: string) {
    const location = this.locations().find((item) => item.id === id);
    if (!location) {
      return;
    }

    this.pendingStatusLocation.set(location);
  }

  closeStatusConfirmation() {
    if (this.isUpdatingStatus()) {
      return;
    }

    this.pendingStatusLocation.set(null);
  }

  async confirmStatusChange() {
    const location = this.pendingStatusLocation();
    if (!location || this.isUpdatingStatus()) {
      return;
    }

    try {
      this.isUpdatingStatus.set(true);
      await firstValueFrom(this.locationsService.updateStatus(location.id, {
        status: this.locationsService.toApiStatus(location.status === 'Activo' ? 'Inactivo' : 'Activo'),
      }));
      this.locationsResource.reload();
      this.pendingStatusLocation.set(null);
      this.notifications.success({
        message:
          location.status === 'Activo'
            ? `Ubicación ${location.name} desactivada correctamente.`
            : `Ubicación ${location.name} activada correctamente.`,
      });
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(
          error,
          location.status === 'Activo'
            ? 'No se pudo desactivar la ubicación.'
            : 'No se pudo activar la ubicación.',
        ),
      });
    } finally {
      this.isUpdatingStatus.set(false);
    }
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }
}
