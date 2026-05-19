import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly sidebarStorageKey = 'sigae-sidebar-collapsed';
  readonly isMobileSidebarOpen = signal(false);
  readonly isDesktopSidebarCollapsed = signal(this.readStoredCollapsedState());
  readonly sidebarWidth = computed(() => (this.isDesktopSidebarCollapsed() ? 64 : 240));

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.update((isOpen) => !isOpen);
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  toggleDesktopSidebar() {
    this.isDesktopSidebarCollapsed.update((isCollapsed) => {
      const nextValue = !isCollapsed;
      this.storeCollapsedState(nextValue);
      return nextValue;
    });
  }

  private readStoredCollapsedState(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.sidebarStorageKey) === 'true';
  }

  private storeCollapsedState(value: boolean) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.sidebarStorageKey, String(value));
  }
}
