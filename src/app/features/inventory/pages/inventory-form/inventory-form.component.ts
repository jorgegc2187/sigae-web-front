import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  getControlErrorMessage,
  shouldShowControlError,
} from '../../../../shared/forms/validation-message.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import { FileAttachmentItemComponent } from '../../../../shared/ui/file-attachment-item/file-attachment-item.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import {
  formatFileAttachmentSize,
  getFileAttachmentExtension,
} from '../../../../shared/utils/file-attachment.util';
import { CategoriesService } from '../../../categories/services/categories.service';
import { InventoryAttachmentPreviewModalComponent } from '../../components/inventory-attachment-preview-modal/inventory-attachment-preview-modal.component';
import { LocationsService } from '../../../locations/services/locations.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import {
  AssetAttachmentSummary,
  AssetCondition,
  InventoryAsset,
  InventoryAssetGroup,
} from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

interface DynamicAttributeField {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  value: string;
}

interface AssetAttachmentDraft {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  previewUrl?: string;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Component({
  selector: 'app-inventory-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ActionButtonComponent,
    FormFieldComponent,
    SelectFieldComponent,
    ProcessingLoaderComponent,
    DatePickerComponent,
    FileAttachmentItemComponent,
    InventoryAttachmentPreviewModalComponent,
  ],
  templateUrl: './inventory-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFormComponent implements OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly assetsService = inject(AssetsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly locationsService = inject(LocationsService);
  private readonly suppliersService = inject(SuppliersService);

  readonly attachmentPickerInput = viewChild<ElementRef<HTMLInputElement>>('attachmentPickerInput');
  readonly id = input<string | null>(null);
  readonly sourceGroupId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('sourceGroupId'))),
    { initialValue: null },
  );
  readonly existingAsset = signal<InventoryAsset | null>(null);
  readonly sourceGroup = signal<InventoryAssetGroup | null>(null);
  readonly isLoadingAsset = signal(false);
  readonly isLoadingSourceGroup = signal(false);
  readonly isSubmitting = signal(false);
  readonly showAttributeErrors = signal(false);
  readonly selectedCategoryId = signal('');
  readonly attributeValuesState = signal<Record<string, string>>({});
  readonly newAttachments = signal<AssetAttachmentDraft[]>([]);
  readonly removedAttachmentIds = signal<string[]>([]);
  readonly attachmentFeedback = signal<string | null>(null);
  readonly isAttachmentDropActive = signal(false);
  readonly isAttachmentPreviewOpen = signal(false);
  readonly previewAttachment = signal<AssetAttachmentSummary | null>(null);
  readonly inputClass =
    'w-full border-0 bg-transparent p-0 text-sm text-base-content placeholder-shown:opacity-50 focus:outline-none disabled:cursor-not-allowed disabled:text-base-content/55';

  readonly isEdit = computed(() => Boolean(this.existingAsset()));
  readonly isContextualCreateMode = computed(() => !this.id() && !!this.sourceGroupId());
  readonly hasLockedSourceGroupContext = computed(
    () => this.isContextualCreateMode() && !!this.sourceGroup(),
  );
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly locations = toSignal(this.locationsService.list('ACTIVE'), { initialValue: [] });
  readonly suppliers = toSignal(this.suppliersService.list(), { initialValue: [] });
  readonly persistedAttachments = computed(() =>
    (this.existingAsset()?.attachments ?? []).filter(
      (attachment) => !this.removedAttachmentIds().includes(attachment.id),
    ),
  );
  readonly hasAttachments = computed(
    () => this.persistedAttachments().length > 0 || this.newAttachments().length > 0,
  );
  readonly attachmentLimitLabel = formatFileAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    categoryId: this.fb.control<string>('', Validators.required),
    typeId: this.fb.control<string>('', Validators.required),
    locationId: this.fb.control<string>('', Validators.required),
    supplierId: [''],
    condition: this.fb.control<AssetCondition>('Bueno', Validators.required),
    acquisitionDate: [''],
    description: [''],
    observations: [''],
  });
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly selectedTypeId = toSignal(this.form.controls.typeId.valueChanges, {
    initialValue: this.form.controls.typeId.value,
  });

  readonly availableTypes = computed(() =>
    this.categories().find((category) => category.id === this.selectedCategoryId())?.types ?? [],
  );
  readonly currentType = computed(
    () => this.availableTypes().find((type) => type.id === this.selectedTypeId()) ?? null,
  );
  readonly currentTypeAttributes = computed(() => this.currentType()?.attributes ?? []);
  readonly dynamicAttributes = computed<DynamicAttributeField[]>(() =>
    this.currentTypeAttributes().map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      description: attribute.description,
      isRequired: attribute.isRequired,
      value: this.attributeValuesState()[attribute.id] ?? '',
    })),
  );
  readonly categoryOptions = computed<SelectFieldOption[]>(() =>
    this.categories().map((category) => ({ value: category.id, label: category.name })),
  );
  readonly typeOptions = computed<SelectFieldOption[]>(() =>
    this.availableTypes().map((type) => ({ value: type.id, label: type.name })),
  );
  readonly locationOptions = computed<SelectFieldOption[]>(() =>
    this.locations().map((location) => ({ value: location.id, label: location.name })),
  );
  readonly supplierOptions = computed<SelectFieldOption[]>(() => [
    { value: '', label: 'Sin proveedor' },
    ...this.suppliers().map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ]);
  readonly conditionOptions: SelectFieldOption[] = [
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Malo', label: 'Malo' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Dado de baja', label: 'Dado de baja' },
  ];

  readonly isBusy = computed(
    () => this.isLoadingAsset() || this.isLoadingSourceGroup() || this.isSubmitting(),
  );
  readonly breadcrumbLabel = computed(() => {
    if (this.isEdit()) {
      return 'Editar activo';
    }

    if (this.hasLockedSourceGroupContext()) {
      return 'Registrar unidad igual';
    }

    return 'Registrar activo';
  });
  readonly submitLabel = computed(() => (this.isEdit() ? 'Guardar cambios' : 'Guardar activo'));
  readonly loadingLabel = computed(() =>
    this.isEdit() ? 'Guardando cambios...' : 'Guardando activo...',
  );
  readonly blockingTitle = computed(() =>
      this.isLoadingAsset()
      ? 'Cargando activo'
      : this.isLoadingSourceGroup()
        ? 'Preparando formulario'
      : this.isEdit()
        ? 'Guardando cambios'
        : 'Guardando activo',
  );
  readonly blockingDescription = computed(() =>
    this.isLoadingAsset()
      ? 'Estamos recuperando la información actual del activo.'
      : this.isLoadingSourceGroup()
        ? 'Estamos cargando la familia seleccionada para precargar el formulario.'
      : 'Estamos guardando la información y esperando la confirmación del servidor.',
  );

  readonly nameError = computed(() => {
    this.formEvents();
    const control = this.form.controls.name;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'El nombre del activo es obligatorio.',
        maxlength: 'El nombre del activo debe tener como máximo 160 caracteres.',
      },
    });
  });

  readonly categoryError = computed(() => {
    this.formEvents();
    const control = this.form.controls.categoryId;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione una categoría.',
      },
    });
  });

  readonly typeError = computed(() => {
    this.formEvents();
    const control = this.form.controls.typeId;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione un tipo de activo.',
      },
    });
  });

  readonly locationError = computed(() => {
    this.formEvents();
    const control = this.form.controls.locationId;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione una ubicación.',
      },
    });
  });

  readonly conditionError = computed(() => {
    this.formEvents();
    const control = this.form.controls.condition;
    if (!shouldShowControlError(control)) {
      return null;
    }

    return getControlErrorMessage(control, {
      messages: {
        required: 'Seleccione un estado del activo.',
      },
    });
  });

  constructor() {
    effect(() => {
      if (this.isBusy()) {
        this.form.disable({ emitEvent: false });
        return;
      }

      this.form.enable({ emitEvent: false });
      if (this.hasLockedSourceGroupContext()) {
        this.form.controls.name.disable({ emitEvent: false });
        this.form.controls.categoryId.disable({ emitEvent: false });
        this.form.controls.typeId.disable({ emitEvent: false });
      }
    });

    effect(() => {
      const categories = this.categories();
      const locations = this.locations();
      if (!this.form.controls.categoryId.value && categories[0] && !this.hasLockedSourceGroupContext()) {
        this.selectedCategoryId.set(categories[0].id);
        this.form.patchValue({
          categoryId: categories[0].id,
          typeId: categories[0].types[0]?.id ?? '',
        });
      }

      if (!this.form.controls.locationId.value && locations[0]) {
        this.form.controls.locationId.setValue(locations[0].id);
      }
    });

    effect(() => {
      const attributeIds = this.currentTypeAttributes().map((attribute) => attribute.id);
      this.attributeValuesState.update((previous) =>
        Object.fromEntries(
          attributeIds.map((attributeId) => [attributeId, previous[attributeId] ?? '']),
        ),
      );
    });

    queueMicrotask(() => {
      void this.initializeFormContext();
    });
  }

  updateCategory(categoryId: string): void {
    if (this.hasLockedSourceGroupContext()) {
      return;
    }

    this.selectedCategoryId.set(categoryId);
    this.form.patchValue({
      categoryId,
      typeId:
        this.categories().find((category) => category.id === categoryId)?.types[0]?.id ?? '',
    });
  }

  updateAttributeValue(attributeId: string, value: string): void {
    this.attributeValuesState.update((previous) => ({
      ...previous,
      [attributeId]: value,
    }));
  }

  getAttributeError(attribute: DynamicAttributeField): string | null {
    if (!this.showAttributeErrors() || !attribute.isRequired) {
      return null;
    }

    return attribute.value.trim() ? null : 'Este atributo es obligatorio.';
  }

  openAttachmentPicker(): void {
    this.attachmentPickerInput()?.nativeElement.click();
  }

  onAttachmentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isAttachmentDropActive.set(true);
  }

  onAttachmentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isAttachmentDropActive.set(false);
  }

  onAttachmentDrop(event: DragEvent): void {
    event.preventDefault();
    this.isAttachmentDropActive.set(false);

    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    this.processSelectedFiles(Array.from(fileList));
  }

  onAttachmentSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) {
      input.value = '';
      return;
    }

    this.processSelectedFiles(Array.from(fileList));
    input.value = '';
  }

  removeNewAttachment(attachmentId: string): void {
    const attachment = this.newAttachments().find((item) => item.id === attachmentId);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    this.newAttachments.update((attachments) =>
      attachments.filter((item) => item.id !== attachmentId),
    );
    this.attachmentFeedback.set(null);
    this.notifications.info({ message: 'Archivo adjunto retirado del formulario.' });
  }

  removePersistedAttachment(attachmentId: string): void {
    if (this.removedAttachmentIds().includes(attachmentId)) {
      return;
    }

    this.removedAttachmentIds.update((ids) => [...ids, attachmentId]);
    this.notifications.info({ message: 'Adjunto marcado para eliminar al guardar.' });
  }

  async downloadPersistedAttachment(attachment: AssetAttachmentSummary): Promise<void> {
    try {
      const response = await firstValueFrom(this.assetsService.downloadAttachment(attachment.downloadUrl));
      const blob = response.body;
      if (!blob) {
        throw new Error('Empty attachment response');
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      this.notifications.error({ message: 'No se pudo descargar el adjunto.' });
    }
  }

  openPersistedAttachmentPreview(attachment: AssetAttachmentSummary): void {
    this.previewAttachment.set(attachment);
    this.isAttachmentPreviewOpen.set(true);
  }

  closeAttachmentPreview(): void {
    this.isAttachmentPreviewOpen.set(false);
    this.previewAttachment.set(null);
  }

  async submit(): Promise<void> {
    this.showAttributeErrors.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.hasInvalidDynamicAttributes()) {
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      code: this.isEdit() ? this.existingAsset()?.code ?? null : null,
      name: value.name.trim(),
      assetTypeId: value.typeId,
      locationId: value.locationId,
      supplierId: value.supplierId || null,
      condition: this.assetsService.toApiCondition(value.condition),
      serialNumber: this.isEdit() ? this.existingAsset()?.serial ?? null : null,
      acquisitionDate: value.acquisitionDate || null,
      description: this.normalizeOptional(value.description),
      notes: this.normalizeOptional(value.observations),
      removedAttachmentIds: this.removedAttachmentIds(),
      attributeValues: this.dynamicAttributes()
        .filter((attribute) => attribute.value.trim())
        .map((attribute) => ({
          attributeDefinitionId: attribute.id,
          value: attribute.value.trim(),
        })),
    };

    try {
      this.isSubmitting.set(true);
      const id = this.id();
      const newAttachmentFiles = this.newAttachments().map((attachment) => attachment.file);
      let savedAsset: InventoryAsset;

      if (id) {
        savedAsset = await firstValueFrom(this.assetsService.update(id, payload, newAttachmentFiles));
      } else {
        savedAsset = await firstValueFrom(this.assetsService.create(payload, newAttachmentFiles));
      }

      this.notifications.success({
        message: this.isEdit()
          ? 'Activo actualizado correctamente.'
          : 'Activo registrado correctamente.',
      });
      await this.router.navigate(['/inventory', savedAsset.id]);
    } catch (error: unknown) {
      this.notifications.error({
        message: this.resolveSaveErrorMessage(error),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private hasInvalidDynamicAttributes(): boolean {
    return this.dynamicAttributes().some(
      (attribute) => attribute.isRequired && !attribute.value.trim(),
    );
  }

  private async loadExistingAsset(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    try {
      this.isLoadingAsset.set(true);
      const asset = await firstValueFrom(this.assetsService.getById(id));
      this.existingAsset.set(asset);
      this.selectedCategoryId.set(asset.categoryId);
      this.attributeValuesState.set(
        Object.fromEntries(
          asset.attributeValues.map((attribute) => [
            attribute.attributeDefinitionId,
            attribute.value,
          ]),
        ),
      );
      this.removedAttachmentIds.set([]);
      this.form.patchValue({
        name: asset.name,
        categoryId: asset.categoryId,
        typeId: asset.typeId,
        locationId: asset.locationId,
        supplierId: asset.supplierId ?? '',
        condition: asset.condition,
        acquisitionDate: asset.acquisitionDate,
        description: asset.description ?? '',
        observations: asset.observations ?? '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(error, 'No se pudo cargar el activo.'),
      });
    } finally {
      this.isLoadingAsset.set(false);
    }
  }

  private async initializeFormContext(): Promise<void> {
    if (this.id()) {
      await this.loadExistingAsset();
      return;
    }

    await this.loadSourceGroupContext();
  }

  private async loadSourceGroupContext(): Promise<void> {
    const sourceGroupId = this.sourceGroupId();
    if (!sourceGroupId) {
      return;
    }

    try {
      this.isLoadingSourceGroup.set(true);
      const group = await firstValueFrom(this.assetsService.getGroupById(sourceGroupId));
      this.sourceGroup.set(group);
      this.selectedCategoryId.set(group.categoryId);
      this.form.patchValue({
        name: group.displayName,
        categoryId: group.categoryId,
        typeId: group.typeId,
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (error: unknown) {
      this.sourceGroup.set(null);
      this.notifications.error({
        message: this.getBackendMessage(
          error,
          'No se pudo cargar la familia seleccionada para agregar unidades iguales.',
        ),
      });
      await this.router.navigate(['/inventory/groups', sourceGroupId]);
    } finally {
      this.isLoadingSourceGroup.set(false);
    }
  }

  private processSelectedFiles(files: File[]): void {
    const nextAttachments: AssetAttachmentDraft[] = [];
    const duplicateNames: string[] = [];
    const invalidMessages: string[] = [];
    const currentKeys = new Set(
      this.newAttachments().map((attachment) => this.getAttachmentKey(attachment.file)),
    );

    for (const file of files) {
      const duplicateKey = this.getAttachmentKey(file);
      if (currentKeys.has(duplicateKey)) {
        duplicateNames.push(file.name);
        continue;
      }

      const validationMessage = this.validateAttachment(file);
      if (validationMessage) {
        invalidMessages.push(`${file.name}: ${validationMessage}`);
        continue;
      }

      currentKeys.add(duplicateKey);
      nextAttachments.push(this.createAttachmentDraft(file));
    }

    if (nextAttachments.length > 0) {
      this.newAttachments.update((attachments) => [...attachments, ...nextAttachments]);
      this.notifications.success({
        message: `${nextAttachments.length} archivo${nextAttachments.length === 1 ? '' : 's'} agregado${nextAttachments.length === 1 ? '' : 's'}.`,
      });
    }

    this.attachmentFeedback.set(
      this.buildAttachmentFeedback({
        addedCount: nextAttachments.length,
        duplicateNames,
        invalidMessages,
      }),
    );
  }

  private createAttachmentDraft(file: File): AssetAttachmentDraft {
    return {
      id: this.buildAttachmentId(file),
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };
  }

  private validateAttachment(file: File): string | null {
    const extension = getFileAttachmentExtension(file.name);
    const isSupportedImage =
      file.type.startsWith('image/') || ALLOWED_IMAGE_EXTENSIONS.has(extension);
    const isSupportedDocument =
      ALLOWED_DOCUMENT_MIME_TYPES.has(file.type) || ALLOWED_DOCUMENT_EXTENSIONS.has(extension);

    if (!isSupportedImage && !isSupportedDocument) {
      return 'Formato no permitido.';
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return `Supera el máximo de ${this.attachmentLimitLabel}.`;
    }

    return null;
  }

  private buildAttachmentFeedback(params: {
    addedCount: number;
    duplicateNames: string[];
    invalidMessages: string[];
  }): string | null {
    const messages: string[] = [];

    if (params.addedCount > 0) {
      messages.push(
        `${params.addedCount} archivo${params.addedCount === 1 ? '' : 's'} agregado${params.addedCount === 1 ? '' : 's'}.`,
      );
    }

    if (params.duplicateNames.length > 0) {
      messages.push(`Duplicados omitidos: ${params.duplicateNames.join(', ')}.`);
    }

    if (params.invalidMessages.length > 0) {
      messages.push(...params.invalidMessages);
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private getAttachmentKey(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  private buildAttachmentId(file: File): string {
    const randomId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `asset-attachment-${randomId}-${file.lastModified}`;
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private resolveSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 413) {
      return 'Los archivos adjuntos exceden el tamaño máximo permitido para el activo.';
    }

    return this.getBackendMessage(error, 'No se pudo guardar el activo.');
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }

  ngOnDestroy(): void {
    for (const attachment of this.newAttachments()) {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
  }
}
