import { Routes } from '@angular/router';

export const LOANS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/loan-list/loan-list.component').then((m) => m.LoanListComponent),
    title: 'Préstamos - SIGAE',
    data: {
      pageTitle: 'Préstamos',
      pageSubtitle: 'Seguimiento y control',
    },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/loan-form/loan-form.component').then((m) => m.LoanFormComponent),
    title: 'Registrar Préstamo - SIGAE',
    data: {
      pageTitle: 'Préstamos',
      pageSubtitle: 'Registrar préstamo',
    },
  },
];
