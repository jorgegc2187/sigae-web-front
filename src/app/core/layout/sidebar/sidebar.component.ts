import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly isMobileOpen = input(false);
  readonly closeMobile = output<void>();
  isSettingsOpen = signal(false);

  toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  closeOnNavigate() {
    this.closeMobile.emit();
  }
}
