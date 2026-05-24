import { httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app.tokens';

export interface DashboardMetrics {
  totalAssets: number;
  operationalAssets: number;
  maintenanceAssets: number;
  decommissionedAssets: number;
  activeLoans: number;
  overdueLoans: number;
  dueTodayLoans: number;
  healthPercentage: number;
}

export interface DashboardConditionBreakdown {
  good: number;
  regular: number;
  bad: number;
  maintenance: number;
  decommissioned: number;
}

export interface DashboardCategoryShare {
  categoryId: string;
  categoryName: string;
  totalAssets: number;
  percentage: number;
}

export interface DashboardLoanAlert {
  loanId: string;
  loanCode: string;
  teacherName: string;
  assetName: string;
  locationName: string;
  dueStatusLabel: string;
  severity: 'overdue' | 'due_today' | 'due_soon';
  dueDate: string;
}

export interface DashboardRecentMovement {
  assetId: string;
  assetCode: string;
  assetName: string;
  categoryName: string;
  condition: string;
  movementType: string;
  occurredAt: string;
}

export interface DashboardOverviewResponse {
  metrics: DashboardMetrics;
  conditionBreakdown: DashboardConditionBreakdown;
  topCategories: DashboardCategoryShare[];
  loanAlerts: DashboardLoanAlert[];
  recentMovements: DashboardRecentMovement[];
}

const EMPTY_OVERVIEW: DashboardOverviewResponse = {
  metrics: {
    totalAssets: 0,
    operationalAssets: 0,
    maintenanceAssets: 0,
    decommissionedAssets: 0,
    activeLoans: 0,
    overdueLoans: 0,
    dueTodayLoans: 0,
    healthPercentage: 0,
  },
  conditionBreakdown: {
    good: 0,
    regular: 0,
    bad: 0,
    maintenance: 0,
    decommissioned: 0,
  },
  topCategories: [],
  loanAlerts: [],
  recentMovements: [],
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly appConfig = inject(APP_CONFIG);
  private readonly baseUrl = `${this.appConfig.apiUrl}/dashboard`;

  overviewResource() {
    return httpResource<DashboardOverviewResponse>(
      () => `${this.baseUrl}/overview`,
      { defaultValue: EMPTY_OVERVIEW },
    );
  }
}
