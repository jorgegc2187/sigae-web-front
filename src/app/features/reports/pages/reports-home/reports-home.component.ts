import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { INVENTORY_ASSETS } from '../../../inventory/data/inventory.mock';

interface ReportCard {
  title: string;
  value: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-reports-home',
  standalone: true,
  imports: [ActionButtonComponent],
  templateUrl: './reports-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsHomeComponent {
  readonly period = signal('month');
  readonly cards = computed<ReportCard[]>(() => {
    const maintenance = INVENTORY_ASSETS.filter((asset) => asset.condition === 'Mantenimiento').length;
    const damaged = INVENTORY_ASSETS.filter((asset) => asset.condition === 'Malo').length;
    const available = INVENTORY_ASSETS.filter((asset) => asset.condition === 'Bueno' || asset.condition === 'Regular').length;

    return [
      {
        title: 'Activos registrados',
        value: String(INVENTORY_ASSETS.length),
        icon: 'inventory_2',
        description: 'Inventario total bajo control.',
      },
      {
        title: 'Disponibles para préstamo',
        value: String(available),
        icon: 'task_alt',
        description: 'Activos en condición buena o regular.',
      },
      {
        title: 'En mantenimiento',
        value: String(maintenance),
        icon: 'build',
        description: 'Requieren seguimiento operativo.',
      },
      {
        title: 'Con observación crítica',
        value: String(damaged),
        icon: 'warning',
        description: 'Activos en mal estado.',
      },
    ];
  });
}
