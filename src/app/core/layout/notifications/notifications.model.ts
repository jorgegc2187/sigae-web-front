export type NotificationSeverity = 'error' | 'warning' | 'info';
export type NotificationType =
  | 'loan_overdue'
  | 'loan_due_today'
  | 'user_invitation_pending'
  | 'user_mfa_pending';
export type NotificationFilter = 'all' | 'unread';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  route: string;
  occurredAt: string;
  read: boolean;
  active: boolean;
}

export interface NotificationsPageResponse {
  totalCount: number;
  unreadCount: number;
  loanAttentionCount: number;
  items: NotificationItem[];
}

export interface LiveNotificationInvalidationEvent {
  audience: 'global' | 'admin';
  occurredAt: string;
}

export const EMPTY_NOTIFICATIONS_PAGE: NotificationsPageResponse = {
  totalCount: 0,
  unreadCount: 0,
  loanAttentionCount: 0,
  items: [],
};
