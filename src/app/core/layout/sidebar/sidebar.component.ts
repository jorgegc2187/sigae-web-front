import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { BrandingService } from '../../services/branding.service';
import { ShellNotificationsService } from '../notifications/shell-notifications.service';

interface SidebarNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  adminOnly?: boolean;
  showDividerBefore?: boolean;
  badgeCount?: number;
  activePrefixes?: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly brandingService = inject(BrandingService);
  private readonly shellNotificationsService = inject(ShellNotificationsService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  private readonly currentPath = computed(() => this.currentUrl().split('?')[0]?.split('#')[0] ?? '');

  readonly isMobileOpen = input(false);
  readonly isDesktopCollapsed = input(false);
  readonly closeMobile = output<void>();
  readonly toggleDesktop = output<void>();
  readonly appName = this.brandingService.systemName;
  readonly logoUrl = this.brandingService.logoUrl;
  readonly currentUser = this.authService.currentUser;
  readonly isAdministrator = computed(() => this.currentUser()?.role === 'Administrador');
  readonly navItems = computed(() =>
    [
      { label: 'Dashboard', icon: 'grid_view', route: '/dashboard', exact: true },
      { label: 'Inventario', icon: 'inventory_2', route: '/inventory' },
      { label: 'Préstamos', icon: 'swap_horiz', route: '/loans', badgeCount: this.shellNotificationsService.loanAttentionCount() || undefined },
      { label: 'Reportes', icon: 'bar_chart', route: '/reports' },
      { label: 'Categorías y Tipos', icon: 'category', route: '/settings/categories', adminOnly: true, showDividerBefore: true },
      { label: 'Ubicaciones', icon: 'location_on', route: '/settings/locations', adminOnly: true },
      { label: 'Proveedores', icon: 'local_shipping', route: '/settings/suppliers', adminOnly: true },
      { label: 'Docentes', icon: 'group', route: '/teachers' },
      { label: 'Usuarios', icon: 'person', route: '/settings/users', adminOnly: true, showDividerBefore: true },
      { label: 'Configuración', icon: 'settings', route: '/settings', adminOnly: true, exact: true },
    ].filter((item) => !item.adminOnly || this.isAdministrator()),
  );

  onToggleDesktop() {
    this.toggleDesktop.emit();
  }

  closeOnNavigate() {
    this.closeMobile.emit();
  }

  isItemActive(item: SidebarNavItem) {
    const currentPath = this.currentPath();

    if (item.activePrefixes?.length) {
      return item.activePrefixes.some((prefix) =>
        currentPath === prefix || currentPath.startsWith(`${prefix}/`),
      );
    }

    if (item.exact) {
      return currentPath === item.route;
    }

    return currentPath === item.route || currentPath.startsWith(`${item.route}/`);
  }
}
