# SIGAE — Instrucciones del Proyecto

> Sistema de Gestión de Activos Educativos · Tesis · Colegio público · Perú

---

## 1. Descripción General

SIGAE es una aplicación web para la gestión integral de activos de un colegio público. Permite registrar, clasificar, controlar el estado, trazabilidad, préstamos y mantenimiento de cualquier tipo de activo escolar (tecnológico, mobiliario, bibliográfico, etc.) distribuido en diferentes ubicaciones del colegio.

**Problema que resuelve:** los colegios públicos no tienen un sistema centralizado para saber qué activos tienen, en qué estado están, dónde están, a quién se prestaron y qué pasó con ellos en el tiempo.

---

## 2. Stack Tecnológico

| Capa          | Tecnología  |
| ------------- | ----------- |
| Frontend      | Angular 20  |
| Backend       | Spring Boot |
| Base de datos | PostgreSQL  |
| Autenticación | JWT         |

---

## 3. Configuración del Entorno (`environment.ts`)

El nombre del sistema y la URL del backend se configuran desde los archivos de entorno. Nunca hardcodear estos valores en componentes o servicios.

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  appName: 'SIGAE',
};
```

```typescript
// app.tokens.ts
export const APP_CONFIG = new InjectionToken<typeof environment>('APP_CONFIG');

// app.config.ts — proveer el token
{ provide: APP_CONFIG, useValue: environment }

// Uso en cualquier componente o servicio
private config = inject(APP_CONFIG);
title = this.config.appName; // 'SIGAE'
```

El nombre del sistema (`appName`) debe usarse en: título del browser (`Title` service), sidebar, pantalla de login y cualquier lugar donde aparezca el nombre de la aplicación.

---

## 4. Stack de Estilos

**Tailwind CSS 4.2 + DaisyUI ^5.5.19.** Sin `tailwind.config.js` — toda la configuración vive en `styles.css`.

> Las reglas completas de uso de DaisyUI v5, breaking changes, componentes y ejemplos están en `daisyui-v5.md`. Leer ese archivo antes de escribir cualquier componente.

**Reglas clave:**

- Usar clases de DaisyUI como base, extender con utilidades Tailwind encima.
- Usar `bg-primary`, `text-primary-content`, `bg-base-100`, etc. — nunca hex hardcodeado en templates.
- Dark mode via `data-theme` en `<html>`. No usar la clase `.dark` de Tailwind.
- No crear archivos `.scss` por componente. Los estilos viven en `styles.css`.
- **Placeholders:** agregar siempre `placeholder-shown:opacity-50` a todo input con placeholder.
- **Bordes en inputs:** usar `border border-base-300` — la clase `input-bordered` fue eliminada en v5.
- No escribir CSS custom salvo para tokens de estados de activos y casos sin cobertura en DaisyUI.

---

## 5. Identidad Visual

### 5.1 Estilo

Institucional y formal. Transmite confianza, orden y seriedad acorde al contexto educativo público. Sin decoraciones innecesarias. Claridad de información sobre estética llamativa.

### 5.2 Origen de la Paleta

Derivada de la insignia de la IE Simón Rodríguez Nasca:

| Color en la insignia    | Rol en el sistema        | Decisión                                                  |
| ----------------------- | ------------------------ | --------------------------------------------------------- |
| Azul cobalto (escudo)   | Primario                 | Desaturado y ajustado para pantalla — evita fatiga visual |
| Dorado/ámbar (antorcha) | Warning / estado regular | Complementario split del azul — coherencia simbólica      |
| Rojo (llama)            | Error / estado malo      | Coincide con convención universal de peligro              |

**Principios aplicados:** WCAG 2.1 AA mínimo (4.5:1 texto normal), regla 60-30-10 (60% neutrales, 30% azul, 10% ámbar), formato OKLCH recomendado por DaisyUI v5.

### 5.3 Configuración del Tema (DaisyUI v5)

DaisyUI v5 usa `@plugin "daisyui/theme"` en el CSS con valores **OKLCH**. Los dos temas personalizados son `sigae-light` (default) y `sigae-dark`.

```css
/* styles.css */
@import 'tailwindcss';

@plugin "daisyui" {
  themes:
    sigae-light --default,
    sigae-dark --prefersdark;
}

/* ─── TEMA CLARO ──────────────────────────────────── */
@plugin "daisyui/theme" {
  name: 'sigae-light';
  default: true;
  color-scheme: light;

  /* Primario: azul derivado del escudo (hue 261°) */
  --color-primary: oklch(47% 0.22 261); /* ~#1D4ED8 */
  --color-primary-content: oklch(98% 0.01 261); /* blanco cálido */

  /* Secondary: azul medio para acciones secundarias */
  --color-secondary: oklch(55% 0.18 261); /* ~#2563EB */
  --color-secondary-content: oklch(98% 0.01 261);

  /* Accent: sin uso fuerte — reservado para highlights */
  --color-accent: oklch(60% 0.15 261);
  --color-accent-content: oklch(98% 0.01 261);

  /* Neutral: grises fríos */
  --color-neutral: oklch(35% 0.02 261);
  --color-neutral-content: oklch(95% 0.01 261);

  /* Base: fondos y superficies */
  --color-base-100: oklch(98.5% 0.005 261); /* ~#F8FAFC — fondo general */
  --color-base-200: oklch(95% 0.008 261); /* ~#F1F5F9 — sidebar, hover */
  --color-base-300: oklch(91% 0.012 261); /* ~#E2E8F0 — bordes */
  --color-base-content: oklch(15% 0.03 261); /* ~#0F172A — texto principal */

  /* Feedback del sistema */
  --color-info: oklch(52% 0.19 261); /* azul info */
  --color-info-content: oklch(98% 0.01 261);
  --color-success: oklch(45% 0.17 145); /* ~#15803D — verde */
  --color-success-content: oklch(98% 0.01 145);
  --color-warning: oklch(55% 0.18 65); /* ~#B45309 — ámbar antorcha */
  --color-warning-content: oklch(98% 0.01 65);
  --color-error: oklch(45% 0.2 25); /* ~#B91C1C — rojo llama */
  --color-error-content: oklch(98% 0.01 25);
}

/* ─── TEMA OSCURO ─────────────────────────────────── */
@plugin "daisyui/theme" {
  name: 'sigae-dark';
  prefersdark: true;
  color-scheme: dark;

  /* Primario más claro para contrastar sobre fondos oscuros */
  --color-primary: oklch(65% 0.2 261); /* ~#60A5FA */
  --color-primary-content: oklch(15% 0.03 261);

  --color-secondary: oklch(72% 0.16 261);
  --color-secondary-content: oklch(15% 0.03 261);

  --color-accent: oklch(70% 0.14 261);
  --color-accent-content: oklch(15% 0.03 261);

  --color-neutral: oklch(75% 0.02 261);
  --color-neutral-content: oklch(20% 0.02 261);

  /* Base oscura con tinte azulado frío */
  --color-base-100: oklch(16% 0.025 261); /* ~#0F172A — fondo general */
  --color-base-200: oklch(21% 0.028 261); /* ~#1E293B — cards, sidebar */
  --color-base-300: oklch(28% 0.03 261); /* ~#334155 — bordes */
  --color-base-content: oklch(93% 0.01 261); /* ~#F1F5F9 — texto principal */

  --color-info: oklch(65% 0.18 261);
  --color-info-content: oklch(15% 0.03 261);
  --color-success: oklch(68% 0.2 145); /* ~#4ADE80 */
  --color-success-content: oklch(15% 0.03 145);
  --color-warning: oklch(78% 0.18 80); /* ~#FCD34D — ámbar claro */
  --color-warning-content: oklch(20% 0.05 80);
  --color-error: oklch(68% 0.2 25); /* ~#F87171 */
  --color-error-content: oklch(15% 0.03 25);
}

/* ─── TOKENS DE ESTADOS DE ACTIVOS ───────────────── */
/* Colores propios del negocio, disponibles como utilidades Tailwind */
@theme {
  --color-estado-bueno: oklch(45% 0.17 145);
  --color-estado-bueno-bg: oklch(95% 0.05 145);
  --color-estado-regular: oklch(55% 0.18 65);
  --color-estado-regular-bg: oklch(96% 0.06 80);
  --color-estado-malo: oklch(45% 0.2 25);
  --color-estado-malo-bg: oklch(95% 0.04 25);
  --color-estado-mant: oklch(45% 0.2 300);
  --color-estado-mant-bg: oklch(95% 0.04 300);
  --color-estado-baja: oklch(45% 0.02 261);
  --color-estado-baja-bg: oklch(93% 0.01 261);
}

/* Sobreescribir en dark */
[data-theme='sigae-dark'] {
  --color-estado-bueno: oklch(68% 0.2 145);
  --color-estado-bueno-bg: oklch(22% 0.06 145);
  --color-estado-regular: oklch(78% 0.18 80);
  --color-estado-regular-bg: oklch(20% 0.05 65);
  --color-estado-malo: oklch(68% 0.2 25);
  --color-estado-malo-bg: oklch(20% 0.05 25);
  --color-estado-mant: oklch(70% 0.18 300);
  --color-estado-mant-bg: oklch(20% 0.05 300);
  --color-estado-baja: oklch(60% 0.02 261);
  --color-estado-baja-bg: oklch(22% 0.02 261);
}
```

**Uso de los tokens de estado en templates:**

```html
<!-- Badge de estado de activo -->
<span class="badge text-estado-bueno bg-estado-bueno-bg">Bueno</span>
<span class="badge text-estado-regular bg-estado-regular-bg">Regular</span>
<span class="badge text-estado-malo bg-estado-malo-bg">Malo</span>
<span class="badge text-estado-mant bg-estado-mant-bg">Mantenimiento</span>
<span class="badge text-estado-baja bg-estado-baja-bg">De baja</span>
```

### 5.4 Toggle de Tema

El tema activo se controla con `data-theme` en `<html>` y se persiste en `localStorage`.

```typescript
// core/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'sigae-theme';
  readonly theme = signal<'sigae-light' | 'sigae-dark'>('sigae-light');

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY) as 'sigae-light' | 'sigae-dark';
    this.theme.set(saved ?? 'sigae-light');
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
      localStorage.setItem(this.STORAGE_KEY, this.theme());
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'sigae-light' ? 'sigae-dark' : 'sigae-light'));
  }
}
```

### 5.5 Tipografía

Inter via Google Fonts. Declarada en el tema para que DaisyUI la aplique globalmente.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* En el @plugin "daisyui/theme" de sigae-light y sigae-dark agregar: */
--font-sans: 'Inter', system-ui, sans-serif;
```

Escala de texto: usar las utilidades estándar de Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`).

### 5.6 Mockups

El diseño de pantallas sigue los mockups creados en Stitch. **Ante cualquier duda de diseño, los mockups tienen prioridad sobre cualquier decisión del agente.** Se irán incorporando por módulo a medida que se desarrolle.

### 5.7 Consistencia entre vistas — Componentes estructurales

Los componentes estructurales (sidebar, header, layout) deben ser **idénticos en todas las vistas**. Antes de implementar cualquier pantalla, el agente debe verificar que estos componentes sean consistentes con la referencia canónica definida aquí. Si detecta una incongruencia en un mockup (ítem extra en el sidebar, icono distinto, elemento faltante en el header), debe **notificarlo explícitamente** antes de continuar y usar siempre la versión canónica, no la del mockup inconsistente.

#### Sidebar — versión canónica

```
Logo: ícono account_balance + texto "SIGAE" + subtítulo "Gestión Educativa"

Ítems de navegación (en este orden exacto):
1. dashboard         → Panel Principal
2. inventory_2       → Inventario
3. swap_horiz        → Préstamos  [badge numérico rojo si hay vencidos]
4. location_on       → Ubicaciones
5. people            → Docentes
6. bar_chart         → Reportes
─────────────────── [divider]
7. settings          → Configuración  [expandible con sub-ítems]
   └── people_alt    → Usuarios
   └── category      → Categorías y Tipos
   └── location_on   → Ubicaciones
   └── storefront    → Proveedores

Ítem activo: bg-blue-50, text-blue-700, border-l-[3px] border-blue-700, font-semibold
Ítem inactivo: text-slate-600, hover:bg-slate-200, hover:text-blue-700
Set de iconos: Material Symbols Outlined exclusivamente
Ancho: 240px fijo
```

#### Header — versión canónica

```
Izquierda: título de la página (text-xl font-bold text-blue-700)
Derecha (en este orden):
  1. Ícono search (colapsado — no input expandido)
  2. Ícono notifications [badge numérico rojo con conteo de alertas]
  3. Ícono contrast (toggle de tema)
  ── [divider vertical] ──
  4. Texto "Soporte"
  5. Nombre del usuario + rol debajo (text-sm / text-xs text-muted)
  6. Avatar (imagen o iniciales, 32px, rounded-full)

Set de iconos: Material Symbols Outlined exclusivamente
Altura: 64px fijo
Fondo: white (light) / slate-950 (dark)
```

#### Layout general — versión canónica

```
Sidebar: fixed left, 240px, full height, z-50
Header:  sticky top, full width menos sidebar, 64px, z-40
Contenido: ml-[240px], padding 24px, pb-24 si hay footer sticky
Footer sticky (solo en formularios): fixed bottom, w-[calc(100%-240px)], z-40
Fondo general: #F8FAFC (bg-slate-50)
```

#### Regla de normalización

Si al leer un mockup el agente detecta cualquiera de estas situaciones, debe reportarlo antes de generar código:

- Un ítem de navegación que no está en la lista canónica
- Un ítem faltante que sí debería estar
- Un ícono distinto al definido para ese ítem
- Elementos extra en el header no definidos en la versión canónica
- Ancho de sidebar, altura de header o fondo distintos a los canónicos

Formato del reporte:

```
⚠️ INCONGRUENCIA DETECTADA en [nombre del mockup]:
- [descripción exacta de la diferencia]
Usando versión canónica definida en project-instructions.md.
```

---

## 6. Módulos del Sistema

### 6.1 Autenticación

- Login con JWT. Sin registro público.
- El administrador crea usuarios desde el dashboard o envía invitaciones por correo.
- Rutas protegidas por rol y ubicación.
- Persistir token en `localStorage`. Refresh token cuando corresponda.

### 6.2 Dashboard

- Resumen general: total de activos, activos por estado, préstamos activos, vencimientos próximos.
- Acceso diferenciado por rol: el administrador ve todo el colegio, el encargado solo su ubicación.
- Notificaciones de préstamos vencidos o próximos a vencer.

### 6.3 Activos

El módulo central del sistema.

**Modelo de datos relevante:**

- Cada activo pertenece a una **ubicación** y tiene una **categoría** y un **tipo**.
- Cada tipo define sus **atributos dinámicos** (ej: tipo "Laptop" tiene atributos "Sistema Operativo", "RAM", "Procesador").
- Cada activo tiene un **código de barras** único generado por el sistema.
- Un activo puede moverse entre ubicaciones; cada cambio queda en la **trazabilidad**.

**Estados de un activo:**
| Estado | Color |
|--------|-------|
| Bueno | Verde |
| Regular | Amarillo/naranja |
| Malo | Rojo |
| En mantenimiento | Violeta |
| De baja | Gris |

**Operaciones:**

- Registrar activo con atributos dinámicos según su tipo.
- Editar, cambiar estado con observación obligatoria.
- Dar de baja o enviar a mantenimiento con motivo/justificación.
- Cambiar ubicación con registro de trazabilidad.
- Ver historial completo del activo (trazabilidad).
- **Acciones en batch:** selección múltiple para cambiar estado, dar de baja, cambiar ubicación, etc.
- Escaneo de código de barras para búsqueda y registro rápido (similar a caja registradora).
- Imprimir etiquetas de código de barras (PDF o browser print).

### 6.4 Categorías y Tipos

- El administrador crea categorías (Tecnología, Mobiliario, Bibliografía, etc.).
- Dentro de cada categoría, crea tipos (Laptop, Escritorio, Libro, Proyector, etc.).
- Para cada tipo, define atributos personalizados (texto, número, fecha, booleano, lista de opciones).
- Los atributos son dinámicos: al registrar un activo del tipo "Laptop", el formulario muestra los campos correspondientes.

### 6.5 Ubicaciones

- El administrador crea y gestiona ubicaciones (Aula de Cómputo, Biblioteca, Aula 1A, Dirección, etc.).
- Los encargados tienen acceso solo a su ubicación asignada.
- Los activos pertenecen a una ubicación pero pueden transferirse.

### 6.6 Préstamos

- Solo el administrador o el encargado de la ubicación pueden registrar préstamos.
- Un préstamo asigna uno o más activos a un docente por un período definido (fecha inicio, fecha fin esperada).
- Registro de devolución con fecha real y observaciones (si hubo daño, pérdida, etc.).
- Alertas/notificaciones cuando un préstamo se aproxima a su fecha límite o está vencido.
- El escaneo de código de barras agiliza la selección de activos al registrar un préstamo.
- La trazabilidad del activo incluye todos sus préstamos.

### 6.7 Docentes

- Módulo para registrar docentes (nombre, DNI, área/especialidad, contacto).
- No son usuarios del sistema; son beneficiarios de préstamos.
- Al registrar un préstamo se selecciona un docente del módulo en vez de escribir sus datos.

### 6.8 Proveedores

- Módulo gestionado exclusivamente por el administrador.
- Permite registrar proveedores con: nombre, RUC, teléfono, email y dirección.
- Al registrar un activo, el campo proveedor es **opcional** — se selecciona de la lista o se deja vacío.
- Desde el detalle de un proveedor se puede ver el historial de activos vinculados a él.
- Operaciones: crear, editar, desactivar (soft delete). No se eliminan proveedores con activos asociados.

### 6.9 Usuarios y Roles

| Rol                        | Permisos                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Administrador**          | Acceso total: usuarios, ubicaciones, categorías, tipos, atributos, activos, préstamos, proveedores, reportes, configuración |
| **Encargado**              | Gestión de activos y préstamos de su(s) ubicación(es) asignada(s)                                                           |
| **Director / Subdirector** | Solo lectura: dashboard global, reportes y trazabilidad                                                                     |

- Registro solo por invitación o creación directa desde el panel del administrador.
- Un encargado puede tener asignada más de una ubicación.
- Los permisos se validan en frontend (rutas y UI) y en backend (JWT + roles).

### 6.10 Reportes

- Reporte de inventario por ubicación, categoría o tipo.
- Reporte de préstamos (activos, vencidos, histórico).
- Reporte de activos por estado.
- Reporte de trazabilidad de un activo específico.
- Exportación: PDF descargable, impresión directa desde el browser, Excel/CSV.

### 6.11 Códigos de Barras

- Cada activo tiene un código de barras único generado al crearlo.
- El sistema permite imprimir etiquetas en formato PDF (hoja con múltiples etiquetas) o una sola desde el browser.
- El escaneo funciona como entrada de texto rápida en campos preparados para ello (el lector de código de barras actúa como teclado).

---

## 7. Trazabilidad

Cada activo mantiene un historial cronológico de eventos. Registrar automáticamente:

| Evento              | Ejemplo                                                        |
| ------------------- | -------------------------------------------------------------- |
| Creación            | "Activo creado por Juan Pérez el 10/01/2025"                   |
| Cambio de estado    | "Estado cambiado de Bueno → Regular. Motivo: desgaste visible" |
| Cambio de ubicación | "Trasladado de Aula de Cómputo → Biblioteca por Admin"         |
| Inicio de préstamo  | "Prestado a Prof. García hasta el 20/01/2025"                  |
| Devolución          | "Devuelto. Observación: pantalla con rayón"                    |
| Mantenimiento       | "Enviado a mantenimiento. Motivo: falla en teclado"            |
| Baja                | "Dado de baja. Justificación: irreparable"                     |

---

## 8. Operaciones en Batch

Aplicable a: cambio de estado, dar de baja, enviar a mantenimiento, cambiar ubicación, imprimir etiquetas.

- Tabla con checkbox por fila + checkbox de selección total.
- Barra de acciones contextual que aparece al seleccionar uno o más registros.
- Confirmación con resumen antes de ejecutar la acción masiva.
- Feedback claro del resultado (cuántos se procesaron, si hubo errores).

---

## 9. Escaneo de Código de Barras

- Los campos preparados para escaneo tienen un ícono indicador y foco automático.
- El lector de código de barras funciona como entrada de teclado (HID): al escanear envía el código + `Enter`.
- El sistema busca el activo y lo agrega a la lista (en préstamos, búsqueda, batch, etc.) sin necesidad de hacer clic.
- Si el código no existe, mostrar feedback inmediato en el campo.

---

## 10. Estructura de Features (Frontend)

```
features/
├── auth/                  # Login, guards, token management
├── dashboard/             # Dashboard por rol
├── assets/                # Gestión de activos (módulo central)
├── loans/                 # Préstamos y devoluciones
├── teachers/              # Módulo de docentes
├── users/                 # Usuarios y roles (solo admin)
├── locations/             # Ubicaciones (solo admin)
├── categories/            # Categorías, tipos y atributos dinámicos (solo admin)
├── suppliers/             # Proveedores (solo admin)
├── reports/               # Reportes y exportaciones
└── settings/              # Configuración general (solo admin)
```

---

## 11. Convenciones y Decisiones Técnicas

- Seguir todas las reglas del archivo `angular-20-best-practices.md`.
- El nombre del sistema siempre desde `environment.appName` vía token `APP_CONFIG`.
- Los permisos de UI (mostrar/ocultar elementos, rutas) se derivan del rol del usuario en el JWT.
- Las tablas con grandes volúmenes de datos usan paginación del lado del servidor.
- Los formularios de activos son dinámicos: se construyen en runtime según los atributos del tipo seleccionado.
- El escaneo de código de barras no requiere librería especial: es un input de texto con detección de `Enter`.
- **Dark mode:** gestionado por DaisyUI via `data-theme` en `<html>` (`sigae-light` / `sigae-dark`). No usar la clase `.dark` de Tailwind. El toggle lo gestiona `ThemeService` (ver sección 5.4).
- Los estados de activos y eventos de trazabilidad son enums definidos en el backend y tipados en el frontend.
- Todas las fechas se manejan en ISO 8601 (UTC) y se formatean en el frontend según locale `es-PE`.
- **Estilos de componentes:** no usar archivos `.scss` por componente. Los estilos van en el CSS global (`styles.css`) con Tailwind y DaisyUI. Usar `templateUrl` sin `styleUrl` salvo casos muy específicos que DaisyUI no cubra.
