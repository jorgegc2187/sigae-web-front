import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FileAttachmentItemComponent } from '../../../../shared/ui/file-attachment-item/file-attachment-item.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { AssetStatusChangeModalComponent, AssetStatusChangeModalIntent } from '../../components/asset-status-change-modal/asset-status-change-modal.component';
import { InventoryAttachmentPreviewModalComponent } from '../../components/inventory-attachment-preview-modal/inventory-attachment-preview-modal.component';
import { AssetAttachmentSummary, AssetCondition, AssetStatusChangeRequest, AssetTraceabilityEntry, InventoryAsset } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';
import { openInventoryLabelPrint } from '../../utils/inventory-label-print.util';

type InventoryDetailStatusAction = 'maintenance' | 'decommission' | 'reactivate';
type InventoryDetailField = {
  label: string;
  value: string | null;
  mono?: boolean;
  accent?: boolean;
};

@Component({
  selector: 'app-inventory-detail',
  imports: [
    RouterLink,
    ActionButtonComponent,
    FileAttachmentItemComponent,
    AssetStatusChangeModalComponent,
    InventoryAttachmentPreviewModalComponent,
    ProcessingLoaderComponent,
  ],
  templateUrl: './inventory-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly traceabilityScrollViewport = viewChild<ElementRef<HTMLDivElement>>('traceabilityScrollViewport');
  private traceabilityScrollSyncFrame: number | null = null;
  private readonly traceabilityScrollTolerance = 12;

  private readonly assetId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly asset = signal<InventoryAsset | null>(null);
  readonly traceability = signal<AssetTraceabilityEntry[]>([]);
  readonly attributeEntries = computed(() => Object.entries(this.asset()?.attributes ?? {}));
  readonly isAttachmentPreviewOpen = signal(false);
  readonly previewAttachment = signal<AssetAttachmentSummary | null>(null);
  readonly isStatusModalOpen = signal(false);
  readonly pendingStatusAction = signal<InventoryDetailStatusAction | null>(null);
  readonly isUpdatingStatus = signal(false);
  readonly hasTraceabilityOverflow = signal(false);
  readonly canScrollUp = signal(false);
  readonly canScrollDown = signal(false);

  readonly generalDetailRows = computed<InventoryDetailField[][]>(() => {
    const asset = this.asset();
    if (!asset) {
      return [];
    }

    return [
      [
        { label: 'Nombre del activo', value: asset.name },
        { label: 'Codigo interno', value: asset.code, mono: true },
      ],
      [
        { label: 'Categoria', value: asset.categoryName },
        { label: 'Tipo', value: asset.typeName },
      ],
      [
        { label: 'Ubicacion actual', value: asset.locationName, accent: true },
        { label: 'Serial number', value: asset.serial ?? null },
      ],
      [
        { label: 'Fecha de adquisicion', value: this.formatDate(asset.acquisitionDate) ?? null },
        { label: 'Proveedor', value: asset.supplierName ?? null },
      ],
      [
        { label: 'Disponibilidad', value: asset.availableForLoan ? 'Disponible para prestamo' : 'No disponible para prestamo' },
      ],
    ];
  });
  readonly formattedTraceability = computed(() =>
    this.traceability().map((event) => ({
      ...event,
      formattedDate: this.formatTraceabilityDate(event.date),
      accentClass: this.traceabilityAccentClass(event.type),
      title: this.traceabilityTitle(event),
      detail: this.traceabilityDetail(event),
      reasonLabel: this.normalizeText(event.reason),
    })),
  );
  readonly statusActionConfig = computed<AssetStatusChangeModalIntent | null>(() => {
    const asset = this.asset();
    const action = this.pendingStatusAction();
    if (!asset || !action) {
      return null;
    }

    if (action === 'maintenance') {
      return {
        action,
        nextCondition: 'Mantenimiento' as AssetCondition,
        title: 'Enviar activo a mantenimiento',
        message: `El activo ${asset.name} pasará a mantenimiento y dejará de estar disponible para préstamo.`,
        confirmLabel: 'Enviar a mantenimiento',
        icon: 'build',
        confirmClassName: '!border-warning !bg-warning !text-warning-content hover:!bg-warning/90',
      };
    }

    if (action === 'decommission') {
      return {
        action,
        nextCondition: 'Dado de baja' as AssetCondition,
        title: 'Dar de baja activo',
        message: `El activo ${asset.name} quedará marcado como dado de baja.`,
        confirmLabel: 'Dar de baja',
        icon: 'delete_forever',
        confirmClassName: '!border-error !bg-error !text-error-content hover:!bg-error/90',
      };
    }

    return {
      action,
      nextCondition: 'Bueno' as AssetCondition,
      title: 'Reactivar activo',
      message: `El activo ${asset.name} volverá al estado Bueno.`,
      confirmLabel: 'Reactivar',
      icon: 'restart_alt',
      confirmClassName: '!border-success !bg-success !text-success-content hover:!bg-success/90',
    };
  });
  readonly canSendToMaintenance = computed(() => {
    const condition = this.asset()?.condition;
    return !!condition && condition !== 'Mantenimiento' && condition !== 'Dado de baja';
  });
  readonly canDecommission = computed(() => this.asset()?.condition !== 'Dado de baja');
  readonly canReactivate = computed(() => {
    const condition = this.asset()?.condition;
    return condition === 'Dado de baja' || condition === 'Mantenimiento';
  });

  constructor() {
    effect(() => {
      const assetId = this.assetId();
      if (!assetId) {
        this.asset.set(null);
        this.traceability.set([]);
        return;
      }

      void this.refreshCurrentAsset(assetId);
    });

    effect(() => {
      this.formattedTraceability().length;
      this.scheduleTraceabilityScrollSync();
    });

    if (typeof window !== 'undefined') {
      const handleResize = () => this.scheduleTraceabilityScrollSync();
      window.addEventListener('resize', handleResize, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', handleResize));
    }

    this.destroyRef.onDestroy(() => {
      if (this.traceabilityScrollSyncFrame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this.traceabilityScrollSyncFrame);
      }
    });
  }

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

  openStatusModal(action: InventoryDetailStatusAction): void {
    this.pendingStatusAction.set(action);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    if (this.isUpdatingStatus()) {
      return;
    }

    this.isStatusModalOpen.set(false);
    this.pendingStatusAction.set(null);
  }

  async confirmStatusChange(event: { payload: AssetStatusChangeRequest; attachments: File[] }): Promise<void> {
    const asset = this.asset();
    const config = this.statusActionConfig();
    if (!asset || !config) {
      return;
    }

    this.isUpdatingStatus.set(true);

    try {
      await firstValueFrom(this.assetsService.changeStatus(asset.id, event.payload, event.attachments));
      this.notifications.success({
        message:
          config.action === 'maintenance'
            ? 'Activo enviado a mantenimiento correctamente.'
            : config.action === 'decommission'
              ? 'Activo dado de baja correctamente.'
              : 'Activo reactivado correctamente.',
      });
      await this.refreshCurrentAsset(asset.id);
      this.isStatusModalOpen.set(false);
      this.pendingStatusAction.set(null);
    } catch {
      this.notifications.error({ message: 'No se pudo actualizar el estado del activo.' });
    } finally {
      this.isUpdatingStatus.set(false);
    }
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

  getAssetStatusClass(condition: AssetCondition): string {
    if (condition === 'Bueno') return 'border-success/20 bg-success/10 text-success';
    if (condition === 'Regular') return 'border-warning/20 bg-warning/10 text-warning';
    if (condition === 'Mantenimiento') return 'border-info/20 bg-info/10 text-info';
    if (condition === 'Malo') return 'border-error/20 bg-error/10 text-error';
    return 'border-base-300 bg-base-200 text-base-content/60';
  }

  onTraceabilityScroll(): void {
    this.syncTraceabilityScrollState();
  }

  scrollTraceabilityToTop(): void {
    const viewport = this.traceabilityScrollViewport()?.nativeElement;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollTraceabilityToBottom(): void {
    const viewport = this.traceabilityScrollViewport()?.nativeElement;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }

  private async refreshCurrentAsset(assetId: string): Promise<void> {
    const [asset, traceability] = await Promise.all([
      firstValueFrom(this.assetsService.getById(assetId).pipe(catchError(() => of(null)))),
      firstValueFrom(this.assetsService.traceability(assetId).pipe(catchError(() => of([])))),
    ]);

    this.asset.set(asset);
    this.traceability.set(traceability);
  }

  private formatDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private formatTraceabilityDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private traceabilityAccentClass(type: AssetTraceabilityEntry['type']): string {
    const map: Record<AssetTraceabilityEntry['type'], string> = {
      Creación: 'bg-primary',
      Edición: 'bg-secondary',
      Estado: 'bg-warning',
      Ubicación: 'bg-info',
      Baja: 'bg-error',
      Reactivación: 'bg-success',
      Préstamo: 'bg-primary',
      Devolución: 'bg-success',
    };

    return map[type];
  }

  private traceabilityTitle(event: AssetTraceabilityEntry): string {
    switch (event.type) {
      case 'Creación':
        return 'Registro inicial';
      case 'Edición':
        return this.updatedTraceabilityTitle(event.description);
      case 'Estado':
        return 'Cambio de estado';
      case 'Ubicación':
        return event.previousValue && event.newValue ? 'Cambio de ubicación' : 'Asignación de ubicación';
      case 'Baja':
        return 'Baja';
      case 'Reactivación':
        return 'Reactivación';
      case 'Préstamo':
        return 'Préstamo';
      case 'Devolución':
        return 'Devolución';
    }
  }

  private traceabilityDetail(event: AssetTraceabilityEntry): string {
    if (event.type === 'Edición') {
      return this.traceabilityChangeDetail(event);
    }

    if (event.type === 'Estado' || event.type === 'Baja' || event.type === 'Reactivación') {
      if (event.previousValue && event.newValue) {
        return `${event.previousValue} -> ${event.newValue}`;
      }

      if (event.newValue) {
        return event.newValue;
      }
    }

    if (event.type === 'Ubicación') {
      if (event.previousValue && event.newValue) {
        return `Trasladado de ${event.previousValue} a ${event.newValue}.`;
      }
    }

    return event.description;
  }

  private updatedTraceabilityTitle(description: string): string {
    if (description.startsWith('Atributo "')) {
      return 'Atributo actualizado';
    }

    const titles: Array<[string, string]> = [
      ['Nombre del activo actualizado.', 'Cambio de nombre'],
      ['Codigo del activo actualizado.', 'Cambio de codigo'],
      ['Proveedor del activo actualizado.', 'Cambio de proveedor'],
      ['Serial number del activo actualizado.', 'Cambio de serial number'],
      ['Fecha de adquisicion del activo actualizada.', 'Cambio de fecha de adquisicion'],
      ['Notas del activo actualizadas.', 'Cambio de observaciones'],
      ['Tipo de activo actualizado.', 'Cambio de tipo'],
      ['Categoria del activo actualizada.', 'Cambio de categoria'],
    ];

    return titles.find(([value]) => value === description)?.[1] ?? 'Actualización';
  }

  private traceabilityChangeDetail(event: AssetTraceabilityEntry): string {
    if (event.previousValue && event.newValue) {
      return `${event.previousValue} -> ${event.newValue}`;
    }

    if (event.newValue && !event.previousValue) {
      return `Nuevo valor: ${event.newValue}`;
    }

    if (event.previousValue && !event.newValue) {
      return `Valor eliminado: ${event.previousValue}`;
    }

    return event.description;
  }

  private scheduleTraceabilityScrollSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.traceabilityScrollSyncFrame !== null) {
      window.cancelAnimationFrame(this.traceabilityScrollSyncFrame);
    }

    this.traceabilityScrollSyncFrame = window.requestAnimationFrame(() => {
      this.traceabilityScrollSyncFrame = null;
      this.syncTraceabilityScrollState();
    });
  }

  private syncTraceabilityScrollState(): void {
    const viewport = this.traceabilityScrollViewport()?.nativeElement;
    if (!viewport) {
      this.hasTraceabilityOverflow.set(false);
      this.canScrollUp.set(false);
      this.canScrollDown.set(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const hasOverflow = scrollHeight - clientHeight > this.traceabilityScrollTolerance;
    const nearTop = scrollTop <= this.traceabilityScrollTolerance;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - this.traceabilityScrollTolerance;

    this.hasTraceabilityOverflow.set(hasOverflow);
    this.canScrollUp.set(hasOverflow && !nearTop);
    this.canScrollDown.set(hasOverflow && !nearBottom);
  }

  normalizeText(value: string | null | undefined, fallback = 'No registrado'): string {
    return value == null || value.trim() === '' ? fallback : value;
  }
}
