import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly isMobileSidebarOpen = signal(false);

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.update((isOpen) => !isOpen);
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }
}
