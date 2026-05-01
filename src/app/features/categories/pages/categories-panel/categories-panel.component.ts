import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetType, Attribute, Category, MOCK_CATEGORIES } from '../../models/category.model';

@Component({
  selector: 'app-categories-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPanelComponent {
  // Estado
  categories = signal<Category[]>(MOCK_CATEGORIES);
  selectedCategoryId = signal<string | null>(this.categories()[0]?.id || null);
  categorySearchQuery = signal<string>('');
  
  // Estado visual
  expandedTypeIds = signal<Set<string>>(new Set(['t1'])); // Expandimos 't1' (Laptop) por defecto

  // Datos derivados
  filteredCategories = computed(() => {
    const query = this.categorySearchQuery().toLowerCase().trim();
    if (!query) return this.categories();
    return this.categories().filter(c => c.name.toLowerCase().includes(query));
  });

  selectedCategory = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return null;
    return this.categories().find(c => c.id === id) || null;
  });

  // Acciones de Categoría
  selectCategory(id: string) {
    this.selectedCategoryId.set(id);
    this.expandedTypeIds.set(new Set()); // Colapsar todos los tipos al cambiar de categoría
  }

  onCreateCategory() {
    console.log('Abrir modal para crear categoría');
  }

  // Acciones de Tipos de Activos
  toggleType(typeId: string) {
    this.expandedTypeIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(typeId)) {
        newSet.delete(typeId);
      } else {
        newSet.add(typeId);
      }
      return newSet;
    });
  }

  isTypeExpanded(typeId: string): boolean {
    return this.expandedTypeIds().has(typeId);
  }

  onCreateAssetType(category: Category) {
    console.log('Abrir modal para crear tipo en categoría:', category.name);
  }

  onEditAssetType(type: AssetType, event: Event) {
    event.stopPropagation(); // Evitar que el acordeón se active
    console.log('Editar tipo:', type.name);
  }

  onDeleteAssetType(type: AssetType, event: Event) {
    event.stopPropagation();
    console.log('Eliminar tipo:', type.name);
  }

  // Acciones de Atributos
  onToggleAttributeRequired(attribute: Attribute) {
    attribute.isRequired = !attribute.isRequired;
    console.log(`Atributo ${attribute.name} requerido: ${attribute.isRequired}`);
    // En una app real, aquí llamaríamos a un servicio para actualizar el backend
  }

  onAddAttribute(type: AssetType) {
    console.log('Abrir modal para añadir atributo al tipo:', type.name);
  }

  onEditAttribute(attribute: Attribute) {
    console.log('Editar atributo:', attribute.name);
  }

  onDeleteAttribute(attribute: Attribute) {
    console.log('Eliminar atributo:', attribute.name);
  }
}
