# Angular 20 — Mejores Prácticas

> Angular 20 · Standalone-first · Signals-first · Feature-based · TypeScript strict

---

## 1. Principios

- Componentes, directivas y pipes son standalone por defecto en Angular 20+. En código nuevo no declarar `standalone: true`.
- Signals para estado local/compartido. RxJS solo para streams complejos.
- Organizar por dominio de negocio (feature-based), no por tipo técnico.
- Reutilización por defecto: todo elemento visual que se repita (tarjetas, listas, badges, formularios parciales) se extrae como componente. Los estilos compartidos van en `shared/`.
- Lazy loading donde aporte valor: rutas secundarias, features opcionales, componentes pesados.
- `ChangeDetectionStrategy.OnPush` en todo componente.
- `strict: true` en tsconfig. Sin `any`.

---

## 2. Nuevas Features Angular 20

### APIs estabilizadas

| API                                        | Estado en v20        |
| ------------------------------------------ | -------------------- |
| `effect()`, `linkedSignal()`, `toSignal()` | ✅ Stable            |
| `input()`, `output()`, `model()`           | ✅ Stable            |
| `viewChild()`, `contentChild()`            | ✅ Stable            |
| Incremental Hydration                      | ✅ Stable            |
| Route-level render mode                    | ✅ Stable            |
| Zoneless mode                              | 🔶 Developer Preview |

### Nuevos operadores en templates

```html
{{ `Hola ${user().name}` }}
<!-- template literals -->
{{ base() ** exponent() }}
<!-- exponenciación -->
@if ('admin' in user()) { ... }
<!-- operador in -->
```

### host: {} con type checking (reemplaza @HostBinding/@HostListener)

```typescript
@Component({
  host: {
    '[class.active]': 'isActive()',
    '[attr.aria-label]': 'label()',
    '(click)': 'handleClick($event)',
  }
})
```

### Redirect asíncrono en rutas

```typescript
{
  path: '',
  pathMatch: 'full',
  redirectTo: async () => {
    const isAuth = await inject(AuthService).checkAuth();
    return isAuth ? '/dashboard' : '/login';
  }
}
```

---

## 3. Signals

```typescript
import {
  signal,
  computed,
  effect,
  linkedSignal,
  input,
  output,
  model,
  viewChild,
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
```

```typescript
// Estado mutable
private items = signal<CartItem[]>([]);

// Estado derivado — lazy, memoizado
readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));

// Inputs
user = input.required<User>();
theme = input<'light' | 'dark'>('light');

// Two-way binding — uso: <app-qty [(quantity)]="qty" />
quantity = model(1);

// Efectos externos (DOM, localStorage). Nunca para derivar estado.
effect(() => document.documentElement.setAttribute('data-theme', this.theme()));

// Derivado sobreescribible
selectedProduct = linkedSignal(() => this.products()[0] ?? null);

// Query como Signal
canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('myCanvas');

// Observable → Signal
results = toSignal(this.http.get<Item[]>('/api/items'), { initialValue: [] });

// Signal → Observable (para pipelines RxJS)
search$ = toObservable(this.searchTerm);
```

> `toSignal()` se llama **una sola vez** por Observable. No invocar en bucles ni métodos reactivos.

> `effect()` no debe escribir un signal que él mismo lee — produce bucle infinito.

---

## 4. RxJS — Cuándo Usarlo

| Caso                                  | Solución                           |
| ------------------------------------- | ---------------------------------- |
| Estado local / derivado               | `signal` / `computed`              |
| GET de API reactivo                   | `httpResource()`                   |
| WebSocket, SSE, streams continuos     | RxJS                               |
| debounce, throttle, retry con backoff | RxJS                               |
| Streams combinados                    | RxJS — `combineLatest`, `forkJoin` |
| Mutaciones POST/PUT/DELETE            | `HttpClient` directo               |

```typescript
// Suscripción manual — siempre con takeUntilDestroyed
private destroyRef = inject(DestroyRef);

results = toSignal(
  this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.http.get<Item[]>(`/api?q=${q}`).pipe(catchError(() => of([])))),
    takeUntilDestroyed(this.destroyRef)
  ),
  { initialValue: [] }
);
```

---

## 5. Resource API

| API              | Usar cuando                          |
| ---------------- | ------------------------------------ |
| `httpResource()` | GET con `HttpClient` — **preferido** |
| `resource()`     | Loader con `fetch` nativo / Promise  |
| `rxResource()`   | Loader con Observable RxJS           |

### httpResource()

```typescript
// URL reactiva simple
product = httpResource<Product>(() => `/api/products/${this.productId()}`);

// Con opciones
list = httpResource<Product[]>(() => ({
  url: '/api/products',
  params: { category: this.category(), page: String(this.page()) },
}));
```

### resource() — fetch nativo

```typescript
userResource = resource({
  params: () => ({ id: this.userId() }),
  loader: async ({ params, abortSignal }) => {
    const res = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
    if (!res.ok) throw new Error('Error');
    return res.json() as Promise<User>;
  },
});
```

### rxResource() — Observable

```typescript
booksResource = rxResource({
  params: () => this.page(),
  loader: ({ params }) => this.http.get<Book[]>(`/api/books?page=${params}`),
});
// Solo toma el primer valor emitido del Observable.
```

### Estados y API

```typescript
resource.value(); // T | undefined
resource.isLoading(); // boolean
resource.error(); // unknown
resource.hasValue(); // boolean + type guard
resource.reload(); // fuerza recarga
resource.set(value); // valor local (status = 'local')
```

```html
@if (product.isLoading()) { <loading-spinner /> } @else if (product.error()) { <error-message /> }
@else if (product.hasValue()) {
<h1>{{ product.value()!.name }}</h1>
}
```

> `httpResource` es solo para GETs. Mutaciones con `HttpClient` directo.

---

## 6. Rutas y Lazy Loading

### Cuándo lazy

- **Sí:** rutas secundarias, áreas de admin, features opcionales, componentes pesados en template.
- **No:** landing principal, shell, layout crítico.

### Configuración de rutas

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent }, // eager
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCT_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];

// features/products/products.routes.ts
export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
];
```

### Scoped providers por ruta

```typescript
{
  path: 'checkout',
  loadChildren: () => import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES),
  providers: [CheckoutService]
}
```

### @defer — lazy en template

```html
<!-- Cargar al entrar al viewport -->
@defer (on viewport) {
<app-heavy-chart [data]="chartData()" />
} @placeholder {
<div class="skeleton" style="height:300px"></div>
} @loading (minimum 500ms) { <loading-spinner /> } @error {
<p>Error al cargar</p>
}

<!-- Cargar al interactuar -->
@defer (on interaction) {
<app-comments [postId]="post().id" />
} @placeholder { <button>Ver comentarios</button> }

<!-- Cargar programáticamente -->
@defer (when showDetails()) { <app-details /> }
```

### Guard con Signals

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).createUrlTree(['/login']);
};
```

---

## 7. Feature-Based Architecture

### Estructura de carpetas

```
src/app/
├── core/                          # Singletons globales
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── auth.guard.ts
│   ├── http/
│   │   ├── api.interceptor.ts
│   │   └── error.interceptor.ts
│   └── layout/
│       ├── header/header.component.ts
│       └── sidebar/sidebar.component.ts
│
├── shared/                        # UI reutilizable sin estado de negocio
│   ├── ui/
│   │   ├── button/button.component.ts
│   │   └── modal/modal.component.ts
│   ├── directives/
│   └── pipes/
│
├── features/
│   ├── products/
│   │   ├── pages/
│   │   │   ├── product-list/product-list.component.ts
│   │   │   └── product-detail/product-detail.component.ts
│   │   ├── components/
│   │   │   └── product-card/product-card.component.ts
│   │   ├── services/products.service.ts
│   │   ├── models/product.model.ts
│   │   └── products.routes.ts
│   └── admin/
│       ├── users/
│       ├── reports/
│       └── admin.routes.ts
│
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

### Reglas

1. **Autosuficiencia:** cada feature contiene páginas, componentes, servicios, modelos y rutas propias.
2. **Dependencias unidireccionales:** `feature → shared → core`. Nunca feature → feature.
3. **Servicios globales** en `core/` con `providedIn: 'root'`. Servicios de feature: `providedIn: 'root'` o en `providers` de la ruta si requieren scope.
4. **Reutilización:** si un componente se usa en más de una feature → `shared/ui/`. Si se repite solo dentro de una feature → `features/<nombre>/components/`. Si es exclusivo de una página → subcarpeta dentro de esa página.
5. **Subcarpetas por página:** los sub-componentes exclusivos de una página viven junto a ella, no en la carpeta general de `components/`.

```
features/products/
├── pages/
│   ├── product-list/
│   │   ├── product-list.component.ts     # página ruteada
│   │   └── product-filter/               # exclusivo de esta página
│   │       └── product-filter.component.ts
│   └── product-detail/
│       ├── product-detail.component.ts
│       └── product-gallery/              # exclusivo de esta página
│           └── product-gallery.component.ts
├── components/
│   └── product-card/                     # reutilizado en varias páginas de la feature
│       └── product-card.component.ts
└── ...
```

### app.config.ts

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(),
      withComponentInputBinding(), // route params → input() automático
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
```

---

## 8. Control Flow

```html
@if (user.isLoading()) { <loading-skeleton /> } @else if (user.error()) { <error-banner /> } @else {
<user-profile [user]="user.value()!" /> }

<!-- track OBLIGATORIO — nunca track $index en listas dinámicas -->
@for (item of items(); track item.id) {
<app-item [item]="item" />
} @empty {
<p>Sin resultados</p>
} @switch (status()) { @case ('active') { <badge variant="success">Activo</badge> } @case
('inactive') { <badge variant="warning">Inactivo</badge> } @default {
<badge>{{ status() }}</badge> } }
```

---

## 9. Formularios

Usar Reactive Forms tipados + Signals. Signal Forms queda fuera del estándar del proyecto mientras siga siendo experimental para nuestro stack Angular 20.

```typescript
@Component({ imports: [ReactiveFormsModule] })
export class LoginFormComponent {
  private fb = inject(NonNullableFormBuilder);
  isSubmitting = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  emailError = computed(() => {
    const c = this.form.get('email');
    if (!c?.dirty || !c.errors) return null;
    return c.errors['required'] ? 'Requerido' : 'Email inválido';
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    try {
      await this.authService.login(this.form.getRawValue());
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

---

## 10. Servicios HTTP

```typescript
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private readonly base = '/api/products';

  // GETs — httpResource
  getList(filters: Signal<ProductFilters>) {
    return httpResource<Product[]>(() => ({
      url: this.base,
      params: filters() as Record<string, string>,
    }));
  }

  getById(id: Signal<string>) {
    return httpResource<Product>(() => `${this.base}/${id()}`);
  }

  // Mutaciones — HttpClient directo
  create(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.base, data);
  }

  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
```

---

## 11. Naming Conventions

```
# Archivos
product-card.component.ts / .html
products.service.ts
product.model.ts
products.routes.ts
auth.guard.ts
api.interceptor.ts
time-ago.pipe.ts
search.resolver.ts
```

> En proyectos con Tailwind + DaisyUI no se crean archivos `.scss` por componente. Los estilos van en `styles.css` global. Omitir `styleUrl` en el decorador salvo casos excepcionales.

```typescript
// Clases — PascalCase con sufijo descriptivo
ProductCardComponent · ProductsService · AuthGuard · ApiInterceptor · TimeAgoPipe

// Interfaces/Types — PascalCase, sin prefijo I
interface Product {}
type OrderStatus = 'pending' | 'shipped';

// Signals — camelCase sin $
count = signal(0);  isLoading = signal(false);

// Observables — camelCase con $
search$ = toObservable(this.searchTerm);

// Constantes de rutas y tokens DI — SCREAMING_SNAKE_CASE
export const PRODUCT_ROUTES: Routes = [];
export const API_URL = new InjectionToken<string>('API_URL');

// Selectores — prefijo de app consistente
selector: 'app-product-card'
```

---

## 12. SSR e Hidratación Incremental

```typescript
// server.routes.ts
export const serverRoutes: ServerRoute[] = [
  { path: '/', renderMode: RenderMode.Prerender },
  { path: '/dashboard', renderMode: RenderMode.Server },
  { path: '/admin/**', renderMode: RenderMode.Client },
  {
    path: '/products/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const ids = await fetchProductIds();
      return ids.map((id) => ({ id }));
    },
  },
];
```

```html
@defer (hydrate on viewport) { <app-product-list /> } @defer (hydrate on interaction) {
<app-comments /> } @defer (hydrate never) { <app-static-footer /> }
```

---

## 13. Reglas para el Agente

Antes de implementar o refactorizar frontend, revisar la skill local que corresponda en `.agents/skills`:

- `angular-component` para componentes, inputs/outputs, host bindings y accesibilidad.
- `angular-signals` para estado local, derivado y efectos.
- `angular-forms` usando su referencia estable de Reactive Forms, no Signal Forms experimental.
- `angular-http` para `httpResource()`, `HttpClient`, descargas e interceptores.
- `angular-routing` para rutas lazy, guards y params como inputs.
- `angular-di` para `inject()`, tokens y providers.
- `angular-directives` para comportamiento DOM reusable.

### ✅ SIEMPRE

1. Omitir `standalone: true` en código nuevo + usar `ChangeDetectionStrategy.OnPush`.
2. `input()` / `output()` / `model()` — no `@Input()` / `@Output()`.
3. `inject()` — no constructor injection.
4. `@if` / `@for (track id)` / `@switch` — no `*ngIf` / `*ngFor`.
5. `httpResource()` para GETs reactivos — `HttpClient` para mutaciones.
6. `loadComponent` / `loadChildren` en rutas secundarias y features opcionales.
7. `takeUntilDestroyed(this.destroyRef)` en toda suscripción manual.
8. `computed()` para estado derivado.
9. `host: {}` — no `@HostBinding` / `@HostListener`.
10. Sufijos en nombres de archivo: `.component.ts`, `.service.ts`, `.model.ts`, etc.
11. Estructura `core/` · `shared/` · `features/` — nunca organizar por tipo técnico global.
12. **Antes de implementar cualquier pantalla**, verificar que el sidebar, header y layout del mockup coincidan con la versión canónica definida en `project-instructions.md` sección 5.7. Si hay incongruencias, reportarlas con el formato `⚠️ INCONGRUENCIA DETECTADA` y usar siempre la versión canónica, nunca la del mockup inconsistente.

### ❌ NUNCA

1. NgModules en código nuevo.
2. `*ngIf`, `*ngFor`, `*ngSwitch`.
3. `BehaviorSubject` para estado simple.
4. `async pipe` cuando se puede usar `toSignal()`.
5. Suscripciones sin `takeUntilDestroyed`.
6. `httpResource()` para POST / PUT / DELETE.
7. `any` — siempre tipar explícitamente.
8. Importar servicios de otra feature directamente.
9. `effect()` que escriba signals que él mismo lee.
10. `ChangeDetectionStrategy.Default` sin justificación.
