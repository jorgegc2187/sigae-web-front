import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { Loan } from '../models/loan.model';

export interface LoanListFilters {
  search?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/loans`;

  listResource(filters: Signal<LoanListFilters>) {
    return httpResource<Loan[]>(
      () => ({
        url: this.baseUrl,
        params: this.buildParams(filters()),
      }),
      { defaultValue: [] },
    );
  }

  getById(id: string) {
    return this.http.get<Loan>(`${this.baseUrl}/${id}`);
  }

  create(payload: unknown) {
    return this.http.post<Loan>(this.baseUrl, payload);
  }

  private buildParams(filters: LoanListFilters): HttpParams {
    let params = new HttpParams();
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return params;
  }
}
