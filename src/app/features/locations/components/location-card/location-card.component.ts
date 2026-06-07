import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../shared/ui/status-badge/status-badge.component';
import { Location } from '../../models/location.model';

@Component({
  selector: 'app-location-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadgeComponent],
  templateUrl: './location-card.component.html',
  host: {
    class: 'block h-full'
  }
})
export class LocationCardComponent {
  location = input.required<Location>();
  edit = output<string>();
  toggleStatus = output<string>();

  readonly statusTone = computed<StatusBadgeTone>(() =>
    this.location().status === 'Activo' ? 'success' : 'neutral',
  );
  readonly statusActionLabel = computed(() =>
    this.location().status === 'Activo' ? 'Desactivar ubicación' : 'Activar ubicación',
  );
  readonly statusActionIcon = computed(() =>
    this.location().status === 'Activo' ? 'block' : 'restart_alt',
  );
  readonly topBarClass = computed(() =>
    this.location().status === 'Activo' ? 'bg-primary/20' : 'bg-base-300',
  );

  onEdit() {
    this.edit.emit(this.location().id);
  }

  onToggleStatus() {
    this.toggleStatus.emit(this.location().id);
  }
}
