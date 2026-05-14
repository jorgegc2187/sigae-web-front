import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard-home',
  imports: [DecimalPipe],
  templateUrl: './dashboard-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  metrics = signal({
    total: 2845,
    operativos: 2410,
    mantenimiento: 112,
    baja: 38
  });

  alerts = signal([
    { id: 1, user: 'Luis Quispe', asset: 'Laptop Dell Inspiron 15', status: 'Venció hace 3 días', location: 'Aula de Cómputo', type: 'error' },
    { id: 2, user: 'Ana Torres', asset: 'Proyector Epson PowerLite', status: 'Venció hace 1 día', location: 'Biblioteca', type: 'error' },
    { id: 3, user: 'Carlos Mamani', asset: 'Teclado Logitech MK270', status: 'Venció hace 5 días', location: 'Sala de Profesores', type: 'error' },
    { id: 4, user: 'María Huanca', asset: 'Mouse Inalámbrico HP', status: 'Vence hoy', location: 'Biblioteca', type: 'warning' },
    { id: 5, user: 'Jorge Ramos', asset: 'Laptop Lenovo ThinkPad', status: 'Vence hoy', location: 'Aula de Cómputo', type: 'warning' },
  ]);

  recentMovements = signal([
    { code: 'IE-LP-00124', description: 'Laptop Lenovo ThinkPad E14', category: 'Tecnología', status: 'Operativo', stateClass: 'bg-estado-bueno-bg text-estado-bueno', dotClass: 'bg-estado-bueno' },
    { code: 'IE-MB-00890', description: 'Escritorio Docente Metal', category: 'Mobiliario', status: 'Regular', stateClass: 'bg-estado-regular-bg text-estado-regular', dotClass: 'bg-estado-regular' },
    { code: 'IE-PR-00045', description: 'Proyector Epson PowerLite', category: 'Tecnología', status: 'Mantenimiento', stateClass: 'bg-estado-mant-bg text-estado-mant', dotClass: 'bg-estado-mant' },
  ]);
}
