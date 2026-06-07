import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { BrandingService } from '../../services/branding.service';
import { ShellNotificationsService } from '../notifications/shell-notifications.service';
import { LiveNotificationItem } from '../notifications/live-notifications.model';

@Component({
  selector: 'app-header',
  imports: [DatePipe],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeNotifications()',
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
  readonly notificationsOpen = signal(false);
  readonly notifications = this.shellNotificationsService.items;
  readonly notificationsInitialLoadPending = this.shellNotificationsService.initialLoadPending;
  readonly notificationsHasSnapshot = this.shellNotificationsService.hasSnapshot;
  readonly notificationsError = this.shellNotificationsService.hasError;
  readonly totalNotifications = this.shellNotificationsService.totalActiveCount;
  readonly notificationBadgeLabel = computed(() => {
    const count = this.totalNotifications();
    return count > 99 ? '99+' : String(count);
  });

  onMenuClick() {
    this.menuClick.emit();
  }

  toggleNotifications() {
    this.notificationsOpen.update((current) => !current);
  }

  closeNotifications() {
    this.notificationsOpen.set(false);
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

  async onNotificationSelect(item: LiveNotificationItem) {
    this.closeNotifications();
    await this.router.navigateByUrl(item.route);
  }

  notificationIcon(item: LiveNotificationItem): string {
    switch (item.type) {
      case 'loan_overdue':
        return 'warning';
      case 'loan_due_today':
        return 'event_upcoming';
      case 'user_invitation_pending':
        return 'mail';
      case 'user_mfa_pending':
        return 'verified_user';
    }
  }

  notificationToneClass(item: LiveNotificationItem): string {
    switch (item.severity) {
      case 'error':
        return 'bg-error/10 text-error';
      case 'warning':
        return 'bg-warning/15 text-warning';
      default:
        return 'bg-info/10 text-info';
    }
  }

  private getDeepestRouteData() {
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route?.firstChild) {
      route = route.firstChild;
    }

    return route?.snapshot?.data ?? {};
  }
}
