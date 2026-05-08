import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoanSignaturePadComponent } from '../../components/loan-signature-pad/loan-signature-pad.component';
import { LoanAttachmentDraft, LoanAttachmentSource } from '../../models/loan-attachment-draft.model';

interface TeacherOption {
  id: string;
  name: string;
  initials: string;
  dni: string;
  specialty: string;
}

interface DestinationOption {
  id: string;
  name: string;
}

type AssetCondition = 'Bueno' | 'Regular';

interface AssetOption {
  id: string;
  name: string;
  code: string;
  condition: AssetCondition;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoanSignaturePadComponent],
  templateUrl: './loan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LoanFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly teacherSearchContainer = viewChild<ElementRef>('teacherSearchContainer');
  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');
  readonly assetSearchContainer = viewChild<ElementRef>('assetSearchContainer');
  readonly signatureModal = viewChild<ElementRef<HTMLDialogElement>>('signatureModal');
  readonly attachmentSourceModal = viewChild<ElementRef<HTMLDialogElement>>('attachmentSourceModal');
  readonly signaturePad = viewChild<LoanSignaturePadComponent>('signaturePad');
  readonly documentPickerInput = viewChild<ElementRef<HTMLInputElement>>('documentPickerInput');
  readonly cameraCaptureInput = viewChild<ElementRef<HTMLInputElement>>('cameraCaptureInput');

  readonly availableTeachers = signal<TeacherOption[]>([
    {
      id: 'teacher-1',
      name: 'Luis Quispe Mendoza',
      initials: 'LQ',
      dni: '45879632',
      specialty: 'Dpto. Ciencias',
    },
    {
      id: 'teacher-2',
      name: 'Ana Torres Huaman',
      initials: 'AT',
      dni: '70124568',
      specialty: 'Comunicación',
    },
    {
      id: 'teacher-3',
      name: 'Jorge Ramos Cárdenas',
      initials: 'JR',
      dni: '46587912',
      specialty: 'Matemáticas',
    },
  ]);

  readonly destinations = signal<DestinationOption[]>([
    { id: 'dest-1', name: 'Aula 101 - Pabellón A' },
    { id: 'dest-2', name: 'Laboratorio de Cómputo' },
    { id: 'dest-3', name: 'Auditorio Principal' },
    { id: 'dest-4', name: 'Sala de Profesores' },
  ]);

  readonly availableAssets = signal<AssetOption[]>([
    {
      id: 'asset-1',
      name: 'Laptop Lenovo ThinkPad T14',
      code: 'CMP-2023-045',
      condition: 'Bueno',
    },
    {
      id: 'asset-2',
      name: 'Proyector Epson PowerLite',
      code: 'PRY-2022-012',
      condition: 'Regular',
    },
    {
      id: 'asset-3',
      name: 'Cable HDMI 5 Metros',
      code: 'ACC-2023-108',
      condition: 'Bueno',
    },
    {
      id: 'asset-4',
      name: 'Mouse Inalámbrico HP',
      code: 'ACC-2024-021',
      condition: 'Bueno',
    },
    {
      id: 'asset-5',
      name: 'Parlante Portátil JBL',
      code: 'AUD-2024-014',
      condition: 'Bueno',
    },
  ]);

  readonly selectedTeacher = signal<TeacherOption | null>(null);
  readonly selectedDestination = signal<DestinationOption | null>(null);
  readonly selectedAssets = signal<AssetOption[]>([
    this.availableAssets()[0]!,
    this.availableAssets()[1]!,
    this.availableAssets()[2]!,
  ]);

  readonly teacherQuery = signal('');
  readonly locationQuery = signal('');
  readonly assetQuery = signal('');
  readonly teacherDropdownOpen = signal(false);
  readonly locationDropdownOpen = signal(false);
  readonly assetDropdownOpen = signal(false);
  readonly showTeacherError = signal(false);
  readonly showAssetsError = signal(false);
  readonly assetLookupError = signal('');
  readonly attachmentFeedback = signal<string | null>(null);
  readonly attachments = signal<LoanAttachmentDraft[]>([]);
  readonly isDocumentDropActive = signal(false);
  readonly isSubmitting = signal(false);
  readonly isSignatureModalOpen = signal(false);
  readonly signatureDataUrl = signal<string | null>(null);
  readonly signatureDraft = signal<string | null>(null);

  readonly form = this.fb.group({
    destinationId: ['', Validators.required],
    startDate: ['2026-05-03', Validators.required],
    dueDate: ['', Validators.required],
    notes: [''],
  });

  readonly filteredTeachers = computed(() => {
    const query = this.teacherQuery().toLowerCase().trim();
    if (!query) {
      return this.availableTeachers();
    }

    return this.availableTeachers().filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(query) || teacher.dni.toLowerCase().includes(query),
    );
  });

  readonly filteredDestinations = computed(() => {
    const query = this.locationQuery().toLowerCase().trim();

    return this.destinations().filter((destination) =>
      destination.name.toLowerCase().includes(query),
    );
  });

  readonly filteredAssets = computed(() => {
    const query = this.assetQuery().toLowerCase().trim();
    const selectedIds = new Set(this.selectedAssets().map((asset) => asset.id));

    return this.availableAssets().filter((asset) => {
      if (selectedIds.has(asset.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        asset.name.toLowerCase().includes(query) || asset.code.toLowerCase().includes(query)
      );
    });
  });

  readonly selectedAssetsCountLabel = computed(() => {
    const count = this.selectedAssets().length;
    return `${count} activo${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}`;
  });

  readonly hasSavedSignature = computed(() => !!this.signatureDataUrl());
  readonly hasAttachments = computed(() => this.attachments().length > 0);

  onClickOutside(event: MouseEvent) {
    const teacherContainer = this.teacherSearchContainer();
    if (
      this.teacherDropdownOpen() &&
      teacherContainer &&
      !teacherContainer.nativeElement.contains(event.target)
    ) {
      this.teacherDropdownOpen.set(false);
    }

    const locationContainer = this.locationSearchContainer();
    if (
      this.locationDropdownOpen() &&
      locationContainer &&
      !locationContainer.nativeElement.contains(event.target)
    ) {
      this.locationDropdownOpen.set(false);
    }

    const assetContainer = this.assetSearchContainer();
    if (
      this.assetDropdownOpen() &&
      assetContainer &&
      !assetContainer.nativeElement.contains(event.target)
    ) {
      this.assetDropdownOpen.set(false);
    }
  }

  onTeacherSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.teacherQuery.set(value);
    this.teacherDropdownOpen.set(true);
    this.showTeacherError.set(false);
  }

  onTeacherFocus() {
    this.teacherDropdownOpen.set(true);
  }

  selectTeacher(teacher: TeacherOption) {
    this.selectedTeacher.set(teacher);
    this.teacherQuery.set(teacher.name);
    this.teacherDropdownOpen.set(false);
    this.showTeacherError.set(false);
  }

  clearTeacher() {
    this.selectedTeacher.set(null);
    this.teacherQuery.set('');
    this.teacherDropdownOpen.set(true);
  }

  onLocationSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.locationQuery.set(value);
    this.locationDropdownOpen.set(true);
    this.selectedDestination.set(null);
    this.form.controls.destinationId.setValue('');
    this.form.controls.destinationId.markAsUntouched();
    this.form.controls.destinationId.updateValueAndValidity();
  }

  onLocationFocus() {
    this.locationDropdownOpen.set(true);
  }

  selectDestination(destination: DestinationOption) {
    this.selectedDestination.set(destination);
    this.locationQuery.set(destination.name);
    this.locationDropdownOpen.set(false);
    this.form.controls.destinationId.setValue(destination.id);
    this.form.controls.destinationId.markAsTouched();
    this.form.controls.destinationId.updateValueAndValidity();
  }

  clearDestination() {
    this.selectedDestination.set(null);
    this.locationQuery.set('');
    this.locationDropdownOpen.set(true);
    this.form.controls.destinationId.setValue('');
    this.form.controls.destinationId.markAsUntouched();
    this.form.controls.destinationId.updateValueAndValidity();
  }

  onAssetSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.assetQuery.set(value);
    this.assetDropdownOpen.set(true);
    this.assetLookupError.set('');
    this.showAssetsError.set(false);
  }

  onAssetFocus() {
    this.assetDropdownOpen.set(true);
  }

  addAsset(asset: AssetOption) {
    this.selectedAssets.update((assets) => [...assets, asset]);
    this.assetQuery.set('');
    this.assetDropdownOpen.set(false);
    this.assetLookupError.set('');
    this.showAssetsError.set(false);
  }

  addAssetFromQuery() {
    const query = this.assetQuery().toLowerCase().trim();
    if (!query) {
      this.assetDropdownOpen.set(true);
      return;
    }

    const asset = this.filteredAssets().find(
      (item) => item.code.toLowerCase() === query || item.name.toLowerCase() === query,
    );

    if (asset) {
      this.addAsset(asset);
      return;
    }

    this.assetLookupError.set('No se encontró un activo disponible con ese código o nombre.');
    this.assetDropdownOpen.set(true);
  }

  onAssetInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addAssetFromQuery();
    }
  }

  removeAsset(assetId: string) {
    this.selectedAssets.update((assets) => assets.filter((asset) => asset.id !== assetId));
  }

  clearAssets() {
    this.selectedAssets.set([]);
    this.showAssetsError.set(true);
  }

  getAssetConditionClass(condition: AssetCondition): string {
    return condition === 'Bueno'
      ? 'text-estado-bueno bg-estado-bueno-bg'
      : 'text-estado-regular bg-estado-regular-bg';
  }

  openSignatureModal() {
    const currentSignature = this.signatureDataUrl();
    this.signatureDraft.set(currentSignature);
    this.isSignatureModalOpen.set(true);
    this.signatureModal()?.nativeElement.showModal();

    requestAnimationFrame(() => {
      this.signaturePad()?.loadSignature(currentSignature);
    });
  }

  closeSignatureModal() {
    this.signatureModal()?.nativeElement.close();
  }

  onSignatureModalClose() {
    this.isSignatureModalOpen.set(false);
    this.signatureDraft.set(null);
    this.signaturePad()?.loadSignature(null);
  }

  clearSignatureDraft() {
    this.signatureDraft.set(null);
    this.signaturePad()?.clearSignature();
  }

  saveSignature() {
    const signatureDataUrl = this.signaturePad()?.getSignatureDataUrl() ?? null;
    this.signatureDraft.set(signatureDataUrl);
    this.signatureDataUrl.set(signatureDataUrl);
    this.closeSignatureModal();
  }

  removeSignature() {
    this.signatureDraft.set(null);
    this.signatureDataUrl.set(null);
  }

  openDocumentPicker() {
    this.documentPickerInput()?.nativeElement.click();
  }

  openCameraCapture() {
    this.cameraCaptureInput()?.nativeElement.click();
  }

  openAttachmentSourceModal() {
    this.attachmentSourceModal()?.nativeElement.showModal();
  }

  closeAttachmentSourceModal() {
    this.attachmentSourceModal()?.nativeElement.close();
  }

  openDocumentPickerFromModal() {
    this.closeAttachmentSourceModal();
    this.openDocumentPicker();
  }

  openCameraCaptureFromModal() {
    this.closeAttachmentSourceModal();
    this.openCameraCapture();
  }

  onDocumentDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDocumentDropActive.set(true);
  }

  onDocumentDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDocumentDropActive.set(false);
  }

  onDocumentDrop(event: DragEvent) {
    event.preventDefault();
    this.isDocumentDropActive.set(false);

    const fileList = event.dataTransfer?.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    this.processSelectedFiles(Array.from(fileList), 'picker');
  }

  onDocumentSelection(event: Event, source: LoanAttachmentSource) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;

    if (!fileList || fileList.length === 0) {
      input.value = '';
      return;
    }

    this.processSelectedFiles(Array.from(fileList), source);
    input.value = '';
  }

  removeAttachment(attachmentId: string) {
    const attachment = this.attachments().find((item) => item.id === attachmentId);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    this.attachments.update((attachments) =>
      attachments.filter((item) => item.id !== attachmentId),
    );

    this.attachmentFeedback.set(null);
  }

  getAttachmentTypeLabel(attachment: LoanAttachmentDraft): string {
    const extension = this.getFileExtension(attachment.name);

    if (attachment.mimeType.startsWith('image/')) {
      return 'Imagen';
    }

    if (extension === 'pdf') {
      return 'PDF';
    }

    if (extension === 'docx') {
      return 'DOCX';
    }

    return 'DOC';
  }

  getAttachmentIcon(attachment: LoanAttachmentDraft): string {
    if (attachment.mimeType.startsWith('image/')) {
      return 'image';
    }

    if (this.getFileExtension(attachment.name) === 'pdf') {
      return 'picture_as_pdf';
    }

    return 'description';
  }

  formatAttachmentSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  getAttachmentSourceLabel(source: LoanAttachmentSource): string {
    return source === 'camera' ? 'Cámara' : 'Archivo';
  }

  ngOnDestroy() {
    for (const attachment of this.attachments()) {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
  }

  onCancel() {
    this.router.navigate(['/loans']);
  }

  onSubmit() {
    if (!this.selectedTeacher()) {
      this.showTeacherError.set(true);
      this.teacherDropdownOpen.set(false);
    }

    if (this.selectedAssets().length === 0) {
      this.showAssetsError.set(true);
    }

    if (!this.selectedTeacher() || this.selectedAssets().length === 0 || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    console.log('Registrar préstamo', this.buildLoanSubmissionPayload());

    queueMicrotask(() => this.isSubmitting.set(false));
  }

  private createAttachmentDraft(file: File, source: LoanAttachmentSource): LoanAttachmentDraft {
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

    return {
      id: this.buildAttachmentId(file),
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      previewUrl,
      source,
      status: 'ready',
    };
  }

  private validateAttachment(file: File): string | null {
    const extension = this.getFileExtension(file.name);
    const isValidMimeType =
      file.type === '' ? ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) : this.isAllowedMimeType(file.type);

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) || !isValidMimeType) {
      return 'Formato no permitido.';
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return `Supera el máximo de ${this.formatAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES)}.`;
    }

    return null;
  }

  private processSelectedFiles(files: File[], source: LoanAttachmentSource) {
    const nextAttachments: LoanAttachmentDraft[] = [];
    const duplicateNames: string[] = [];
    const invalidMessages: string[] = [];
    const currentKeys = new Set(
      this.attachments().map((attachment) => this.getAttachmentKey(attachment.file)),
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
      nextAttachments.push(this.createAttachmentDraft(file, source));
    }

    if (nextAttachments.length > 0) {
      this.attachments.update((attachments) => [...attachments, ...nextAttachments]);
    }

    this.attachmentFeedback.set(
      this.buildAttachmentFeedback({
        addedCount: nextAttachments.length,
        duplicateNames,
        invalidMessages,
      }),
    );
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
    return `attachment-${crypto.randomUUID()}-${file.lastModified}`;
  }

  private getFileExtension(fileName: string): string {
    const segments = fileName.toLowerCase().split('.');
    return segments.at(-1) ?? '';
  }

  private isAllowedMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/') || ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType);
  }

  private buildLoanSubmissionPayload() {
    return {
      loanData: {
        teacher: this.selectedTeacher(),
        destination: this.selectedDestination(),
        assets: this.selectedAssets(),
        form: this.form.getRawValue(),
        signatureDataUrl: this.signatureDataUrl(),
      },
      attachmentsMetadata: this.attachments().map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        source: attachment.source,
        status: attachment.status,
      })),
      attachmentFiles: this.attachments().map((attachment) => attachment.file),
    };
  }
}
