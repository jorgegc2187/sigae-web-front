import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FileAttachmentItemComponent } from '../../../../shared/ui/file-attachment-item/file-attachment-item.component';
import { formatFileAttachmentSize, getFileAttachmentIcon, getFileAttachmentTypeLabel } from '../../../../shared/utils/file-attachment.util';
import { parseRelativeDateValue } from '../../../../shared/pipes/relative-date.utils';
import { LoanActivity, LoanAssetStatus, LoanAttachmentSummary, LoanDetail, LoanReturnPayload } from '../../models/loan.model';
import { LoanAttachmentPreviewModalComponent } from '../../components/loan-attachment-preview-modal/loan-attachment-preview-modal.component';
import { LoanReturnModalComponent } from '../../components/loan-return-modal/loan-return-modal.component';
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
  imports: [RouterLink, LoanStatusBadgeComponent, ActionButtonComponent, LoanReturnModalComponent, LoanAttachmentPreviewModalComponent, FileAttachmentItemComponent],
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
  readonly isReturnModalOpen = signal(false);
  readonly isAttachmentPreviewOpen = signal(false);
  readonly previewAttachment = signal<LoanAttachmentSummary | null>(null);

  readonly pageTitle = computed(() => {
    const loan = this.loan();
    return loan ? `Detalle de Préstamo #${loan.code}` : 'Detalle de Préstamo';
  });

  readonly destinationBadgeLabel = computed(() => {
    const loan = this.loan();
    return this.pluralize(loan?.assets.length ?? 0, 'activo', 'activos');
  });

  readonly attachmentBadgeLabel = computed(() => {
    const loan = this.loan();
    return this.pluralize(loan?.attachments.length ?? 0, 'adjunto', 'adjuntos');
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
    const parsedDate = parseRelativeDateValue(dateIso);
    return parsedDate ? this.shortDateFormatter.format(parsedDate) : dateIso;
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
      Bueno: 'border-success/20 bg-success/10 text-success',
      Regular: 'border-warning/20 bg-warning/10 text-warning',
      Malo: 'border-error/20 bg-error/10 text-error',
      Mantenimiento: 'border-info/20 bg-info/10 text-info',
      'Dado de baja': 'border-base-300 bg-base-200 text-base-content/60',
    };

    return map[status];
  }

  getAttachmentTypeLabel(attachment: LoanAttachmentSummary): string {
    return getFileAttachmentTypeLabel(attachment.fileName, attachment.mimeType);
  }

  getAttachmentIcon(attachment: LoanAttachmentSummary): string {
    return getFileAttachmentIcon(attachment.fileName, attachment.mimeType);
  }

  formatAttachmentSize(size: number): string {
    return formatFileAttachmentSize(size);
  }

  getActivityIcon(activity: LoanActivity): string {
    if (activity.title.toLowerCase().includes('incidencia')) {
      return 'report';
    }
    if (activity.title.toLowerCase().includes('devuelto')) {
      return 'check_circle';
    }
    if (activity.title.toLowerCase().includes('registrado')) {
      return 'add_box';
    }

    return 'history';
  }

  getActivityIconClass(activity: LoanActivity): string {
    if (activity.title.toLowerCase().includes('incidencia')) {
      return 'text-error';
    }
    if (activity.title.toLowerCase().includes('devuelto')) {
      return 'text-primary';
    }

    return 'text-base-content/45';
  }

  trackActivity(_: number, activity: LoanActivity): string {
    return activity.id;
  }

  onReturnLoan(): void {
    const loan = this.loan();
    if (!loan || loan.status === 'Devuelto' || this.isReturning()) {
      return;
    }

    this.isReturnModalOpen.set(true);
  }

  closeReturnModal(): void {
    if (this.isReturning()) {
      return;
    }

    this.isReturnModalOpen.set(false);
  }

  async confirmReturnLoan(payload: LoanReturnPayload): Promise<void> {
    const loan = this.loan();
    if (!loan || loan.status === 'Devuelto' || this.isReturning()) {
      return;
    }

    this.isReturning.set(true);
    try {
      const updatedLoan = await firstValueFrom(this.loansService.returnLoan(loan.id, payload));
      this.returnedLoan.set(updatedLoan);
      this.isReturnModalOpen.set(false);
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

  openAttachmentPreview(attachment: LoanAttachmentSummary): void {
    this.previewAttachment.set(attachment);
    this.isAttachmentPreviewOpen.set(true);
  }

  closeAttachmentPreview(): void {
    this.isAttachmentPreviewOpen.set(false);
    this.previewAttachment.set(null);
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

  private pluralize(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }
}
