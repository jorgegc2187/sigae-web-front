import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_CONFIG } from '../../config/app.tokens';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly appConfig = inject(APP_CONFIG);
  private readonly authService = inject(AuthService);

  readonly isMobileOpen = input(false);
  readonly closeMobile = output<void>();
  readonly appName = this.appConfig.appName;
  isSettingsOpen = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly isAdministrator = computed(() => this.currentUser()?.role === 'Administrador');

  toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  closeOnNavigate() {
    this.closeMobile.emit();
  }
}
