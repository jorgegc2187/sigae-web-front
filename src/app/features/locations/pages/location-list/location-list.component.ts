import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { LocationCardComponent } from '../../components/location-card/location-card.component';
import { LocationsService } from '../../services/locations.service';

@Component({
  selector: 'app-location-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocationCardComponent, SearchInputComponent, ActionButtonComponent],
  templateUrl: './location-list.component.html',
})
export class LocationListComponent {
  private readonly notifications = inject(NotificationService);
  private readonly locationsService = inject(LocationsService);

  readonly searchQuery = signal('');
  readonly locations = toSignal(this.locationsService.list(), { initialValue: [] });

  readonly filteredLocations = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.locations();
    }

    return this.locations().filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.description.toLowerCase().includes(query) ||
        (location.managersText ?? '').toLowerCase().includes(query),
    );
  });

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  onEdit(id: string) {
    console.log('Editar ubicación', id);
    this.notifications.info({ message: 'Edición de ubicación pendiente de conectar.' });
  }

  onDelete(id: string) {
    console.log('Eliminar ubicación', id);
    this.notifications.info({ message: 'Eliminación de ubicaciones pendiente en API.' });
  }
}
