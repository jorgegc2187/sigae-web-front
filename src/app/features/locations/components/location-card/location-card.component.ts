import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Location } from '../../models/location.model';

@Component({
  selector: 'app-location-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-card.component.html',
  host: {
    class: 'block h-full'
  }
})
export class LocationCardComponent {
  location = input.required<Location>();
  edit = output<string>();
  delete = output<string>();

  onEdit() {
    this.edit.emit(this.location().id);
  }

  onDelete() {
    this.delete.emit(this.location().id);
  }
}
