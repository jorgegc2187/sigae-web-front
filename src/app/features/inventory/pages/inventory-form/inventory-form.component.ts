import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { CategoriesService } from '../../../categories/services/categories.service';
import { LocationsService } from '../../../locations/services/locations.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { AssetCondition, InventoryAsset } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-inventory-form',
  imports: [ReactiveFormsModule, RouterLink, ActionButtonComponent, FormFieldComponent, SelectFieldComponent],
  templateUrl: './inventory-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly assetsService = inject(AssetsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly locationsService = inject(LocationsService);
  private readonly suppliersService = inject(SuppliersService);

  readonly id = input<string | null>(null);
  readonly existingAsset = signal<InventoryAsset | null>(null);
  readonly isEdit = computed(() => Boolean(this.existingAsset()));
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly locations = toSignal(this.locationsService.list('ACTIVE'), { initialValue: [] });
  readonly suppliers = toSignal(this.suppliersService.list(), { initialValue: [] });
  readonly selectedCategoryId = signal('');

  readonly availableTypes = computed(() =>
    this.categories().find((category) => category.id === this.selectedCategoryId())?.types ?? [],
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

  readonly form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    categoryId: this.fb.control<string>('', Validators.required),
    typeId: this.fb.control<string>('', Validators.required),
    locationId: this.fb.control<string>('', Validators.required),
    supplierId: [''],
    condition: this.fb.control<AssetCondition>('Bueno', Validators.required),
    serial: ['', Validators.required],
    barcode: [''],
    acquisitionDate: [''],
    observations: [''],
  });

  constructor() {
    effect(() => {
      const categories = this.categories();
      const locations = this.locations();
      if (!this.form.controls.categoryId.value && categories[0]) {
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

    queueMicrotask(() => {
      void this.loadExistingAsset();
    });
  }

  updateCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.form.patchValue({
      categoryId,
      typeId: this.categories().find((category) => category.id === categoryId)?.types[0]?.id ?? '',
    });
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload = {
      code: value.code,
      name: value.name,
      assetTypeId: value.typeId,
      locationId: value.locationId,
      supplierId: value.supplierId || null,
      condition: this.assetsService.toApiCondition(value.condition),
      serialNumber: value.serial || null,
      barcode: value.barcode || null,
      acquisitionDate: value.acquisitionDate || null,
      notes: value.observations || null,
      attributeValues: [],
    };

    try {
      const id = this.id();
      if (id) {
        await firstValueFrom(this.assetsService.update(id, payload));
      } else {
        await firstValueFrom(this.assetsService.create(payload));
      }

      this.notifications.success({
        message: this.isEdit() ? 'Activo actualizado correctamente.' : 'Activo registrado correctamente.',
      });
      await this.router.navigate(['/inventory']);
    } catch {
      this.notifications.error({ message: 'No se pudo guardar el activo.' });
    }
  }

  private async loadExistingAsset(): Promise<void> {
    const id = this.id();
    if (!id) return;

    try {
      const asset = await firstValueFrom(this.assetsService.getById(id));
      this.existingAsset.set(asset);
      this.selectedCategoryId.set(asset.categoryId);
      this.form.patchValue({
        code: asset.code,
        name: asset.name,
        categoryId: asset.categoryId,
        typeId: asset.typeId,
        locationId: asset.locationId,
        supplierId: asset.supplierId ?? '',
        condition: asset.condition,
        serial: asset.serial,
        barcode: asset.barcode,
        acquisitionDate: asset.acquisitionDate,
        observations: asset.observations ?? '',
      });
    } catch {
      this.notifications.error({ message: 'No se pudo cargar el activo.' });
    }
  }
}
