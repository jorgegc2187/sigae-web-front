import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DataListingComponent } from '../../../../shared/ui/data-listing/data-listing.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { Supplier } from '../../models/supplier.model';
import { SuppliersService } from '../../services/suppliers.service';

type SupplierDraft = { name: string; ruc: string; email: string; phone: string; address: string };

@Component({
  selector: 'app-supplier-list',
  imports: [FormsModule, ActionButtonComponent, DataListingComponent, SearchInputComponent, StatusBadgeComponent],
  templateUrl: './supplier-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierListComponent {
  private readonly notifications = inject(NotificationService);
  private readonly suppliersService = inject(SuppliersService);

  readonly suppliers = toSignal(this.suppliersService.list(), { initialValue: [] });
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

  async saveSupplier(): Promise<void> {
    const draft = this.draft();
    if (!draft.name.trim()) return;

    const editingId = this.editingSupplierId();
    try {
      if (editingId) {
        await firstValueFrom(this.suppliersService.update(editingId, this.suppliersService.toRequest({ ...draft, status: 'Activo' })));
        this.notifications.success({ message: 'Proveedor actualizado correctamente.' });
      } else {
        await firstValueFrom(this.suppliersService.create(this.suppliersService.toRequest({ ...draft, status: 'Activo' })));
        this.notifications.success({ message: 'Proveedor registrado correctamente.' });
      }

      window.location.reload();
      this.closeModal();
    } catch {
      this.notifications.error({ message: 'No se pudo guardar el proveedor.' });
    }
  }

  async deactivate(supplier: Supplier): Promise<void> {
    try {
      await firstValueFrom(this.suppliersService.deactivate(supplier.id));
      window.location.reload();
      this.notifications.info({ message: 'Proveedor desactivado.' });
    } catch {
      this.notifications.error({ message: 'No se pudo desactivar el proveedor.' });
    }
  }
}
