import { CommonModule } from '@angular/common';
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
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { MOCK_CATEGORIES } from '../../../../shared/models/mock-inventory-catalog.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { inferAssetTypeIcon, inferCategoryIcon } from '../../../../shared/utils/icon-inference.util';
import { MobilePaginationComponent } from '../../../../shared/ui/mobile-pagination/mobile-pagination.component';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { AssetType, Attribute, Category } from '../../models/category.model';

type TypeFormMode = 'create' | 'edit';
type CategoryFormMode = 'create' | 'edit';
type CategoryFilterId = 'all' | string;

interface AttributeDraft {
  id: string;
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
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ActionButtonComponent,
    DesktopPaginationComponent,
    SearchInputComponent,
    FormFieldComponent,
    MobilePaginationComponent,
  ],
  templateUrl: './categories-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPanelComponent {
  private readonly notifications = inject(NotificationService);

  private readonly categoryDialog =
    viewChild<ElementRef<HTMLDialogElement>>('categoryDialog');
  private readonly typeDialog = viewChild<ElementRef<HTMLDialogElement>>('typeDialog');
  private readonly attributesDialog =
    viewChild<ElementRef<HTMLDialogElement>>('attributesDialog');
  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');

  private idSequence = 100;
  private readonly desktopPageSize = 10;
  private readonly mobilePageSize = 4;

  readonly categories = signal<Category[]>(this.cloneCategories(MOCK_CATEGORIES));
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
      assetsCount: this.categoriesWithMetrics().reduce(
        (total, category) => total + category.assetsCount,
        0,
      ),
    },
    ...this.categoriesWithMetrics(),
  ]);

  readonly selectedCategory = computed(() => {
    const categoryId = this.activeCategoryFilterId();
    if (categoryId === 'all') {
      return null;
    }

    return this.categoriesWithMetrics().find((category) => category.id === categoryId) ?? null;
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

    if (query) {
      return matchingEntries;
    }

    if (activeFilter === 'all') {
      return matchingEntries;
    }

    return matchingEntries.filter((entry) => entry.categoryId === activeFilter);
  });

  readonly visibleTypeEntries = computed<TypeListEntry[]>(() => this.filteredTypeEntries());

  readonly desktopTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTypeEntries().length / this.desktopPageSize)),
  );

  readonly desktopVisibleTypeEntries = computed<TypeListEntry[]>(() => {
    const page = Math.min(this.desktopCurrentPage(), this.desktopTotalPages());
    const startIndex = (page - 1) * this.desktopPageSize;

    return this.filteredTypeEntries().slice(startIndex, startIndex + this.desktopPageSize);
  });

  readonly desktopStartItem = computed(() => {
    if (this.filteredTypeEntries().length === 0) {
      return 0;
    }

    const page = Math.min(this.desktopCurrentPage(), this.desktopTotalPages());
    return (page - 1) * this.desktopPageSize + 1;
  });

  readonly desktopEndItem = computed(() => {
    if (this.filteredTypeEntries().length === 0) {
      return 0;
    }

    return Math.min(
      this.desktopStartItem() + this.desktopVisibleTypeEntries().length - 1,
      this.filteredTypeEntries().length,
    );
  });

  readonly desktopResultLabel = computed(
    () =>
      `Mostrando ${this.desktopStartItem()}-${this.desktopEndItem()} de ${this.filteredTypeEntries().length} tipos`,
  );

  readonly mobileTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTypeEntries().length / this.mobilePageSize)),
  );

  readonly mobileVisibleTypeEntries = computed<TypeListEntry[]>(() => {
    const page = Math.min(this.mobileCurrentPage(), this.mobileTotalPages());
    const startIndex = (page - 1) * this.mobilePageSize;

    return this.filteredTypeEntries().slice(startIndex, startIndex + this.mobilePageSize);
  });

  readonly currentAttributesEntry = computed<TypeListEntry | null>(() => {
    const context = this.attributesModalContext();
    if (!context) {
      return null;
    }

    const category = this.categoriesWithMetrics().find((item) => item.id === context.categoryId);
    const type = category?.types.find((item) => item.id === context.typeId);

    if (!category || !type) {
      return null;
    }

    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      type,
    };
  });

  readonly typeFormTitle = computed(() =>
    this.typeFormMode() === 'edit' ? 'Editar tipo de activo' : 'Nuevo tipo de activo',
  );

  readonly typeFormSubmitLabel = computed(() =>
    this.typeFormMode() === 'edit' ? 'Guardar cambios' : 'Crear Tipo',
  );

  readonly typeSearchEmptyMessage = computed(() =>
    this.isGlobalSearchActive()
      ? 'No se encontraron tipos que coincidan con la búsqueda.'
      : this.activeCategoryFilterId() === 'all'
        ? 'No hay tipos de activos configurados todavía.'
        : 'No hay tipos de activos configurados para esta categoría.',
  );

  readonly mobilePageLabel = computed(
    () => `${Math.min(this.mobileCurrentPage(), this.mobileTotalPages())} de ${this.mobileTotalPages()}`,
  );

  readonly categoryFormTitle = computed(() =>
    this.categoryFormMode() === 'edit' ? 'Editar Categoría' : 'Nueva Categoría',
  );

  readonly categoryFormSubmitLabel = computed(() =>
    this.categoryFormMode() === 'edit' ? 'Guardar cambios' : 'Crear Categoría',
  );

  readonly deleteDialogTitle = computed(() =>
    this.deleteTarget()?.type === 'category' ? 'Eliminar categoría' : 'Eliminar tipo de activo',
  );

  readonly deleteDialogMessage = computed(() => {
    const target = this.deleteTarget();
    if (!target) {
      return '';
    }

    return target.type === 'category'
      ? `Se eliminará la categoría "${target.label}" con todos sus tipos asociados. Esta acción no se puede deshacer.`
      : `Se eliminará el tipo de activo "${target.label}". Esta acción no se puede deshacer.`;
  });

  setActiveCategoryFilter(categoryId: CategoryFilterId) {
    this.activeCategoryFilterId.set(categoryId);
    this.desktopCurrentPage.set(1);
    this.mobileCurrentPage.set(1);
  }

  onTypeSearch(query: string) {
    this.typeSearchQuery.set(query);
    this.desktopCurrentPage.set(1);
    this.mobileCurrentPage.set(1);
  }

  onMobileSearchInput(event: Event) {
    this.onTypeSearch((event.target as HTMLInputElement).value);
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
    this.categoryFormDraft.set({
      id: category.id,
      name: category.name,
    });
    this.categoryDialog()?.nativeElement.showModal();
  }

  closeCategoryModal() {
    this.categoryDialog()?.nativeElement.close();
  }

  submitCategory() {
    const draft = this.categoryFormDraft();
    const name = draft.name.trim();
    if (!name) {
      return;
    }

    if (this.categoryFormMode() === 'edit' && draft.id) {
      this.categories.update((categories) =>
        categories.map((category) =>
          category.id === draft.id
            ? {
                ...category,
                name,
                icon: inferCategoryIcon(name),
              }
            : category,
        ),
      );
      this.activeCategoryFilterId.set(draft.id);
      this.notifications.success({ message: `Categoría "${name}" actualizada correctamente.` });
    } else {
      const newCategory: Category = {
        id: this.createId('category'),
        name,
        icon: inferCategoryIcon(name),
        typesCount: 0,
        assetsCount: 0,
        types: [],
      };

      this.categories.update((categories) => [...categories, newCategory]);
      this.activeCategoryFilterId.set(newCategory.id);
      this.notifications.success({ message: `Categoría "${name}" creada correctamente.` });
    }

    this.resetPagination();
    this.closeCategoryModal();
  }

  openCreateTypeModal(categoryId?: string) {
    const targetCategoryId =
      categoryId ??
      (this.activeCategoryFilterId() === 'all' ? this.categoriesWithMetrics()[0]?.id : this.activeCategoryFilterId()) ??
      '';

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
      attributes: entry.type.attributes.map((attribute) => ({
        id: attribute.id,
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
    this.typeFormDraft.update((draft) => ({
      ...draft,
      name,
    }));
  }

  updateCategoryDraftName(name: string) {
    this.categoryFormDraft.update((draft) => ({
      ...draft,
      name,
    }));
  }

  updateTypeDraftCategory(categoryId: string) {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      categoryId,
    }));
  }

  addDraftAttribute() {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: [
        ...draft.attributes,
        this.createAttributeDraft({
          name: '',
          description: '',
          isRequired: false,
        }),
      ],
    }));
  }

  updateDraftAttributeName(attributeId: string, name: string) {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: draft.attributes.map((attribute) =>
        attribute.id === attributeId ? { ...attribute, name } : attribute,
      ),
    }));
  }

  toggleDraftAttributeRequired(attributeId: string) {
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: draft.attributes.map((attribute) =>
        attribute.id === attributeId
          ? { ...attribute, isRequired: !attribute.isRequired }
          : attribute,
      ),
    }));
  }

  removeDraftAttribute(attributeId: string) {
    this.typeFormDraft.update((draft) => {
      const remainingAttributes = draft.attributes.filter(
        (attribute) => attribute.id !== attributeId,
      );

      return {
        ...draft,
        attributes:
          remainingAttributes.length > 0
            ? remainingAttributes
            : [this.createAttributeDraft({ name: '', description: '', isRequired: false })],
      };
    });
  }

  submitTypeForm() {
    const draft = this.typeFormDraft();
    const typeName = draft.name.trim();
    const categoryId = draft.categoryId;
    const isCreateMode = this.typeFormMode() === 'create';
    const originCategoryId = this.typeFormOriginCategoryId();
    const previousTypeId = draft.id;

    if (!typeName || !categoryId) {
      return;
    }

    const attributes = this.normalizeDraftAttributes(draft.attributes);
    const categoryName =
      this.categoriesWithMetrics().find((category) => category.id === categoryId)?.name ?? '';
    const icon = inferAssetTypeIcon({
      name: typeName,
      categoryId,
      categoryName,
    });

    const normalizedType: AssetType = {
      id: draft.id ?? this.createId('type'),
      name: typeName,
      icon,
      attributes,
    };

    this.categories.update((categories) => {
      return categories.map((category) => {
        const isOriginCategory = category.id === originCategoryId;
        const isTargetCategory = category.id === categoryId;

        if (isCreateMode) {
          if (!isTargetCategory) {
            return category;
          }

          return this.syncCategoryMetrics({
            ...category,
            types: [...category.types, normalizedType],
          });
        }

        if (!draft.id) {
          return category;
        }

        if (isOriginCategory && isTargetCategory) {
          return this.syncCategoryMetrics({
            ...category,
            types: category.types.map((type) => (type.id === draft.id ? normalizedType : type)),
          });
        }

        if (isOriginCategory) {
          return this.syncCategoryMetrics({
            ...category,
            types: category.types.filter((type) => type.id !== draft.id),
          });
        }

        if (isTargetCategory) {
          return this.syncCategoryMetrics({
            ...category,
            types: [...category.types, normalizedType],
          });
        }

        return category;
      });
    });

    if (isCreateMode && this.isGlobalSearchActive()) {
      this.typeSearchQuery.set('');
    }

    this.activeCategoryFilterId.set(categoryId);
    if (isCreateMode || originCategoryId !== categoryId) {
      this.goToTypeEntry(categoryId, normalizedType.id);
    } else if (previousTypeId === normalizedType.id) {
      this.clampDesktopPage();
      this.clampMobilePage();
    }
    this.notifications.success({
      message: isCreateMode
        ? `Tipo de activo "${typeName}" creado correctamente.`
        : `Tipo de activo "${typeName}" actualizado correctamente.`,
    });
    this.closeTypeModal();
  }

  openAttributesModal(entry: TypeListEntry) {
    this.attributesModalContext.set({
      categoryId: entry.categoryId,
      typeId: entry.type.id,
    });
    this.attributesDialog()?.nativeElement.showModal();
  }

  closeAttributesModal() {
    this.attributesDialog()?.nativeElement.close();
  }

  openDeleteCategoryDialog(category: Category) {
    this.deleteTarget.set({
      type: 'category',
      id: category.id,
      label: category.name,
    });
    this.deleteDialog()?.nativeElement.showModal();
  }

  openDeleteTypeDialog(entry: TypeListEntry) {
    this.deleteTarget.set({
      type: 'assetType',
      id: entry.type.id,
      categoryId: entry.categoryId,
      label: entry.type.name,
    });
    this.deleteDialog()?.nativeElement.showModal();
  }

  closeDeleteDialog() {
    this.deleteDialog()?.nativeElement.close();
  }

  confirmDeleteTarget() {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }

    if (target.type === 'category') {
      this.categories.update((categories) =>
        categories.filter((category) => category.id !== target.id),
      );

      if (this.activeCategoryFilterId() === target.id) {
        this.activeCategoryFilterId.set('all');
      }

      const attributesContext = this.attributesModalContext();
      if (attributesContext?.categoryId === target.id) {
        this.closeAttributesModal();
      }
      this.notifications.success({ message: `Categoría "${target.label}" eliminada correctamente.` });
    } else if (target.categoryId) {
      const attributesContext = this.attributesModalContext();
      if (
        attributesContext?.categoryId === target.categoryId &&
        attributesContext.typeId === target.id
      ) {
        this.closeAttributesModal();
      }

      this.categories.update((categories) =>
        categories.map((category) =>
          category.id === target.categoryId
            ? this.syncCategoryMetrics({
                ...category,
                types: category.types.filter((type) => type.id !== target.id),
              })
            : category,
          ),
      );
      this.notifications.success({
        message: `Tipo de activo "${target.label}" eliminado correctamente.`,
      });
    }

    this.clampDesktopPage();
    this.clampMobilePage();
    this.closeDeleteDialog();
  }

  addAttributeFromDetails() {
    const entry = this.currentAttributesEntry();
    if (!entry) {
      return;
    }

    const nextIndex = entry.type.attributes.length + 1;
    this.updateType(entry.categoryId, entry.type.id, (type) => ({
      ...type,
      attributes: [
        ...type.attributes,
        {
          id: this.createId('attr'),
          name: `Nuevo atributo ${nextIndex}`,
          description: 'Descripción pendiente',
          isRequired: false,
        },
      ],
    }));
    this.notifications.success({ message: 'Atributo agregado correctamente.' });
  }

  onToggleAttributeRequired(categoryId: string, typeId: string, attributeId: string) {
    this.updateType(categoryId, typeId, (type) => ({
      ...type,
      attributes: type.attributes.map((attribute) =>
        attribute.id === attributeId
          ? { ...attribute, isRequired: !attribute.isRequired }
          : attribute,
      ),
    }));
    this.notifications.success({ message: 'Atributo actualizado correctamente.' });
  }

  onDeleteAttribute(categoryId: string, typeId: string, attributeId: string) {
    this.updateType(categoryId, typeId, (type) => ({
      ...type,
      attributes: type.attributes.filter((attribute) => attribute.id !== attributeId),
    }));
    this.notifications.success({ message: 'Atributo eliminado correctamente.' });
  }

  getCategoryToneClasses(categoryId: string): string {
    switch (categoryId) {
      case '1':
        return 'bg-primary/10 text-primary';
      case '2':
        return 'bg-base-200 text-base-content/60';
      case '3':
        return 'bg-base-200 text-base-content/60';
      case '4':
        return 'bg-base-200 text-base-content/60';
      default:
        return 'bg-base-200 text-base-content/60';
    }
  }

  onCategoryDialogClose() {
    this.categoryFormMode.set('create');
    this.categoryFormDraft.set(this.createEmptyCategoryDraft());
  }

  onTypeDialogClose() {
    const fallbackCategoryId =
      (this.activeCategoryFilterId() === 'all'
        ? this.categoriesWithMetrics()[0]?.id
        : this.activeCategoryFilterId()) ??
      '';
    this.typeFormMode.set('create');
    this.typeFormOriginCategoryId.set(null);
    this.typeFormDraft.set(this.createEmptyTypeDraft(fallbackCategoryId));
  }

  onAttributesDialogClose() {
    this.attributesModalContext.set(null);
  }

  onDeleteDialogClose() {
    this.deleteTarget.set(null);
  }

  private normalizeDraftAttributes(attributes: AttributeDraft[]): Attribute[] {
    return attributes
      .map((attribute) => ({
        ...attribute,
        name: attribute.name.trim(),
        description: attribute.description.trim(),
      }))
      .filter((attribute) => attribute.name.length > 0)
      .map((attribute) => ({
        id: attribute.id || this.createId('attr'),
        name: attribute.name,
        description: attribute.description || attribute.name,
        isRequired: attribute.isRequired,
      }));
  }

  private updateType(
    categoryId: string,
    typeId: string,
    updater: (type: AssetType) => AssetType,
  ) {
    this.categories.update((categories) =>
      categories.map((category) => {
        if (category.id !== categoryId) {
          return category;
        }

        return this.syncCategoryMetrics({
          ...category,
          types: category.types.map((type) => (type.id === typeId ? updater(type) : type)),
        });
      }),
    );
  }

  private syncCategoryMetrics(category: Category): Category {
    return {
      ...category,
      typesCount: category.types.length,
    };
  }

  private createEmptyCategoryDraft(): CategoryFormDraft {
    return {
      id: null,
      name: '',
    };
  }

  private createEmptyTypeDraft(categoryId = ''): TypeFormDraft {
    return {
      id: null,
      name: '',
      categoryId,
      attributes: [
        this.createAttributeDraft({
          name: '',
          description: '',
          isRequired: false,
        }),
      ],
    };
  }

  private createAttributeDraft(partial: Partial<AttributeDraft>): AttributeDraft {
    return {
      id: partial.id ?? this.createId('draft-attr'),
      name: partial.name ?? '',
      description: partial.description ?? '',
      isRequired: partial.isRequired ?? false,
    };
  }

  private createId(prefix: string): string {
    this.idSequence += 1;
    return `${prefix}-${this.idSequence}`;
  }

  private resetPagination() {
    this.desktopCurrentPage.set(1);
    this.mobileCurrentPage.set(1);
  }

  private goToTypeEntry(categoryId: string, typeId: string) {
    const categoryEntries = this.filteredTypeEntries().filter((entry) => entry.categoryId === categoryId);
    const entryIndex = categoryEntries.findIndex((entry) => entry.type.id === typeId);

    if (entryIndex < 0) {
      this.clampDesktopPage();
      this.clampMobilePage();
      return;
    }

    this.desktopCurrentPage.set(Math.floor(entryIndex / this.desktopPageSize) + 1);
    this.mobileCurrentPage.set(Math.floor(entryIndex / this.mobilePageSize) + 1);
  }

  private clampDesktopPage() {
    this.desktopCurrentPage.set(Math.min(this.desktopCurrentPage(), this.desktopTotalPages()));
  }

  private clampMobilePage() {
    this.mobileCurrentPage.set(Math.min(this.mobileCurrentPage(), this.mobileTotalPages()));
  }

  private cloneCategories(categories: Category[]): Category[] {
    return categories.map((category) => ({
      ...category,
      types: category.types.map((type) => ({
        ...type,
        attributes: type.attributes.map((attribute) => ({ ...attribute })),
      })),
    }));
  }
}
