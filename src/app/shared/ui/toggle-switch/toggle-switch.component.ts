import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly ariaLabel = input('Cambiar estado');

  readonly checkedChange = output<boolean>();

  onChange(event: Event): void {
    if (this.disabled()) {
      return;
    }

    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
