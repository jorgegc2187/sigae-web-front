import { Routes } from '@angular/router';
import { CategoriesPanelComponent } from './pages/categories-panel/categories-panel.component';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    component: CategoriesPanelComponent,
    title: 'Categorías y Tipos - SIGAE',
    data: {
      pageTitle: 'Configuración',
      pageSubtitle: 'Categorías y tipos',
    },
  },
];
