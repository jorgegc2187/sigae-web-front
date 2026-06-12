import { Routes } from '@angular/router';
import { DashboardHomeComponent } from './pages/dashboard-home/dashboard-home.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardHomeComponent,
    title: 'Dashboard',
    data: {
      pageTitle: 'Panel Principal',
      pageSubtitle: 'Resumen operativo global',
    },
  },
];
