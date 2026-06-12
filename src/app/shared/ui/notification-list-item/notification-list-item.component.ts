import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NotificationItem } from '../../../core/layout/notifications/notifications.model';
import { formatNotificationOccurredAt } from '../../../core/layout/notifications/notification-time.util';

@Component({
  selector: 'app-notification-list-item',
  templateUrl: './notification-list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationListItemComponent {
  readonly item = input.required<NotificationItem>();
  readonly compact = input(false);
  readonly selected = output<NotificationItem>();

  readonly icon = computed(() => {
    switch (this.item().type) {
      case 'loan_overdue':
        return 'event_busy';
      case 'loan_due_today':
        return 'assignment_return';
      case 'user_invitation_pending':
        return 'mail';
      case 'user_mfa_pending':
        return 'verified_user';
    }
  });

  readonly iconShellClass = computed(() => {
    switch (this.item().severity) {
      case 'error':
        return 'bg-error/12 text-error';
      case 'warning':
        return 'bg-warning/15 text-warning';
      default:
        return 'bg-info/12 text-info';
    }
  });

  readonly occurredAtLabel = computed(() => formatNotificationOccurredAt(this.item().occurredAt));

  readonly rootClass = computed(() =>
    this.compact()
      ? 'group flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-base-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
      : 'group flex w-full items-start gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-base-200/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
  );

  onSelect(): void {
    this.selected.emit(this.item());
  }
}
