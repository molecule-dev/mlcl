# DESIGN.md — Warehouse Fulfillment

## Brand Identity

- **App Name:** Sorthaus
- **Tagline:** Fulfillment without friction
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Industrial, precise, authoritative, action-oriented

## Target Persona

Warehouse operators, pickers, packers, and fulfillment managers who need glanceable status and large tap targets while moving between physical tasks.

## Screens

| Name            | Route            | Auth | Purpose                                                        | deriveFrom |
| --------------- | ---------------- | ---- | -------------------------------------------------------------- | ---------- |
| Landing         | /                | No   | Marketing home with value props and signup CTA                 | —          |
| Login           | /login           | No   | Sign in                                                        | —          |
| Signup          | /signup          | No   | Create account                                                 | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                  | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                               | Login      |
| Dashboard       | /dashboard       | Yes  | Fulfillment KPIs, live order flow, zone heatmap                | —          |
| Orders          | /orders          | Yes  | Order queue with lifecycle status and bulk actions             | —          |
| OrderDetail     | /orders/:id      | Yes  | Single order with items, shipping, lifecycle tracker           | —          |
| PickList        | /pick/:id        | Yes  | Active pick run with bin locations and scan UI                 | —          |
| Inventory       | /inventory       | Yes  | SKU-level stock across bins with low-stock alerts              | —          |
| Shipments       | /shipments       | Yes  | Outbound manifests and tracking labels                         | —          |
| Settings        | /settings        | Yes  | Warehouse, users, integrations, notifications                  | —          |
| InventoryDetail | /inventory/:sku  | Yes  | Single SKU with bin breakdown, movement history, replenishment | —          |
| ShipmentDetail  | /shipments/:id   | Yes  | Manifest, shipping label, tracking timeline                    | —          |
| Receiving       | /receiving       | Yes  | Inbound goods queue with ASN/PO check-in and putaway           | —          |
| Returns         | /returns         | Yes  | Returned and damaged goods triage queue                        | —          |
| Reports         | /reports         | Yes  | Throughput, SLA, and fulfillment analytics over time           | —          |
| Notifications   | /notifications   | Yes  | Rush order alerts, low-stock warnings, scan errors feed        | —          |
| Profile         | /profile         | Yes  | Operator profile, shift, and performance stats                 | —          |
| Scanner         | /scan            | Yes  | Full-viewport barcode scan mode (no sidebar)                   | —          |
| Locations       | /locations       | Yes  | Warehouse zones, aisles, and bin management                    | —          |

## App Constraints

- Sidebar is dark navy `#0f172a` with light content area; maintain this contrast on every authed screen
- SKUs, bin locations, tracking numbers, and quantities always render in JetBrains Mono (tabular-nums for quantities)
- Every order/item must communicate lifecycle state via color-coded status badges or left border accents

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7490` (deep teal — warehouse tech, scanners, dock displays)
- Primary Hover: `#06b6d4`
- Primary Dark: `#0c4a6e`
- Accent: `#10b981` (emerald green — completion, shipment, go)
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f172a` (sidebar, headers, authority)

### Semantic — Order Lifecycle

- Pending: `#f59e0b`
- Pending Light: `#fef3c7`
- Picking: `#3b82f6`
- Picking Light: `#dbeafe`
- Packed: `#0e7490`
- Packed Light: `#cffafe`
- Shipped: `#10b981`
- Shipped Light: `#d1fae5`
- Delivered: `#047857`
- Delivered Light: `#a7f3d0`
- Returned: `#ef4444`
- Returned Light: `#fee2e2`
- Cancelled: `#6b7280`
- Cancelled Light: `#f3f4f6`

### Semantic — Inventory

- In Stock: `#10b981`
- Low Stock: `#f59e0b`
- Out of Stock: `#ef4444`
- Backorder: `#8b5cf6`
- Backorder Light: `#ede9fe`

### Semantic — Priority

- Rush: `#dc2626`
- Rush Light: `#fee2e2`
- Express: `#f59e0b`
- Express Light: `#fef3c7`
- Standard: `#6b7280`
- Standard Light: `#f3f4f6`

### Backgrounds

- Primary: `#f1f5f9` (cool slate — warehouse/industrial feel)
- Secondary: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Sidebar: `#0f172a` (dark navy)
- Sidebar Hover: `#1e293b`
- Scanner Overlay: `rgba(14, 116, 144, 0.08)` (subtle teal tint for active scan zones)

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Inverse: `#f8fafc`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`
- Link: `#0e7490`
- Link Hover: `#0c4a6e`
- SKU: `#475569` (monospaced SKU/barcode text)

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0e7490`
- Zone: `#06b6d4` (dashed borders for drop zones, pick zones)

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e293b`
- Sidebar: `#020617`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 700)
- Mono: `"JetBrains Mono", "SF Mono", "Fira Code", Consolas, monospace` (SKUs, barcodes, tracking numbers, bin locations)
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums — quantities, weights, dimensions)

## Layout

- Content Max Width: `1440px`
- Grid Columns: `12` (desktop), `8` (tablet), `4` (mobile)
- Grid Gap: `16px`
- Sidebar Width: `256px` (collapsed: `72px`)
- Top Bar Height: `56px`
- Stats Bar Height: `80px` (KPI strip below top bar)
- Detail Panel Width: `480px` (slide-out order/item detail)
- Scanner Mode: full viewport, no sidebar, minimal chrome

## Components

### Order Card

- Border radius: `8px` (md)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Border-left: `4px solid` (color matches order lifecycle status)
- Header: order number (mono, semibold) + customer name (body, medium)
- Meta row: item count, total weight, shipping method badge
- Footer: timestamp (secondary text) + action button (primary, sm)
- Compact variant: single row for table/list views

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Each lifecycle status maps to its semantic color pair (text on light background)
- Dot variant: `8px` circle + status text (for inline use)

### Pick List Item

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border: `1px solid` border-primary
- Background: surface, checked: `#f0fdfa` (teal-50 tint)
- Checkbox: `24px` rounded square, primary color when checked
- SKU in mono font, product name in body, quantity in data font (bold)
- Bin location: mono font, background `#f1f5f9`, padding `2px 8px`, radius `4px`
- Swipe-to-complete on mobile

### Bin Location Tag

- Border radius: `4px` (sm)
- Background: `#f1f5f9`
- Border: `1px solid #e2e8f0`
- Padding: `2px 8px`
- Font: mono, `xs` (12px), weight `600`
- Color: `#0f172a`
- Format: `A-12-03` (zone-aisle-shelf)

### Barcode / SKU Display

- Font: mono, `sm` (14px)
- Letter spacing: `0.05em`
- Color: SKU text color (`#475569`)
- Background: `#f8fafc`
- Padding: `4px 8px`
- Border radius: `4px` (sm)
- Copy-on-click interaction

### Shipping Label Preview

- Border radius: `8px` (md)
- Border: `2px dashed #cbd5e1`
- Background: `#ffffff`
- Padding: `24px`
- Aspect ratio: `4:6` (standard label)
- Shadow: `sm`
- Hover: `md` shadow + subtle scale (1.01)

### KPI Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Label: secondary text, `sm`, weight `500`
- Value: primary text, `2xl` (24px), weight `700`, data font (tabular nums)
- Trend indicator: small arrow + percentage, success (up) or error (down) color
- Sparkline: `48px` height, primary color, below value

### Progress Tracker (Order Lifecycle)

- Horizontal stepper with connected line
- Step circle: `32px`, border `2px solid`
- Completed: accent fill, white checkmark
- Current: primary fill, white dot
- Upcoming: border-primary, empty
- Connector line: `2px`, completed: accent, upcoming: border-primary
- Labels below each step: `xs`, secondary text

### Warehouse Zone Map

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Background: `#f8fafc`
- Zone blocks: rounded `8px`, colored by zone type (receiving: blue, storage: slate, picking: teal, packing: emerald, shipping: green)
- Active zone: pulsing border animation (primary color, `1.5s ease`)
- Hover: zone name tooltip + current activity count

### Data Table (Orders / Inventory)

- Header: navy background (`#0f172a`), inverse text, `sm`, weight `600`
- Row height: `52px`
- Row hover: scanner overlay background
- Cell padding: `12px 16px`
- Sortable columns: chevron icon, primary color when active
- Sticky first column on horizontal scroll
- Bulk select: checkbox column, primary color
- Inline status badges in status column
- Quantity cells: data font (tabular nums), right-aligned

### Search & Filter Bar

- Border radius: `8px` (md)
- Height: `44px`
- Background: surface
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Search icon: secondary text color
- Filter chips: pill shape, secondary background, `sm` text
- Active filter chip: primary background, inverse text
- Barcode scan button: accent color, right-aligned in search bar

### Notification Toast (Realtime)

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Border-left: `4px solid` (semantic color by type)
- Max width: `400px`
- Position: top-right, `16px` from edges
- Auto-dismiss: `5s` for info, persistent for errors
- Slide-in animation: `300ms ease`
- Sound: subtle chime for new order, alert for rush priority

### Action Button Group (Pick/Pack/Ship)

- Primary action: accent background, `48px` height (lg), full width on mobile
- Secondary actions: outline variant, grouped in row
- Confirm action: two-step (tap once to arm, tap again to confirm) for ship/complete
- Icon + text layout, `16px` icon size
- Disabled state: `0.5` opacity, no pointer events

## Design Principles

1. **Scanability over beauty** — warehouse operators glance at screens between physical tasks. High contrast, large touch targets, clear status colors
2. **Status is king** — every item, order, and zone should communicate its state through color at a glance
3. **Monospace for machine data** — SKUs, barcodes, tracking numbers, and bin locations always in mono font for easy reading and scanning
4. **Tabular numbers for quantities** — all numeric data uses tabular-nums so columns align perfectly
5. **Dark sidebar, light content** — the navy sidebar provides a stable anchor; content area stays bright for readability under warehouse lighting
6. **Touch-friendly** — minimum `44px` tap targets, generous spacing, swipe gestures for common actions
7. **Realtime feedback** — every scan, pick, and pack triggers immediate visual confirmation
