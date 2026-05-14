import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';

export interface ReportsSummary {
  totalAssets: number;
  activeLoans: number;
  maintenanceAssets: number;
  lowStockCategories: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/reports`;

  summary() {
    return this.http.get<ReportsSummary>(`${this.baseUrl}/summary`);
  }
}
