import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  computed,
  effect,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, map, of, startWith } from 'rxjs';
import { LoanSignaturePadComponent } from '../../components/loan-signature-pad/loan-signature-pad.component';
import { LoanAttachmentDraft, LoanAttachmentSource } from '../../models/loan-attachment-draft.model';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { AssetQrScannerModalComponent } from '../../../../shared/ui/asset-qr-scanner-modal/asset-qr-scanner-modal.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AssetsService } from '../../../inventory/services/assets.service';
import { AssetCondition, InventoryAsset } from '../../../inventory/models/inventory.model';
import { LocationsService } from '../../../locations/services/locations.service';
import { TeacherDto, TeachersService } from '../../../teachers/services/teachers.service';
import { LoansService } from '../../services/loans.service';

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

type AssetCategoryId = 'all' | string;
type AssetLocationId = 'all' | string;
type AssetOption = InventoryAsset & {
  location: string;
  groupKey: string;
  groupName: string;
  groupIcon: string;
};

interface AssetCategoryOption {
  id: AssetCategoryId;
  name: string;
  count: number;
}

interface AssetLocationOption {
  id: AssetLocationId;
  name: string;
  count: number;
}
type AssetSearchOption = AssetOption;

interface AssetSearchGroup {
  key: string;
  name: string;
  icon: string;
  availableCount: number;
  assets: AssetSearchOption[];
}

type LoadState<T> =
  | { kind: 'loading'; items: T[] }
  | { kind: 'ready'; items: T[] }
  | { kind: 'error'; items: T[]; message: string };

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function dueDateAfterStartDateValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value as string | null;
  const dueDate = control.get('dueDate')?.value as string | null;

  if (!startDate || !dueDate) {
    return null;
  }

  return dueDate >= startDate ? null : { dueDateBeforeStartDate: true };
}

function getTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-loan-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoanSignaturePadComponent,
    AssetQrScannerModalComponent,
    DatePickerComponent,
    ActionButtonComponent,
  ],
  templateUrl: './loan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LoanFormComponent implements OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly assetsService = inject(AssetsService);
  private readonly locationsService = inject(LocationsService);
  private readonly teachersService = inject(TeachersService);
  private readonly loansService = inject(LoansService);
  private readonly modalScrollLockClass = 'overflow-hidden';

  readonly teacherSearchContainer = viewChild<ElementRef>('teacherSearchContainer');
  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');
  readonly assetSearchContainer = viewChild<ElementRef>('assetSearchContainer');
  readonly signatureModal = viewChild<ElementRef<HTMLDialogElement>>('signatureModal');
  readonly signaturePad = viewChild<LoanSignaturePadComponent>('signaturePad');
  readonly documentPickerInput = viewChild<ElementRef<HTMLInputElement>>('documentPickerInput');

  private readonly teacherState = toSignal(
    this.teachersService.list().pipe(
      map((teachers) => ({ kind: 'ready', items: teachers }) as LoadState<TeacherDto>),
      startWith({ kind: 'loading', items: [] } as LoadState<TeacherDto>),
      catchError(() =>
        of({
          kind: 'error',
          items: [],
          message: 'No se pudieron cargar los docentes disponibles.',
        } as LoadState<TeacherDto>),
      ),
    ),
    { initialValue: { kind: 'loading', items: [] } as LoadState<TeacherDto> },
  );
  private readonly locationRows = toSignal(this.locationsService.list('ACTIVE'), { initialValue: [] });
  private readonly assetState = toSignal(
    this.assetsService.list().pipe(
      map((assets) => ({ kind: 'ready', items: assets }) as LoadState<InventoryAsset>),
      startWith({ kind: 'loading', items: [] } as LoadState<InventoryAsset>),
      catchError(() =>
        of({
          kind: 'error',
          items: [],
          message: 'No se pudieron cargar los activos disponibles para préstamo.',
        } as LoadState<InventoryAsset>),
      ),
    ),
    { initialValue: { kind: 'loading', items: [] } as LoadState<InventoryAsset> },
  );

  readonly teachersLoading = computed(() => this.teacherState().kind === 'loading');
  readonly teachersLoadFailed = computed(() => this.teacherState().kind === 'error');
  readonly teacherLoadMessage = computed(() => {
    const state = this.teacherState();
    return state.kind === 'error' ? state.message : '';
  });
  readonly assetsLoading = computed(() => this.assetState().kind === 'loading');
  readonly assetsLoadFailed = computed(() => this.assetState().kind === 'error');
  readonly assetLoadMessage = computed(() => {
    const state = this.assetState();
    return state.kind === 'error' ? state.message : '';
  });

  readonly availableTeachers = computed<TeacherOption[]>(() =>
    this.teacherState().items
      .filter((teacher) => this.teachersService.toUiStatus(teacher.status ?? 'Activo') === 'Activo')
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.fullName,
        initials: this.buildInitials(teacher.fullName),
        dni: teacher.dni,
        specialty: teacher.specialty ?? 'Docente',
      })),
  );

  readonly destinations = computed<DestinationOption[]>(() =>
    this.locationRows().map((location) => ({ id: location.id, name: location.name })),
  );

  readonly availableAssets = computed<AssetOption[]>(() =>
    this.assetState().items.map((asset) => ({
      ...asset,
      location: asset.locationName,
      groupKey: asset.typeId,
      groupName: asset.typeName,
      groupIcon: asset.icon,
    })),
  );

  readonly selectedTeacher = signal<TeacherOption | null>(null);
  readonly selectedDestination = signal<DestinationOption | null>(null);
  readonly selectedAssets = signal<AssetOption[]>([]);

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
  readonly isAttachmentSourceModalOpen = signal(false);
  readonly isAssetSearchModalOpen = signal(false);
  readonly isQrScannerOpen = signal(false);
  readonly signatureDataUrl = signal<string | null>(null);
  readonly signatureDraft = signal<string | null>(null);
  readonly assetModalQuery = signal('');
  readonly selectedAssetCategory = signal<AssetCategoryId>('all');
  readonly selectedAssetLocation = signal<AssetLocationId>('all');
  readonly expandedAssetGroups = signal<Set<string>>(new Set());
  readonly modalSelectedAssetIds = signal<Set<string>>(new Set());

  readonly form = this.fb.group({
      destinationId: ['', Validators.required],
      startDate: [getTodayIsoDate(), Validators.required],
      dueDate: ['', Validators.required],
      notes: [''],
    },
    { validators: dueDateAfterStartDateValidator },
  );

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
      if (selectedIds.has(asset.id) || !this.isAssetSearchOptionSelectable(asset)) {
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

  readonly teachersEmpty = computed(
    () => !this.teachersLoading() && !this.teachersLoadFailed() && this.availableTeachers().length === 0,
  );

  readonly filteredTeachersEmpty = computed(
    () => !this.teachersLoading() && !this.teachersLoadFailed() && this.filteredTeachers().length === 0,
  );

  readonly assetSearchOptions = computed<AssetSearchOption[]>(() =>
    this.availableAssets().filter((asset) => this.isAssetVisibleInSearchModal(asset)),
  );

  readonly assetCategoryOptions = computed<AssetCategoryOption[]>(() => {
    const assets = this.assetSearchOptions();
    const categories = new Map<string, string>();
    for (const asset of assets) {
      categories.set(asset.categoryId, asset.categoryName);
    }

    return [
      { id: 'all', name: 'Todos', count: assets.length },
      ...Array.from(categories.entries()).map(([id, name]) => ({
        id,
        name,
        count: assets.filter((asset) => asset.categoryId === id).length,
      })),
    ];
  });

  readonly assetLocationOptions = computed<AssetLocationOption[]>(() => {
    const assets = this.assetSearchOptions();
    const locations = new Map<string, string>();
    for (const asset of assets) {
      locations.set(asset.locationId, asset.locationName);
    }

    return [
      { id: 'all', name: 'Todos', count: assets.length },
      ...Array.from(locations.entries()).map(([id, name]) => ({
        id,
        name,
        count: assets.filter((asset) => asset.locationId === id).length,
      })),
    ];
  });

  readonly filteredAssetGroups = computed<AssetSearchGroup[]>(() => {
    const selectedCategory = this.selectedAssetCategory();
    const selectedLocation = this.selectedAssetLocation();
    const query = this.assetModalQuery().trim().toLowerCase();
    const groups = new Map<string, AssetSearchGroup>();

    const assets = this.assetSearchOptions().filter((asset) => {
      const matchesCategory = selectedCategory === 'all' || asset.categoryId === selectedCategory;
      const matchesLocation = selectedLocation === 'all' || asset.locationId === selectedLocation;
      const matchesQuery =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        asset.code.toLowerCase().includes(query) ||
        asset.serial.toLowerCase().includes(query);

      return matchesCategory && matchesLocation && matchesQuery;
    });

    for (const asset of assets) {
      const group = groups.get(asset.groupKey);
      if (group) {
        group.assets.push(asset);
        group.availableCount += this.isAssetSearchOptionCurrentlyAvailable(asset) ? 1 : 0;
        continue;
      }

      groups.set(asset.groupKey, {
        key: asset.groupKey,
        name: asset.groupName,
        icon: asset.groupIcon,
        availableCount: this.isAssetSearchOptionCurrentlyAvailable(asset) ? 1 : 0,
        assets: [asset],
      });
    }

    return Array.from(groups.values()).filter((group) => group.availableCount > 0);
  });

  readonly assetSearchOptionsEmpty = computed(
    () => !this.assetsLoading() && !this.assetsLoadFailed() && this.assetSearchOptions().length === 0,
  );

  readonly modalSelectedAssetsCount = computed(() => this.modalSelectedAssetIds().size);

  readonly selectedAssetsCountLabel = computed(() => {
    const count = this.selectedAssets().length;
    return `${count} activo${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}`;
  });

  readonly hasSavedSignature = computed(() => !!this.signatureDataUrl());
  readonly hasAttachments = computed(() => this.attachments().length > 0);

  constructor() {
    effect(() => {
      document.body.classList.toggle(this.modalScrollLockClass, this.isAssetSearchModalOpen());
    });
  }

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
    this.notifications.info({ message: `Activo "${asset.name}" agregado al préstamo.` });
  }

  addAssetFromQuery() {
    const query = this.assetQuery();
    if (!query) {
      this.assetDropdownOpen.set(true);
      return;
    }
    void this.lookupAndAddAsset(query, { openDropdownOnFailure: true });
  }

  onAssetInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addAssetFromQuery();
    }
  }

  removeAsset(assetId: string) {
    const removedAsset = this.selectedAssets().find((asset) => asset.id === assetId);
    this.selectedAssets.update((assets) => assets.filter((asset) => asset.id !== assetId));
    if (removedAsset) {
      this.notifications.info({ message: `Activo "${removedAsset.name}" retirado del préstamo.` });
    }
  }

  clearAssets() {
    this.selectedAssets.set([]);
    this.showAssetsError.set(true);
    this.notifications.warning({ message: 'Lista de activos seleccionados limpiada.' });
  }

  openAssetSearchModal() {
    this.assetModalQuery.set('');
    this.selectedAssetCategory.set('all');
    this.selectedAssetLocation.set('all');
    this.modalSelectedAssetIds.set(new Set());
    this.expandedAssetGroups.set(new Set());
    this.isAssetSearchModalOpen.set(true);
  }

  closeAssetSearchModal() {
    this.isAssetSearchModalOpen.set(false);
    this.assetModalQuery.set('');
    this.modalSelectedAssetIds.set(new Set());
  }

  setAssetCategory(categoryId: AssetCategoryId) {
    this.selectedAssetCategory.set(categoryId);
    this.expandedAssetGroups.set(new Set());
  }

  setAssetLocation(locationId: AssetLocationId) {
    this.selectedAssetLocation.set(locationId);
    this.expandedAssetGroups.set(new Set());
  }

  onAssetModalSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.assetModalQuery.set(value);
    this.expandedAssetGroups.set(new Set());
  }

  toggleAssetGroup(groupKey: string) {
    this.expandedAssetGroups.update((expandedGroups) => {
      const nextGroups = new Set(expandedGroups);
      if (nextGroups.has(groupKey)) {
        nextGroups.delete(groupKey);
      } else {
        nextGroups.add(groupKey);
      }

      return nextGroups;
    });
  }

  isAssetSearchGroupExpanded(groupKey: string): boolean {
    return this.expandedAssetGroups().has(groupKey);
  }

  toggleModalAssetSelection(assetId: string) {
    const asset = this.assetSearchOptions().find((item) => item.id === assetId);
    if (!asset || this.isModalAssetDisabled(asset)) {
      return;
    }

    this.modalSelectedAssetIds.update((selectedIds) => {
      const nextSelectedIds = new Set(selectedIds);
      if (nextSelectedIds.has(assetId)) {
        nextSelectedIds.delete(assetId);
      } else {
        nextSelectedIds.add(assetId);
      }

      return nextSelectedIds;
    });
  }

  confirmAssetSelection() {
    const selectedIds = this.modalSelectedAssetIds();
    if (selectedIds.size === 0) {
      this.closeAssetSearchModal();
      return;
    }

    const currentIds = new Set(this.selectedAssets().map((asset) => asset.id));
    const nextAssets = this.assetSearchOptions().filter(
      (asset) => selectedIds.has(asset.id) && !currentIds.has(asset.id),
    );

    if (nextAssets.length > 0) {
      this.selectedAssets.update((assets) => [...assets, ...nextAssets]);
      this.showAssetsError.set(false);
      this.notifications.info({
        message: `${nextAssets.length} activo${nextAssets.length === 1 ? '' : 's'} agregado${nextAssets.length === 1 ? '' : 's'} al préstamo.`,
      });
    }

    this.closeAssetSearchModal();
  }

  isModalAssetSelected(assetId: string): boolean {
    return this.modalSelectedAssetIds().has(assetId);
  }

  isModalAssetAlreadyAdded(assetId: string): boolean {
    return this.selectedAssets().some((asset) => asset.id === assetId);
  }

  isModalAssetDisabled(asset: AssetSearchOption): boolean {
    return !this.isAssetSearchOptionSelectable(asset) || this.isModalAssetAlreadyAdded(asset.id);
  }

  getAssetSearchStatusClass(asset: AssetSearchOption): string {
    if (this.isModalAssetAlreadyAdded(asset.id)) {
      return 'bg-info/12 text-info';
    }

    switch (asset.condition) {
      case 'Bueno':
        return 'bg-estado-bueno-bg text-estado-bueno';
      case 'Regular':
        return 'bg-estado-regular-bg text-estado-regular';
      case 'Malo':
        return 'bg-estado-malo-bg text-estado-malo';
      case 'Mantenimiento':
        return 'bg-estado-mant-bg text-estado-mant';
      case 'Dado de baja':
        return 'bg-estado-baja-bg text-estado-baja';
    }
  }

  getAssetSearchStatusLabel(asset: AssetSearchOption): string {
    return this.isModalAssetAlreadyAdded(asset.id) ? 'Agregado' : asset.condition;
  }

  getAssetConditionClass(condition: AssetCondition): string {
    switch (condition) {
      case 'Bueno':
        return 'text-estado-bueno bg-estado-bueno-bg';
      case 'Regular':
        return 'text-estado-regular bg-estado-regular-bg';
      case 'Malo':
        return 'text-estado-malo bg-estado-malo-bg';
      case 'Mantenimiento':
        return 'text-estado-mant bg-estado-mant-bg';
      case 'Dado de baja':
        return 'text-estado-baja bg-estado-baja-bg';
    }
  }

  getAssetSearchRowClass(asset: AssetSearchOption): string {
    if (this.isModalAssetAlreadyAdded(asset.id)) {
      return 'flex items-center justify-between gap-4 bg-base-200/45 px-4 py-3 opacity-70';
    }

    switch (asset.condition) {
      case 'Bueno':
      case 'Regular':
        return 'group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-primary/5';
      case 'Malo':
        return 'flex items-center justify-between gap-4 bg-base-200/55 px-4 py-3 opacity-65';
      case 'Mantenimiento':
        return 'flex items-center justify-between gap-4 bg-base-200/55 px-4 py-3 opacity-65';
      case 'Dado de baja':
        return 'hidden';
    }
  }

  getAssetSearchContentClass(asset: AssetSearchOption): string {
    return this.isModalAssetDisabled(asset)
      ? 'min-w-0 text-base-content/70'
      : 'min-w-0';
  }

  getAssetSearchCheckboxClass(asset: AssetSearchOption): string {
    if (this.isModalAssetAlreadyAdded(asset.id)) {
      return 'checkbox checkbox-sm shrink-0 cursor-not-allowed border-2 border-base-300 bg-base-100 text-base-content/40 opacity-100 shadow-none';
    }

    switch (asset.condition) {
      case 'Bueno':
      case 'Regular':
        return 'checkbox checkbox-sm shrink-0 border-2 border-base-400 bg-base-100 shadow-sm transition-all hover:border-primary/60 checked:border-primary checked:bg-primary checked:text-primary-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';
      case 'Malo':
        return 'checkbox checkbox-sm shrink-0 cursor-not-allowed border-2 border-base-300 bg-base-100 text-base-content/35 opacity-100 shadow-none';
      case 'Mantenimiento':
        return 'checkbox checkbox-sm shrink-0 cursor-not-allowed border-2 border-base-300 bg-base-100 text-base-content/35 opacity-100 shadow-none';
      case 'Dado de baja':
        return 'checkbox checkbox-sm hidden';
    }
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
    this.notifications.success({ message: 'Firma guardada correctamente.' });
    this.closeSignatureModal();
  }

  removeSignature() {
    this.signatureDraft.set(null);
    this.signatureDataUrl.set(null);
    this.notifications.info({ message: 'Firma eliminada.' });
  }

  openQrScanner() {
    this.assetLookupError.set('');
    this.isQrScannerOpen.set(true);
  }

  closeQrScanner() {
    this.isQrScannerOpen.set(false);
  }

  onQrCodeDetected(rawCode: string) {
    this.closeQrScanner();
    void this.lookupAndAddAsset(rawCode, { openDropdownOnFailure: false });
  }

  openDocumentPicker() {
    this.documentPickerInput()?.nativeElement.click();
  }

  openAttachmentSourceModal() {
    this.isAttachmentSourceModalOpen.set(true);
  }

  closeAttachmentSourceModal() {
    this.isAttachmentSourceModalOpen.set(false);
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
      this.closeAttachmentSourceModal();
      return;
    }

    const files = Array.from(fileList);
    input.value = '';

    try {
      this.processSelectedFiles(files, source);
    } catch {
      this.attachmentFeedback.set(
        'No se pudo procesar el archivo seleccionado. Intente nuevamente o seleccione otro archivo.',
      );
    } finally {
      this.closeAttachmentSourceModal();
    }
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
    this.notifications.info({ message: 'Archivo adjunto eliminado.' });
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
    switch (source) {
      case 'camera':
        return 'Cámara';
      case 'gallery':
        return 'Galería';
      case 'files':
        return 'Archivos';
      default:
        return 'Archivo';
    }
  }

  ngOnDestroy() {
    document.body.classList.remove(this.modalScrollLockClass);

    for (const attachment of this.attachments()) {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
  }

  onCancel() {
    this.router.navigate(['/loans']);
  }

  async onSubmit() {
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

    try {
      const createdLoan = await firstValueFrom(
        this.loansService.create(
          this.buildLoanSubmissionPayload(),
          this.signatureDataUrlToBlob(this.signatureDataUrl()),
          this.attachments().map((attachment) => attachment.file),
        ),
      );
      this.notifications.success({ message: 'Préstamo registrado correctamente.' });
      await this.router.navigate(['/loans', createdLoan.id]);
    } catch (error) {
      this.notifications.error({
        message: this.resolveLoanCreationErrorMessage(error),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resolveLoanCreationErrorMessage(error: unknown): string {
    if (this.loansService.isCollectionEndpointMissing(error)) {
      return 'El módulo de préstamos aún no está disponible en la API; no se guardó información local.';
    }

    if (this.loansService.isPayloadTooLarge(error)) {
      return 'Los archivos adjuntos exceden el tamaño máximo permitido para registrar el préstamo.';
    }

    if (this.loansService.isUnauthorizedOrForbidden(error)) {
      return 'No tiene permisos para registrar préstamos o su sesión ya no es válida.';
    }

    if (this.loansService.isValidationError(error)) {
      return (
        this.loansService.getApiErrorMessage(error) ??
        'La información del préstamo no pasó las validaciones del servidor.'
      );
    }

    return 'No se pudo registrar el préstamo. Intente nuevamente.';
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
    const isSupportedImage = this.isSupportedImage(file.type, extension);
    const isSupportedDocument = this.isSupportedDocument(file.type, extension);

    if (!isSupportedImage && !isSupportedDocument) {
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
    const randomId = this.createClientId();
    return `attachment-${randomId}-${file.lastModified}`;
  }

  private createClientId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private buildInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private getFileExtension(fileName: string): string {
    const segments = fileName.toLowerCase().split('.');
    return segments.at(-1) ?? '';
  }

  private isSupportedDocument(mimeType: string, extension: string): boolean {
    return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) || ALLOWED_DOCUMENT_EXTENSIONS.has(extension);
  }

  private isSupportedImage(mimeType: string, extension: string): boolean {
    return mimeType.startsWith('image/') || ALLOWED_IMAGE_EXTENSIONS.has(extension);
  }

  private isAssetSearchOptionSelectable(asset: AssetSearchOption): boolean {
    return asset.availableForLoan && (asset.condition === 'Bueno' || asset.condition === 'Regular');
  }

  private isAssetVisibleInSearchModal(asset: AssetOption): boolean {
    return asset.availableForLoan && (asset.condition === 'Bueno' || asset.condition === 'Regular');
  }

  private isAssetSearchOptionCurrentlyAvailable(asset: AssetSearchOption): boolean {
    return this.isAssetSearchOptionSelectable(asset) && !this.isModalAssetAlreadyAdded(asset.id);
  }

  private async lookupAndAddAsset(
    rawValue: string,
    options: { openDropdownOnFailure: boolean },
  ): Promise<boolean> {
    const normalizedQuery = rawValue.toLowerCase().trim();

    if (!normalizedQuery) {
      return false;
    }

    try {
      const asset = await firstValueFrom(this.assetsService.lookupByScanValue(rawValue));
      return this.tryAddResolvedAsset(asset, options);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.assetLookupError.set('No se encontró un activo disponible con ese código o QR.');
      } else {
        this.assetLookupError.set('No se pudo resolver el activo escaneado. Intente nuevamente.');
      }

      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }
  }

  private tryAddResolvedAsset(
    asset: InventoryAsset,
    options: { openDropdownOnFailure: boolean },
  ): boolean {
    const duplicateAsset = this.selectedAssets().find(
      (selectedAsset) => selectedAsset.code.toLowerCase() === asset.code.toLowerCase(),
    );

    if (duplicateAsset) {
      this.assetLookupError.set('El activo ya fue agregado a este préstamo.');
      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }

    const assetOption = this.availableAssets().find((item) => item.id === asset.id);
    if (!assetOption) {
      this.assetLookupError.set('El activo escaneado no está disponible en el inventario cargado.');
      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }

    if (!this.isAssetSearchOptionSelectable(assetOption)) {
      const message = assetOption.activeLoanId
        ? 'El activo ya pertenece a un préstamo activo.'
        : `El activo no está disponible para préstamo por su estado actual: ${assetOption.condition}.`;
      this.assetLookupError.set(message);
      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }

    this.addAsset(assetOption);
    return true;
  }

  private buildLoanSubmissionPayload() {
    return {
      teacherId: this.selectedTeacher()?.id ?? '',
      destinationLocationId: this.form.controls.destinationId.value,
      loanDate: this.form.controls.startDate.value,
      dueDate: this.form.controls.dueDate.value,
      notes: this.form.controls.notes.value || null,
      assetIds: this.selectedAssets().map((asset) => asset.id),
      attachmentSources: this.attachments().map((attachment) => attachment.source),
    };
  }

  private signatureDataUrlToBlob(dataUrl: string | null): Blob | null {
    if (!dataUrl) {
      return null;
    }

    const [metadata, content] = dataUrl.split(',');
    if (!metadata || !content) {
      return null;
    }

    const mimeType = metadata.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }
}
