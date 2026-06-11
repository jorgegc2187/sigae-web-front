import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FileAttachmentItemComponent } from '../../../../shared/ui/file-attachment-item/file-attachment-item.component';
import { formatFileAttachmentSize, getFileAttachmentExtension } from '../../../../shared/utils/file-attachment.util';
import { AssetCondition, AssetStatusChangeRequest, InventoryAsset } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

type AssetStatusModalAction = 'maintenance' | 'decommission' | 'reactivate';

export interface AssetStatusChangeModalIntent {
  action: AssetStatusModalAction;
  title: string;
  message: string;
  confirmLabel: string;
  icon: string;
  nextCondition: AssetCondition;
  confirmClassName: string;
}

interface AttachmentDraft {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);

@Component({
  selector: 'app-asset-status-change-modal',
  imports: [ActionButtonComponent, FileAttachmentItemComponent],
  templateUrl: './asset-status-change-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetStatusChangeModalComponent {
  private readonly assetsService = inject(AssetsService);

  readonly open = input(false);
  readonly asset = input<InventoryAsset | null>(null);
  readonly intent = input<AssetStatusChangeModalIntent | null>(null);
  readonly loading = input(false);

  readonly confirmed = output<{ payload: AssetStatusChangeRequest; attachments: File[] }>();
  readonly cancelled = output<void>();

  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly attachmentPickerInput = viewChild<ElementRef<HTMLInputElement>>('attachmentPickerInput');
  readonly reason = signal('');
  readonly attachments = signal<AttachmentDraft[]>([]);
  readonly isDropActive = signal(false);
  readonly attachmentError = signal<string | null>(null);
  private readonly initializedKey = signal<string | null>(null);

  readonly maxAttachmentSizeLabel = formatFileAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES);
  readonly isReasonInvalid = computed(() => !this.reason().trim());
  readonly hasValidationErrors = computed(() => this.isReasonInvalid());

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (this.open() && !dialog.open) {
        dialog.showModal();
        return;
      }

      if (!this.open() && dialog.open) {
        dialog.close();
      }
    });

    effect(() => {
      const asset = this.asset();
      const intent = this.intent();
      if (!this.open() || !asset || !intent) {
        return;
      }

      const nextKey = `${asset.id}:${intent.action}`;
      if (this.initializedKey() === nextKey) {
        return;
      }

      this.initializedKey.set(nextKey);
      this.reason.set('');
      this.attachmentError.set(null);
      this.attachments.set([]);
    });
  }

  openAttachmentPicker(): void {
    this.attachmentPickerInput()?.nativeElement.click();
  }

  onAttachmentSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) {
      input.value = '';
      return;
    }

    this.processFiles(Array.from(fileList));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDropActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDropActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDropActive.set(false);
    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    this.processFiles(Array.from(fileList));
  }

  removeAttachment(attachmentId: string): void {
    this.attachments.update((attachments) => attachments.filter((attachment) => attachment.id !== attachmentId));
    this.attachmentError.set(null);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.onCancel();
    }
  }

  onCancel(): void {
    if (this.loading()) {
      return;
    }

    this.cancelled.emit();
  }

  onConfirm(): void {
    const intent = this.intent();
    if (!intent || this.loading() || this.hasValidationErrors()) {
      return;
    }

    this.confirmed.emit({
      payload: {
        nextCondition: this.toApiCondition(intent.nextCondition),
        reason: this.reason().trim(),
      },
      attachments: this.attachments().map((attachment) => attachment.file),
    });
  }

  private processFiles(files: File[]): void {
    const currentKeys = new Set(this.attachments().map((attachment) => this.getAttachmentKey(attachment.file)));
    const nextAttachments: AttachmentDraft[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const key = this.getAttachmentKey(file);
      if (currentKeys.has(key)) {
        continue;
      }

      const validationError = this.validateAttachment(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      currentKeys.add(key);
      nextAttachments.push({
        id: this.buildAttachmentId(file),
        file,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
    }

    if (nextAttachments.length > 0) {
      this.attachments.update((attachments) => [...attachments, ...nextAttachments]);
    }

    this.attachmentError.set(errors.length > 0 ? errors.join(' ') : null);
  }

  private validateAttachment(file: File): string | null {
    const mimeType = file.type.toLowerCase();
    const extension = getFileAttachmentExtension(file.name);

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType) && !ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      return 'Formato no permitido.';
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return `Supera el máximo de ${this.maxAttachmentSizeLabel}.`;
    }

    return null;
  }

  private buildAttachmentId(file: File): string {
    const randomId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `asset-status-change-${randomId}-${file.lastModified}`;
  }

  private getAttachmentKey(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  private toApiCondition(condition: AssetCondition): AssetStatusChangeRequest['nextCondition'] {
    return this.assetsService.toApiCondition(condition);
  }
}
