import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoanQrScannerComponent } from '../../components/loan-qr-scanner/loan-qr-scanner.component';
import { LoanSignaturePadComponent } from '../../components/loan-signature-pad/loan-signature-pad.component';
import { LoanAttachmentDraft, LoanAttachmentSource } from '../../models/loan-attachment-draft.model';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';

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

type AssetCategoryId = 'all' | 'technology' | 'furniture' | 'laboratory' | 'sports';
type AssetLocationId = 'all' | 'central-warehouse' | 'computer-lab' | 'classroom-101' | 'teachers-room';
type AssetCondition = 'Bueno' | 'Regular' | 'Malo' | 'Mantenimiento' | 'Dado de baja';

interface AssetOption {
  id: string;
  name: string;
  code: string;
  condition: AssetCondition;
}

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

interface AssetSearchMetadata {
  category: Exclude<AssetCategoryId, 'all'>;
  locationId: Exclude<AssetLocationId, 'all'>;
  groupKey: string;
  groupName: string;
  groupIcon: string;
  serial: string;
  location: string;
}

interface AssetSearchOption extends AssetOption, AssetSearchMetadata {}

interface AssetSearchGroup {
  key: string;
  name: string;
  icon: string;
  availableCount: number;
  assets: AssetSearchOption[];
}

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

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoanSignaturePadComponent,
    LoanQrScannerComponent,
    DatePickerComponent,
  ],
  templateUrl: './loan-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LoanFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly modalScrollLockClass = 'overflow-hidden';

  readonly teacherSearchContainer = viewChild<ElementRef>('teacherSearchContainer');
  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');
  readonly assetSearchContainer = viewChild<ElementRef>('assetSearchContainer');
  readonly signatureModal = viewChild<ElementRef<HTMLDialogElement>>('signatureModal');
  readonly signaturePad = viewChild<LoanSignaturePadComponent>('signaturePad');
  readonly documentPickerInput = viewChild<ElementRef<HTMLInputElement>>('documentPickerInput');

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
      condition: 'Mantenimiento',
    },
    {
      id: 'asset-6',
      name: 'Tablet Samsung Galaxy Tab A8',
      code: 'TAB-2024-008',
      condition: 'Bueno',
    },
    {
      id: 'asset-7',
      name: 'Monitor LG 24 Pulgadas',
      code: 'MON-2023-031',
      condition: 'Regular',
    },
    {
      id: 'asset-8',
      name: 'Micrófono Inalámbrico Shure',
      code: 'AUD-2022-019',
      condition: 'Bueno',
    },
    {
      id: 'asset-9',
      name: 'Extensión Eléctrica 10 Metros',
      code: 'ACC-2024-033',
      condition: 'Bueno',
    },
    {
      id: 'asset-10',
      name: 'Cámara Web Logitech C920',
      code: 'VID-2023-017',
      condition: 'Malo',
    },
    {
      id: 'asset-11',
      name: 'Router TP-Link Archer C80',
      code: 'NET-2024-005',
      condition: 'Bueno',
    },
    {
      id: 'asset-12',
      name: 'Impresora HP LaserJet Pro',
      code: 'IMP-2022-011',
      condition: 'Mantenimiento',
    },
    {
      id: 'asset-13',
      name: 'Puntero Láser Kensington',
      code: 'ACC-2023-076',
      condition: 'Bueno',
    },
    {
      id: 'asset-14',
      name: 'Switch de Red Cisco 24 Puertos',
      code: 'NET-2021-004',
      condition: 'Dado de baja',
    },
    {
      id: 'asset-15',
      name: 'Pantalla de Proyección Retráctil',
      code: 'PRY-2023-026',
      condition: 'Bueno',
    },
  ]);

  private readonly assetSearchMetadataById: Record<string, AssetSearchMetadata> = {
    'asset-1': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'laptop-lenovo-thinkpad',
      groupName: 'Laptop Lenovo ThinkPad',
      groupIcon: 'laptop_mac',
      serial: 'SN: LNV-T14-4587',
      location: 'Almacén Central',
    },
    'asset-2': {
      category: 'technology',
      locationId: 'computer-lab',
      groupKey: 'proyector-epson-powerlite',
      groupName: 'Proyector Epson PowerLite',
      groupIcon: 'videocam',
      serial: 'SN: EPS-PL-2022',
      location: 'Laboratorio de Cómputo',
    },
    'asset-3': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'accesorios-audiovisuales',
      groupName: 'Accesorios Audiovisuales',
      groupIcon: 'settings_input_hdmi',
      serial: 'SN: HDMI-5M-108',
      location: 'Almacén Central',
    },
    'asset-4': {
      category: 'technology',
      locationId: 'classroom-101',
      groupKey: 'perifericos-hp',
      groupName: 'Periféricos HP',
      groupIcon: 'mouse',
      serial: 'SN: HP-MSE-021',
      location: 'Aula 101 - Pabellón A',
    },
    'asset-5': {
      category: 'laboratory',
      locationId: 'teachers-room',
      groupKey: 'audio-portatil',
      groupName: 'Audio Portátil',
      groupIcon: 'speaker',
      serial: 'SN: JBL-AUD-014',
      location: 'Sala de Profesores',
    },
    'asset-6': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'tablets-samsung-galaxy',
      groupName: 'Tablets Samsung Galaxy',
      groupIcon: 'tablet_mac',
      serial: 'SN: SAM-TABA8-008',
      location: 'Almacén Central',
    },
    'asset-7': {
      category: 'technology',
      locationId: 'computer-lab',
      groupKey: 'monitores-lg',
      groupName: 'Monitores LG',
      groupIcon: 'desktop_windows',
      serial: 'SN: LG-MON-031',
      location: 'Laboratorio de Cómputo',
    },
    'asset-8': {
      category: 'laboratory',
      locationId: 'teachers-room',
      groupKey: 'microfonos-inalambricos',
      groupName: 'Micrófonos Inalámbricos',
      groupIcon: 'mic_external_on',
      serial: 'SN: SHR-MIC-019',
      location: 'Sala de Profesores',
    },
    'asset-9': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'accesorios-electricos',
      groupName: 'Accesorios Eléctricos',
      groupIcon: 'power',
      serial: 'SN: EXT-10M-033',
      location: 'Almacén Central',
    },
    'asset-10': {
      category: 'technology',
      locationId: 'computer-lab',
      groupKey: 'camaras-web-logitech',
      groupName: 'Cámaras Web Logitech',
      groupIcon: 'videocam',
      serial: 'SN: LOG-C920-017',
      location: 'Laboratorio de Cómputo',
    },
    'asset-11': {
      category: 'technology',
      locationId: 'classroom-101',
      groupKey: 'routers-tp-link',
      groupName: 'Routers TP-Link',
      groupIcon: 'router',
      serial: 'SN: TPL-C80-005',
      location: 'Aula 101 - Pabellón A',
    },
    'asset-12': {
      category: 'technology',
      locationId: 'teachers-room',
      groupKey: 'impresoras-hp-laserjet',
      groupName: 'Impresoras HP LaserJet',
      groupIcon: 'print',
      serial: 'SN: HP-LJ-011',
      location: 'Sala de Profesores',
    },
    'asset-13': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'punteros-laser',
      groupName: 'Punteros Láser',
      groupIcon: 'ads_click',
      serial: 'SN: KNS-LSR-076',
      location: 'Almacén Central',
    },
    'asset-14': {
      category: 'technology',
      locationId: 'computer-lab',
      groupKey: 'switches-cisco',
      groupName: 'Switches Cisco',
      groupIcon: 'hub',
      serial: 'SN: CSC-SW24-004',
      location: 'Laboratorio de Cómputo',
    },
    'asset-15': {
      category: 'technology',
      locationId: 'central-warehouse',
      groupKey: 'pantallas-proyeccion',
      groupName: 'Pantallas de Proyección',
      groupIcon: 'present_to_all',
      serial: 'SN: SCR-PRY-026',
      location: 'Almacén Central',
    },
  };

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
  readonly isAttachmentSourceModalOpen = signal(false);
  readonly isAssetSearchModalOpen = signal(false);
  readonly isQrScannerOpen = signal(false);
  readonly signatureDataUrl = signal<string | null>(null);
  readonly signatureDraft = signal<string | null>(null);
  readonly assetModalQuery = signal('');
  readonly selectedAssetCategory = signal<AssetCategoryId>('all');
  readonly selectedAssetLocation = signal<AssetLocationId>('all');
  readonly expandedAssetGroups = signal<Set<string>>(new Set(['laptop-lenovo-thinkpad']));
  readonly modalSelectedAssetIds = signal<Set<string>>(new Set());

  readonly form = this.fb.group({
      destinationId: ['', Validators.required],
      startDate: ['2026-05-03', Validators.required],
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

  readonly assetSearchOptions = computed<AssetSearchOption[]>(() =>
    this.availableAssets()
      .filter((asset) => asset.condition !== 'Dado de baja')
      .map((asset) => ({
        ...asset,
        ...this.assetSearchMetadataById[asset.id]!,
      })),
  );

  readonly assetCategoryOptions = computed<AssetCategoryOption[]>(() => {
    const assets = this.assetSearchOptions();

    return [
      { id: 'all', name: 'Todos', count: assets.length },
      {
        id: 'technology',
        name: 'Tecnología',
        count: assets.filter((asset) => asset.category === 'technology').length,
      },
      {
        id: 'furniture',
        name: 'Mobiliario',
        count: assets.filter((asset) => asset.category === 'furniture').length,
      },
      {
        id: 'laboratory',
        name: 'Laboratorio',
        count: assets.filter((asset) => asset.category === 'laboratory').length,
      },
      {
        id: 'sports',
        name: 'Deportes',
        count: assets.filter((asset) => asset.category === 'sports').length,
      },
    ];
  });

  readonly assetLocationOptions = computed<AssetLocationOption[]>(() => {
    const assets = this.assetSearchOptions();

    return [
      { id: 'all', name: 'Todos', count: assets.length },
      {
        id: 'central-warehouse',
        name: 'Almacén Central',
        count: assets.filter((asset) => asset.locationId === 'central-warehouse').length,
      },
      {
        id: 'computer-lab',
        name: 'Laboratorio de Cómputo',
        count: assets.filter((asset) => asset.locationId === 'computer-lab').length,
      },
      {
        id: 'classroom-101',
        name: 'Aula 101 - Pabellón A',
        count: assets.filter((asset) => asset.locationId === 'classroom-101').length,
      },
      {
        id: 'teachers-room',
        name: 'Sala de Profesores',
        count: assets.filter((asset) => asset.locationId === 'teachers-room').length,
      },
    ];
  });

  readonly filteredAssetGroups = computed<AssetSearchGroup[]>(() => {
    const selectedCategory = this.selectedAssetCategory();
    const selectedLocation = this.selectedAssetLocation();
    const query = this.assetModalQuery().trim().toLowerCase();
    const groups = new Map<string, AssetSearchGroup>();

    const assets = this.assetSearchOptions().filter((asset) => {
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
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
        group.availableCount += this.isAssetSearchOptionSelectable(asset) ? 1 : 0;
        continue;
      }

      groups.set(asset.groupKey, {
        key: asset.groupKey,
        name: asset.groupName,
        icon: asset.groupIcon,
        availableCount: this.isAssetSearchOptionSelectable(asset) ? 1 : 0,
        assets: [asset],
      });
    }

    return Array.from(groups.values());
  });

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
    this.form.controls['destinationId'].setValue('');
    this.form.controls['destinationId'].markAsUntouched();
    this.form.controls['destinationId'].updateValueAndValidity();
  }

  onLocationFocus() {
    this.locationDropdownOpen.set(true);
  }

  selectDestination(destination: DestinationOption) {
    this.selectedDestination.set(destination);
    this.locationQuery.set(destination.name);
    this.locationDropdownOpen.set(false);
    this.form.controls['destinationId'].setValue(destination.id);
    this.form.controls['destinationId'].markAsTouched();
    this.form.controls['destinationId'].updateValueAndValidity();
  }

  clearDestination() {
    this.selectedDestination.set(null);
    this.locationQuery.set('');
    this.locationDropdownOpen.set(true);
    this.form.controls['destinationId'].setValue('');
    this.form.controls['destinationId'].markAsUntouched();
    this.form.controls['destinationId'].updateValueAndValidity();
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
    const query = this.assetQuery();
    if (!query) {
      this.assetDropdownOpen.set(true);
      return;
    }
    this.resolveAssetCode(query, { openDropdownOnFailure: true });
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

  openAssetSearchModal() {
    this.assetModalQuery.set('');
    this.selectedAssetCategory.set('all');
    this.selectedAssetLocation.set('all');
    this.modalSelectedAssetIds.set(new Set());
    this.expandedAssetGroups.set(new Set(this.filteredAssetGroups().map((group) => group.key)));
    this.isAssetSearchModalOpen.set(true);
  }

  closeAssetSearchModal() {
    this.isAssetSearchModalOpen.set(false);
    this.assetModalQuery.set('');
    this.modalSelectedAssetIds.set(new Set());
  }

  setAssetCategory(categoryId: AssetCategoryId) {
    this.selectedAssetCategory.set(categoryId);
    this.expandedAssetGroups.set(new Set(this.filteredAssetGroups().map((group) => group.key)));
  }

  setAssetLocation(locationId: AssetLocationId) {
    this.selectedAssetLocation.set(locationId);
    this.expandedAssetGroups.set(new Set(this.filteredAssetGroups().map((group) => group.key)));
  }

  onAssetModalSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.assetModalQuery.set(value);
    this.expandedAssetGroups.set(new Set(this.filteredAssetGroups().map((group) => group.key)));
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
    const nextAssets = this.assetSearchOptions()
      .filter((asset) => selectedIds.has(asset.id) && !currentIds.has(asset.id))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        code: asset.code,
        condition: asset.condition,
      }));

    if (nextAssets.length > 0) {
      this.selectedAssets.update((assets) => [...assets, ...nextAssets]);
      this.showAssetsError.set(false);
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
    this.closeSignatureModal();
  }

  removeSignature() {
    this.signatureDraft.set(null);
    this.signatureDataUrl.set(null);
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
    this.resolveAssetCode(rawCode, { openDropdownOnFailure: false });
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
    return asset.condition === 'Bueno' || asset.condition === 'Regular';
  }

  private resolveAssetCode(
    rawValue: string,
    options: { openDropdownOnFailure: boolean },
  ): boolean {
    const normalizedQuery = rawValue.toLowerCase().trim();

    if (!normalizedQuery) {
      return false;
    }

    const duplicateAsset = this.selectedAssets().find(
      (asset) => asset.code.toLowerCase() === normalizedQuery,
    );

    if (duplicateAsset) {
      this.assetLookupError.set('El activo ya fue agregado a este préstamo.');
      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }

    const asset = this.availableAssets().find(
      (item) =>
        item.code.toLowerCase() === normalizedQuery ||
        item.name.toLowerCase() === normalizedQuery,
    );

    if (!asset) {
      this.assetLookupError.set('No se encontró un activo disponible con ese código o nombre.');
      this.assetDropdownOpen.set(options.openDropdownOnFailure);
      return false;
    }

    this.addAsset(asset);
    return true;
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
