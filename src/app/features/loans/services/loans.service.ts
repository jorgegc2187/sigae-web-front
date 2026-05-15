import { HttpClient, HttpErrorResponse, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../core/config/app.tokens';
import { CreateLoanPayload, LoanDetail, LoanSummary } from '../models/loan.model';

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
    return httpResource<LoanSummary[]>(
      () => ({
        url: this.baseUrl,
        params: this.buildParams(filters()),
      }),
      { defaultValue: [] },
    );
  }

  getById(id: string) {
    return this.http.get<LoanDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateLoanPayload, signature: Blob | null, attachments: File[]) {
    const formData = new FormData();
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (signature) {
      formData.append('signature', signature, 'firma-prestamo.png');
    }
    attachments.forEach((file) => formData.append('attachments', file, file.name));
    return this.http.post<LoanDetail>(this.baseUrl, formData);
  }

  returnLoan(id: string) {
    return this.http.post<LoanDetail>(`${this.baseUrl}/${id}/return`, {});
  }

  downloadAttachment(downloadUrl: string) {
    const url = downloadUrl.startsWith('http') ? downloadUrl : `${this.appConfig.apiUrl.replace(/\/api$/, '')}${downloadUrl}`;
    return this.http.get(url, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  probeModuleAvailability() {
    return this.http.get<LoanSummary[]>(this.baseUrl).pipe(
      map(() => true),
      catchError((error: unknown) => {
        if (this.isCollectionEndpointMissing(error)) {
          return of(false);
        }

        return throwError(() => error);
      }),
    );
  }

  isCollectionEndpointMissing(error: unknown): boolean {
    return this.isLoansEndpointError(error) && this.isCollectionUrl(error.url);
  }

  isLoansEndpointError(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse && error.status === 404 && this.isLoansUrl(error.url);
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

  private isCollectionUrl(url: string | null): boolean {
    return typeof url === 'string' && /\/loans(?:\?.*)?$/.test(url);
  }

  private isLoansUrl(url: string | null): boolean {
    return typeof url === 'string' && /\/loans(?:\/[^/?]+)?(?:\?.*)?$/.test(url);
  }
}
