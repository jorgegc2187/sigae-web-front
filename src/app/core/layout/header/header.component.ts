import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { BrandingService } from '../../services/branding.service';
import { ShellNotificationsService } from '../notifications/shell-notifications.service';
import { NotificationFilter, NotificationItem } from '../notifications/notifications.model';
import { NotificationListItemComponent } from '../../../shared/ui/notification-list-item/notification-list-item.component';

@Component({
  selector: 'app-header',
  imports: [NotificationListItemComponent],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeNotificationSurfaces()',
  },
})
export class HeaderComponent {
  readonly menuClick = output<void>();
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly brandingService = inject(BrandingService);
  private readonly shellNotificationsService = inject(ShellNotificationsService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  private readonly activeRouteData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.getDeepestRouteData()),
    ),
    { initialValue: this.getDeepestRouteData() },
  );

  readonly pageTitle = computed(() => this.activeRouteData()?.['pageTitle'] ?? this.brandingService.systemName());
  readonly pageSubtitle = computed(() => this.activeRouteData()?.['pageSubtitle'] ?? '');
  readonly notifications = this.shellNotificationsService.items;
  readonly drawerNotifications = this.shellNotificationsService.drawerItems;
  readonly activeNotificationFilter = this.shellNotificationsService.activeFilter;
  readonly notificationsInitialLoadPending = this.shellNotificationsService.initialLoadPending;
  readonly notificationsHasSnapshot = this.shellNotificationsService.hasSnapshot;
  readonly notificationsError = this.shellNotificationsService.hasError;
  readonly notificationsOpen = this.shellNotificationsService.isPanelOpen;
  readonly notificationsDrawerOpen = this.shellNotificationsService.isDrawerOpen;
  readonly notificationsDrawerLoading = this.shellNotificationsService.isDrawerLoading;
  readonly notificationsDrawerHasMore = this.shellNotificationsService.drawerHasMore;
  readonly notificationsDrawerEmpty = this.shellNotificationsService.drawerEmpty;
  readonly notificationsMarkAllLoading = this.shellNotificationsService.isMarkingAll;
  readonly totalNotifications = this.shellNotificationsService.unreadCount;
  readonly notificationBadgeLabel = computed(() => {
    const count = this.totalNotifications();
    return count > 99 ? '99+' : String(count);
  });

  onMenuClick() {
    this.menuClick.emit();
  }

  async toggleNotifications() {
    await this.shellNotificationsService.togglePanel();
  }

  closeNotifications() {
    this.shellNotificationsService.closePanel();
  }

  closeNotificationSurfaces() {
    this.shellNotificationsService.closePanel();
    this.shellNotificationsService.closeDrawer();
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.notificationsOpen()) {
      return;
    }

    const clickTarget = event.target;
    if (!(clickTarget instanceof Node)) {
      return;
    }

    if (!this.hostElement.nativeElement.contains(clickTarget)) {
      this.closeNotifications();
    }
  }

  async reloadNotifications() {
    await this.shellNotificationsService.reload();
  }

  async onNotificationSelect(item: NotificationItem) {
    await this.shellNotificationsService.openNotification(item);
  }

  async onNotificationFilterChange(filterValue: NotificationFilter) {
    await this.shellNotificationsService.setFilter(filterValue);
  }

  async openNotificationsHistory() {
    await this.shellNotificationsService.openDrawer();
  }

  closeNotificationsHistory() {
    this.shellNotificationsService.closeDrawer();
  }

  async markAllNotifications() {
    await this.shellNotificationsService.markAllAsRead();
  }

  async loadMoreNotificationsHistory() {
    await this.shellNotificationsService.loadMoreDrawer();
  }

  private getDeepestRouteData() {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route?.snapshot?.data ?? {};
  }
}
