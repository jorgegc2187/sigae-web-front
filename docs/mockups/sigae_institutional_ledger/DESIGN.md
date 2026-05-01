# SIGAE Design System

## Project Context
SIGAE is a web-based asset management system for a public school in Peru. It is used by
administrators, location managers, and school directors. The tone is institutional, formal,
and trustworthy. Clarity and information density take priority over decorative aesthetics.
Target device: desktop browser (1280px and above). No mobile layouts needed.

## Color Palette
Inspired by the school's blue institutional crest. All colors use OKLCH format internally
but are referenced here as hex for readability.

### Light Theme (sigae-light) — Default
- Primary: #1D4ED8 (institutional blue — buttons, links, active states)
- Primary hover: #2563EB
- Primary content: #FFFFFF (text on primary backgrounds)
- Secondary: #2563EB (secondary actions)
- Base 100: #F8FAFC (page background)
- Base 200: #F1F5F9 (sidebar, table row hover, input backgrounds)
- Base 300: #E2E8F0 (borders, dividers)
- Base content: #0F172A (primary text)
- Text secondary: #334155
- Text muted: #64748B

### Dark Theme (sigae-dark) — Optional toggle
- Primary: #60A5FA
- Base 100: #0F172A
- Base 200: #1E293B
- Base 300: #334155
- Base content: #F1F5F9

### Semantic Colors (Asset Status)
- Status Good: text #15803D / bg #DCFCE7 (green — working correctly)
- Status Regular: text #B45309 / bg #FEF3C7 (amber — from the school torch)
- Status Bad: text #B91C1C / bg #FEE2E2 (red — from the school flame)
- Status Maintenance: text #6D28D9 / bg #EDE9FE (violet — temporary process)
- Status Retired: text #475569 / bg #F1F5F9 (gray — out of service)

### System Feedback
- Success: #15803D
- Warning: #B45309
- Error: #B91C1C
- Info: #1D4ED8

## Typography
- Font family: Inter, system-ui, sans-serif
- Heading 1 (page title): 24px, 700 weight
- Heading 2 (section title): 20px, 600 weight
- Heading 3 (card title): 16px, 600 weight
- Body text: 14px, 400 weight (tables, forms, descriptions)
- Small / labels: 12px, 400–500 weight (badges, metadata, timestamps)

## Spacing
- Base unit: 4px
- Common values: 4, 8, 12, 16, 24, 32, 48px
- Content padding: 24px
- Card padding: 16px
- Table cell padding: 12px vertical, 16px horizontal

## Layout
- Structure: fixed left sidebar (240px) + top header (64px) + main content area
- Sidebar: navigation menu with icons + labels, collapsible
- Header: page title (left) + actions area (right: notifications, theme toggle, user avatar)
- Main content: full width with 24px padding, max-width unconstrained
- Grid: 12-column, gap 16px

## Components

### Buttons
- Primary: bg-primary, white text, 8px border-radius, 36px height
- Secondary: outlined with primary border, 8px border-radius
- Ghost: transparent, text-primary, no border
- Danger: bg-error, white text (for destructive actions)
- Size sm: 28px height, text-xs — used inside tables

### Cards
- Background: white (light) / base-200 (dark)
- Border: 1px solid base-300
- Border radius: 12px
- Shadow: 0 1px 3px rgba(0,0,0,0.08)
- Padding: 16px

### Tables
- Header: bg-base-200, text-muted, uppercase, text-xs, font-600
- Row: white background, bottom border base-300
- Row hover: bg-base-200
- Checkbox column: 40px wide, first column
- Actions column: last column, right-aligned, contains icon buttons
- Pagination: bottom of table, centered

### Badges (Asset Status)
- Shape: rounded pill (full border-radius)
- Size: small, inline
- Always show colored dot + label text
- Use semantic colors from Asset Status palette above

### Forms
- Input height: 36px
- Input border: 1px solid base-300, radius 6px
- Input focus: primary color border, no shadow
- Label: above input, text-sm, font-medium, text-secondary
- Required marker: red asterisk after label
- Error state: red border + error message below input, text-xs

### Sidebar Navigation
- Item height: 40px
- Active item: bg-primary-light (#DBEAFE), text-primary, left border 3px primary
- Inactive item: transparent, text-secondary
- Icon: 18px, left-aligned
- Section headers: uppercase, text-xs, text-muted, font-600, margin-top 16px

### Data Tables with Batch Actions
- Floating action bar appears above table when rows are selected
- Action bar: white bg, shadow-md, rounded-lg, contains count + action buttons
- Example: "3 activos seleccionados · [Cambiar estado] [Dar de baja] [Cancelar]"

### Barcode Scan Input
- Full-width input with barcode scanner icon on the right
- Border: 2px dashed primary (indicates scan-ready state)
- Placeholder: "Escanear código de barras o escribir..."
- Focus animation: border becomes solid primary

## Tone & Style Rules
- Formal and institutional. No playful illustrations, no gradients on content areas.
- Use color sparingly: primary blue only on interactive elements and active states.
- Amber/orange appears only on "Regular" status badges and warning alerts.
- White space is generous — avoid cramped layouts.
- Icons: outline style (Heroicons or similar), 18–20px.
- Empty states: simple centered illustration + message + primary action button.
- No dark cards on light backgrounds. No mixed surface depths without clear hierarchy.