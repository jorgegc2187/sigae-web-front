import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { Loan, LoanActivity, LoanAssetStatus, LoanStatus, MOCK_LOANS } from '../../models/loan.model';
import { LoanStatusBadgeComponent } from '../../components/loan-status-badge/loan-status-badge.component';

@Component({
  selector: 'app-loan-detail',
  standalone: true,
  imports: [RouterLink, LoanStatusBadgeComponent, ActionButtonComponent],
  templateUrl: './loan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly shortDateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  private readonly detailDateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  private readonly loanId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly loan = computed<Loan | undefined>(() =>
    MOCK_LOANS.find((loan) => loan.id === this.loanId()),
  );

  readonly pageTitle = computed(() => {
    const loan = this.loan();
    return loan ? `Detalle de Préstamo #${loan.code}` : 'Detalle de Préstamo';
  });

  readonly destinationBadgeLabel = computed(() => {
    const loan = this.loan();
    return loan ? `${loan.assets.length} activos` : '0 activos';
  });

  readonly departmentLabel = computed(() => {
    const loan = this.loan();
    if (!loan) {
      return '';
    }

    const map: Record<string, string> = {
      Laboratorio: 'Ciencias',
      Ciencias: 'Ciencias',
      Historia: 'Humanidades',
      Comunicación: 'Comunicación',
      'Educación Física': 'Bienestar',
      'Arte y Cultura': 'Arte y Cultura',
      Biología: 'Ciencias',
      Tutoría: 'Tutoría',
    };

    return map[loan.teacher.specialty] ?? 'Académico';
  });

  readonly statusPanelClass = computed(() => {
    const loan = this.loan();
    if (!loan) {
      return 'border-base-300 bg-base-100';
    }

    const map: Record<LoanStatus, string> = {
      Activo: 'border-success/20 bg-success/5',
      Vencido: 'border-error/20 bg-error/5',
      Devuelto: 'border-base-300 bg-base-100',
    };

    return map[loan.status];
  });

  readonly statusMessage = computed(() => {
    const loan = this.loan();
    if (!loan) {
      return '';
    }

    if (loan.status === 'Activo') {
      return 'El préstamo sigue vigente y los activos están asignados al docente.';
    }

    if (loan.status === 'Vencido') {
      return 'La fecha límite venció y se requiere coordinación para su cierre.';
    }

    return 'El préstamo ya fue cerrado y la devolución quedó registrada.';
  });

  readonly actionLabel = computed(() => {
    const loan = this.loan();
    if (!loan) {
      return 'Volver';
    }

    return loan.status === 'Devuelto' ? 'Ver Préstamo Finalizado' : 'Finalizar Préstamo';
  });

  formatCardDate(dateIso: string): string {
    const parts = this.detailDateFormatter.formatToParts(new Date(dateIso));
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
    const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value?.toUpperCase() ?? '';

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
  }

  formatActivityDate(dateIso: string): string {
    return this.shortDateFormatter.format(new Date(dateIso));
  }

  formatActivityTime(dateIso: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    })
      .format(new Date(dateIso))
      .toUpperCase();
  }

  getAssetStatusClass(status: LoanAssetStatus): string {
    const map: Record<LoanAssetStatus, string> = {
      Operativo: 'text-estado-bueno bg-estado-bueno-bg',
      Regular: 'text-estado-regular bg-estado-regular-bg',
      'En préstamo': 'text-primary bg-primary/10',
    };

    return map[status];
  }

  trackActivity(_: number, activity: LoanActivity): string {
    return activity.id;
  }
}
