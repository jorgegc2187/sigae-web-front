import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';

export type ReportExportFormat = 'pdf' | 'excel' | 'word';

export interface AssetReportFilters {
  categoryId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AssetReportRow {
  id: string;
  code: string;
  description: string;
  category: string;
  categoryId: string;
  location: string;
  locationId: string;
  condition: string;
  acquisitionDate: string | null;
}

export interface ReportsSummary {
  totalAssets: number;
  activeLoans: number;
  maintenanceAssets: number;
  lowStockCategories: number;
}

export interface ReportFilterOption {
  id: string;
  name: string;
}

interface CategoryResponse {
  id: string;
  name: string;
}

interface LocationResponse {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/reports`;
  private readonly catalogBaseUrl = this.appConfig.apiUrl;

  summary() {
    return this.http.get<ReportsSummary>(`${this.baseUrl}/summary`);
  }

  listAssetsReport(filters: AssetReportFilters) {
    return this.http.get<AssetReportRow[]>(`${this.baseUrl}/assets`, {
      params: this.buildParams(filters),
    });
  }

  listAssetCategories() {
    return this.http
      .get<CategoryResponse[]>(`${this.catalogBaseUrl}/categories`)
      .pipe(map((categories) => categories.map((category) => ({ id: category.id, name: category.name }))));
  }

  listAssetLocations() {
    return this.http
      .get<LocationResponse[]>(`${this.catalogBaseUrl}/locations`)
      .pipe(map((locations) => locations.map((location) => ({ id: location.id, name: location.name }))));
  }

  downloadAssetsReport(filters: AssetReportFilters, format: ReportExportFormat) {
    return this.http.get(`${this.baseUrl}/assets/export`, {
      params: this.buildParams(filters).set('format', format),
      observe: 'response',
      responseType: 'blob',
    });
  }

  getFilename(response: HttpResponse<Blob>, fallback: string): string {
    const disposition = response.headers.get('content-disposition');
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1];
    return filename || fallback;
  }

  private buildParams(filters: AssetReportFilters): HttpParams {
    let params = new HttpParams();

    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }

    if (filters.locationId) {
      params = params.set('locationId', filters.locationId);
    }

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }

    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return params;
  }
}
