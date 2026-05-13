import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { LocationCardComponent } from '../../components/location-card/location-card.component';
import { Location } from '../../models/location.model';

@Component({
  selector: 'app-location-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocationCardComponent, SearchInputComponent, ActionButtonComponent],
  templateUrl: './location-list.component.html',
})
export class LocationListComponent {
  private readonly notifications = inject(NotificationService);

  readonly searchQuery = signal('');

  readonly mockLocations = signal<Location[]>([
    {
      id: '1',
      name: 'Aula de Cómputo',
      description: 'Laboratorio principal equipado con 30 estaciones de trabajo y proyector multimedia.',
      managers: [
        { id: 'm1', name: 'Juan Perez', initials: 'JP', colorClass: 'bg-primary' },
        { id: 'm2', name: 'Maria Garcia', initials: 'MG', colorClass: 'bg-secondary' }
      ],
      managersText: 'Juan Perez, Maria Garcia'
    },
    {
      id: '2',
      name: 'Biblioteca',
      description: 'Espacio de lectura y consulta bibliográfica. Contiene el archivo histórico escolar.',
      managers: [
        { id: 'm3', name: 'Rosa Luna', initials: 'RL', colorClass: 'bg-primary' }
      ],
      managersText: 'Rosa Luna'
    },
    {
      id: '3',
      name: 'Dirección',
      description: 'Oficina administrativa central para la gestión escolar y atención a padres.',
      managers: [],
      managersText: 'Sin encargado asignado'
    },
    {
      id: '4',
      name: 'Sala de Profesores',
      description: 'Área común para planificación docente y descanso entre periodos de clase.',
      managers: [
        { id: 'm4', name: 'Carlos Huaman', initials: 'CH', colorClass: 'bg-primary' },
        { id: 'm5', name: 'Ana Mori', initials: 'AM', colorClass: 'bg-secondary' },
        { id: 'm6', name: 'Pedro Vera', initials: 'PV', colorClass: 'bg-accent text-accent-content' }
      ],
      managersText: 'Carlos Huaman, Ana Mori, Pedro Vera'
    },
    {
      id: '5',
      name: 'Aula 1A',
      description: 'Salón de clases para primer grado de secundaria. Mobiliario completo.',
      managers: [
        { id: 'm7', name: 'Luis Castro', initials: 'LC', colorClass: 'bg-primary' }
      ],
      managersText: 'Luis Castro'
    },
    {
      id: '6',
      name: 'Laboratorio de Ciencias',
      description: 'Equipado para experimentos de física, química y biología. Normas de seguridad estrictas.',
      managers: [
        { id: 'm8', name: 'Elena Torres', initials: 'ET', colorClass: 'bg-primary' },
        { id: 'm9', name: 'Fernando Mora', initials: 'FM', colorClass: 'bg-secondary' },
        { id: 'm10', name: 'Jorge Soto', initials: 'JS', colorClass: 'bg-accent text-accent-content' }
      ],
      additionalManagersCount: 1,
      managersText: 'Torres, Mora, S. y 1 más'
    }
  ]);

  readonly filteredLocations = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.mockLocations();
    }

    return this.mockLocations().filter(
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
    this.notifications.success({ message: 'Ubicación eliminada correctamente.' });
  }
}
