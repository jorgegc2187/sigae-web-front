import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../shared/ui/status-badge/status-badge.component';
import { Teacher } from '../../models/teacher.model';

@Component({
  selector: 'app-teacher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadgeComponent],
  templateUrl: './teacher-card.component.html',
  host: {
    class: 'block h-full',
  },
})
export class TeacherCardComponent {
  readonly teacher = input.required<Teacher>();
  readonly canManage = input(false);

  readonly edit = output<string>();
  readonly toggleStatus = output<string>();

  readonly statusTone = computed<StatusBadgeTone>(() =>
    this.teacher().status === 'Activo' ? 'success' : 'neutral',
  );
  readonly topBarClass = computed(() =>
    this.teacher().status === 'Activo' ? 'bg-primary/20' : 'bg-base-300',
  );
  readonly statusActionLabel = computed(() =>
    this.teacher().status === 'Activo' ? 'Desactivar docente' : 'Activar docente',
  );
  readonly statusActionIcon = computed(() =>
    this.teacher().status === 'Activo' ? 'person_off' : 'person_check',
  );

  onEdit() {
    this.edit.emit(this.teacher().id);
  }

  onToggleStatus() {
    this.toggleStatus.emit(this.teacher().id);
  }
}
