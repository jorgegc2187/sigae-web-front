import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { TeacherCardComponent } from '../../components/teacher-card/teacher-card.component';
import { Teacher } from '../../models/teacher.model';

@Component({
  selector: 'app-teacher-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeacherCardComponent, SearchInputComponent, ActionButtonComponent],
  templateUrl: './teacher-list.component.html',
})
export class TeacherListComponent {
  readonly searchQuery = signal('');

  readonly teachers = signal<Teacher[]>([
    { id: '1', name: 'Alejandro Cárdenas', initials: 'AC', dni: '45678912', specialty: 'Matemáticas y Física', email: 'a.cardenas@colegio.edu.pe', phone: '+51 987 654 321' },
    { id: '2', name: 'Maria Rodriguez', initials: 'MR', dni: '70123456', specialty: 'Comunicación e Idiomas', email: 'm.rodriguez@colegio.edu.pe', phone: '+51 912 345 678' },
    { id: '3', name: 'Jorge Sánchez', initials: 'JS', dni: '12345678', specialty: 'Ciencia, Tecnología y Ambiente', email: 'j.sanchez@colegio.edu.pe', phone: '+51 955 443 322' },
    { id: '4', name: 'Elena Paredes', initials: 'EP', dni: '09876543', specialty: 'Ciencias Sociales', email: 'e.paredes@colegio.edu.pe', phone: '+51 944 332 211' },
    { id: '5', name: 'Roberto Mendoza', initials: 'RM', dni: '21436587', specialty: 'Educación Física', email: 'r.mendoza@colegio.edu.pe', phone: '+51 966 778 899' },
    { id: '6', name: 'Sofia Torres', initials: 'ST', dni: '87654321', specialty: 'Arte y Cultura', email: 's.torres@colegio.edu.pe', phone: '+51 922 110 099' },
  ]);

  readonly filteredTeachers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.teachers();
    }

    return this.teachers().filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(query) ||
        teacher.dni.toLowerCase().includes(query) ||
        teacher.specialty.toLowerCase().includes(query),
    );
  });

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  onViewHistory(teacherId: string) {
    console.log('Ver historial:', teacherId);
  }
}
