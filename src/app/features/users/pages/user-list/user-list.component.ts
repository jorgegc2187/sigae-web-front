import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
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
  host: {
    '(document:keydown.escape)': 'closeActionsMenu()',
  },
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly usersService = inject(UsersService);
  private readonly usersResource = this.usersService.listResource();
  private readonly statusDialog = viewChild<ElementRef<HTMLDialogElement>>('statusDialog');

  searchQuery = signal('');
  selectedRole = signal<UserRole | ''>('');
  currentPage = signal(1);
  openActionsMenuUserId = signal<string | null>(null);
  pendingStatusActionUser = signal<User | null>(null);
  readonly pageSize = 10;
  readonly isLoading = computed(() => this.usersResource.isLoading());
  readonly currentUser = this.authService.currentUser;
  readonly users = computed(() => this.usersResource.value().map((user) => this.usersService.toUser(user)));
  readonly activeAdministratorIds = computed(() =>
    new Set(
      this.users()
        .filter((user) => user.role === 'Administrador' && user.status === 'Activo')
        .map((user) => user.id),
    ),
  );
  readonly pendingStatusActionLabel = computed(() =>
    this.pendingStatusActionUser()?.status === 'Activo' ? 'Desactivar usuario' : 'Activar usuario',
  );
  readonly pendingStatusActionMessage = computed(() => {
    const user = this.pendingStatusActionUser();
    if (!user) {
      return '';
    }

    if (user.status === 'Activo') {
      return `El usuario ${user.name} no podrá iniciar sesión hasta que vuelva a activarse.`;
    }

    return `El usuario ${user.name} recuperará el acceso al sistema inmediatamente.`;
  });

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

  toggleActionsMenu(userId: string) {
    this.openActionsMenuUserId.update((currentUserId) => (currentUserId === userId ? null : userId));
  }

  closeActionsMenu() {
    this.openActionsMenuUserId.set(null);
  }

  isActionsMenuOpen(userId: string): boolean {
    return this.openActionsMenuUserId() === userId;
  }

  isCurrentUser(user: User): boolean {
    return this.currentUser()?.id === user.id;
  }

  isLastActiveAdministrator(user: User): boolean {
    return (
      user.role === 'Administrador' &&
      user.status === 'Activo' &&
      this.activeAdministratorIds().size === 1 &&
      this.activeAdministratorIds().has(user.id)
    );
  }

  canToggleStatus(user: User): boolean {
    if (user.status === 'Pendiente') {
      return false;
    }

    if (user.status === 'Activo' && (this.isCurrentUser(user) || this.isLastActiveAdministrator(user))) {
      return false;
    }

    return true;
  }

  getStatusRestrictionMessage(user: User): string | null {
    if (user.status === 'Pendiente') {
      return 'Los usuarios pendientes completan su activación desde el enlace de invitación.';
    }

    if (this.isCurrentUser(user)) {
      return 'No puede desactivarse a sí mismo.';
    }

    if (this.isLastActiveAdministrator(user)) {
      return 'No se puede desactivar al último administrador activo.';
    }

    return null;
  }

  openStatusDialog(user: User) {
    this.pendingStatusActionUser.set(user);
    const dialog = this.statusDialog()?.nativeElement;
    if (!dialog?.open) {
      dialog?.showModal();
    }
  }

  closeStatusDialog() {
    this.pendingStatusActionUser.set(null);
    const dialog = this.statusDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  onStatusDialogClose() {
    this.pendingStatusActionUser.set(null);
  }

  onEdit(user: User) {
    this.closeActionsMenu();
    console.log('Editar usuario:', user.id);
    this.notifications.info({ message: 'Edición de usuario pendiente de conectar.' });
  }

  onResetPassword(user: User) {
    this.closeActionsMenu();
    this.notifications.info({
      message: `Restablecimiento de contraseña para ${user.name} pendiente de conectar.`,
    });
  }

  onViewActivity(user: User) {
    this.closeActionsMenu();
    this.notifications.info({
      message: `Consulta de actividad para ${user.name} pendiente de conectar.`,
    });
  }

  onToggleStatus(user: User) {
    const restrictionMessage = this.getStatusRestrictionMessage(user);
    if (restrictionMessage) {
      this.closeActionsMenu();
      this.notifications.warning({ message: restrictionMessage });
      return;
    }

    if (user.status === 'Activo') {
      this.closeActionsMenu();
      this.openStatusDialog(user);
      return;
    }

    this.performStatusUpdate(user, 'Activo');
  }

  confirmStatusChange() {
    const user = this.pendingStatusActionUser();
    if (!user) {
      return;
    }

    this.performStatusUpdate(user, user.status === 'Activo' ? 'Inactivo' : 'Activo');
  }

  private performStatusUpdate(user: User, nextStatus: UserStatus) {
    this.closeActionsMenu();
    const dialog = this.statusDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.pendingStatusActionUser.set(null);
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
      error: (error) => {
        const message =
          error?.error?.message ??
          'No se pudo actualizar el estado del usuario.';
        this.notifications.error({ message });
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
