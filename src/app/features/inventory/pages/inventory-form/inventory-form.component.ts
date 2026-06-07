import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  getControlErrorMessage,
  shouldShowControlError,
} from '../../../../shared/forms/validation-message.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { ProcessingLoaderComponent } from '../../../../shared/ui/processing-loader/processing-loader.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { CategoriesService } from '../../../categories/services/categories.service';
import { LocationsService } from '../../../locations/services/locations.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { AssetCondition, InventoryAsset } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

interface DynamicAttributeField {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  value: string;
}

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
  ],
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
  readonly isLoadingAsset = signal(false);
  readonly isSubmitting = signal(false);
  readonly showAttributeErrors = signal(false);
  readonly selectedCategoryId = signal('');
  readonly attributeValuesState = signal<Record<string, string>>({});
  readonly inputClass =
    'w-full border-0 bg-transparent p-0 text-sm text-base-content placeholder-shown:opacity-50 focus:outline-none';

  readonly isEdit = computed(() => Boolean(this.existingAsset()));
  readonly categories = toSignal(this.categoriesService.list(), { initialValue: [] });
  readonly locations = toSignal(this.locationsService.list('ACTIVE'), { initialValue: [] });
  readonly suppliers = toSignal(this.suppliersService.list(), { initialValue: [] });

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    categoryId: this.fb.control<string>('', Validators.required),
    typeId: this.fb.control<string>('', Validators.required),
    locationId: this.fb.control<string>('', Validators.required),
    supplierId: [''],
    condition: this.fb.control<AssetCondition>('Bueno', Validators.required),
    acquisitionDate: [''],
    observations: [''],
  });
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly selectedTypeId = toSignal(this.form.controls.typeId.valueChanges, {
    initialValue: this.form.controls.typeId.value,
  });

  readonly availableTypes = computed(() =>
    this.categories().find((category) => category.id === this.selectedCategoryId())?.types ?? [],
  );
  readonly currentType = computed(() =>
    this.availableTypes().find((type) => type.id === this.selectedTypeId()) ?? null,
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

  readonly isBusy = computed(() => this.isLoadingAsset() || this.isSubmitting());
  readonly breadcrumbLabel = computed(() => (this.isEdit() ? 'Editar activo' : 'Registrar activo'));
  readonly formTitle = computed(() => (this.isEdit() ? 'Editar activo' : 'Registrar activo'));
  readonly submitLabel = computed(() => (this.isEdit() ? 'Guardar cambios' : 'Guardar activo'));
  readonly loadingLabel = computed(() => (this.isEdit() ? 'Guardando cambios...' : 'Guardando activo...'));
  readonly blockingTitle = computed(() =>
    this.isLoadingAsset()
      ? 'Cargando activo'
      : this.isEdit()
        ? 'Guardando cambios'
        : 'Guardando activo',
  );
  readonly blockingDescription = computed(() =>
    this.isLoadingAsset()
      ? 'Estamos recuperando la información actual del activo.'
      : 'Estamos guardando la información y esperando la confirmación del servidor.',
  );
  readonly generatedCodeLabel = computed(() =>
    this.isEdit()
      ? this.existingAsset()?.code ?? ''
      : 'El código se generará automáticamente al guardar',
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
    });

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

    effect(() => {
      const attributeIds = this.currentTypeAttributes().map((attribute) => attribute.id);
      this.attributeValuesState.update((previous) =>
        Object.fromEntries(attributeIds.map((attributeId) => [attributeId, previous[attributeId] ?? ''])),
      );
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
      barcode: this.isEdit() ? this.existingAsset()?.barcode ?? null : null,
      acquisitionDate: value.acquisitionDate || null,
      notes: this.normalizeOptional(value.observations),
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

      if (id) {
        await firstValueFrom(this.assetsService.update(id, payload));
      } else {
        await firstValueFrom(this.assetsService.create(payload));
      }

      this.notifications.success({
        message: this.isEdit() ? 'Activo actualizado correctamente.' : 'Activo registrado correctamente.',
      });
      await this.router.navigate(['/inventory']);
    } catch (error: unknown) {
      this.notifications.error({
        message: this.getBackendMessage(error, 'No se pudo guardar el activo.'),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private hasInvalidDynamicAttributes(): boolean {
    return this.dynamicAttributes().some((attribute) => attribute.isRequired && !attribute.value.trim());
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
        Object.fromEntries(asset.attributeValues.map((attribute) => [attribute.attributeDefinitionId, attribute.value])),
      );
      this.form.patchValue({
        name: asset.name,
        categoryId: asset.categoryId,
        typeId: asset.typeId,
        locationId: asset.locationId,
        supplierId: asset.supplierId ?? '',
        condition: asset.condition,
        acquisitionDate: asset.acquisitionDate,
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

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private getBackendMessage(error: unknown, fallback: string): string {
    return typeof (error as { error?: { message?: unknown } })?.error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }
}
