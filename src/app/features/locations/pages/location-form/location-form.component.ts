import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild, computed, inject } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { FormFieldComponent } from '../../../../shared/ui/form-field/form-field.component';
import { UsersService } from '../../../users/services/users.service';
import { LocationsService } from '../../services/locations.service';

interface UserOption {
  id: string;
  name: string;
  initials: string;
}

@Component({
  selector: 'app-location-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ActionButtonComponent],
  templateUrl: './location-form.component.html',
  host: {
    '(document:click)': 'onClickOutside($event)',
  },
})
export class LocationFormComponent {
  private fb = inject(NonNullableFormBuilder);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private locationsService = inject(LocationsService);
  private usersResource = this.usersService.listResource();

  allUsers = computed<UserOption[]>(() =>
    this.usersResource.value().map((user) => ({
      id: user.id,
      name: user.fullName,
      initials: user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase(),
    })),
  );

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

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  get nameControl() { return this.form.controls.name; }

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

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    try {
      await firstValueFrom(this.locationsService.create({
        name: value.name,
        description: value.description || 'Sin descripción',
        status: 'ACTIVE',
      }));
      this.notifications.success({ message: 'Ubicación registrada correctamente.' });
      await this.router.navigate(['/settings/locations']);
    } catch {
      this.notifications.error({ message: 'No se pudo registrar la ubicación.' });
    }
  }
}
