import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MOCK_ASSET_LOCATIONS, MOCK_CATEGORIES } from '../../../../shared/models/mock-inventory-catalog.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { INVENTORY_ASSETS, MOCK_SUPPLIERS } from '../../data/inventory.mock';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ActionButtonComponent, FormFieldComponent],
  templateUrl: './inventory-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly id = input<string | null>(null);
  readonly existingAsset = computed(() => INVENTORY_ASSETS.find((asset) => asset.id === this.id()) ?? null);
  readonly isEdit = computed(() => Boolean(this.existingAsset()));
  readonly categories = MOCK_CATEGORIES;
  readonly locations = MOCK_ASSET_LOCATIONS;
  readonly suppliers = MOCK_SUPPLIERS;
  readonly selectedCategoryId = signal(MOCK_CATEGORIES[0]?.id ?? '');

  readonly availableTypes = computed(() =>
    this.categories.find((category) => category.id === this.selectedCategoryId())?.types ?? [],
  );

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    categoryId: this.fb.nonNullable.control<string>(MOCK_CATEGORIES[0]?.id ?? '', Validators.required),
    typeId: [MOCK_CATEGORIES[0]?.types[0]?.id ?? '', Validators.required],
    locationId: this.fb.nonNullable.control<string>(MOCK_ASSET_LOCATIONS[0]?.id ?? '', Validators.required),
    supplierId: [''],
    condition: ['Bueno', Validators.required],
    serial: ['', Validators.required],
    barcode: [''],
    acquisitionDate: [''],
    observations: [''],
  });

  constructor() {
    queueMicrotask(() => {
      const asset = this.existingAsset();
      if (!asset) return;

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
    });
  }

  updateCategory(event: Event): void {
    const categoryId = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(categoryId);
    this.form.patchValue({
      categoryId,
      typeId: this.categories.find((category) => category.id === categoryId)?.types[0]?.id ?? '',
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.notifications.success({
      message: this.isEdit() ? 'Activo actualizado correctamente.' : 'Activo registrado correctamente.',
    });
    this.router.navigate(['/inventory']);
  }
}
