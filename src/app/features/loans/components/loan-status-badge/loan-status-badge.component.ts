import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  StatusBadgeComponent,
  StatusBadgeTone,
} from '../../../../shared/ui/status-badge/status-badge.component';
import { LoanStatus } from '../../models/loan.model';

@Component({
  selector: 'app-loan-status-badge',
  imports: [StatusBadgeComponent],
  templateUrl: './loan-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanStatusBadgeComponent {
  status = input.required<LoanStatus>();
  compact = input(false);

  readonly tone = computed<StatusBadgeTone>(() => {
    const map: Record<LoanStatus, StatusBadgeTone> = {
      Activo: 'success',
      Vencido: 'error',
      Devuelto: 'neutral',
    };

    return map[this.status()];
  });
}
