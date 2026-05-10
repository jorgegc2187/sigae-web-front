import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedFilterTabItem {
  value: string;
  label: string;
  badgeCount?: number;
}

export type SegmentedFilterTabsVariant = 'desktop' | 'mobile';

@Component({
  selector: 'app-segmented-filter-tabs',
  standalone: true,
  templateUrl: './segmented-filter-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedFilterTabsComponent {
  items = input.required<ReadonlyArray<SegmentedFilterTabItem>>();
  activeValue = input.required<string>();
  variant = input<SegmentedFilterTabsVariant>('desktop');
  compact = input(false);

  valueChange = output<string>();

  isActive(value: string): boolean {
    return this.activeValue() === value;
  }

  onSelect(value: string) {
    this.valueChange.emit(value);
  }

  isDesktop(): boolean {
    return this.variant() === 'desktop';
  }

  isMobile(): boolean {
    return this.variant() === 'mobile';
  }
}
