import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  title?: string;
  message: string;
  durationMs?: number;
  persist?: boolean;
}

export interface ToastNotification extends Required<Pick<NotificationOptions, 'message'>> {
  id: string;
  type: NotificationType;
  title?: string;
  persist: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly maxVisibleToasts = 4;
  private readonly defaultDurationMs = 3500;
  private readonly errorDurationMs = 6000;
  private readonly activeTimers = new Map<string, number>();
  private readonly toastNotifications = signal<ToastNotification[]>([]);

  readonly toasts = this.toastNotifications.asReadonly();

  success(options: NotificationOptions): string {
    return this.show('success', options);
  }

  error(options: NotificationOptions): string {
    return this.show('error', {
      durationMs: this.errorDurationMs,
      ...options,
    });
  }

  warning(options: NotificationOptions): string {
    return this.show('warning', options);
  }

  info(options: NotificationOptions): string {
    return this.show('info', options);
  }

  show(type: NotificationType, options: NotificationOptions): string {
    const id = this.createId();
    const toast: ToastNotification = {
      id,
      type,
      title: options.title,
      message: options.message,
      persist: options.persist ?? false,
    };

    this.toastNotifications.update((toasts) => {
      const nextToasts = [...toasts, toast].slice(-this.maxVisibleToasts);
      const visibleIds = new Set(nextToasts.map((item) => item.id));

      for (const existingToast of toasts) {
        if (!visibleIds.has(existingToast.id)) {
          this.clearTimer(existingToast.id);
        }
      }

      return nextToasts;
    });

    if (!toast.persist) {
      const durationMs = options.durationMs ?? this.defaultDurationMs;
      const timerId = window.setTimeout(() => this.dismiss(id), durationMs);
      this.activeTimers.set(id, timerId);
    }

    return id;
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.toastNotifications.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const id of this.activeTimers.keys()) {
      this.clearTimer(id);
    }

    this.toastNotifications.set([]);
  }

  private clearTimer(id: string): void {
    const timerId = this.activeTimers.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      this.activeTimers.delete(id);
    }
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
