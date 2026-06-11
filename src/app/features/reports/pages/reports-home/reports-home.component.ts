import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { DatePickerComponent, DateRangeValue } from '../../../../shared/ui/date-picker/date-picker.component';
import { DesktopPaginationComponent } from '../../../../shared/ui/desktop-pagination/desktop-pagination.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../shared/ui/status-badge/status-badge.component';
import {
  AssetReportFilters,
  AssetReportRow,
  LoanReportFilters,
  LoanReportRow,
  ReportExportFormat,
  ReportFilterOption,
  ReportsService,
} from '../../services/reports.service';

type ReportsTab = 'assets' | 'loans';

interface PendingReportExport {
  format: ReportExportFormat;
  tab: ReportsTab;
}

@Component({
  selector: 'app-reports-home',
  imports: [RouterLink, ActionButtonComponent, DatePickerComponent, DesktopPaginationComponent, StatusBadgeComponent, SelectFieldComponent],
  templateUrl: './reports-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsHomeComponent {
  private readonly notifications = inject(NotificationService);
  private readonly reportsService = inject(ReportsService);
  private readonly exportLabels = {
    pdf: 'PDF',
    excel: 'Excel',
    word: 'Word',
  } as const;

  readonly exportDialogRef = viewChild<ElementRef<HTMLDialogElement>>('exportDialog');

  readonly activeTab = signal<ReportsTab>('assets');
  readonly pendingExport = signal<PendingReportExport | null>(null);

  readonly assetCategoryId = signal('all');
  readonly assetLocationId = signal('all');
  readonly assetDateRange = signal<DateRangeValue | null>(null);
  readonly assetCurrentPage = signal(1);
  readonly assetPageSize = 8;

  readonly loanQuery = signal('');
  readonly loanLocation = signal('all');
  readonly loanDateRange = signal<DateRangeValue | null>(null);
  readonly loanCurrentPage = signal(1);
  readonly loanPageSize = 8;

  readonly assetCategories = signal<ReportFilterOption[]>([]);
  readonly assetLocations = signal<ReportFilterOption[]>([]);
  readonly assetCategoryOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las categorías' },
    ...this.assetCategories().map((category) => ({ value: category.id, label: category.name })),
  ]);
  readonly assetLocationOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las ubicaciones' },
    ...this.assetLocations().map((location) => ({ value: location.id, label: location.name })),
  ]);
  readonly loanLocationOptions = computed<SelectFieldOption[]>(() => [
    { value: 'all', label: 'Todas las ubicaciones' },
    ...this.loanLocations().map((location) => ({ value: location.id, label: location.name })),
  ]);

  readonly loanLocations = computed<ReportFilterOption[]>(() => this.assetLocations());

  readonly assetReportFilters = computed<AssetReportFilters>(() => {
    const dateRange = this.assetDateRange();
    return {
      categoryId: this.assetCategoryId() === 'all' ? undefined : this.assetCategoryId(),
      locationId: this.assetLocationId() === 'all' ? undefined : this.assetLocationId(),
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    };
  });

  readonly assetReportResource = this.reportsService.assetsReportResource(this.assetReportFilters);
  readonly assetRows = computed<AssetReportRow[]>(() =>
    this.assetReportResource.hasValue() ? this.assetReportResource.value() : [],
  );
  readonly assetReportError = computed(() => !!this.assetReportResource.error());

  readonly filteredAssetRows = computed(() => {
    const categoryId = this.assetCategoryId();
    const locationId = this.assetLocationId();
    const dateRange = this.assetDateRange();

    return this.assetRows().filter((row) => {
      const matchesCategory = categoryId === 'all' || row.categoryId === categoryId;
      const matchesLocation = locationId === 'all' || row.locationId === locationId;
      const matchesDate = this.matchesDateRange(row.acquisitionDate, dateRange);

      return matchesCategory && matchesLocation && matchesDate;
    });
  });

  readonly assetTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAssetRows().length / this.assetPageSize)),
  );

  readonly visibleAssetRows = computed(() => {
    const start = (this.assetCurrentPage() - 1) * this.assetPageSize;
    return this.filteredAssetRows().slice(start, start + this.assetPageSize);
  });

  readonly assetResultLabel = computed(() =>
    this.buildResultLabel(this.filteredAssetRows().length, this.assetCurrentPage(), this.assetPageSize),
  );

  readonly loanReportFilters = computed<LoanReportFilters>(() => {
    const dateRange = this.loanDateRange();
    return {
      search: this.loanQuery().trim() || undefined,
      locationId: this.loanLocation() === 'all' ? undefined : this.loanLocation(),
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    };
  });

  readonly loanReportResource = this.reportsService.loansReportResource(this.loanReportFilters);
  readonly loanRows = computed<LoanReportRow[]>(() =>
    this.loanReportResource.hasValue() ? this.loanReportResource.value() : [],
  );
  readonly loanReportError = computed(() => !!this.loanReportResource.error());

  readonly filteredLoanRows = computed(() => {
    const query = this.loanQuery().trim().toLowerCase();
    const dateRange = this.loanDateRange();

    return this.loanRows().filter((row) => {
      const matchesQuery = !query || row.teacherName.toLowerCase().includes(query) || row.code.toLowerCase().includes(query);
      const matchesDate = this.matchesDateRange(row.loanDate, dateRange);

      return matchesQuery && matchesDate;
    });
  });

  readonly loanTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLoanRows().length / this.loanPageSize)),
  );

  readonly visibleLoanRows = computed(() => {
    const start = (this.loanCurrentPage() - 1) * this.loanPageSize;
    return this.filteredLoanRows().slice(start, start + this.loanPageSize);
  });

  readonly loanResultLabel = computed(() =>
    this.buildResultLabel(this.filteredLoanRows().length, this.loanCurrentPage(), this.loanPageSize),
  );
  readonly exportDialogTitle = computed(() => {
    const pending = this.pendingExport();
    if (!pending) {
      return 'Confirmar descarga';
    }

    return `Descargar reporte en ${this.exportLabels[pending.format]}`;
  });
  readonly exportDialogMessage = computed(() => {
    const pending = this.pendingExport();
    if (!pending) {
      return '';
    }

    const reportName = pending.tab === 'assets' ? 'Reporte de Activos' : 'Reporte de Préstamos';
    if (pending.format === 'excel') {
      return `Se preparará la descarga tabular del ${reportName} en formato Excel, incluyendo metadatos institucionales y filtros aplicados.`;
    }

    return `Se preparará el informe formal del ${reportName} en formato ${this.exportLabels[pending.format]}, listo para impresión y firma manual.`;
  });
  readonly exportDialogIcon = computed(() => {
    const pending = this.pendingExport();
    if (!pending) {
      return 'download';
    }

    if (pending.format === 'pdf') return 'picture_as_pdf';
    if (pending.format === 'excel') return 'table_view';
    return 'description';
  });

  constructor() {
    void this.loadAssetFilterOptions();
  }

  setActiveTab(tab: ReportsTab): void {
    this.closeExportDialog();
    this.activeTab.set(tab);
    if (tab === 'assets') {
      this.assetCurrentPage.set(1);
    } else {
      this.loanCurrentPage.set(1);
    }
  }

  updateAssetCategory(categoryId: string): void {
    this.assetCategoryId.set(categoryId);
    this.assetCurrentPage.set(1);
  }

  updateAssetLocation(locationId: string): void {
    this.assetLocationId.set(locationId);
    this.assetCurrentPage.set(1);
  }

  updateAssetDateRange(value: string | DateRangeValue | null): void {
    this.assetDateRange.set(this.asDateRangeValue(value));
    this.assetCurrentPage.set(1);
  }

  clearAssetFilters(): void {
    this.assetCategoryId.set('all');
    this.assetLocationId.set('all');
    this.assetDateRange.set(null);
    this.assetCurrentPage.set(1);
  }

  updateLoanQuery(event: Event): void {
    this.loanQuery.set((event.target as HTMLInputElement).value);
    this.loanCurrentPage.set(1);
  }

  updateLoanLocation(locationId: string): void {
    this.loanLocation.set(locationId);
    this.loanCurrentPage.set(1);
  }

  updateLoanDateRange(value: string | DateRangeValue | null): void {
    this.loanDateRange.set(this.asDateRangeValue(value));
    this.loanCurrentPage.set(1);
  }

  clearLoanFilters(): void {
    this.loanQuery.set('');
    this.loanLocation.set('all');
    this.loanDateRange.set(null);
    this.loanCurrentPage.set(1);
  }

  goToAssetPage(page: number): void {
    this.assetCurrentPage.set(page);
  }

  goToLoanPage(page: number): void {
    this.loanCurrentPage.set(page);
  }

  reloadAssetReport(): void {
    this.assetReportResource.reload();
  }

  reloadLoanReport(): void {
    this.loanReportResource.reload();
  }

  exportReport(format: ReportExportFormat): void {
    this.pendingExport.set({
      format,
      tab: this.activeTab(),
    });
    this.exportDialogRef()?.nativeElement.showModal();
  }

  closeExportDialog(): void {
    if (this.exportDialogRef()?.nativeElement.open) {
      this.exportDialogRef()?.nativeElement.close();
    }

    this.pendingExport.set(null);
  }

  async confirmExport(): Promise<void> {
    const pending = this.pendingExport();
    if (!pending) {
      return;
    }

    if (pending.tab === 'assets') {
      await this.confirmAssetExport(pending.format);
      return;
    }

    await this.confirmLoanExport(pending.format);
  }

  onExportDialogClose(): void {
    this.pendingExport.set(null);
  }

  getAssetStatusClass(condition: string): string {
    if (condition === 'Bueno') return 'border-success/20 bg-success/10 text-success';
    if (condition === 'Regular') return 'border-warning/20 bg-warning/10 text-warning';
    if (condition === 'Mantenimiento') return 'border-info/20 bg-info/10 text-info';
    if (condition === 'Malo') return 'border-error/20 bg-error/10 text-error';
    return 'border-base-300 bg-base-200 text-base-content/60';
  }

  loanStatusTone(status: string): StatusBadgeTone {
    if (status === 'Activo') return 'success';
    if (status === 'Vencido') return 'error';
    return 'neutral';
  }

  formatDisplayDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private buildResultLabel(total: number, currentPage: number, pageSize: number): string {
    if (total === 0) {
      return 'Mostrando 0 resultados';
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);

    return `Mostrando ${start} a ${end} de ${total} resultados`;
  }

  private async confirmAssetExport(format: ReportExportFormat): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.reportsService.downloadAssetsReport(this.assetReportFilters(), format),
      );
      const content = response.body;
      if (!content) {
        throw new Error('Empty report response');
      }

      const filename = this.reportsService.getFilename(response, this.buildFallbackFilename(format));
      this.downloadBlob(content, filename);
      this.closeExportDialog();
      this.notifications.success({ message: 'Reporte de activos descargado correctamente.' });
    } catch {
      this.closeExportDialog();
      this.notifications.error({ message: 'No se pudo descargar el reporte de activos.' });
    }
  }

  private async confirmLoanExport(format: ReportExportFormat): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.reportsService.downloadLoansReport(this.loanReportFilters(), format),
      );
      const content = response.body;
      if (!content) {
        throw new Error('Empty report response');
      }

      const filename = this.reportsService.getFilename(response, this.buildFallbackFilename(format, 'prestamos'));
      this.downloadBlob(content, filename);
      this.closeExportDialog();
      this.notifications.success({ message: 'Reporte de préstamos descargado correctamente.' });
    } catch {
      this.closeExportDialog();
      this.notifications.error({ message: 'No se pudo descargar el reporte de préstamos.' });
    }
  }

  private async loadAssetFilterOptions(): Promise<void> {
    try {
      const [categories, locations] = await Promise.all([
        firstValueFrom(this.reportsService.listAssetCategories()),
        firstValueFrom(this.reportsService.listAssetLocations()),
      ]);

      this.assetCategories.set(categories);
      this.assetLocations.set(locations);
    } catch {
      this.notifications.error({ message: 'No se pudieron cargar los filtros de reportes.' });
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private buildFallbackFilename(format: ReportExportFormat, report: 'activos' | 'prestamos' = 'activos'): string {
    const extension = format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf';
    return `reporte-${report}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  }

  private matchesDateRange(dateValue: string | null, range: DateRangeValue | null): boolean {
    if (!range) {
      return true;
    }

    if (!dateValue) {
      return false;
    }

    const current = this.normalizeDate(new Date(dateValue));
    const start = this.normalizeDate(new Date(`${range.start}T00:00:00Z`));
    const end = this.normalizeDate(new Date(`${range.end}T00:00:00Z`));

    if (current === null || start === null || end === null) {
      return false;
    }

    return current >= start && current <= end;
  }

  private asDateRangeValue(value: string | DateRangeValue | null): DateRangeValue | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const [start, end] = value.split('/');
      if (!start || !end) {
        return null;
      }

      return { start, end };
    }

    return value.start && value.end ? value : null;
  }

  private normalizeDate(date: Date): number | null {
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
}
