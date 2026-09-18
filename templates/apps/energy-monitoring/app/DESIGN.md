# DESIGN.md — Energy Monitoring

## Brand Identity

- **App Name:** Voltrace
- **Tagline:** See every watt, save every cent
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, data-dense, calm, technical

## Target Persona

Homeowners with solar/battery systems and facility managers who need real-time power insight, historical usage trends, and cost forecasting in a glanceable control-room aesthetic.

## Screens

| Name           | Route             | Auth | Purpose                                                                                | deriveFrom |
| -------------- | ----------------- | ---- | -------------------------------------------------------------------------------------- | ---------- |
| Login          | /login            | No   | Sign in                                                                                | —          |
| Signup         | /signup           | No   | Create account                                                                         | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                                          | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                                       | Login      |
| Dashboard      | /dashboard        | Yes  | Realtime power gauge, KPI row, usage chart                                             | —          |
| Devices        | /devices          | Yes  | Connected devices and their live wattage                                               | —          |
| Reports        | /reports          | Yes  | Historical usage and cost reports                                                      | —          |
| Alerts         | /alerts           | Yes  | Alert configuration and active notifications                                           | —          |
| Settings       | /settings         | Yes  | Account, rates, integrations, notifications                                            | —          |
| DeviceDetail   | /devices/:id      | Yes  | Live wattage trend, schedule, controls, recent events for one device                   | —          |
| AlertRule      | /alerts/rules/new | Yes  | Create or edit an alert rule — thresholds, conditions, schedule, notification channels | —          |
| Profile        | /profile          | Yes  | User profile — identity, household/facility, energy goals, achievements                | —          |
| Billing        | /billing          | Yes  | Subscription plan, payment method, add-ons, invoice history                            | —          |

## App Constraints

- Dark-first — every chart assumes dark surface (#0c1222 bg, #1a2744 surface); light mode is secondary
- All numeric values render in mono font with tabular-nums; watts, kWh, cost, timestamps use JetBrains Mono
- Charts use the color sequence listed (consumption blue, production amber, export green, import rose) — never decorative

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0ea5e9`
- Primary Hover: `#38bdf8`
- Primary Dark: `#0284c7`
- Accent Cyan: `#06b6d4`
- Accent Cyan Hover: `#22d3ee`
- Accent Green: `#10b981`
- Accent Green Hover: `#34d399`

### Semantic

- Production (Solar/Generation): `#f59e0b`
- Production Light: `#fef3c7`
- Consumption: `#0ea5e9`
- Consumption Light: `#e0f2fe`
- Export (Grid Out): `#10b981`
- Export Light: `#d1fae5`
- Import (Grid In): `#f43f5e`
- Import Light: `#ffe4e6`
- Savings: `#10b981`
- Overspend: `#ef4444`
- Off-Peak: `#8b5cf6`
- Off-Peak Light: `#ede9fe`
- Peak: `#f97316`
- Peak Light: `#fff7ed`

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111a2e`
- Tertiary: `#162032`
- Surface: `#1a2744`
- Surface Secondary: `#1e2d4d`
- Input: `#162032`
- Overlay: `rgba(0, 0, 0, 0.65)`
- Chart Area: `#0f1829`

### Text

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#38bdf8`
- Link Hover: `#0ea5e9`
- Watts: `#f1f5f9`
- Cost: `#10b981`

### Borders

- Primary: `#1e3a5f`
- Secondary: `#2d4a6f`
- Focus: `#0ea5e9`
- Chart Grid: `rgba(148, 163, 184, 0.12)`

### Dark Theme Overrides

Dark-first design — the defaults above ARE the dark theme. Light overrides:

- Background Primary: `#f0f4f8`
- Background Secondary: `#e8eef4`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#cbd5e1`
- Chart Area: `#f8fafc`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono (readings/values): `"JetBrains Mono", "SF Mono", "Fira Code", Consolas, monospace`

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Sidebar Nav Width: `240px` (collapsed: `64px`)
- Top Bar Height: `56px`
- KPI Row Height: `96px`
- Chart Default Height: `320px`
- Chart Compact Height: `200px`
- Alert Drawer Width: `380px`

## Components

### KPI Stat Card

- Border radius: `12px` (lg)
- Shadow: none (border-only on dark bg)
- Border: `1px solid` border-primary
- Background: surface
- Padding: `20px 24px`
- Value font: mono, `2xl` (24px), weight `700`
- Label font: body, `sm` (14px), weight `400`, text-secondary
- Trend indicator: `12px` arrow icon + percentage in savings/overspend color
- Icon: `32px` left-aligned, primary or semantic color with `0.15` opacity background circle

### Realtime Power Gauge

- Border radius: `16px` (xl)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `24px`
- Gauge arc stroke width: `12px`
- Gauge diameter: `200px`
- Center value font: mono, `4xl` (36px), weight `700`
- Unit label: body, `sm`, text-secondary
- Segment colors: off-peak → consumption → peak (gradient stops)

### Usage Chart (Area/Line)

- Border radius: `12px` (lg)
- Background: chart-area
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Chart padding (internal): `8px`
- Grid lines: chart-grid color, `1px` dashed
- Consumption line: consumption color, `2px` stroke
- Production fill: production color at `0.2` opacity
- Export fill: export color at `0.15` opacity
- Import fill: import color at `0.15` opacity
- Tooltip: surface background, `8px` radius, `md` shadow, `12px 16px` padding
- Legend dot size: `8px` circle, `8px` gap to label
- Time axis font: data, `xs` (12px), text-tertiary

### Cost Breakdown Bar

- Border radius: `8px` (md)
- Bar height: `32px`
- Segment border radius: `0` (flush segments) with `8px` on outer edges
- Segment colors: peak, off-peak, production (offset credits)
- Label font: body, `sm`, weight `500`
- Value font: data, `sm`, weight `600`

### Alert Card

- Border radius: `8px` (md)
- Border-left: `4px solid` (severity color)
- Background: surface
- Padding: `12px 16px`
- Severity colors: error (critical), production (warning/solar), info (informational)
- Timestamp font: data, `xs`, text-tertiary
- Title font: body, `sm`, weight `600`
- Unread indicator: `8px` primary-colored dot, top-right

### Date Range Picker

- Border radius: `8px` (md)
- Background: input
- Border: `1px solid` border-primary
- Height: `40px`
- Quick presets: `Today`, `7D`, `30D`, `90D`, `1Y`, `Custom`
- Active preset: primary background at `0.15` opacity, primary text, weight `600`
- Preset pill radius: `9999px` (full)
- Preset pill padding: `4px 12px`

### Device Row

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Height: `56px`
- Icon: `24px`, left-aligned, text-secondary
- Name font: body, `sm`, weight `500`
- Wattage font: mono, `sm`, weight `600`
- Status dot: `8px`, savings (online) / text-tertiary (offline)
- Hover: surface-secondary background

### Solar Production Panel

- Border radius: `12px` (lg)
- Background: linear gradient from `rgba(245, 158, 11, 0.05)` to transparent (top to bottom)
- Border: `1px solid rgba(245, 158, 11, 0.2)`
- Padding: `20px 24px`
- Sun icon: `24px`, production color
- Current output font: mono, `3xl` (30px), weight `700`, production color
- Daily total font: data, `lg`, weight `600`
- Efficiency percentage: badge style, production background at `0.15` opacity, production text

### Report Table

- Header background: surface-secondary
- Header font: body, `xs`, weight `600`, text-secondary, uppercase, `0.05em` letter-spacing
- Row hover: surface-secondary
- Border: `1px solid` border-primary (horizontal only)
- Cell padding: `12px 16px`
- Number cells: mono font, right-aligned
- Cost cells: savings color for credits, text-primary for charges
- Striped: alternating surface/surface-secondary

### Push Notification Toast

- Border radius: `12px` (lg)
- Shadow: `lg`
- Background: surface
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Icon size: `20px`
- Title font: body, `sm`, weight `600`
- Body font: body, `sm`, weight `400`, text-secondary
- Auto-dismiss: `5000ms`
- Entry animation: slide in from top-right, `300ms ease`

## Chart Color Sequences

When multiple data series appear on the same chart, use these colors in order:

1. `#0ea5e9` (consumption/primary)
2. `#f59e0b` (production/solar)
3. `#10b981` (export/savings)
4. `#f43f5e` (import/cost)
5. `#8b5cf6` (off-peak/storage)
6. `#06b6d4` (accent cyan — secondary metric)
7. `#ec4899` (overflow — rarely needed)
