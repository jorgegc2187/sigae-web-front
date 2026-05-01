import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Teacher } from '../../models/teacher.model';

@Component({
  selector: 'app-teacher-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-card.component.html',
  host: {
    class: 'block h-full'
  }
})
export class TeacherCardComponent {
  teacher = input.required<Teacher>();
  viewHistory = output<string>();

  onViewHistory() {
    this.viewHistory.emit(this.teacher().id);
  }
}
