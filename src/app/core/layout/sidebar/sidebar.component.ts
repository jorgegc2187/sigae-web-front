import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
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

  readonly isMobileOpen = input(false);
  readonly closeMobile = output<void>();
  readonly appName = this.appConfig.appName;
  isSettingsOpen = signal(false);

  toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  closeOnNavigate() {
    this.closeMobile.emit();
  }
}
