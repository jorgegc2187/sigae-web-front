import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  NotificationService,
  NotificationType,
  ToastNotification,
} from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  readonly notifications = inject(NotificationService);

  getAlertClass(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info',
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
