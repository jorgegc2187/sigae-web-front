# DaisyUI v5 — Guía de Uso para Agentes

> Versión: **5.5.19** · Stack: Tailwind CSS 4.2 + DaisyUI v5 · Sin `tailwind.config.js`

---

## 1. Instalación y configuración

```css
/* styles.css — toda la config vive aquí, sin tailwind.config.js */
@import "tailwindcss";
@plugin "daisyui";
```

Para incluir/excluir componentes específicos:
```css
@plugin "daisyui" {
  themes: sigae-light --default, sigae-dark --prefersdark;
  /* include: btn, card, table; */ /* solo incluir estos */
  /* exclude: scrollbar; */        /* excluir este */
}
```

---

## 2. Breaking changes v4 → v5 (NO usar sintaxis antigua)

### Clases eliminadas / renombradas

| ❌ v4 (NO usar) | ✅ v5 (correcto) |
|----------------|-----------------|
| `input-bordered` | `border border-base-300` en el input o label contenedor |
| `card-bordered` | `card-border` |
| `card-compact` | `card-sm` |
| `form-control` | `fieldset` (nuevo componente) |
| `btn-group` | `join` |
| `input-group` | `join` |
| `btm-nav` | `dock` |
| `btm-nav-active` | `dock-active` |
| `tabs-lifted` | `tabs-lift` |
| `tabs-bordered` | `tabs-border` |
| `tabs-boxed` | `tabs-box` |
| `textarea-border` | eliminado — textarea tiene borde por defecto. Usar `textarea-ghost` para quitar el borde |
| `hover` (tabla) | `hover:bg-base-300` u otro color de Tailwind |
| `disabled` (menu item) | `menu-disabled` |
| `active` (menu item) | `menu-active` |
| `focus` (menu item) | `menu-focus` |
| `online` (avatar) | `avatar-online` |
| `offline` (avatar) | `avatar-offline` |
| `placeholder` (avatar) | `avatar-placeholder` |
| `artboard`, `phone-*` | utilidades Tailwind `w-[...]` `h-[...]` |
| `label-text`, `label-text-alt` | usar `<label>` directamente con texto |

### Formularios — nueva sintaxis con `fieldset`

```html
<!-- ❌ v4 — NO usar -->
<div class="form-control">
  <label class="label">
    <span class="label-text">Nombre</span>
  </label>
  <input type="text" class="input input-bordered" />
</div>

<!-- ✅ v5 — correcto -->
<fieldset class="fieldset">
  <legend class="fieldset-legend">Nombre</legend>
  <label class="label" for="nombre">Nombre</label>
  <input id="nombre" type="text" class="input" placeholder="Ej: Laptop Dell" />
  <span class="fieldset-label">Texto de ayuda opcional</span>
</fieldset>
```

### Inputs — borde visible

```html
<!-- ✅ Input simple con borde -->
<input class="input border border-base-300 placeholder-shown:opacity-50" placeholder="Buscar..." />

<!-- ✅ Input con ícono (label contenedor) -->
<label class="input border border-base-300 flex items-center gap-2">
  <svg><!-- ícono --></svg>
  <input class="grow placeholder-shown:opacity-50" type="text" placeholder="Buscar activo..." />
</label>
```

---

## 3. Componentes más usados en SIGAE

### Botones

```html
<!-- Variantes disponibles en v5 -->
<button class="btn">Default</button>
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-soft">Soft</button>   <!-- nuevo en v5 -->
<button class="btn btn-dash">Dash</button>   <!-- nuevo en v5 -->

<!-- Tamaños -->
<button class="btn btn-xs">XS</button>
<button class="btn btn-sm">SM</button>
<button class="btn btn-md">MD (default)</button>
<button class="btn btn-lg">LG</button>
<button class="btn btn-xl">XL</button>   <!-- nuevo en v5 -->

<!-- Estado de carga -->
<button class="btn btn-primary">
  <span class="loading loading-spinner loading-sm"></span>
  Guardando...
</button>
```

### Cards

```html
<!-- ✅ v5 — card-border en lugar de card-bordered -->
<div class="card card-border bg-base-100 shadow-sm">
  <div class="card-body">
    <h2 class="card-title">Título</h2>
    <p>Contenido</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Acción</button>
    </div>
  </div>
</div>

<!-- Tamaños disponibles en v5 -->
<!-- card-xs / card-sm / card-md / card-lg / card-xl -->
```

### Badges — estados de activos

```html
<!-- Estados semánticos de SIGAE -->
<span class="badge text-estado-bueno bg-estado-bueno-bg">Bueno</span>
<span class="badge text-estado-regular bg-estado-regular-bg">Regular</span>
<span class="badge text-estado-malo bg-estado-malo-bg">Malo</span>
<span class="badge text-estado-mant bg-estado-mant-bg">Mantenimiento</span>
<span class="badge text-estado-baja bg-estado-baja-bg">De baja</span>

<!-- Variantes nuevas en v5 -->
<span class="badge badge-soft badge-success">Soft</span>
<span class="badge badge-dash badge-warning">Dash</span>
<span class="badge badge-outline badge-error">Outline</span>
```

### Tablas

```html
<div class="overflow-x-auto">
  <table class="table">
    <!-- ✅ v5: hover con Tailwind, NO clase 'hover' de daisyUI -->
    <thead>
      <tr class="bg-base-200 text-base-content/60 text-xs uppercase font-semibold">
        <th><input type="checkbox" class="checkbox checkbox-sm" /></th>
        <th>Código</th>
        <th>Nombre</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr class="hover:bg-base-200 border-b border-base-300">
        <td><input type="checkbox" class="checkbox checkbox-sm" /></td>
        <td class="font-mono text-sm">ACT-2025-0001</td>
        <td class="font-medium">Laptop Dell Inspiron</td>
        <td><span class="badge text-estado-bueno bg-estado-bueno-bg">Bueno</span></td>
        <td class="text-right">
          <button class="btn btn-ghost btn-xs">Ver →</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modal

```html
<!-- ✅ v5 — usar dialog nativo HTML -->
<button class="btn" onclick="my_modal.showModal()">Abrir modal</button>

<dialog id="my_modal" class="modal">
  <div class="modal-box">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
    </form>
    <h3 class="text-lg font-bold">Título del modal</h3>
    <p class="py-4">Contenido del modal</p>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">Cancelar</button>
        <button class="btn btn-primary">Confirmar</button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>Cerrar al hacer clic fuera</button>
  </form>
</dialog>
```

En Angular, controlar programáticamente:
```typescript
// Abrir
(document.getElementById('my_modal') as HTMLDialogElement).showModal();
// Cerrar
(document.getElementById('my_modal') as HTMLDialogElement).close();
```

### Dropdown — Popover API (v5)

```html
<!-- ✅ v5 — nueva sintaxis con popover -->
<div class="dropdown">
  <div tabindex="0" role="button" class="btn">Opciones</div>
  <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-sm border border-base-300">
    <li><a>Editar</a></li>
    <li><a>Cambiar estado</a></li>
    <li class="divider"></li>
    <li><a class="text-error">Dar de baja</a></li>
  </ul>
</div>
```

### Menu (sidebar)

```html
<!-- ✅ v5 — clases renombradas para estados -->
<ul class="menu w-full gap-1">
  <li>
    <!-- Activo: menu-active ya no existe, usar clases Tailwind directamente -->
    <a class="bg-primary/10 text-primary border-l-4 border-primary font-semibold">
      Dashboard
    </a>
  </li>
  <li>
    <!-- ✅ v5: menu-disabled en lugar de disabled -->
    <a class="menu-disabled">Item deshabilitado</a>
  </li>
  <li class="menu-title">Sección</li>
  <li><a>Item normal</a></li>
</ul>
```

### Alert

```html
<!-- Variantes nuevas en v5 -->
<div role="alert" class="alert alert-success">Éxito</div>
<div role="alert" class="alert alert-warning">Advertencia</div>
<div role="alert" class="alert alert-error">Error</div>
<div role="alert" class="alert alert-soft alert-info">Soft info</div>    <!-- nuevo v5 -->
<div role="alert" class="alert alert-dash alert-warning">Dash</div>      <!-- nuevo v5 -->
<div role="alert" class="alert alert-outline alert-error">Outline</div>  <!-- nuevo v5 -->
```

### Select

```html
<!-- ✅ v5 — select tiene width 20rem por defecto, no necesita w-full max-w-xs -->
<select class="select border border-base-300">
  <option disabled selected>Seleccionar categoría</option>
  <option>Tecnología</option>
  <option>Mobiliario</option>
</select>

<!-- Si necesita ancho completo -->
<select class="select border border-base-300 w-full">...</select>
```

### Textarea

```html
<!-- ✅ v5 — textarea tiene borde por defecto, NO usar textarea-border -->
<textarea class="textarea" placeholder="Observaciones..."></textarea>

<!-- Sin borde: usar textarea-ghost -->
<textarea class="textarea textarea-ghost" placeholder="Sin borde"></textarea>
```

### Loading / Skeleton

```html
<!-- Spinner -->
<span class="loading loading-spinner loading-md text-primary"></span>

<!-- Skeleton para estados de carga -->
<div class="skeleton h-4 w-full"></div>
<div class="skeleton h-32 w-full"></div>
```

### Join (reemplaza btn-group e input-group)

```html
<!-- ✅ v5 — join en lugar de btn-group / input-group -->
<div class="join">
  <button class="btn join-item">Anterior</button>
  <button class="btn btn-active join-item">1</button>
  <button class="btn join-item">2</button>
  <button class="btn join-item">Siguiente</button>
</div>

<!-- Input con botón -->
<div class="join w-full">
  <input class="input join-item border border-base-300 w-full" placeholder="Buscar..." />
  <button class="btn btn-primary join-item">Buscar</button>
</div>
```

---

## 4. Variables CSS disponibles

### Colores del tema (usar siempre estos, nunca hex hardcodeado)

```css
/* Primarios */
bg-primary          text-primary          border-primary
bg-primary-content  text-primary-content

/* Base (fondos y superficies) */
bg-base-100    /* fondo general */
bg-base-200    /* sidebar, hover de filas */
bg-base-300    /* bordes */
text-base-content          /* texto principal */
text-base-content/60       /* texto muted (60% opacidad) */
text-base-content/40       /* texto muy sutil */

/* Feedback */
bg-success  text-success  bg-success-content
bg-warning  text-warning  bg-warning-content
bg-error    text-error    bg-error-content
bg-info     text-info     bg-info-content

/* Estados de activos SIGAE (custom tokens) */
text-estado-bueno      bg-estado-bueno-bg
text-estado-regular    bg-estado-regular-bg
text-estado-malo       bg-estado-malo-bg
text-estado-mant       bg-estado-mant-bg
text-estado-baja       bg-estado-baja-bg
```

### Variables de efecto (nuevo en v5)

```css
/* Usar en sombras y efectos */
--depth      /* profundidad del tema */
--noise      /* textura del tema */
```

---

## 5. Nuevas features v5 útiles para SIGAE

### Validador de formularios nativo

```html
<fieldset class="fieldset">
  <label class="label" for="email">Email *</label>
  <input
    id="email"
    type="email"
    class="input border border-base-300 validator w-full placeholder-shown:opacity-50"
    placeholder="usuario@colegio.edu.pe"
    required
  />
  <span class="validator-hint hidden text-error text-xs">
    Ingresa un email válido
  </span>
</fieldset>
```

### Modificadores `*-soft` y `*-dash`

Disponibles en: `btn`, `badge`, `alert`, `card`

```html
<button class="btn btn-primary btn-soft">Soft primary</button>
<span class="badge badge-warning badge-dash">Dash warning</span>
<div class="alert alert-error alert-soft">Error suave</div>
<div class="card card-dash">Card con borde discontinuo</div>
```

### Tamaño `xl` nuevo

Disponibles en: `btn`, `badge`, `input`, `select`, `textarea`, `toggle`, `table`

```html
<button class="btn btn-xl">Botón extra grande</button>
<input class="input input-xl" />
```

---

## 6. MCP oficial de DaisyUI — Blueprint

DaisyUI tiene un **servidor MCP oficial llamado Blueprint** que provee contexto en tiempo real al LLM para generar código DaisyUI correcto, sin alucinaciones y con 90% menos tokens.

**Instalación en Claude Code / Antigravity / Cursor:**

```json
{
  "mcpServers": {
    "daisyui": {
      "command": "npx",
      "args": ["-y", "@daisyui/blueprint-mcp@latest"],
      "env": {
        "DAISYUI_BLUEPRINT_KEY": "TU_LICENSE_KEY"
      }
    }
  }
}
```

Más información: https://daisyui.com/blueprint/

**Recomendación:** Si usas Claude Code o Antigravity para desarrollar SIGAE, configurar Blueprint MCP es la forma más efectiva de garantizar código DaisyUI v5 correcto sin necesidad de este archivo MD como contexto manual.

---

## 7. Reglas para el agente

### ✅ SIEMPRE

1. Usar `fieldset` + `label` para formularios — no `form-control`.
2. Usar `border border-base-300` para bordes en inputs — no `input-bordered`.
3. Usar `menu-disabled`, `menu-active`, `menu-focus` — no `disabled`, `active`, `focus`.
4. Usar `join` para grupos de botones o inputs — no `btn-group` ni `input-group`.
5. Usar `card-border` — no `card-bordered`.
6. Usar `dock` para navegación inferior — no `btm-nav`.
7. Usar `tabs-lift`, `tabs-border`, `tabs-box` — no las versiones con `-lifted`/`-bordered`/`-boxed`.
8. Usar `hover:bg-base-200` en filas de tabla — no clase `hover` de DaisyUI.
9. Usar `avatar-online`, `avatar-offline`, `avatar-placeholder` — no sin prefijo.
10. Agregar `placeholder-shown:opacity-50` a todo input con placeholder.
11. Usar `dialog` nativo HTML para modales con `.showModal()` / `.close()`.
12. Usar colores del tema (`bg-primary`, `bg-base-100`, etc.) — nunca hex hardcodeado.

### ❌ NUNCA

1. `input-bordered` — eliminado en v5.
2. `form-control` — eliminado en v5, usar `fieldset`.
3. `card-bordered` — renombrado a `card-border`.
4. `card-compact` — renombrado a `card-sm`.
5. `btn-group` / `input-group` — usar `join`.
6. `btm-nav` — usar `dock`.
7. `artboard` / `phone-*` — usar utilidades Tailwind.
8. `textarea-border` — textarea ya tiene borde por defecto.
9. `tabs-lifted` / `tabs-bordered` / `tabs-boxed` — usar versiones renombradas.
10. Hardcodear colores hex en clases de Tailwind cuando existe el token semántico.
