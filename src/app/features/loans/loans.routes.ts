import { Routes } from '@angular/router';

export const LOANS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/loan-list/loan-list.component').then((m) => m.LoanListComponent),
    title: 'Préstamos',
    data: {
      pageTitle: 'Préstamos',
      pageSubtitle: 'Seguimiento y control',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/loan-form/loan-form.component').then((m) => m.LoanFormComponent),
    title: 'Registrar Préstamo',
    data: {
      pageTitle: 'Préstamos',
      pageSubtitle: 'Registrar préstamo',
    },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/loan-detail/loan-detail.component').then((m) => m.LoanDetailComponent),
    title: 'Detalle del Préstamo',
    data: {
      pageTitle: 'Préstamos',
      pageSubtitle: 'Detalle del préstamo',
    },
  },
];
