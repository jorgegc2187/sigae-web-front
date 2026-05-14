import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';
import { AssetCondition } from '../../models/inventory.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-inventory-detail',
  imports: [RouterLink, ActionButtonComponent, StatusBadgeComponent],
  templateUrl: './inventory-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly route = inject(ActivatedRoute);

  private readonly assetResource = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => (id ? this.assetsService.getById(id).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null },
  );
  private readonly traceabilityResource = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => (id ? this.assetsService.traceability(id).pipe(catchError(() => of([]))) : of([]))),
    ),
    { initialValue: [] },
  );

  readonly asset = computed(() => this.assetResource());
  readonly traceability = computed(() => this.traceabilityResource());
  readonly attributeEntries = computed(() => Object.entries(this.asset()?.attributes ?? {}));

  conditionTone(condition: AssetCondition): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
    if (condition === 'Bueno') return 'success';
    if (condition === 'Regular') return 'warning';
    if (condition === 'Mantenimiento') return 'info';
    if (condition === 'Malo') return 'error';
    return 'neutral';
  }
}
