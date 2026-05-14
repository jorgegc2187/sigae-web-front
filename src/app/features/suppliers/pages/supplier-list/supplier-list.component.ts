import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { MOCK_SUPPLIERS } from '../../../inventory/data/inventory.mock';
import { Supplier } from '../../models/supplier.model';

type SupplierDraft = { name: string; ruc: string; email: string; phone: string; address: string };

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [FormsModule, ActionButtonComponent, DataListingComponent, SearchInputComponent, StatusBadgeComponent],
  templateUrl: './supplier-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierListComponent {
  private readonly notifications = inject(NotificationService);

  readonly suppliers = signal<Supplier[]>(
    MOCK_SUPPLIERS.map((supplier, index) => ({
      ...supplier,
      email: `contacto${index + 1}@proveedor.edu.pe`,
      phone: `999 000 00${index + 1}`,
      address: 'Lima, Perú',
      assetsCount: index + 2,
    })),
  );
  readonly query = signal('');
  readonly isModalOpen = signal(false);
  readonly editingSupplierId = signal<string | null>(null);
  readonly draft = signal<SupplierDraft>({ name: '', ruc: '', email: '', phone: '', address: '' });

  readonly filteredSuppliers = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.suppliers().filter((supplier) =>
      !query || [supplier.name, supplier.ruc, supplier.email].some((value) => value?.toLowerCase().includes(query)),
    );
  });

  readonly resultLabel = computed(() => `Mostrando ${this.filteredSuppliers().length} proveedores`);

  openCreateModal(): void {
    this.editingSupplierId.set(null);
    this.draft.set({ name: '', ruc: '', email: '', phone: '', address: '' });
    this.isModalOpen.set(true);
  }

  openEditModal(supplier: Supplier): void {
    this.editingSupplierId.set(supplier.id);
    this.draft.set({
      name: supplier.name,
      ruc: supplier.ruc ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  updateDraft(field: keyof SupplierDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  saveSupplier(): void {
    const draft = this.draft();
    if (!draft.name.trim()) return;

    const editingId = this.editingSupplierId();
    if (editingId) {
      this.suppliers.update((items) =>
        items.map((item) => item.id === editingId ? { ...item, ...draft } : item),
      );
      this.notifications.success({ message: 'Proveedor actualizado correctamente.' });
    } else {
      this.suppliers.update((items) => [
        ...items,
        {
          id: `supplier-${Date.now()}`,
          ...draft,
          status: 'Activo',
          assetsCount: 0,
        },
      ]);
      this.notifications.success({ message: 'Proveedor registrado correctamente.' });
    }

    this.closeModal();
  }

  deactivate(supplier: Supplier): void {
    this.suppliers.update((items) =>
      items.map((item) => item.id === supplier.id ? { ...item, status: 'Inactivo' } : item),
    );
    this.notifications.info({ message: 'Proveedor desactivado.' });
  }
}
