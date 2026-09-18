# DESIGN.md — Delivery Tracking

## Brand Identity

- **App Name:** Parcel
- **Tagline:** Every mile, accounted for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Operational, precise, confident, realtime

## Target Persona

Logistics coordinators and ecommerce ops teams who need at-a-glance visibility into hundreds of in-flight shipments and immediate alerts when something goes wrong.

## Screens

| Name           | Route            | Auth | Purpose                                                                                     | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                                              | —          |
| Login          | /login           | No   | Sign in                                                                                     | —          |
| Signup         | /signup          | No   | Create account                                                                              | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                               | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                            | Login      |
| Dashboard      | /dashboard       | Yes  | KPI overview, live shipments map, recent alerts                                             | —          |
| Shipments      | /shipments       | Yes  | Filterable shipments table with status chips                                                | —          |
| ShipmentDetail | /shipments/:id   | Yes  | Map + tracking timeline + carrier info                                                      | —          |
| Carriers       | /carriers        | Yes  | Carrier accounts, performance metrics, integrations                                         | —          |
| Webhooks       | /webhooks        | Yes  | Webhook endpoints + event log (monospace)                                                   | —          |
| Settings       | /settings        | Yes  | Account, notifications, API keys                                                            | —          |
| CarrierDetail  | /carriers/:id    | Yes  | Single carrier — performance metrics, integrations config, recent shipments                 | —          |
| Alerts         | /alerts          | Yes  | Operational alerts feed: exceptions, delays, customs holds, with acknowledge/assign actions | —          |
| Analytics      | /analytics       | Yes  | Delivery performance reports — on-time rate, exception trends, carrier comparison, charts   | —          |
| Profile        | /profile         | Yes  | Current user profile, avatar, contact, password                                             | —          |
| Team           | /team            | Yes  | Team member roster + roles + invite                                                         | —          |

## App Constraints

- Dashboard must keep map and shipments table visible together without scrolling on 1440px
- Tracking codes, webhook payloads, and timestamps always render in the JetBrains Mono tracking-code font
- Sidebar is dark navy (`#0c1629`) on every authed screen — the light/dark contrast anchors the layout

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Navy: `#0c1629`
- Navy Light: `#1e293b`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- In Transit: `#0891b2`
- In Transit Light: `#cffafe`
- Delivered: `#10b981`
- Delivered Light: `#d1fae5`
- Delayed: `#f59e0b`
- Delayed Light: `#fef3c7`
- Exception: `#ef4444`
- Exception Light: `#fee2e2`
- Pending: `#6366f1`
- Pending Light: `#e0e7ff`
- Returned: `#8b5cf6`
- Returned Light: `#ede9fe`
- Out for Delivery: `#06b6d4`
- Out for Delivery Light: `#ecfeff`

### Backgrounds

- Primary: `#f0f9ff`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Map Overlay: `rgba(12, 22, 41, 0.85)`
- Sidebar: `#0c1629`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Inverse: `#f8fafc`
- Link: `#0891b2`
- Link Hover: `#0e7490`
- Tracking Code: `#0891b2`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0891b2`

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
- Map Overlay: `rgba(2, 6, 23, 0.9)`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Tracking Code: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Data: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Sidebar Style: dark navy (`#0c1629`) background, light text, icon + label nav items
- Top Bar Height: `56px`
- Map Panel Min Height: `400px`
- Map Panel Default: `50%` of viewport on shipment detail
- Shipment List Width: `420px` (split view alongside map)
- Timeline Rail Width: `2px`
- Timeline Node Size: `12px`

## Components

### Shipment Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Border-left: `4px solid` status color (in-transit: primary, delivered: accent, delayed: warning, exception: error)
- Layout: carrier icon left, tracking code + recipient stacked right, status badge far right
- Tracking code font: tracking-code family, `14px`, medium weight
- Carrier name: `14px`, secondary text color
- Recipient: `16px`, semibold, primary text
- ETA line: `13px`, tertiary text, includes relative time ("arrives in 2 days")

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `12px` (xs)
- Font weight: `600`
- Text transform: uppercase, letter-spacing `0.05em`
- Variants use semantic status colors: background is `*-light`, text is the full status color
- Dot indicator: `8px` circle before label, filled with status color, with CSS pulse animation on "In Transit" and "Out for Delivery"

### Tracking Timeline

- Vertical orientation on desktop, horizontal on mobile
- Rail: `2px` solid, border-secondary color
- Node: `12px` circle, border `2px solid` status color, filled white (future) or filled status color (past/current)
- Current node: `16px`, accent color, outer glow ring (`0 0 0 4px` accent-light)
- Event text: `14px` primary, timestamp `12px` secondary
- Location text: `13px`, tertiary, with map-pin icon (`14px`)
- Spacing between events: `32px`

### Map View

- Border radius: `12px` (lg) when inset, `0` when full-bleed
- Route line: `3px` solid primary color, dashed for estimated remaining
- Origin marker: `24px` circle, navy background, white icon
- Destination marker: `24px` circle, accent background, white icon
- Current position marker: `32px`, primary color, animated pulse ring
- Cluster badge: `28px` circle, navy background, white count text, `700` weight
- Info popup: `280px` width, `12px` border radius, `md` shadow, `16px` padding

### Shipment Table

- Header: navy-light background (`#1e293b`), inverse text, `13px` uppercase, `600` weight, letter-spacing `0.05em`
- Row height: `56px`
- Row hover: primary background (`#f0f9ff`)
- Cell padding: `12px 16px`
- Tracking code cells: monospace font, primary color, underline on hover (clickable)
- Status column: inline status badge
- Carrier column: `20px` carrier logo icon + name
- Sortable columns: header arrow icon, active sort in primary color

### Notification Toast

- Border radius: `12px` (lg)
- Shadow: `lg`
- Width: `380px`
- Padding: `16px`
- Position: top-right, `24px` from edges
- Auto-dismiss: `5000ms` with progress bar (primary color, `2px` height at bottom)
- Icon: `20px`, status-colored
- Layout: icon left, title (`14px` semibold) + message (`13px` secondary) stacked right, dismiss X button

### Search & Filter Bar

- Border radius: `10px`
- Height: `44px`
- Background: surface
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Search icon: `18px`, secondary text color, left-aligned inside input
- Filter chips: `8px` border radius, `28px` height, `13px` font, border-secondary, selected: primary background + inverse text
- Filter categories: Status, Carrier, Date Range, Origin, Destination

### KPI Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Value: `28px` (between 2xl and 3xl), `700` weight, primary text
- Label: `13px`, secondary text, uppercase, letter-spacing `0.05em`
- Trend indicator: `13px`, inline arrow icon + percentage, accent (up) or error (down)
- Sparkline: `48px` height, `2px` stroke, primary color, below the value

### Carrier Logo

- Size: `32px` (list), `48px` (detail)
- Border radius: `8px` (md)
- Background: surface-secondary
- Border: `1px solid` border-primary
- Fallback: first two letters of carrier name, `600` weight, secondary text, centered

### Webhook Event Log

- Font family: tracking-code (monospace)
- Font size: `13px`
- Row height: `40px`
- Timestamp: `12px`, tertiary text, fixed `140px` width
- Method badge: `10px` font, `600` weight, pill shape, `POST` = primary, `GET` = accent
- Status code: monospace, `200` = accent, `4xx` = delayed color, `5xx` = exception color
- URL path: monospace, primary text, truncate with ellipsis at `300px`

### Realtime Pulse Indicator

- Size: `10px` circle
- Color: accent (connected), delayed (reconnecting), exception (disconnected)
- Animation: concentric ring pulse, `2s` infinite ease-out
- Label: `12px`, secondary text, beside indicator ("Live" / "Reconnecting" / "Offline")

## Design Principles

1. **Status at a glance** — every shipment surface must show its status via color-coded left border or badge without requiring interaction
2. **Data density without clutter** — dashboards show KPIs, tables, and map simultaneously; use navy/dark backgrounds to create visual sections
3. **Monospace for machine data** — tracking codes, webhook payloads, timestamps, and IDs always use the monospace tracking-code font
4. **Map as first-class citizen** — the map is not a secondary view; it shares equal screen space with list/detail views in split layouts
5. **Realtime feels alive** — pulse animations on in-transit markers, live indicators, and auto-updating timestamps reinforce that data is current
6. **Dark sidebar, light content** — the navy sidebar anchors navigation while the light content area maximizes readability for dense shipment data
