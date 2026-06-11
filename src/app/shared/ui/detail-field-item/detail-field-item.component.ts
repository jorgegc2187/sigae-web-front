import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-detail-field-item',
  imports: [RouterLink],
  templateUrl: './detail-field-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block h-full',
  },
})
export class DetailFieldItemComponent {
  readonly label = input.required<string>();
  readonly value = input<string | null | undefined>(null);
  readonly href = input<string | null>(null);
  readonly routerLink = input<string | string[] | null>(null);
  readonly fallback = input('No registrado');
  readonly mono = input(false);
  readonly muted = input(false);
  readonly valueClass = input('');
  readonly hostClass = input('');

  readonly displayValue = computed(() => {
    const value = this.value();
    return value == null || value.trim() === '' ? this.fallback() : value;
  });

  readonly isLink = computed(() => Boolean(this.href() || this.routerLink()));
  readonly resolvedHostClass = computed(() =>
    `rounded-xl border border-base-300/70 bg-base-100 p-4 shadow-sm ${this.hostClass().trim()}`.trim(),
  );
  readonly resolvedValueClass = computed(() => {
    const classes = ['mt-1 text-sm text-base-content'];

    if (this.mono()) {
      classes.push('font-mono font-semibold');
    } else {
      classes.push('font-medium');
    }

    if (this.muted()) {
      classes.push('text-base-content/60');
    }

    const extra = this.valueClass().trim();
    if (extra) {
      classes.push(extra);
    }

    return classes.join(' ');
  });
}
