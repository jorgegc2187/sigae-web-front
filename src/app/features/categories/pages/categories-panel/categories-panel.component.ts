import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { MobilePaginationComponent } from '../../../../shared/ui/mobile-pagination/mobile-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { ToggleSwitchComponent } from '../../../../shared/ui/toggle-switch/toggle-switch.component';
import { inferAssetTypeIcon, inferCategoryIcon } from '../../../../shared/utils/icon-inference.util';
import { AssetType, Attribute, Category } from '../../models/category.model';
import { CategoriesService } from '../../services/categories.service';

type TypeFormMode = 'create' | 'edit';
type CategoryFormMode = 'create' | 'edit';
type CategoryFilterId = 'all' | string;

interface AttributeDraft {
  id: string;
  persistedId?: string;
  name: string;
  description: string;
  isRequired: boolean;
}

interface TypeFormDraft {
  id: string | null;
  name: string;
  categoryId: string;
  attributes: AttributeDraft[];
}

interface TypeListEntry {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: AssetType;
}

interface AttributesModalContext {
  categoryId: string;
  typeId: string;
}

interface CategoryFormDraft {
  id: string | null;
  name: string;
}

interface DeleteTarget {
  type: 'category' | 'assetType';
  id: string;
  categoryId?: string;
  label: string;
}

@Component({
  selector: 'app-categories-panel',
  imports: [
    FormsModule,
    ActionButtonComponent,
    DesktopPaginationComponent,
    SearchInputComponent,
    FormFieldComponent,
    MobilePaginationComponent,
    ToggleSwitchComponent,
  ],
  templateUrl: './categories-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPanelComponent {
  private readonly notifications = inject(NotificationService);
  private readonly categoriesService = inject(CategoriesService);

  private readonly categoryDialog = viewChild<ElementRef<HTMLDialogElement>>('categoryDialog');
  private readonly typeDialog = viewChild<ElementRef<HTMLDialogElement>>('typeDialog');
  private readonly attributesDialog = viewChild<ElementRef<HTMLDialogElement>>('attributesDialog');
  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly categoriesResource = this.categoriesService.listResource();
  private readonly desktopPageSize = 10;
  private readonly mobilePageSize = 4;

  readonly activeCategoryFilterId = signal<CategoryFilterId>('all');
  readonly typeSearchQuery = signal('');
  readonly desktopCurrentPage = signal(1);
  readonly mobileCurrentPage = signal(1);

  readonly categoryFormMode = signal<CategoryFormMode>('create');
  readonly categoryFormDraft = signal<CategoryFormDraft>(this.createEmptyCategoryDraft());
  readonly typeFormMode = signal<TypeFormMode>('create');
  readonly typeFormOriginCategoryId = signal<string | null>(null);
  readonly typeFormDraft = signal<TypeFormDraft>(this.createEmptyTypeDraft());
  readonly attributesModalContext = signal<AttributesModalContext | null>(null);
  readonly deleteTarget = signal<DeleteTarget | null>(null);

  readonly categories = computed(() => this.categoriesResource.value());
  readonly categoriesWithMetrics = computed(() =>
    this.categories().map((category) => ({
      ...category,
      typesCount: category.types.length,
      assetsCount: category.assetsCount,
    })),
  );

  readonly categoryFilters = computed(() => [
    {
      id: 'all' as const,
      name: 'Todos',
      icon: 'grid_view',
      typesCount: this.categoriesWithMetrics().reduce((total, category) => total + category.types.length, 0),
      assetsCount: this.categoriesWithMetrics().reduce((total, category) => total + category.assetsCount, 0),
      types: [],
    },
    ...this.categoriesWithMetrics(),
  ]);

  readonly selectedCategory = computed(() => {
    const categoryId = this.activeCategoryFilterId();
    return categoryId === 'all'
      ? null
      : this.categoriesWithMetrics().find((category) => category.id === categoryId) ?? null;
  });

  readonly isGlobalSearchActive = computed(() => this.typeSearchQuery().trim().length > 0);

  readonly filteredTypeEntries = computed<TypeListEntry[]>(() => {
    const query = this.typeSearchQuery().trim().toLowerCase();
    const activeFilter = this.activeCategoryFilterId();
    const matchingEntries = this.categoriesWithMetrics().flatMap((category) =>
      category.types
        .filter((type) => {
          const matchesTypeName = type.name.toLowerCase().includes(query);
          const matchesCategoryName = category.name.toLowerCase().includes(query);
          const matchesAttributes = type.attributes.some((attribute) =>
            attribute.name.toLowerCase().includes(query),
          );
          return matchesTypeName || matchesCategoryName || matchesAttributes;
        })
        .map((type) => ({
          categoryId: category.id,
          categoryName: category.name,
          categoryIcon: category.icon,
          type,
        })),
    );

    if (query || activeFilter === 'all') {
      return matchingEntries;
    }

    return matchingEntries.filter((entry) => entry.categoryId === activeFilter);
  });

  readonly visibleTypeEntries = computed<TypeListEntry[]>(() => this.filteredTypeEntries());
  readonly desktopTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredTypeEntries().length / this.desktopPageSize)));
  readonly desktopVisibleTypeEntries = computed<TypeListEntry[]>(() => {
    const page = Math.min(this.desktopCurrentPage(), this.desktopTotalPages());
    return this.filteredTypeEntries().slice((page - 1) * this.desktopPageSize, page * this.desktopPageSize);
  });
  readonly desktopStartItem = computed(() =>
    this.filteredTypeEntries().length === 0
      ? 0
      : (Math.min(this.desktopCurrentPage(), this.desktopTotalPages()) - 1) * this.desktopPageSize + 1,
  );
  readonly desktopEndItem = computed(() =>
    this.filteredTypeEntries().length === 0
      ? 0
      : Math.min(this.desktopStartItem() + this.desktopVisibleTypeEntries().length - 1, this.filteredTypeEntries().length),
  );
  readonly desktopResultLabel = computed(
    () => `Mostrando ${this.desktopStartItem()}-${this.desktopEndItem()} de ${this.filteredTypeEntries().length} tipos`,
  );
  readonly mobileTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredTypeEntries().length / this.mobilePageSize)));
  readonly mobileVisibleTypeEntries = computed<TypeListEntry[]>(() => {
    const page = Math.min(this.mobileCurrentPage(), this.mobileTotalPages());
    return this.filteredTypeEntries().slice((page - 1) * this.mobilePageSize, page * this.mobilePageSize);
  });
  readonly mobilePageLabel = computed(() => `${Math.min(this.mobileCurrentPage(), this.mobileTotalPages())} de ${this.mobileTotalPages()}`);

  readonly currentAttributesEntry = computed<TypeListEntry | null>(() => {
    const context = this.attributesModalContext();
    const category = context ? this.categoriesWithMetrics().find((item) => item.id === context.categoryId) : null;
    const type = category?.types.find((item) => item.id === context?.typeId);
    return category && type
      ? { categoryId: category.id, categoryName: category.name, categoryIcon: category.icon, type }
      : null;
  });

  readonly typeFormTitle = computed(() => (this.typeFormMode() === 'edit' ? 'Editar tipo de activo' : 'Nuevo tipo de activo'));
  readonly typeFormSubmitLabel = computed(() => (this.typeFormMode() === 'edit' ? 'Guardar cambios' : 'Crear Tipo'));
  readonly typeSearchEmptyMessage = computed(() =>
    this.isGlobalSearchActive()
      ? 'No se encontraron tipos que coincidan con la búsqueda.'
      : this.activeCategoryFilterId() === 'all'
        ? 'No hay tipos de activos configurados todavía.'
        : 'No hay tipos de activos configurados para esta categoría.',
  );
  readonly categoryFormTitle = computed(() => (this.categoryFormMode() === 'edit' ? 'Editar Categoría' : 'Nueva Categoría'));
  readonly categoryFormSubmitLabel = computed(() => (this.categoryFormMode() === 'edit' ? 'Guardar cambios' : 'Crear Categoría'));
  readonly deleteDialogTitle = computed(() => (this.deleteTarget()?.type === 'category' ? 'Eliminar categoría' : 'Eliminar tipo de activo'));
  readonly deleteDialogMessage = computed(() => {
    const target = this.deleteTarget();
    if (!target) return '';
    return target.type === 'category'
      ? `Se eliminará la categoría "${target.label}" con todos sus tipos asociados. Esta acción no se puede deshacer.`
      : `Se eliminará el tipo de activo "${target.label}". Esta acción no se puede deshacer.`;
  });

  setActiveCategoryFilter(categoryId: CategoryFilterId) {
    this.activeCategoryFilterId.set(categoryId);
    this.resetPagination();
  }

  onTypeSearch(query: string) {
    this.typeSearchQuery.set(query);
    this.resetPagination();
  }

  onMobileSearchInput(event: Event) {
    this.onTypeSearch((event.target as HTMLInputElement).value);
  }

  categoryFilterItemClass(categoryId: CategoryFilterId): string {
    const stateClass = this.activeCategoryFilterId() === categoryId ? 'border-primary/15 bg-primary/10 shadow-sm' : 'border-transparent hover:bg-base-200/55';
    return `group relative flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all ${stateClass}`;
  }

  categoryFilterIconClass(categoryId: CategoryFilterId): string {
    const stateClass = this.activeCategoryFilterId() === categoryId ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200 text-base-content/55 group-hover:bg-base-300';
    return `flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${stateClass}`;
  }

  categoryFilterLabelClass(categoryId: CategoryFilterId): string {
    const stateClass = this.activeCategoryFilterId() === categoryId ? 'text-primary' : 'text-base-content group-hover:text-primary';
    return `block truncate text-sm font-semibold transition-colors ${stateClass}`;
  }

  categoryFilterChevronClass(categoryId: CategoryFilterId): string {
    return `material-symbols-outlined transition-colors ${this.activeCategoryFilterId() === categoryId ? 'text-primary' : 'text-base-content/35'}`;
  }

  mobileCategoryFilterClass(categoryId: CategoryFilterId): string {
    const stateClass = this.activeCategoryFilterId() === categoryId
      ? 'border-primary bg-primary text-primary-content shadow-sm'
      : 'border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200/60';
    return `flex-none whitespace-nowrap rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors ${stateClass}`;
  }

  attributeRequiredBadgeClass(isRequired: boolean): string {
    return `inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
      isRequired ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/60'
    }`;
  }

  onDesktopPageChange(page: number) {
    this.desktopCurrentPage.set(page);
  }

  onMobilePageChange(page: number) {
    this.mobileCurrentPage.set(page);
  }

  openCategoryModal() {
    this.categoryFormMode.set('create');
    this.categoryFormDraft.set(this.createEmptyCategoryDraft());
    this.categoryDialog()?.nativeElement.showModal();
  }

  openEditCategoryModal(category: Category) {
    this.categoryFormMode.set('edit');
    this.categoryFormDraft.set({ id: category.id, name: category.name });
    this.categoryDialog()?.nativeElement.showModal();
  }

  closeCategoryModal() {
    this.categoryDialog()?.nativeElement.close();
  }

  async submitCategory() {
    const draft = this.categoryFormDraft();
    const name = draft.name.trim();
    if (!name) return;

    try {
      const payload = { name, icon: inferCategoryIcon(name) };
      const category = draft.id
        ? await firstValueFrom(this.categoriesService.updateCategory(draft.id, payload))
        : await firstValueFrom(this.categoriesService.createCategory(payload));

      this.activeCategoryFilterId.set(category.id);
      this.categoriesResource.reload();
      this.notifications.success({ message: `Categoría "${name}" guardada correctamente.` });
      this.resetPagination();
      this.closeCategoryModal();
    } catch {
      this.notifications.error({ message: 'No se pudo guardar la categoría.' });
    }
  }

  openCreateTypeModal(categoryId?: string) {
    const targetCategoryId = categoryId ?? (this.activeCategoryFilterId() === 'all' ? this.categoriesWithMetrics()[0]?.id : this.activeCategoryFilterId()) ?? '';
    this.typeFormMode.set('create');
    this.typeFormOriginCategoryId.set(targetCategoryId);
    this.typeFormDraft.set(this.createEmptyTypeDraft(targetCategoryId));
    this.typeDialog()?.nativeElement.showModal();
  }

  openEditTypeModal(entry: TypeListEntry) {
    this.typeFormMode.set('edit');
    this.typeFormOriginCategoryId.set(entry.categoryId);
    this.typeFormDraft.set({
      id: entry.type.id,
      name: entry.type.name,
      categoryId: entry.categoryId,
      attributes: entry.type.attributes.map((attribute) => this.createAttributeDraft({
        persistedId: attribute.id,
        name: attribute.name,
        description: attribute.description,
        isRequired: attribute.isRequired,
      })),
    });
    this.typeDialog()?.nativeElement.showModal();
  }

  closeTypeModal() {
    this.typeDialog()?.nativeElement.close();
  }

  updateTypeDraftName(name: string) {
    this.typeFormDraft.update((draft) => ({ ...draft, name }));
  }

  updateCategoryDraftName(name: string) {
    this.categoryFormDraft.update((draft) => ({ ...draft, name }));
  }

  updateTypeDraftCategory(categoryId: string) {
    this.typeFormDraft.update((draft) => ({ ...draft, categoryId }));
  }

  addDraftAttribute() {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: [...draft.attributes, this.createAttributeDraft({ name: '', description: '', isRequired: false })],
    }));
  }

  updateDraftAttributeName(attributeId: string, name: string) {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: draft.attributes.map((attribute) => attribute.id === attributeId ? { ...attribute, name } : attribute),
    }));
  }

  toggleDraftAttributeRequired(attributeId: string) {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: draft.attributes.map((attribute) => attribute.id === attributeId ? { ...attribute, isRequired: !attribute.isRequired } : attribute),
    }));
  }

  removeDraftAttribute(attributeId: string) {
    this.typeFormDraft.update((draft) => {
      const attributes = draft.attributes.filter((attribute) => attribute.id !== attributeId);
      return {
        ...draft,
        attributes: attributes.length ? attributes : [this.createAttributeDraft({ name: '', description: '', isRequired: false })],
      };
    });
  }

  async submitTypeForm() {
    const draft = this.typeFormDraft();
    const typeName = draft.name.trim();
    if (!typeName || !draft.categoryId) return;

    const categoryName = this.categoriesWithMetrics().find((category) => category.id === draft.categoryId)?.name ?? '';
    const icon = inferAssetTypeIcon({ name: typeName, categoryId: draft.categoryId, categoryName });
    const attributes = this.normalizeDraftAttributes(draft.attributes);
    if (attributes.length === 0) {
      this.notifications.warning({ message: 'Agregue al menos un atributo con nombre.' });
      return;
    }

    try {
      if (this.typeFormMode() === 'edit' && draft.id) {
        await firstValueFrom(this.categoriesService.updateType(this.typeFormOriginCategoryId() ?? draft.categoryId, draft.id, {
          categoryId: draft.categoryId,
          name: typeName,
          icon,
          attributes,
        }));
      } else {
        await firstValueFrom(this.categoriesService.createType(draft.categoryId, { name: typeName, icon, attributes }));
      }

      this.activeCategoryFilterId.set(draft.categoryId);
      this.categoriesResource.reload();
      this.notifications.success({ message: `Tipo "${typeName}" guardado correctamente.` });
      this.resetPagination();
      this.closeTypeModal();
    } catch {
      this.notifications.error({ message: 'No se pudo guardar el tipo de activo.' });
    }
  }

  openAttributesModal(entry: TypeListEntry) {
    this.attributesModalContext.set({ categoryId: entry.categoryId, typeId: entry.type.id });
    this.attributesDialog()?.nativeElement.showModal();
  }

  openDeleteCategoryDialog(category: Category) {
    this.deleteTarget.set({ type: 'category', id: category.id, label: category.name });
    this.deleteDialog()?.nativeElement.showModal();
  }

  openDeleteTypeDialog(entry: TypeListEntry) {
    this.deleteTarget.set({ type: 'assetType', id: entry.type.id, categoryId: entry.categoryId, label: entry.type.name });
    this.deleteDialog()?.nativeElement.showModal();
  }

  async confirmDeleteTarget() {
    const target = this.deleteTarget();
    if (!target) return;

    try {
      if (target.type === 'category') {
        await firstValueFrom(this.categoriesService.deleteCategory(target.id));
        this.activeCategoryFilterId.set('all');
      } else if (target.categoryId) {
        await firstValueFrom(this.categoriesService.deleteType(target.categoryId, target.id));
      }

      this.categoriesResource.reload();
      this.notifications.success({ message: `"${target.label}" eliminado correctamente.` });
      this.resetPagination();
      this.deleteDialog()?.nativeElement.close();
    } catch {
      this.notifications.error({ message: 'No se pudo eliminar el registro.' });
    }
  }

  onCategoryDialogClose() {
    this.categoryFormDraft.set(this.createEmptyCategoryDraft());
  }

  onTypeDialogClose() {
    this.typeFormDraft.set(this.createEmptyTypeDraft());
    this.typeFormOriginCategoryId.set(null);
  }

  onAttributesDialogClose() {
    this.attributesModalContext.set(null);
  }

  onDeleteDialogClose() {
    this.deleteTarget.set(null);
  }

  private resetPagination() {
    this.desktopCurrentPage.set(1);
    this.mobileCurrentPage.set(1);
  }

  private createEmptyCategoryDraft(): CategoryFormDraft {
    return { id: null, name: '' };
  }

  private createEmptyTypeDraft(categoryId = ''): TypeFormDraft {
    return {
      id: null,
      name: '',
      categoryId,
      attributes: [this.createAttributeDraft({ name: '', description: '', isRequired: false })],
    };
  }

  private createAttributeDraft(params: {
    persistedId?: string;
    name: string;
    description: string;
    isRequired: boolean;
  }): AttributeDraft {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      persistedId: params.persistedId,
      name: params.name,
      description: params.description,
      isRequired: params.isRequired,
    };
  }

  private normalizeDraftAttributes(attributes: AttributeDraft[]): Attribute[] {
    return attributes
      .map((attribute) => ({
        id: attribute.persistedId ?? attribute.id,
        name: attribute.name.trim(),
        description: attribute.description.trim() || 'Sin descripción',
        isRequired: attribute.isRequired,
      }))
      .filter((attribute) => attribute.name.length > 0);
  }
}
