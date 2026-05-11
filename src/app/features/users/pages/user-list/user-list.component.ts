import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { MOCK_USERS, User, UserRole, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  searchQuery = signal('');
  selectedRole = signal<UserRole | ''>('');

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

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  onRoleFilter(event: Event) {
    this.selectedRole.set((event.target as HTMLSelectElement).value as UserRole | '');
  }

  onEdit(userId: number) {
    console.log('Editar usuario:', userId);
  }

  onToggleStatus(user: User) {
    console.log('Toggle status:', user.id, user.status);
  }

  onSendInvitation() {
    console.log('Enviar invitación');
  }

  onNewUser() {
    console.log('Nuevo usuario');
  }

  getRoleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Administrador: 'badge-primary',
      Encargado: 'badge-secondary',
      Director: 'badge-neutral',
    };
    return map[role];
  }

  getStatusBadgeClass(status: UserStatus): string {
    return status === 'Activo' ? 'badge-success' : 'badge-ghost';
  }
}
