import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { LoanActivity, LoanAssetStatus, LoanDetail, LoanStatus } from '../../models/loan.model';
import { LoanStatusBadgeComponent } from '../../components/loan-status-badge/loan-status-badge.component';
import { LoansService } from '../../services/loans.service';

type LoanDetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; loan: LoanDetail }
  | { kind: 'module-unavailable' }
  | { kind: 'not-found' }
  | { kind: 'error' };

const INITIAL_LOAN_DETAIL_STATE: LoanDetailState = { kind: 'loading' };

@Component({
  selector: 'app-loan-detail',
  imports: [RouterLink, LoanStatusBadgeComponent, ActionButtonComponent],
  templateUrl: './loan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly loansService = inject(LoansService);
  private readonly notifications = inject(NotificationService);
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

  readonly detailState = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) =>
        id
          ? this.loansService.getById(id).pipe(
              map((loan) => ({ kind: 'ready', loan }) as LoanDetailState),
              catchError((error: unknown) => this.resolveDetailError(error)),
            )
          : of({ kind: 'not-found' } as LoanDetailState),
      ),
    ),
    { initialValue: INITIAL_LOAN_DETAIL_STATE },
  );
  private readonly returnedLoan = signal<LoanDetail | null>(null);
  readonly loan = computed(() => {
    const updatedLoan = this.returnedLoan();
    if (updatedLoan) {
      return updatedLoan;
    }

    const state = this.detailState();
    if (state.kind !== 'ready') {
      return undefined;
    }

    return state.loan;
  });
  readonly isLoading = computed(() => this.detailState().kind === 'loading');
  readonly modulePending = computed(() => this.detailState().kind === 'module-unavailable');
  readonly unexpectedError = computed(() => this.detailState().kind === 'error');
  readonly isReturning = signal(false);

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
    const currentLoan = this.loan();
    if (!currentLoan) {
      return 'border-base-300 bg-base-100';
    }

    const map: Record<LoanStatus, string> = {
      Activo: 'border-success/20 bg-success/5',
      Vencido: 'border-error/20 bg-error/5',
      Devuelto: 'border-base-300 bg-base-100',
    };

    return map[currentLoan.status];
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

    return loan.status === 'Devuelto' ? 'Préstamo Finalizado' : 'Finalizar Préstamo';
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

  async onReturnLoan(): Promise<void> {
    const loan = this.loan();
    if (!loan || loan.status === 'Devuelto' || this.isReturning()) {
      return;
    }

    const confirmed = window.confirm(`¿Confirmar devolución del préstamo ${loan.code}?`);
    if (!confirmed) {
      return;
    }

    this.isReturning.set(true);
    try {
      const updatedLoan = await firstValueFrom(this.loansService.returnLoan(loan.id));
      this.returnedLoan.set(updatedLoan);
      this.notifications.success({ message: 'Préstamo finalizado correctamente.' });
    } catch {
      this.notifications.error({ message: 'No se pudo finalizar el préstamo.' });
    } finally {
      this.isReturning.set(false);
    }
  }

  async downloadAttachment(downloadUrl: string, filename: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.loansService.downloadAttachment(downloadUrl));
      const blob = response.body;
      if (!blob) {
        throw new Error('Empty attachment response');
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      this.notifications.error({ message: 'No se pudo descargar el adjunto.' });
    }
  }

  private resolveDetailError(error: unknown) {
    if (!this.loansService.isLoansEndpointError(error)) {
      return of({ kind: 'error' } as LoanDetailState);
    }

    return this.loansService.probeModuleAvailability().pipe(
      map((isAvailable) =>
        isAvailable
          ? ({ kind: 'not-found' } as LoanDetailState)
          : ({ kind: 'module-unavailable' } as LoanDetailState),
      ),
      catchError(() => of({ kind: 'error' } as LoanDetailState)),
    );
  }
}
