import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import {
  ConfirmationModalComponent,
  ConfirmationModalTone,
} from '../../../../shared/ui/confirmation-modal/confirmation-modal.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '../../../../shared/ui/status-badge/status-badge.component';
import { User, UserRole } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

interface UserActionsMenuState {
  user: User;
  top: number;
  right: number;
}

type PendingUserConfirmationType =
  | 'activate'
  | 'deactivate'
  | 'cancelInvitation'
  | 'resendInvitation'
  | 'requireMfa'
  | 'removeMfaRequirement'
  | 'resetMfa';

interface PendingUserConfirmation {
  user: User;
  type: PendingUserConfirmationType;
}

@Component({
  selector: 'app-user-list',
  imports: [
    SearchInputComponent,
    ActionButtonComponent,
    DesktopPaginationComponent,
    StatusBadgeComponent,
    SelectFieldComponent,
    ConfirmationModalComponent,
  ],
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
  pendingConfirmation = signal<PendingUserConfirmation | null>(null);
  readonly isConfirmingAction = signal(false);
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
  readonly pendingConfirmationUser = computed(() => this.pendingConfirmation()?.user ?? null);
  readonly pendingConfirmationTitle = computed(() => {
    const action = this.pendingConfirmation();
    if (!action) {
      return '';
    }

    const titles: Record<PendingUserConfirmationType, string> = {
      activate: 'Activar usuario',
      deactivate: 'Desactivar usuario',
      cancelInvitation: 'Anular invitación',
      resendInvitation: 'Reenviar invitación',
      requireMfa: 'Requerir 2FA',
      removeMfaRequirement: 'Quitar requisito 2FA',
      resetMfa: 'Resetear 2FA',
    };
    return titles[action.type];
  });
  readonly pendingConfirmationMessage = computed(() => {
    const action = this.pendingConfirmation();
    if (!action) {
      return '';
    }

    const messages: Record<PendingUserConfirmationType, string> = {
      activate: `El usuario ${action.user.name} recuperará el acceso al sistema inmediatamente.`,
      deactivate: `El usuario ${action.user.name} no podrá iniciar sesión hasta que vuelva a activarse.`,
      cancelInvitation: `El enlace actual de ${action.user.name} dejará de funcionar inmediatamente.`,
      resendInvitation: `Se invalidará cualquier enlace anterior y se enviará una nueva invitación al correo ${action.user.email}.`,
      requireMfa: `El usuario ${action.user.name} deberá configurar 2FA en su próximo inicio de sesión.`,
      removeMfaRequirement: `Se quitará el requisito de 2FA para ${action.user.name}. Si ya tenía 2FA activo, se desactivará.`,
      resetMfa: `El usuario ${action.user.name} deberá enrolar nuevamente su aplicación autenticadora.`,
    };
    return messages[action.type];
  });
  readonly pendingConfirmationLabel = computed(() => {
    const action = this.pendingConfirmation();
    if (!action) {
      return 'Confirmar';
    }

    const labels: Record<PendingUserConfirmationType, string> = {
      activate: 'Activar usuario',
      deactivate: 'Desactivar usuario',
      cancelInvitation: 'Anular invitación',
      resendInvitation: 'Reenviar invitación',
      requireMfa: 'Requerir 2FA',
      removeMfaRequirement: 'Quitar requisito',
      resetMfa: 'Resetear 2FA',
    };
    return labels[action.type];
  });
  readonly pendingConfirmationIcon = computed(() => {
    const action = this.pendingConfirmation();
    if (!action) {
      return null;
    }

    const icons: Record<PendingUserConfirmationType, string> = {
      activate: 'person',
      deactivate: 'person_off',
      cancelInvitation: 'cancel',
      resendInvitation: 'mail',
      requireMfa: 'shield_lock',
      removeMfaRequirement: 'lock_open',
      resetMfa: 'restart_alt',
    };
    return icons[action.type];
  });
  readonly pendingConfirmationTone = computed<ConfirmationModalTone>(() => {
    const type = this.pendingConfirmation()?.type;
    if (type === 'deactivate' || type === 'cancelInvitation' || type === 'resetMfa') {
      return 'danger';
    }

    if (type === 'removeMfaRequirement') {
      return 'warning';
    }

    return 'info';
  });
  readonly isMfaConfirmation = computed(() => {
    const type = this.pendingConfirmation()?.type;
    return type === 'requireMfa' || type === 'removeMfaRequirement' || type === 'resetMfa';
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
    this.openUserConfirmation(user, user.mfaRequired ? 'removeMfaRequirement' : 'requireMfa');
  }

  onResetMfa(user: User) {
    this.openUserConfirmation(user, 'resetMfa');
  }

  onToggleStatus(user: User) {
    const restrictionMessage = this.getStatusRestrictionMessage(user);
    if (restrictionMessage) {
      this.closeActionsMenu();
      this.notifications.warning({ message: restrictionMessage });
      return;
    }

    this.openUserConfirmation(user, user.status === 'Activo' ? 'deactivate' : 'activate');
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

  openUserConfirmation(user: User, type: PendingUserConfirmationType) {
    this.closeActionsMenu();
    this.pendingConfirmation.set({ user, type });
  }

  closeUserConfirmation() {
    if (this.isConfirmingAction()) {
      return;
    }

    this.pendingConfirmation.set(null);
  }

  async confirmUserAction(): Promise<void> {
    const action = this.pendingConfirmation();
    if (!action) {
      return;
    }

    if (this.isConfirmingAction()) {
      return;
    }

    try {
      this.isConfirmingAction.set(true);
      await this.executeUserAction(action);
      this.usersResource.reload();
      this.pendingConfirmation.set(null);
      this.notifications.success({ message: this.getUserActionSuccessMessage(action) });
    } catch (error) {
      this.notifications.error({ message: this.getBackendMessage(error, this.getUserActionErrorMessage(action)) });
    } finally {
      this.isConfirmingAction.set(false);
    }
  }

  private async executeUserAction(action: PendingUserConfirmation): Promise<void> {
    switch (action.type) {
      case 'activate':
        await firstValueFrom(this.usersService.updateStatus(action.user.id, this.usersService.toApiStatus('Activo')));
        return;
      case 'deactivate':
        await firstValueFrom(this.usersService.updateStatus(action.user.id, this.usersService.toApiStatus('Inactivo')));
        return;
      case 'cancelInvitation':
        await firstValueFrom(this.usersService.cancelInvitation(action.user.id));
        return;
      case 'resendInvitation':
        await firstValueFrom(this.usersService.resendInvitation(action.user.id));
        return;
      case 'requireMfa':
        await firstValueFrom(this.usersService.updateMfaPolicy(action.user.id, true));
        return;
      case 'removeMfaRequirement':
        await firstValueFrom(this.usersService.updateMfaPolicy(action.user.id, false));
        return;
      case 'resetMfa':
        await firstValueFrom(this.usersService.resetMfa(action.user.id));
        return;
    }
  }

  private getUserActionSuccessMessage(action: PendingUserConfirmation): string {
    const messages: Record<PendingUserConfirmationType, string> = {
      activate: `Usuario ${action.user.name} activado correctamente.`,
      deactivate: `Usuario ${action.user.name} desactivado correctamente.`,
      cancelInvitation: `Invitación anulada para ${action.user.name}.`,
      resendInvitation: `Invitación reenviada correctamente a ${action.user.name}.`,
      requireMfa: `2FA requerido para ${action.user.name}.`,
      removeMfaRequirement: `2FA desactivado para ${action.user.name}.`,
      resetMfa: `2FA reseteado para ${action.user.name}.`,
    };
    return messages[action.type];
  }

  private getUserActionErrorMessage(action: PendingUserConfirmation): string {
    const messages: Record<PendingUserConfirmationType, string> = {
      activate: 'No se pudo activar el usuario.',
      deactivate: 'No se pudo desactivar el usuario.',
      cancelInvitation: 'No se pudo anular la invitación.',
      resendInvitation: 'No se pudo reenviar la invitación.',
      requireMfa: 'No se pudo requerir 2FA para este usuario.',
      removeMfaRequirement: 'No se pudo quitar el requisito 2FA.',
      resetMfa: 'No se pudo resetear el 2FA del usuario.',
    };
    return messages[action.type];
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
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
