import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { INVENTORY_ASSETS, INVENTORY_TRACEABILITY } from '../../data/inventory.mock';
import { AssetCondition } from '../../models/inventory.model';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [RouterLink, ActionButtonComponent, StatusBadgeComponent],
  templateUrl: './inventory-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailComponent {
  readonly id = input.required<string>();
  readonly asset = computed(() => INVENTORY_ASSETS.find((item) => item.id === this.id()) ?? null);
  readonly traceability = computed(() => INVENTORY_TRACEABILITY[this.id()] ?? []);
  readonly attributeEntries = computed(() => Object.entries(this.asset()?.attributes ?? {}));

  conditionTone(condition: AssetCondition): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
    if (condition === 'Bueno') return 'success';
    if (condition === 'Regular') return 'warning';
    if (condition === 'Mantenimiento') return 'info';
    if (condition === 'Malo') return 'error';
    return 'neutral';
  }
}
