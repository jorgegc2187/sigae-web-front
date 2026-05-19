import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { APP_CONFIG } from '../../config/app.tokens';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

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
  private readonly appConfig = inject(APP_CONFIG);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isMobileOpen = input(false);
  readonly isDesktopCollapsed = input(false);
  readonly closeMobile = output<void>();
  readonly toggleDesktop = output<void>();
  readonly appName = this.appConfig.appName;
  readonly currentUser = this.authService.currentUser;
  readonly isAdministrator = computed(() => this.currentUser()?.role === 'Administrador');
  readonly navItems = computed(() =>
    [
      { label: 'Dashboard', icon: 'grid_view', route: '/dashboard', exact: true },
      { label: 'Inventario', icon: 'inventory_2', route: '/inventory' },
      { label: 'Préstamos', icon: 'swap_horiz', route: '/loans', badgeCount: 3 },
      { label: 'Reportes', icon: 'bar_chart', route: '/reports' },
      { label: 'Categorías y Tipos', icon: 'category', route: '/settings/categories', adminOnly: true, showDividerBefore: true },
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
    const currentUrl = this.currentUrl();

    if (item.activePrefixes?.length) {
      return item.activePrefixes.some((prefix) =>
        currentUrl === prefix || currentUrl.startsWith(`${prefix}/`),
      );
    }

    if (item.exact) {
      return currentUrl === item.route;
    }

    return currentUrl === item.route || currentUrl.startsWith(`${item.route}/`);
  }
}
