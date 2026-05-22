import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '../../../../shared/ui/status-badge/status-badge.component';
import { User, UserRole, UserStatus } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

interface UserActionsMenuState {
  user: User;
  top: number;
  right: number;
}

interface PendingInvitationAction {
  user: User;
  type: 'cancel' | 'resend';
}

@Component({
  selector: 'app-user-list',
  imports: [SearchInputComponent, ActionButtonComponent, DesktopPaginationComponent, StatusBadgeComponent, SelectFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeActionsMenu()',
    '(window:scroll)': 'closeActionsMenu()',
    '(window:resize)': 'closeActionsMenu()',
  },
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly usersResource = this.usersService.listResource();
  private readonly statusDialog = viewChild<ElementRef<HTMLDialogElement>>('statusDialog');
  private readonly invitationDialog = viewChild<ElementRef<HTMLDialogElement>>('invitationDialog');

  searchQuery = signal('');
  selectedRole = signal<UserRole | ''>('');
  readonly roleFilterOptions: SelectFieldOption[] = [
    { value: '', label: 'Todos los roles' },
    { value: 'Administrador', label: 'Administrador' },
    { value: 'Encargado', label: 'Encargado' },
    { value: 'Solo Lectura', label: 'Solo Lectura' },
  ];
  currentPage = signal(1);
  openActionsMenu = signal<UserActionsMenuState | null>(null);
  pendingStatusActionUser = signal<User | null>(null);
  pendingInvitationAction = signal<PendingInvitationAction | null>(null);
  readonly pageSize = 10;
  readonly isLoading = computed(() => this.usersResource.isLoading());
  readonly currentUser = this.authService.currentUser;
  readonly users = computed(() => this.usersResource.value().map((user) => this.usersService.toUser(user)));
  readonly openActionsMenuUser = computed(() => this.openActionsMenu()?.user ?? null);
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
  readonly pendingInvitationActionLabel = computed(() =>
    this.pendingInvitationAction()?.type === 'cancel' ? 'Anular invitación' : 'Reenviar invitación',
  );
  readonly pendingInvitationActionMessage = computed(() => {
    const action = this.pendingInvitationAction();
    if (!action) {
      return '';
    }

    if (action.type === 'cancel') {
      return `El enlace actual de ${action.user.name} dejará de funcionar inmediatamente.`;
    }

    return `Se invalidará cualquier enlace anterior y se enviará una nueva invitación al correo ${action.user.email}.`;
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
    this.closeActionsMenu();
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onRoleFilter(role: string) {
    this.closeActionsMenu();
    this.selectedRole.set(role as UserRole | '');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.closeActionsMenu();
    this.currentPage.set(page);
  }

  clearFilters() {
    this.closeActionsMenu();
    this.searchQuery.set('');
    this.selectedRole.set('');
    this.currentPage.set(1);
  }

  toggleActionsMenu(user: User, trigger: HTMLElement) {
    const currentMenu = this.openActionsMenu();
    if (currentMenu?.user.id === user.id) {
      this.closeActionsMenu();
      return;
    }

    const rect = trigger.getBoundingClientRect();
    this.openActionsMenu.set({
      user,
      top: rect.bottom + 8,
      right: Math.max(window.innerWidth - rect.right, 16),
    });
  }

  closeActionsMenu() {
    this.openActionsMenu.set(null);
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
    void this.router.navigate(['/settings/users', user.id, 'edit']);
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

  onToggleMfaRequirement(user: User) {
    this.closeActionsMenu();
    this.usersService.updateMfaPolicy(user.id, !user.mfaRequired).subscribe({
      next: () => {
        this.usersResource.reload();
        this.notifications.success({
          message: !user.mfaRequired
            ? `2FA requerido para ${user.name}.`
            : `2FA desactivado para ${user.name}.`,
        });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'No se pudo actualizar la política 2FA.';
        this.notifications.error({ message });
      },
    });
  }

  onResetMfa(user: User) {
    this.closeActionsMenu();
    if (!window.confirm(`¿Resetear 2FA para ${user.name}? El usuario deberá enrolar nuevamente su autenticador.`)) {
      return;
    }

    this.usersService.resetMfa(user.id).subscribe({
      next: () => {
        this.usersResource.reload();
        this.notifications.success({ message: `2FA reseteado para ${user.name}.` });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'No se pudo resetear el 2FA del usuario.';
        this.notifications.error({ message });
      },
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

  canCancelInvitation(user: User): boolean {
    return user.status === 'Pendiente' && user.invitationStatus === 'ACTIVE';
  }

  canResendInvitation(user: User): boolean {
    return (
      user.status === 'Pendiente' &&
      (user.invitationStatus === 'ACTIVE' ||
        user.invitationStatus === 'EXPIRED' ||
        user.invitationStatus === 'CANCELLED')
    );
  }

  openInvitationDialog(user: User, type: PendingInvitationAction['type']) {
    this.closeActionsMenu();
    this.pendingInvitationAction.set({ user, type });
    const dialog = this.invitationDialog()?.nativeElement;
    if (!dialog?.open) {
      dialog?.showModal();
    }
  }

  closeInvitationDialog() {
    this.pendingInvitationAction.set(null);
    const dialog = this.invitationDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  onInvitationDialogClose() {
    this.pendingInvitationAction.set(null);
  }

  confirmInvitationAction() {
    const action = this.pendingInvitationAction();
    if (!action) {
      return;
    }

    const request$ =
      action.type === 'cancel'
        ? this.usersService.cancelInvitation(action.user.id)
        : this.usersService.resendInvitation(action.user.id);

    const dialog = this.invitationDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
    this.pendingInvitationAction.set(null);

    request$.subscribe({
      next: () => {
        this.usersResource.reload();
        this.notifications.success({
          message:
            action.type === 'cancel'
              ? `Invitación anulada para ${action.user.name}.`
              : `Invitación reenviada correctamente a ${action.user.name}.`,
        });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'No se pudo completar la acción sobre la invitación.';
        this.notifications.error({ message });
      },
    });
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

  getStatusLabel(user: User): string {
    if (user.status !== 'Pendiente') {
      return user.status;
    }

    if (user.invitationStatus === 'ACTIVE') {
      return 'Invitación activa';
    }

    if (user.invitationStatus === 'EXPIRED') {
      return 'Invitación vencida';
    }

    if (user.invitationStatus === 'CANCELLED') {
      return 'Invitación anulada';
    }

    return 'Pendiente';
  }

  getStatusBadgeTone(user: User): StatusBadgeTone {
    if (user.status === 'Activo') {
      return 'success';
    }

    if (user.status === 'Pendiente') {
      if (user.invitationStatus === 'ACTIVE') {
        return 'warning';
      }

      if (user.invitationStatus === 'CANCELLED') {
        return 'error';
      }

      return 'neutral';
    }

    return 'neutral';
  }

  getMfaBadgeTone(user: User): StatusBadgeTone {
    if (user.mfaEnabled) {
      return 'success';
    }
    if (user.mfaRequired) {
      return 'warning';
    }
    return 'neutral';
  }
}
