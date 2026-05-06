import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoanSignaturePadComponent } from '../../components/loan-signature-pad/loan-signature-pad.component';

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
export class LoanFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly teacherSearchContainer = viewChild<ElementRef>('teacherSearchContainer');
  readonly locationSearchContainer = viewChild<ElementRef>('locationSearchContainer');
  readonly assetSearchContainer = viewChild<ElementRef>('assetSearchContainer');

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

  readonly selectedTeacher = signal<TeacherOption | null>(this.availableTeachers()[0] ?? null);
  readonly selectedDestination = signal<DestinationOption | null>(null);
  readonly selectedAssets = signal<AssetOption[]>([
    this.availableAssets()[0]!,
    this.availableAssets()[1]!,
    this.availableAssets()[2]!,
  ]);

  readonly teacherQuery = signal(this.selectedTeacher()?.name ?? '');
  readonly locationQuery = signal('');
  readonly assetQuery = signal('');
  readonly teacherDropdownOpen = signal(false);
  readonly locationDropdownOpen = signal(false);
  readonly assetDropdownOpen = signal(false);
  readonly showTeacherError = signal(false);
  readonly showAssetsError = signal(false);
  readonly assetLookupError = signal('');
  readonly isSubmitting = signal(false);
  readonly signatureDataUrl = signal<string | null>(null);

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

  onSignatureChange(signatureDataUrl: string | null) {
    this.signatureDataUrl.set(signatureDataUrl);
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

    console.log('Registrar préstamo', {
      teacher: this.selectedTeacher(),
      assets: this.selectedAssets(),
      form: this.form.getRawValue(),
      signatureDataUrl: this.signatureDataUrl(),
    });

    queueMicrotask(() => this.isSubmitting.set(false));
  }
}
