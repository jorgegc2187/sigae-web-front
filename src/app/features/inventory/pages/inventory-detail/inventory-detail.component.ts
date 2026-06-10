import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FileAttachmentItemComponent } from '../../../../shared/ui/file-attachment-item/file-attachment-item.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { InventoryAttachmentPreviewModalComponent } from '../../components/inventory-attachment-preview-modal/inventory-attachment-preview-modal.component';
import { AssetAttachmentSummary, AssetCondition } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';
import { openInventoryLabelPrint } from '../../utils/inventory-label-print.util';

@Component({
  selector: 'app-inventory-detail',
  imports: [RouterLink, ActionButtonComponent, StatusBadgeComponent, FileAttachmentItemComponent, InventoryAttachmentPreviewModalComponent],
  templateUrl: './inventory-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  private readonly assetResource = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => (id ? this.assetsService.getById(id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
  );
  private readonly traceabilityResource = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => (id ? this.assetsService.traceability(id).pipe(catchError(() => of([]))) : of([]))),
    ),
    { initialValue: [] },
  );

  readonly asset = computed(() => this.assetResource());
  readonly traceability = computed(() => this.traceabilityResource());
  readonly attributeEntries = computed(() => Object.entries(this.asset()?.attributes ?? {}));
  readonly isAttachmentPreviewOpen = signal(false);
  readonly previewAttachment = signal<AssetAttachmentSummary | null>(null);

  printLabel(): void {
    const asset = this.asset();
    if (!asset) {
      return;
    }

    openInventoryLabelPrint(this.router, {
      assetIds: asset.id,
    });
  }

  openAttachmentPreview(attachment: AssetAttachmentSummary): void {
    this.previewAttachment.set(attachment);
    this.isAttachmentPreviewOpen.set(true);
  }

  closeAttachmentPreview(): void {
    this.isAttachmentPreviewOpen.set(false);
    this.previewAttachment.set(null);
  }

  async downloadAttachment(downloadUrl: string, filename: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.assetsService.downloadAttachment(downloadUrl));
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

  conditionTone(condition: AssetCondition): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
    if (condition === 'Bueno') return 'success';
    if (condition === 'Regular') return 'warning';
    if (condition === 'Mantenimiento') return 'info';
    if (condition === 'Malo') return 'error';
    return 'neutral';
  }
}
