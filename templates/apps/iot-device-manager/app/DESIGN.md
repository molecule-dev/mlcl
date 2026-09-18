# DESIGN.md — IoT Device Manager

## Brand Identity

- **App Name:** Filament
- **Tagline:** Every signal, orchestrated
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Technical
- Calm
- Precise
- Orchestrated

## Target Persona

DevOps and IoT platform operators managing fleets of thousands of connected devices across environments.

## Screens

| Name           | Route            | Auth | Purpose                                                        | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with platform capabilities and ROI              | —          |
| Login          | /login           | No   | Sign in                                                        | —          |
| Signup         | /signup          | No   | Create account                                                 | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                  | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                               | Login      |
| Dashboard      | /dashboard       | Yes  | Fleet overview, alerts, telemetry summary                      | —          |
| Devices        | /devices         | Yes  | Device list with filters, status, firmware version             | Dashboard  |
| DeviceDetail   | /devices/:id     | Yes  | Device profile with live telemetry, command console, event log | Dashboard  |
| Fleets         | /fleets          | Yes  | Logical grouping of devices with bulk operations               | Dashboard  |
| Firmware       | /firmware        | Yes  | Firmware versions and rollout campaigns                        | Dashboard  |
| Alerts         | /alerts          | Yes  | Active and historical alerts with severity and acknowledgement | Dashboard  |
| Console        | /console         | Yes  | Live command console with device selector                      | Dashboard  |
| Settings       | /settings        | Yes  | Account, environments, API keys, webhooks                      | Dashboard  |

## App Constraints

- Dark navy sidebar (`#0c1222`) on all authenticated screens
- Mono font (JetBrains Mono) for device IDs, telemetry values, and firmware versions
- Status colors: Online #10b981, Offline #6b7280, Warning #f59e0b, Critical #ef4444

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Accent: `#6366f1`
- Accent Hover: `#818cf8`
- Accent Dark: `#4f46e5`

### Semantic

- Online: `#10b981`
- Online Light: `#d1fae5`
- Offline: `#6b7280`
- Offline Light: `#f3f4f6`
- Warning: `#f59e0b`
- Warning Light: `#fef3c7`
- Critical: `#ef4444`
- Critical Light: `#fee2e2`
- Firmware Current: `#10b981`
- Firmware Pending: `#f59e0b`
- Firmware Failed: `#ef4444`
- Telemetry: `#06b6d4`
- Telemetry Light: `#cffafe`
- Command Sent: `#8b5cf6`
- Command Ack: `#10b981`
- Command Timeout: `#f59e0b`

### Backgrounds

- Primary: `#f0f9ff`
- Secondary: `#e0f2fe`
- Tertiary: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Console: `#0c1222`
- Topology: `#f0fdfa`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#475569`
- Device ID: `#0891b2`
- Telemetry Value: `#0f172a`
- Telemetry Unit: `#94a3b8`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0891b2`
- Device Card: `#e0f2fe`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#818cf8`
- Background: `#0a0f1e`
- Background Secondary: `#0f172a`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Console: `#060a12`
- Device ID: `#22d3ee`
- Online: `#34d399`
- Telemetry: `#67e8f9`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Device ID: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Usage

- Device IDs, MAC addresses, firmware versions, telemetry values, and command payloads use the `Data` font family
- All dashboard metrics and chart labels use `Data` at `font-variant-numeric: tabular-nums`
- Body copy, navigation, and headings use `Body`/`Heading`

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Device Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Device Grid Gap: `20px`
- Telemetry Panel Width: `360px` (right-side drawer)
- Dashboard Grid: `12-column` with `16px` gap
- Metric Card Min Width: `240px`
- Console Panel Height: `280px` (resizable)

## Components

### Device Card

- Border radius: `12px` (lg)
- Border: `1px solid` device-card border
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Status indicator: `10px` circle, top-right, color-coded (online/offline/warning/critical)
- Status indicator glow: `0 0 8px` with status color at `0.4` opacity (online devices only)
- Device name: `base` size, `600` weight
- Device ID: `Data` font, `sm` size, device-id color, truncated with tooltip
- Last seen: `xs` size, secondary text, relative time format
- Bottom row: firmware version badge + signal strength icon

### Telemetry Chart

- Border radius: `12px` (lg)
- Background: surface
- Padding: `20px`
- Chart line color: telemetry (`#06b6d4`)
- Chart area fill: telemetry at `0.08` opacity
- Grid lines: `1px` dashed, border-primary at `0.5` opacity
- Axis labels: `Data` font, `xs` size, secondary text
- Tooltip: `8px` radius, console background, inverse text, `Data` font
- Time range selector: pill buttons, `sm` size (1h, 6h, 24h, 7d, 30d)

### Metric Tile

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `16px`
- Value: `Data` font, `2xl` size, `700` weight
- Unit: `Data` font, `sm` size, telemetry-unit color, inline after value
- Label: `sm` size, secondary text, below value
- Trend indicator: `xs` size, inline arrow + percentage, green (up-good) or red (up-bad) contextual
- Sparkline: `40px` height, bottom of tile, no axes, telemetry color

### Device Table

- Header: `600` weight, `sm` size, uppercase, `0.05em` letter-spacing, secondary text
- Header background: surface-secondary
- Row height: `56px`
- Row hover: `#f0f9ff` (light), `#1a2332` (dark)
- Status column: colored dot (`8px`) + status text
- Device ID column: `Data` font, primary color, clickable
- Cell padding: `12px 16px`
- Sortable columns: header with sort icon, active column highlighted
- Bulk select: checkbox column, `32px` width
- Zebra striping: alternating surface/surface-secondary

### Command Console

- Border radius: `8px` top corners only
- Background: console (`#0c1222`)
- Text: `Data` font, `sm` size, `#e2e8f0`
- Input line: `$` prompt in `#22d3ee`, input in `#f1f5f9`
- Output: `#94a3b8` default, `#34d399` success, `#f87171` error, `#fbbf24` warning
- Timestamp: `xs` size, `#475569`, left margin
- Scrollable with `4px` custom scrollbar, `#1e3a5f` thumb
- Padding: `16px`

### Firmware Update Card

- Border radius: `8px` (md)
- Border-left: `4px solid` — current: firmware-current, pending: firmware-pending, failed: firmware-failed
- Background: surface
- Padding: `16px 20px`
- Version number: `Data` font, `600` weight
- Progress bar: `6px` height, `9999px` radius, primary color fill, border-secondary track
- Rollout percentage: `Data` font, `sm` size, right-aligned

### Alert Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` — critical: `#ef4444`, warning: `#f59e0b`, info: `#0891b2`
- Background: respective semantic light color at `0.5` opacity
- Timestamp: `Data` font, `xs` size, secondary text, right-aligned
- Unread indicator: `8px` primary-colored dot, left of alert text
- Dismiss: ghost button, `xs` size, right side

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font: `xs` size, `600` weight
- Online: online color text, online-light background
- Offline: offline color text, offline-light background
- Warning: warning color text (darkened), warning-light background
- Critical: critical color text, critical-light background
- Updating: accent color text, accent at `0.1` background, animated pulse border

### Signal Strength Icon

- Size: `16px`
- 4 bars, spaced `2px` apart
- Bar widths: `3px` each
- Bar heights: `4px`, `7px`, `10px`, `13px`
- Active bars: primary color
- Inactive bars: border-primary color
- Thresholds: 4 bars (excellent), 3 (good), 2 (fair), 1 (poor), 0 (no signal, all inactive + critical color)

### Topology Map

- Background: topology (`#f0fdfa`), dark: `#0a1a14`
- Node size: `48px` circle
- Node border: `2px solid` status color
- Node icon: device type icon, `20px`, centered
- Edge line: `1.5px`, `#94a3b8`, curved bezier
- Active edge: primary color, animated dash (`4px` dash, `4px` gap, `1s` linear loop)
- Selected node: `3px` primary border + `0 0 12px` primary glow at `0.3` opacity
- Cluster group: dashed border, `16px` radius, secondary-light fill at `0.3` opacity
- Zoom controls: bottom-right, `8px` radius buttons, surface background

### Search & Filter Bar

- Height: `48px`
- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Search icon: `20px`, secondary text color, left-padded `12px`
- Input: `base` size, no visible border (integrated)
- Filter chips: pill badges, `sm` size, secondary background, dismissable `x`
- Active filter: primary color outline, primary-light background
