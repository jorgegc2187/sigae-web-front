import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reports-home/reports-home.component').then((m) => m.ReportsHomeComponent),
    title: 'Reportes - SIGAE',
    data: {
      pageTitle: 'Reportes',
      pageSubtitle: 'Exportaciones y consultas operativas',
    },
  },
];
