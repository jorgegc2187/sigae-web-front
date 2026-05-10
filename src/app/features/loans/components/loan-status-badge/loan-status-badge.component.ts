import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LoanStatus } from '../../models/loan.model';

@Component({
  selector: 'app-loan-status-badge',
  standalone: true,
  templateUrl: './loan-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanStatusBadgeComponent {
  status = input.required<LoanStatus>();
  compact = input(false);

  readonly badgeClass = computed(() => {
    const map: Record<LoanStatus, string> = {
      Activo: 'text-success bg-success/10',
      Vencido: 'text-error bg-error/10',
      Devuelto: 'text-base-content/60 bg-base-300/60',
    };

    return map[this.status()];
  });

  readonly dotClass = computed(() => {
    const map: Record<LoanStatus, string> = {
      Activo: 'bg-success',
      Vencido: 'bg-error',
      Devuelto: 'bg-base-content/30',
    };

    return map[this.status()];
  });
}
