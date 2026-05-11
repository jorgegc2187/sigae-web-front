import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchInputComponent } from '../../../../shared/ui/search-input/search-input.component';
import { AssetType, Attribute, Category, MOCK_CATEGORIES } from '../../models/category.model';

type TypeFormMode = 'create' | 'edit';

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

@Component({
  selector: 'app-categories-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchInputComponent],
  templateUrl: './categories-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPanelComponent {
  private readonly categoryDialog =
    viewChild<ElementRef<HTMLDialogElement>>('categoryDialog');
  private readonly typeDialog = viewChild<ElementRef<HTMLDialogElement>>('typeDialog');
  private readonly attributesDialog =
    viewChild<ElementRef<HTMLDialogElement>>('attributesDialog');

  private idSequence = 100;

  readonly categories = signal<Category[]>(this.cloneCategories(MOCK_CATEGORIES));
  readonly selectedCategoryId = signal<string | null>(this.categories()[0]?.id ?? null);
  readonly typeSearchQuery = signal('');

  readonly categoryDraftName = signal('');
  readonly typeFormMode = signal<TypeFormMode>('create');
  readonly typeFormOriginCategoryId = signal<string | null>(null);
  readonly typeFormDraft = signal<TypeFormDraft>(this.createEmptyTypeDraft());
  readonly attributesModalContext = signal<AttributesModalContext | null>(null);

  readonly categoriesWithMetrics = computed(() =>
    this.categories().map((category) => ({
      ...category,
      typesCount: category.types.length,
      assetsCount: category.assetsCount,
    })),
  );

  readonly selectedCategory = computed(() => {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      return null;
    }

    return this.categoriesWithMetrics().find((category) => category.id === categoryId) ?? null;
  });

  readonly isGlobalSearchActive = computed(() => this.typeSearchQuery().trim().length > 0);

  readonly visibleTypeEntries = computed<TypeListEntry[]>(() => {
    const query = this.typeSearchQuery().trim().toLowerCase();

    if (!query) {
      const category = this.selectedCategory();
      if (!category) {
        return [];
      }

      return category.types.map((type) => ({
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        type,
      }));
    }

    return this.categoriesWithMetrics().flatMap((category) =>
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
      : 'No hay tipos de activos configurados para esta categoría.',
  );

  selectCategory(categoryId: string) {
    this.selectedCategoryId.set(categoryId);
  }

  onTypeSearch(query: string) {
    this.typeSearchQuery.set(query);
  }

  openCategoryModal() {
    this.categoryDraftName.set('');
    this.categoryDialog()?.nativeElement.showModal();
  }

  closeCategoryModal() {
    this.categoryDialog()?.nativeElement.close();
  }

  submitCategory() {
    const name = this.categoryDraftName().trim();
    if (!name) {
      return;
    }

    const newCategory: Category = {
      id: this.createId('category'),
      name,
      icon: 'category',
      typesCount: 0,
      assetsCount: 0,
      types: [],
    };

    this.categories.update((categories) => [...categories, newCategory]);
    this.selectedCategoryId.set(newCategory.id);
    this.closeCategoryModal();
  }

  openCreateTypeModal(categoryId?: string) {
    const targetCategoryId =
      categoryId ?? this.selectedCategoryId() ?? this.categoriesWithMetrics()[0]?.id ?? '';

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
          isRequired: true,
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
    this.typeFormDraft.update((draft) => ({
      ...draft,
      attributes: draft.attributes.filter((attribute) => attribute.id !== attributeId),
    }));
  }

  submitTypeForm() {
    const draft = this.typeFormDraft();
    const typeName = draft.name.trim();
    const categoryId = draft.categoryId;

    if (!typeName || !categoryId) {
      return;
    }

    const attributes = this.normalizeDraftAttributes(draft.attributes);
    const icon =
      this.typeFormMode() === 'edit'
        ? this.findTypeById(draft.id ?? '', this.typeFormOriginCategoryId())?.icon ?? 'inventory_2'
        : 'inventory_2';

    const normalizedType: AssetType = {
      id: draft.id ?? this.createId('type'),
      name: typeName,
      icon,
      attributes,
    };

    this.categories.update((categories) => {
      const originCategoryId = this.typeFormOriginCategoryId();
      return categories.map((category) => {
        const isOriginCategory = category.id === originCategoryId;
        const isTargetCategory = category.id === categoryId;

        if (this.typeFormMode() === 'create') {
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

    this.selectedCategoryId.set(categoryId);
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
  }

  onDeleteAttribute(categoryId: string, typeId: string, attributeId: string) {
    this.updateType(categoryId, typeId, (type) => ({
      ...type,
      attributes: type.attributes.filter((attribute) => attribute.id !== attributeId),
    }));
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
    this.categoryDraftName.set('');
  }

  onTypeDialogClose() {
    const fallbackCategoryId =
      this.selectedCategoryId() ?? this.categoriesWithMetrics()[0]?.id ?? '';
    this.typeFormMode.set('create');
    this.typeFormOriginCategoryId.set(null);
    this.typeFormDraft.set(this.createEmptyTypeDraft(fallbackCategoryId));
  }

  onAttributesDialogClose() {
    this.attributesModalContext.set(null);
  }

  private normalizeDraftAttributes(attributes: AttributeDraft[]): Attribute[] {
    return attributes.map((attribute, index) => {
      const fallbackName = `Atributo ${index + 1}`;
      const name = attribute.name.trim() || fallbackName;
      const description = attribute.description.trim() || name;

      return {
        id: attribute.id || this.createId('attr'),
        name,
        description,
        isRequired: attribute.isRequired,
      };
    });
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

  private findTypeById(typeId: string, categoryId: string | null) {
    if (!typeId || !categoryId) {
      return null;
    }

    return (
      this.categories()
        .find((category) => category.id === categoryId)
        ?.types.find((type) => type.id === typeId) ?? null
    );
  }

  private syncCategoryMetrics(category: Category): Category {
    return {
      ...category,
      typesCount: category.types.length,
    };
  }

  private createEmptyTypeDraft(categoryId = ''): TypeFormDraft {
    return {
      id: null,
      name: '',
      categoryId,
      attributes: [
        this.createAttributeDraft({
          name: 'Marca',
          description: 'Marca',
          isRequired: true,
        }),
        this.createAttributeDraft({
          name: 'Modelo',
          description: 'Modelo',
          isRequired: true,
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
