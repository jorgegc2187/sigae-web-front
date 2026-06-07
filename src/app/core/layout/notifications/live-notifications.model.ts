export type LiveNotificationSeverity = 'error' | 'warning' | 'info';

export type LiveNotificationType =
  | 'loan_overdue'
  | 'loan_due_today'
  | 'user_invitation_pending'
  | 'user_mfa_pending';

export interface LiveNotificationItem {
  id: string;
  type: LiveNotificationType;
  severity: LiveNotificationSeverity;
  title: string;
  message: string;
  route: string;
  occurredAt: string;
}

export interface LiveNotificationsResponse {
  totalActiveCount: number;
  loanAttentionCount: number;
  items: LiveNotificationItem[];
}

export interface LiveNotificationInvalidationEvent {
  audience: 'global' | 'admin';
  occurredAt: string;
}

export const EMPTY_LIVE_NOTIFICATIONS: LiveNotificationsResponse = {
  totalActiveCount: 0,
  loanAttentionCount: 0,
  items: [],
};
