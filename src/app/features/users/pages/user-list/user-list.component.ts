import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '../../../../shared/ui/status-badge/status-badge.component';
import { MOCK_USERS, User, UserRole, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [SearchInputComponent, ActionButtonComponent, DataListingComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  private readonly notifications = inject(NotificationService);

  searchQuery = signal('');
  selectedRole = signal<UserRole | ''>('');
  currentPage = signal(1);
  readonly pageSize = 10;

  private readonly allUsers = signal<User[]>(MOCK_USERS);

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();

    return this.allUsers().filter((u) => {
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

  onEdit(userId: number) {
    console.log('Editar usuario:', userId);
    this.notifications.info({ message: 'Edición de usuario pendiente de conectar.' });
  }

  onToggleStatus(user: User) {
    console.log('Toggle status:', user.id, user.status);
    this.notifications.success({
      message:
        user.status === 'Activo'
          ? `Usuario ${user.name} desactivado correctamente.`
          : `Usuario ${user.name} activado correctamente.`,
    });
  }

  onSendInvitation() {
    console.log('Enviar invitación');
    this.notifications.success({ message: 'Invitación enviada correctamente.' });
  }

  onNewUser() {
    console.log('Nuevo usuario');
    this.notifications.info({ message: 'Creación de usuario pendiente de conectar.' });
  }

  getRoleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Administrador: 'badge-primary',
      Encargado: 'badge-secondary',
      Director: 'badge-neutral',
    };
    return map[role];
  }

  getStatusBadgeTone(status: UserStatus): StatusBadgeTone {
    return status === 'Activo' ? 'success' : 'neutral';
  }
}
