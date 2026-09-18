# DESIGN.md — Fleet Management

## Brand Identity

- **App Name:** Bearing
- **Tagline:** Command every mile
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Operational, commanding, data-dense, realtime

## Target Persona

Dispatchers and fleet operations managers monitoring vehicles, drivers, and maintenance across a large fleet in real time.

## Screens

| Name              | Route            | Auth | Purpose                                                                                                     | deriveFrom |
| ----------------- | ---------------- | ---- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| Landing           | /                | No   | Marketing home with value props and signup CTA                                                              | —          |
| Login             | /login           | No   | Sign in                                                                                                     | —          |
| Signup            | /signup          | No   | Create account                                                                                              | Login      |
| ForgotPassword    | /forgot-password | No   | Request reset                                                                                               | Login      |
| ResetPassword     | /reset-password  | No   | Set new password                                                                                            | Login      |
| Dashboard         | /dashboard       | Yes  | Fleet overview with KPIs, live map, alerts                                                                  | —          |
| Vehicles          | /vehicles        | Yes  | Vehicle fleet list with status and filters                                                                  | —          |
| VehicleDetail     | /vehicles/:id    | Yes  | Single vehicle view with map, history, telematics                                                           | —          |
| Drivers           | /drivers         | Yes  | Driver roster with profiles and scores                                                                      | —          |
| Maintenance       | /maintenance     | Yes  | Maintenance schedule, upcoming and overdue                                                                  | —          |
| Alerts            | /alerts          | Yes  | Alerts and incident timeline                                                                                | —          |
| Reports           | /reports         | Yes  | Analytics and scheduled reports                                                                             | —          |
| Settings          | /settings        | Yes  | Profile, geofences, notifications                                                                           | —          |
| DriverDetail      | /drivers/:id     | Yes  | Single driver profile with safety score, trip history, vehicle assignment, hours of service, certifications | —          |
| Routes            | /routes          | Yes  | Active and planned routes with map-dominant dispatch view, stops, ETAs, and deviations                      | —          |
| Trips             | /trips           | Yes  | Historical trip log with KPIs, filters, expandable rows showing route playback and events                   | —          |
| Geofences         | /geofences       | Yes  | Geofence manager with map-dominant editor, list of zones, entry/exit rules                                  | —          |
| MaintenanceDetail | /maintenance/:id | Yes  | Single work order with parts, labor, cost summary, technician assignment, activity timeline                 | —          |

## App Constraints

- Top command bar uses dark navy background for operations-center feel
- Map-dominant layouts on Dashboard/Routes with min 55% viewport width
- Realtime LIVE indicator uses pulsing accent green; vehicle status colors are reserved (green=operational, cyan=in-transit, amber=idle, red=alert)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0c1929`
- Navy Light: `#162a44`

### Semantic

- Operational: `#10b981`
- Operational Light: `#d1fae5`
- In Transit: `#0891b2`
- In Transit Light: `#cffafe`
- Idle: `#f59e0b`
- Idle Light: `#fef3c7`
- Offline: `#6b7280`
- Offline Light: `#f3f4f6`
- Maintenance Due: `#f97316`
- Maintenance Due Light: `#ffedd5`
- Critical Alert: `#dc2626`
- Critical Alert Light: `#fee2e2`
- Geofence: `#8b5cf6`
- Geofence Light: `#ede9fe`

### Backgrounds

- Primary: `#f0f4f8`
- Secondary: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Map Overlay: `rgba(12, 25, 41, 0.85)`
- Command Bar: `#0c1929`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Tertiary: `#475569`
- Inverse: `#f8fafc`
- Metric: `#0f172a`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0891b2`
- Map Card: `rgba(8, 145, 178, 0.3)`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#0a1628`
- Surface: `#152238`
- Surface Secondary: `#1c2d47`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Command Bar: `#060e1a`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Metric: `"DM Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1600px`
- Grid Columns: `12` (desktop), `6` (tablet), `2` (mobile)
- Grid Gap: `16px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Map Panel Min Width: `55%`
- Detail Panel Width: `400px`
- Top Bar Height: `56px`
- Status Bar Height: `32px` (bottom bar for fleet-wide stats)
- KPI Row Height: `88px`

## Components

### Vehicle Card

- Border radius: `8px` (md)
- Shadow: `sm`, hover: `md`
- Padding: `12px 16px`
- Left border: `3px solid` status color (operational/idle/offline/maintenance)
- Status dot: `8px` circle, top-right, pulsing animation for in-transit
- Font: metric font for speed/mileage, body font for labels
- Compact variant: single row, `48px` height, for list views

### Map Marker

- Size: `36px` (default), `28px` (clustered), `44px` (selected)
- Shape: rounded rectangle with bottom pointer, `6px` radius
- Fill: status color (operational green, idle amber, offline gray, alert red)
- Selected: `2px` primary border + `lg` shadow
- Label: vehicle ID in `xs` metric font, white text on status-colored background
- Cluster: circle with count badge, navy background, primary border

### Route Line

- Active route: `3px` solid primary, with directional arrows every `80px`
- Planned route: `2px` dashed primary, `60%` opacity
- Completed route: `2px` solid accent, `40%` opacity
- Deviation: `2px` solid critical-alert color

### KPI Tile

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px 20px`
- Metric value: `2xl` size, `700` weight, metric font
- Label: `sm` size, secondary text color
- Delta indicator: `xs` size, accent (positive) or critical-alert (negative), with up/down arrow
- Spark line: `32px` height, `1.5px` stroke, primary color, bottom-aligned

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Dot: `6px` circle before text
- Variants: operational (accent bg-light), in-transit (primary bg-light), idle (idle bg-light), offline (offline bg-light), maintenance (maintenance bg-light), alert (critical bg-light)

### Data Table (Fleet/Driver/Maintenance)

- Header: navy background, inverse text, `600` weight, `sm` font
- Row height: `52px`
- Row hover: surface-secondary
- Cell padding: `8px 16px`
- Sortable column header: underline on hover, arrow indicator
- Inline status: status badge (pill) in status column
- Expandable row: chevron left, expands to detail card with map thumbnail

### Alert Banner

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` severity color
- Icon: `20px`, severity-matched
- Severity levels: info (primary), warning (idle color), critical (critical-alert), resolved (accent)
- Timestamp: `xs` metric font, secondary text, right-aligned
- Dismissible: `x` button, ghost style

### Driver Profile Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Avatar: `48px`, `full` radius, fallback to initials on navy background
- Padding: `20px`
- Score ring: `56px` diameter, `4px` stroke, color mapped to score (accent >80, idle 60-80, critical-alert <60)
- Stats row: hours driven, trips completed, safety score — metric font, `lg` size

### Maintenance Schedule Card

- Border radius: `8px` (md)
- Shadow: `sm`
- Padding: `16px`
- Left accent: `3px solid` — accent (completed), idle (upcoming), maintenance-due (overdue), critical-alert (past due)
- Date: metric font, `sm` size
- Service type: `600` weight, primary text
- Vehicle tag: pill badge, secondary background
- Calendar dot colors: match left accent colors

### Map Controls Overlay

- Position: top-right of map panel
- Border radius: `8px` (md)
- Shadow: `lg`
- Background: surface with `95%` opacity
- Button size: `36px` square
- Button gap: `4px`
- Icon size: `18px`
- Active filter: primary background, inverse icon

### Command Palette (Search)

- Border radius: `12px` (lg)
- Shadow: `xl`
- Background: surface
- Input height: `48px`
- Input font: `lg` body font
- Result row height: `44px`
- Result icon: `20px`, secondary color
- Category label: `xs`, `600` weight, uppercase, secondary color
- Keyboard hint: `xs` metric font, secondary bg pill
- Max height: `480px`, scrollable

### Sidebar Navigation

- Width: `260px` (expanded), `64px` (collapsed)
- Background: navy
- Text: inverse, `400` weight
- Active item: primary background at `15%` opacity, primary left border `3px`, `500` weight
- Hover: white at `8%` opacity background
- Icon size: `20px`
- Section divider: `1px` white at `10%` opacity
- Collapse toggle: bottom, chevron icon

### Realtime Indicator

- Dot: `8px`, accent color, CSS pulse animation (`2s` infinite)
- Label: `xs` metric font, "LIVE" text, accent color
- Position: top bar, right of search
- Disconnected state: offline color, no pulse, "OFFLINE" text
