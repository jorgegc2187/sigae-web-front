import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import {
  DashboardConditionBreakdown,
  DashboardLoanAlert,
  DashboardRecentMovement,
  DashboardService,
} from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [DecimalPipe, RouterLink, ActionButtonComponent],
  templateUrl: './dashboard-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly circleCircumference = 251.32;
  private readonly overviewResource = this.dashboardService.overviewResource();

  readonly overview = computed(() => this.overviewResource.value());
  readonly isLoading = computed(() => {
    const status = this.overviewResource.status();
    return status === 'loading' || status === 'reloading';
  });
  readonly hasError = computed(() => !!this.overviewResource.error());

  readonly metricCards = computed(() => {
    const metrics = this.overview().metrics;
    return [
      {
        value: metrics.totalAssets,
        label: 'Total activos',
        containerClass: 'bg-primary',
        textClass: 'text-primary-content/20',
        contentClass: 'text-primary-content',
        icon: 'inventory',
      },
      {
        value: metrics.operationalAssets,
        label: 'Operativos',
        containerClass: 'bg-estado-bueno',
        textClass: 'text-white/20',
        contentClass: 'text-white',
        icon: 'check_circle',
      },
      {
        value: metrics.maintenanceAssets,
        label: 'Mantenimiento',
        containerClass: 'bg-estado-mant',
        textClass: 'text-white/20',
        contentClass: 'text-white',
        icon: 'build',
      },
      {
        value: metrics.decommissionedAssets,
        label: 'Dados de baja',
        containerClass: 'bg-estado-baja',
        textClass: 'text-white/20',
        contentClass: 'text-white',
        icon: 'report',
      },
    ];
  });

  readonly conditionLegend = computed(() => {
    const breakdown = this.overview().conditionBreakdown;
    return [
      {
        label: 'Buen estado',
        helper: 'Activos totalmente operativos',
        value: breakdown.good,
        colorClass: 'bg-estado-bueno',
      },
      {
        label: 'Regular',
        helper: 'Requieren seguimiento',
        value: breakdown.regular,
        colorClass: 'bg-estado-regular',
      },
      {
        label: 'Mantenimiento',
        helper: 'En proceso técnico',
        value: breakdown.maintenance,
        colorClass: 'bg-estado-mant',
      },
      {
        label: 'Malo',
        helper: 'Con fallas registradas',
        value: breakdown.bad,
        colorClass: 'bg-estado-malo',
      },
      {
        label: 'Dados de baja',
        helper: 'Activos retirados del servicio',
        value: breakdown.decommissioned,
        colorClass: 'bg-estado-baja',
      },
    ];
  });

  readonly donutSegments = computed(() => this.buildDonutSegments(this.overview().conditionBreakdown));
  readonly topCategories = computed(() => this.overview().topCategories);
  readonly alerts = computed(() => this.overview().loanAlerts);
  readonly recentMovements = computed(() => this.overview().recentMovements);
  readonly isAlertsEmpty = computed(() => !this.isLoading() && !this.hasError() && this.alerts().length === 0);
  readonly isMovementsEmpty = computed(() => !this.isLoading() && !this.hasError() && this.recentMovements().length === 0);
  readonly hasTopCategories = computed(() => this.topCategories().length > 0);

  readonly healthPercentage = computed(() => this.overview().metrics.healthPercentage);
  readonly totalLoansBadge = computed(() => {
    const metrics = this.overview().metrics;
    return metrics.activeLoans > 0 ? `${metrics.activeLoans} activos` : 'Sin préstamos activos';
  });

  reload(): void {
    this.overviewResource.reload();
  }

  alertBorderClass(alert: DashboardLoanAlert): string {
    return alert.severity === 'overdue' ? 'border-error' : 'border-warning';
  }

  alertDotClass(alert: DashboardLoanAlert): string {
    return alert.severity === 'overdue' ? 'bg-error' : 'bg-warning';
  }

  movementBadgeClass(movement: DashboardRecentMovement): string {
    if (movement.condition === 'Bueno') {
      return 'bg-estado-bueno-bg text-estado-bueno';
    }

    if (movement.condition === 'Regular') {
      return 'bg-estado-regular-bg text-estado-regular';
    }

    if (movement.condition === 'Mantenimiento') {
      return 'bg-estado-mant-bg text-estado-mant';
    }

    if (movement.condition === 'Malo') {
      return 'bg-estado-malo-bg text-estado-malo';
    }

    return 'bg-estado-baja-bg text-estado-baja';
  }

  movementDotClass(movement: DashboardRecentMovement): string {
    if (movement.condition === 'Bueno') {
      return 'bg-estado-bueno';
    }

    if (movement.condition === 'Regular') {
      return 'bg-estado-regular';
    }

    if (movement.condition === 'Mantenimiento') {
      return 'bg-estado-mant';
    }

    if (movement.condition === 'Malo') {
      return 'bg-estado-malo';
    }

    return 'bg-estado-baja';
  }

  displayCondition(movement: DashboardRecentMovement): string {
    return movement.condition === 'Bueno' ? 'Operativo' : movement.condition;
  }

  private buildDonutSegments(breakdown: DashboardConditionBreakdown) {
    const segments = [
      { key: 'good', value: breakdown.good, colorClass: 'text-estado-bueno' },
      { key: 'regular', value: breakdown.regular, colorClass: 'text-estado-regular' },
      { key: 'maintenance', value: breakdown.maintenance, colorClass: 'text-estado-mant' },
      { key: 'bad', value: breakdown.bad, colorClass: 'text-estado-malo' },
      { key: 'decommissioned', value: breakdown.decommissioned, colorClass: 'text-estado-baja' },
    ];

    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let consumedLength = 0;

    return segments
      .filter((segment) => segment.value > 0 && total > 0)
      .map((segment) => {
        const length = (segment.value / total) * this.circleCircumference;
        const entry = {
          key: segment.key,
          colorClass: segment.colorClass,
          dasharray: `${length} ${this.circleCircumference - length}`,
          dashoffset: `${-consumedLength}`,
        };
        consumedLength += length;
        return entry;
      });
  }
}
