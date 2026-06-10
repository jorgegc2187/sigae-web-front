import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { LoanAttachmentSummary } from '../../models/loan.model';
import { LoansService } from '../../services/loans.service';

@Component({
  selector: 'app-loan-attachment-preview-modal',
  imports: [ActionButtonComponent],
  templateUrl: './loan-attachment-preview-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanAttachmentPreviewModalComponent implements OnDestroy {
  readonly open = input(false);
  readonly attachment = input<LoanAttachmentSummary | null>(null);

  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly loansService = inject(LoansService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly objectUrl = signal<string | null>(null);
  readonly safeObjectUrl = signal<SafeResourceUrl | null>(null);
  private readonly loadedAttachmentId = signal<string | null>(null);

  readonly canInlinePreview = computed(() => {
    const attachment = this.attachment();
    return !!attachment && (this.isImage(attachment) || this.isPdf(attachment));
  });

  readonly isImagePreview = computed(() => {
    const attachment = this.attachment();
    return !!attachment && this.isImage(attachment);
  });

  readonly isPdfPreview = computed(() => {
    const attachment = this.attachment();
    return !!attachment && this.isPdf(attachment);
  });

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }

      if (!this.open()) {
        this.revokeObjectUrl();
        this.loadedAttachmentId.set(null);
        this.hasError.set(false);
      }
    });

    effect(() => {
      const attachment = this.attachment();
      if (!this.open() || !attachment) {
        return;
      }

      if (this.loadedAttachmentId() === attachment.id && this.objectUrl()) {
        return;
      }

      void this.loadAttachment(attachment);
    });
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.isLoading()) {
      return;
    }

    this.closed.emit();
  }

  async downloadCurrentAttachment(): Promise<void> {
    const attachment = this.attachment();
    if (!attachment) {
      return;
    }

    try {
      const blob = await this.resolveBlob(attachment);
      this.downloadBlob(blob, attachment.fileName);
    } catch {
      this.notifications.error({ message: 'No se pudo descargar el adjunto.' });
    }
  }

  private async loadAttachment(attachment: LoanAttachmentSummary): Promise<void> {
    this.revokeObjectUrl();
    this.loadedAttachmentId.set(attachment.id);
    this.hasError.set(false);
    this.isLoading.set(true);

    try {
      const blob = await this.fetchBlob(attachment);
      const url = URL.createObjectURL(blob);
      this.objectUrl.set(url);
      this.safeObjectUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch {
      this.hasError.set(true);
      this.loadedAttachmentId.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async resolveBlob(attachment: LoanAttachmentSummary): Promise<Blob> {
    const currentUrl = this.objectUrl();
    if (currentUrl && this.loadedAttachmentId() === attachment.id) {
      return await fetch(currentUrl).then((response) => response.blob());
    }

    return this.fetchBlob(attachment);
  }

  private async fetchBlob(attachment: LoanAttachmentSummary): Promise<Blob> {
    const response = await firstValueFrom(this.loansService.downloadAttachment(attachment.downloadUrl));
    const blob = response.body;
    if (!blob) {
      throw new Error('Empty attachment response');
    }

    return blob;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.objectUrl.set(null);
    this.safeObjectUrl.set(null);
  }

  private isImage(attachment: LoanAttachmentSummary): boolean {
    return attachment.mimeType.startsWith('image/');
  }

  private isPdf(attachment: LoanAttachmentSummary): boolean {
    return attachment.mimeType === 'application/pdf' || attachment.fileName.toLowerCase().endsWith('.pdf');
  }
}
