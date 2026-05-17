import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '../../../../shared/ui/status-badge/status-badge.component';
import { User, UserRole, UserStatus } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-user-list',
  imports: [SearchInputComponent, ActionButtonComponent, DesktopPaginationComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  private readonly notifications = inject(NotificationService);
  private readonly usersService = inject(UsersService);
  private readonly usersResource = this.usersService.listResource();

  searchQuery = signal('');
  selectedRole = signal<UserRole | ''>('');
  currentPage = signal(1);
  readonly pageSize = 10;
  readonly isLoading = computed(() => this.usersResource.isLoading());
  readonly users = computed(() => this.usersResource.value().map((user) => this.usersService.toUser(user)));

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();
    const users = this.users();

    return users.filter((u) => {
      const matchesQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);
      const matchesRole = !role || u.role === role;
      return matchesQuery && matchesRole;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  resultLabel = computed(() => {
    const total = this.filteredUsers().length;
    if (total === 0) {
      return 'Mostrando 0 usuarios';
    }

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `Mostrando ${start}-${end} de ${total} usuarios`;
  });

  constructor() {
    effect(() => {
      const totalPages = this.totalPages();
      const currentPage = this.currentPage();

      if (currentPage > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  onSearch(value: string) {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onRoleFilter(event: Event) {
    this.selectedRole.set((event.target as HTMLSelectElement).value as UserRole | '');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedRole.set('');
    this.currentPage.set(1);
  }

  onEdit(userId: string) {
    console.log('Editar usuario:', userId);
    this.notifications.info({ message: 'Edición de usuario pendiente de conectar.' });
  }

  onToggleStatus(user: User) {
    if (user.status === 'Pendiente') {
      return;
    }

    const nextStatus: UserStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo';
    this.usersService.updateStatus(user.id, this.usersService.toApiStatus(nextStatus)).subscribe({
      next: () => {
        this.usersResource.reload();
        this.notifications.success({
          message:
            nextStatus === 'Inactivo'
              ? `Usuario ${user.name} desactivado correctamente.`
              : `Usuario ${user.name} activado correctamente.`,
        });
      },
      error: () => {
        this.notifications.error({ message: 'No se pudo actualizar el estado del usuario.' });
      },
    });
  }

  getRoleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Administrador: 'badge-primary',
      Encargado: 'badge-secondary',
      'Solo Lectura': 'badge-neutral',
    };
    return map[role];
  }

  getStatusBadgeTone(status: UserStatus): StatusBadgeTone {
    if (status === 'Activo') {
      return 'success';
    }

    if (status === 'Pendiente') {
      return 'warning';
    }

    return 'neutral';
  }
}
