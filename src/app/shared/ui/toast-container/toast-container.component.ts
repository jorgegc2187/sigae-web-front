import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  NotificationService,
  NotificationType,
  ToastNotification,
} from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  readonly notifications = inject(NotificationService);

  getToastClass(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      success: 'border-success bg-success text-success-content',
      error: 'border-error bg-error text-error-content',
      warning: 'border-warning bg-warning text-warning-content',
      info: 'border-info bg-info text-info-content',
    };

    return map[type];
  }

  getIcon(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    return map[type];
  }

  dismiss(toast: ToastNotification): void {
    this.notifications.dismiss(toast.id);
  }
}
