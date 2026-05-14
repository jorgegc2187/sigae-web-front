import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { AssetType, Attribute, Category } from '../models/category.model';

export interface AttributeDefinitionRequest {
  id?: string;
  name: string;
  description: string;
  isRequired: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  icon: string;
}

export interface UpdateCategoryRequest {
  name: string;
  icon: string;
}

export interface CreateAssetTypeRequest {
  name: string;
  icon: string;
  attributes: AttributeDefinitionRequest[];
}

export interface UpdateAssetTypeRequest extends CreateAssetTypeRequest {
  categoryId: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/categories`;

  listResource() {
    return httpResource<Category[]>(() => this.baseUrl, { defaultValue: [] });
  }

  list() {
    return this.http.get<Category[]>(this.baseUrl);
  }

  createCategory(payload: CreateCategoryRequest) {
    return this.http.post<Category>(this.baseUrl, payload);
  }

  updateCategory(id: string, payload: UpdateCategoryRequest) {
    return this.http.patch<Category>(`${this.baseUrl}/${id}`, payload);
  }

  deleteCategory(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  createType(categoryId: string, payload: CreateAssetTypeRequest) {
    return this.http.post<AssetType>(`${this.baseUrl}/${categoryId}/types`, payload);
  }

  updateType(categoryId: string, typeId: string, payload: UpdateAssetTypeRequest) {
    return this.http.patch<AssetType>(`${this.baseUrl}/${categoryId}/types/${typeId}`, payload);
  }

  deleteType(categoryId: string, typeId: string) {
    return this.http.delete<void>(`${this.baseUrl}/${categoryId}/types/${typeId}`);
  }

  normalizeAttributes(attributes: Attribute[]): AttributeDefinitionRequest[] {
    return attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      description: attribute.description,
      isRequired: attribute.isRequired,
    }));
  }
}
