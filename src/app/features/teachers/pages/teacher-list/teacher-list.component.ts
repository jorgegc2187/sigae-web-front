import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import {
  ConfirmationModalComponent,
  ConfirmationModalTone,
} from '../../../../shared/ui/confirmation-modal/confirmation-modal.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { TeacherCardComponent } from '../../components/teacher-card/teacher-card.component';
import { Teacher } from '../../models/teacher.model';
import { TeachersService } from '../../services/teachers.service';

@Component({
  selector: 'app-teacher-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TeacherCardComponent,
    SearchInputComponent,
    ActionButtonComponent,
    ConfirmationModalComponent,
  ],
  templateUrl: './teacher-list.component.html',
})
export class TeacherListComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly teachersService = inject(TeachersService);
  private readonly teachersResource = this.teachersService.listResource();

  readonly searchQuery = signal('');
  readonly pendingStatusTeacher = signal<Teacher | null>(null);
  readonly isUpdatingStatus = signal(false);
  readonly canManageTeachers = computed(() =>
    this.authService.hasAnyRole(['Administrador']),
  );
  readonly teachers = computed(() =>
    this.teachersResource.value().map((teacher) => this.teachersService.toTeacher(teacher)),
  );
  readonly isLoading = computed(() => this.teachersResource.isLoading());

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

  readonly pendingStatusTitle = computed(() => {
    const teacher = this.pendingStatusTeacher();
    if (!teacher) {
      return '';
    }

    return teacher.status === 'Activo' ? 'Desactivar docente' : 'Activar docente';
  });

  readonly pendingStatusMessage = computed(() => {
    const teacher = this.pendingStatusTeacher();
    if (!teacher) {
      return '';
    }

    return teacher.status === 'Activo'
      ? `El docente ${teacher.name} dejará de estar disponible para nuevos préstamos, pero se conservará en el historial del sistema.`
      : `El docente ${teacher.name} volverá a estar disponible para nuevas operaciones.`;
  });

  readonly pendingStatusLabel = computed(() => {
    const teacher = this.pendingStatusTeacher();
    if (!teacher) {
      return 'Confirmar';
    }

    return teacher.status === 'Activo' ? 'Desactivar docente' : 'Activar docente';
  });

  readonly pendingStatusTone = computed<ConfirmationModalTone>(() =>
    this.pendingStatusTeacher()?.status === 'Activo' ? 'warning' : 'info',
  );

  readonly pendingStatusIcon = computed(() =>
    this.pendingStatusTeacher()?.status === 'Activo' ? 'person_off' : 'person_check',
  );

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  onEdit(id: string) {
    if (!this.canManageTeachers()) {
      return;
    }

    void this.router.navigate(['/teachers', id, 'edit']);
  }

  onToggleStatus(id: string) {
    if (!this.canManageTeachers()) {
      return;
    }

    const teacher = this.teachers().find((item) => item.id === id);
    if (!teacher) {
      return;
    }

    this.pendingStatusTeacher.set(teacher);
  }

  closeStatusConfirmation() {
    if (this.isUpdatingStatus()) {
      return;
    }

    this.pendingStatusTeacher.set(null);
  }

  async confirmStatusChange() {
    const teacher = this.pendingStatusTeacher();
    if (!teacher || this.isUpdatingStatus()) {
      return;
    }

    try {
      this.isUpdatingStatus.set(true);
      await firstValueFrom(this.teachersService.updateStatus(teacher.id, {
        status: this.teachersService.toApiStatus(teacher.status === 'Activo' ? 'Inactivo' : 'Activo'),
      }));
      this.teachersResource.reload();
      this.pendingStatusTeacher.set(null);
      this.notifications.success({
        message:
          teacher.status === 'Activo'
            ? `Docente ${teacher.name} desactivado correctamente.`
            : `Docente ${teacher.name} activado correctamente.`,
      });
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(
          error,
          teacher.status === 'Activo'
            ? 'No se pudo desactivar el docente.'
            : 'No se pudo activar el docente.',
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
