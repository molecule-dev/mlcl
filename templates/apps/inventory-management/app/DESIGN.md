# DESIGN.md — Inventory Management

## Brand Identity

- **App Name:** Locus
- **Tagline:** Every unit, accounted for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, operational, quietly authoritative, data-forward

## Target Persona

Operations managers and warehouse leads tracking SKUs, stock levels, and movement across locations who need dense scannable data and fast actions.

## Screens

| Name            | Route            | Auth | Purpose                                                                   | deriveFrom |
| --------------- | ---------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing         | /                | No   | Marketing home with value props and signup CTA                            | —          |
| Login           | /login           | No   | Sign in                                                                   | —          |
| Signup          | /signup          | No   | Create account                                                            | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                             | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                                          | Login      |
| Dashboard       | /dashboard       | Yes  | KPI cards, low-stock alerts, movement trends, warehouse summary           | —          |
| Inventory       | /inventory       | Yes  | Full SKU data table with filters, search, bulk actions                    | —          |
| ProductDetail   | /products/:id    | Yes  | Single product: stock by warehouse, movement history, barcode             | —          |
| Warehouses      | /warehouses      | Yes  | Warehouse grid with capacity utilization and stock counts                 | —          |
| Orders          | /orders          | Yes  | Inbound/outbound orders table with status                                 | —          |
| Reports         | /reports         | Yes  | Turnover, aging, valuation, forecast analytics                            | —          |
| Settings        | /settings        | Yes  | Team, locations, integrations, notifications                              | —          |
| OrderDetail     | /orders/:id      | Yes  | Single order: line items, shipping, audit trail, receive/ship actions     | —          |
| WarehouseDetail | /warehouses/:id  | Yes  | Single warehouse: zones/bins, capacity breakdown, SKU list, staff         | —          |
| StockTransfer   | /transfers       | Yes  | Transfer stock between warehouses with scan flow, source/dest, items      | —          |
| Notifications   | /notifications   | Yes  | Activity feed: low-stock alerts, order updates, transfer events, mentions | —          |
| Profile         | /profile         | Yes  | Current user profile: avatar, contact, role, default warehouse, security  | —          |

## App Constraints

- Sidebar is deep navy (`#0f1729`) with teal active accent — data dashboard ergonomics
- SKU column always uses mono font in primary brand color
- Stock level badges are pill-shaped with semantic color pairs (In Stock / Low / Out / Overstock)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7490`
- Primary Hover: `#22a3bf`
- Primary Dark: `#0a5a70`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f1729`
- Navy Light: `#1a2744`

### Semantic

- In Stock: `#10b981`
- In Stock Light: `#d1fae5`
- Low Stock: `#f59e0b`
- Low Stock Light: `#fef3c7`
- Out of Stock: `#ef4444`
- Out of Stock Light: `#fee2e2`
- Overstock: `#8b5cf6`
- Overstock Light: `#ede9fe`
- Incoming: `#0ea5e9`
- Incoming Light: `#e0f2fe`
- Reserved: `#6b7280`
- Reserved Light: `#f3f4f6`

### Backgrounds

- Primary: `#f0f4f8`
- Secondary: `#e8eef4`
- Tertiary: `#dce4ed`
- Surface: `#ffffff`
- Surface Secondary: `#f7f9fb`
- Sidebar: `#0f1729`
- Sidebar Hover: `#1a2744`

### Text

- Primary: `#111827`
- Secondary: `#6b7280`
- Tertiary: `#4b5563`
- Inverse: `#f8fafc`
- SKU: `#0e7490`
- Quantity Positive: `#10b981`
- Quantity Negative: `#ef4444`
- Quantity Zero: `#9ca3af`
- Link: `#0e7490`
- Link Hover: `#0a5a70`

### Borders

- Primary: `#d1d9e6`
- Secondary: `#c3cdd9`
- Focus: `#0e7490`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#0a0f1a`
- Surface: `#111827`
- Surface Secondary: `#1f2937`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Sidebar: `#060a12`
- SKU: `#22d3ee`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace`
- SKU/Barcode labels use Mono at `sm` size

### Font Sizes (overrides)

- Metric Value: `2rem` (32px) — for KPI dashboard cards
- Metric Label: `0.75rem` (12px) — uppercase, letter-spacing `0.05em`

## Layout

- Content Max Width: `1440px`
- Grid Columns: `12` (desktop), `8` (tablet), `4` (mobile)
- Grid Gap: `24px`
- Sidebar Width: `256px` (collapsed: `72px`)
- Sidebar Background: navy (`#0f1729`)
- Sidebar Text: inverse, icons with `20px` size
- Sidebar Active Item: `#0e7490` left border (`3px`), `rgba(14, 116, 144, 0.12)` background
- Top Bar Height: `56px`
- Top Bar: white surface, bottom border, search bar centered
- Dashboard Card Min Width: `280px`
- Table Row Height: `52px`

## Components

### Stock Level Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Variants:
  - In Stock: `#d1fae5` background, `#059669` text
  - Low Stock: `#fef3c7` background, `#d97706` text
  - Out of Stock: `#fee2e2` background, `#dc2626` text
  - Overstock: `#ede9fe` background, `#7c3aed` text
  - Incoming: `#e0f2fe` background, `#0284c7` text
  - Reserved: `#f3f4f6` background, `#4b5563` text

### Inventory Data Table

- Header: `#f0f4f8` background, `600` weight, `xs` size, uppercase, `0.04em` tracking
- Row height: `52px`
- Row hover: `#f7f9fb`
- Cell padding: `12px 16px`
- SKU column: mono font, primary color, `sm` size
- Quantity column: tabular-nums, right-aligned
- Quantity coloring: positive green, zero muted, negative red
- Sortable column header: pointer cursor, chevron icon `14px`
- Sticky first column on horizontal scroll (mobile/tablet)
- Checkbox column: `40px` width, centered

### KPI Dashboard Card

- Border radius: `12px` (lg)
- Padding: `24px`
- Shadow: `sm`
- Border: `1px solid` border-primary
- Metric value: `2rem`, `700` weight
- Metric label: `0.75rem`, `500` weight, secondary text, uppercase
- Trend indicator: `sm` size, inline arrow icon
  - Positive trend: accent green + up arrow
  - Negative trend: error red + down arrow
  - Neutral: secondary text + dash
- Hover: `md` shadow

### Warehouse Selector

- Border radius: `8px`
- Height: `40px`
- Border: `1px solid` border-primary
- Dropdown: `lg` shadow, `8px` radius
- Selected warehouse: `600` weight, primary text
- Warehouse item: `16px` padding, hover `surface-secondary`
- Multi-select variant: pill badges for each selected warehouse
- "All Warehouses" option always first, bold

### Low Stock Alert Card

- Border radius: `8px`
- Border-left: `4px solid #f59e0b`
- Background: `#fffbeb`
- Padding: `12px 16px`
- Icon: warning triangle, `20px`, `#d97706`
- Product name: `500` weight, primary text
- Current/threshold display: `"3 / 10 units"` format, mono font
- Action button: `ghost` variant, primary color, right-aligned
- Dark theme: `rgba(245, 158, 11, 0.1)` background, `#fbbf24` border

### SKU Display

- Font family: mono
- Font size: `sm` (14px)
- Color: primary brand (`#0e7490`)
- Letter spacing: `0.02em`
- Copyable: click-to-copy with subtle tooltip confirmation
- Dark theme: `#22d3ee`

### Search Bar (Global)

- Position: centered in top bar
- Width: `480px` (desktop), full width (mobile)
- Height: `40px`
- Border radius: `8px`
- Background: `#f0f4f8`
- Border: `1px solid transparent`, focus: `1px solid #0e7490`
- Placeholder: `"Search SKUs, products, warehouses…"`
- Prefix icon: magnifying glass, `18px`, secondary text
- Keyboard shortcut hint: `/` badge, right side, `xs` mono

### Import/Export Actions

- Button group: outlined buttons, `8px` radius
- Import icon: upload arrow, `18px`
- Export icon: download arrow, `18px`
- Dropdown for format selection: CSV, XLSX, PDF
- Progress bar during import: `4px` height, primary color, `9999px` radius

### Sidebar Navigation

- Background: navy (`#0f1729`)
- Item padding: `12px 16px`
- Item border radius: `6px` (within `8px` horizontal margin)
- Icon size: `20px`, `rgba(255,255,255,0.5)` default, `#ffffff` active
- Label: `sm` size, `rgba(255,255,255,0.7)` default, `#ffffff` active
- Active state: `rgba(14, 116, 144, 0.15)` background, `3px` left border primary
- Section divider: `1px solid rgba(255,255,255,0.08)`, `16px` vertical margin
- Section label: `xs` size, `rgba(255,255,255,0.35)`, uppercase, `0.06em` tracking
- Collapsed: icons only, tooltip on hover (`md` shadow, `6px` radius)

### Warehouse Location Tag

- Border radius: `6px`
- Padding: `2px 8px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `#e0f2fe`
- Text: `#0369a1`
- Icon: map pin, `12px`, inline before text
- Dark theme: `rgba(14, 165, 233, 0.15)` background, `#38bdf8` text

### Barcode/QR Display

- Container: `1px dashed` border-secondary, `8px` radius, `16px` padding
- Barcode height: `48px`
- QR code size: `120px × 120px`
- Label below: mono, `xs`, secondary text
- Print button: `ghost` variant, `sm` size, bottom-right
