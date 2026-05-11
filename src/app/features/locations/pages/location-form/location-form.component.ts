import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';

interface UserOption {
  id: string;
  name: string;
  initials: string;
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent],
  templateUrl: './location-form.component.html',
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LocationFormComponent {
  private fb = inject(FormBuilder);

  allUsers = signal<UserOption[]>([
    { id: '1', name: 'Juan Pérez', initials: 'JP' },
    { id: '2', name: 'María Gómez', initials: 'MG' },
    { id: '3', name: 'Carlos Huaman', initials: 'CH' },
    { id: '4', name: 'Ana Mori', initials: 'AM' },
    { id: '5', name: 'Pedro Vera', initials: 'PV' },
    { id: '6', name: 'Rosa Luna', initials: 'RL' },
    { id: '7', name: 'Luis Castro', initials: 'LC' },
  ]);

  selectedManagers = signal<UserOption[]>([]);
  userSearchQuery = signal('');
  dropdownOpen = signal(false);

  searchContainer = viewChild<ElementRef>('searchContainer');

  filteredUsers = computed(() => {
    const query = this.userSearchQuery().toLowerCase();
    const selectedIds = new Set(this.selectedManagers().map(m => m.id));
    return this.allUsers().filter(
      u => !selectedIds.has(u.id) && u.name.toLowerCase().includes(query)
    );
  });

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  get nameControl() { return this.form.get('name')!; }

  onClickOutside(event: MouseEvent) {
    const container = this.searchContainer();
    if (this.dropdownOpen() && container && !container.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  addManager(user: UserOption) {
    this.selectedManagers.update(prev => [...prev, user]);
    this.userSearchQuery.set('');
    this.dropdownOpen.set(false);
  }

  removeManager(userId: string) {
    this.selectedManagers.update(prev => prev.filter(m => m.id !== userId));
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.userSearchQuery.set(val);
    this.dropdownOpen.set(true);
  }

  onSearchFocus() {
    this.dropdownOpen.set(true);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log('Submit', { ...this.form.value, managers: this.selectedManagers() });
  }
}
