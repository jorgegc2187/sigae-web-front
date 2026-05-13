import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeTone = 'success' | 'error' | 'neutral' | 'warning' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  label = input.required<string>();
  tone = input<StatusBadgeTone>('neutral');
  compact = input(false);

  readonly badgeClass = computed(() => {
    const map: Record<StatusBadgeTone, string> = {
      success: 'text-success bg-success/10',
      error: 'text-error bg-error/10',
      neutral: 'text-base-content/60 bg-base-300/60',
      warning: 'text-warning bg-warning/10',
      info: 'text-info bg-info/10',
    };

    return map[this.tone()];
  });

  readonly dotClass = computed(() => {
    const map: Record<StatusBadgeTone, string> = {
      success: 'bg-success',
      error: 'bg-error',
      neutral: 'bg-base-content/30',
      warning: 'bg-warning',
      info: 'bg-info',
    };

    return map[this.tone()];
  });
}
