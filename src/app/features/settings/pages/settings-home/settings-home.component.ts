import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';

interface SettingsShortcut {
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, ActionButtonComponent],
  templateUrl: './settings-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHomeComponent {
  readonly shortcuts: SettingsShortcut[] = [
    {
      title: 'Usuarios',
      description: 'Gestiona accesos, roles, invitaciones y estados de los usuarios del sistema.',
      icon: 'person',
      route: '/settings/users',
    },
    {
      title: 'Categorías y Tipos',
      description: 'Define categorías, tipos y estructuras base para organizar el inventario escolar.',
      icon: 'category',
      route: '/settings/categories',
    },
    {
      title: 'Proveedores',
      description: 'Consulta y administra el catálogo de proveedores vinculados al inventario.',
      icon: 'local_shipping',
      route: '/settings/suppliers',
    },
  ];
}
