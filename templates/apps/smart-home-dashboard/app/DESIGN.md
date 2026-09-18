# DESIGN.md — Smart Home Dashboard

## Brand Identity

- **App Name:** Ember
- **Tagline:** Your home, always aglow
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Ambient, attentive, inviting, intelligent

## Target Persona

Smart home enthusiasts controlling lights, climate, security, and automations across rooms.

## Screens

| Name             | Route                 | Auth | Purpose                                                              | deriveFrom |
| ---------------- | --------------------- | ---- | -------------------------------------------------------------------- | ---------- |
| Landing          | /                     | No   | Marketing home with connected demo                                   | —          |
| Login            | /login                | No   | Sign in                                                              | —          |
| Signup           | /signup               | No   | Create account                                                       | Login      |
| ForgotPassword   | /forgot-password      | No   | Request reset                                                        | Login      |
| ResetPassword    | /reset-password       | No   | Set new password                                                     | Login      |
| Overview         | /overview             | Yes  | Home dashboard with room cards and active devices                    | —          |
| Rooms            | /rooms                | Yes  | Room-by-room detailed control                                        | —          |
| Scenes           | /scenes               | Yes  | Preset scenes (Movie night, Morning, Away)                           | —          |
| Automations      | /automations          | Yes  | If-this-then-that automation list                                    | —          |
| Energy           | /energy               | Yes  | Power usage charts and insights                                      | —          |
| Security         | /security             | Yes  | Live cameras, locks, sensor map, recent alerts                       | —          |
| Activity         | /activity             | Yes  | Chronological event timeline of devices, automations, security       | —          |
| Floorplan        | /floorplan            | Yes  | Top-down 2D house map with live device positions and heat overlay    | —          |
| RoomDetail       | /rooms/:id            | Yes  | Single-room detailed view with all devices, environment, scenes      | —          |
| DeviceDetail     | /devices/:id          | Yes  | Full control + history for a single device (thermostat, light, etc.) | —          |
| AutomationEditor | /automations/:id/edit | Yes  | Visual when/if/then builder for a single automation rule             | —          |
| AddDevice        | /devices/add          | Yes  | Multi-step pairing wizard for a new smart device                     | —          |
| Settings         | /settings             | Yes  | Hubs, devices, team, privacy                                         | —          |

## App Constraints

- Active device rings pulse with glow cyan (#22d3ee) to signal live data
- Device states: Online emerald, Offline muted, Alert red
- Room cards stack device states visually with colored icons

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Accent: `#f59e0b`
- Accent Hover: `#fbbf24`
- Accent Dark: `#d97706`
- Glow: `#22d3ee` (live-data highlights, active device rings, realtime pulse indicators)

### Semantic

- Device Online: `#10b981`
- Device Online Light: `#d1fae5`
- Device Offline: `#6b7280`
- Device Offline Light: `#f3f4f6`
- Device Alert: `#ef4444`
- Device Alert Light: `#fee2e2`
- Automation Active: `#0891b2`
- Automation Active Light: `#cffafe`
- Automation Paused: `#9ca3af`
- Energy Generating: `#10b981`
- Energy Consuming: `#f59e0b`
- Energy Peak: `#ef4444`
- Scene Active: `#8b5cf6`
- Scene Active Light: `#ede9fe`

### Backgrounds

- Primary: `#f0f9ff`
- Secondary: `#e0f2fe`
- Tertiary: `#d6eef8`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Dashboard Panel: `#ffffff`
- Sidebar: `#0c1a2e`
- Sidebar Hover: `#162d4a`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#475569`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`
- Metric Value: `#0f172a`
- Metric Unit: `#94a3b8`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0891b2`
- Panel: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Primary Hover: `#67e8f9`
- Primary Dark: `#06b6d4`
- Accent: `#fbbf24`
- Glow: `#22d3ee`
- Background: `#0a0f1a`
- Background Secondary: `#111827`
- Surface: `#1e293b`
- Surface Secondary: `#1a2332`
- Dashboard Panel: `#1e293b`
- Sidebar: `#060b14`
- Sidebar Hover: `#0f172a`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Metric Value: `#f1f5f9`
- Border Primary: `#334155`
- Border Panel: `#334155`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Metric: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Font Sizes (overrides)

- Metric Large: `2.5rem` (40px) — hero KPI values on the overview dashboard
- Metric Medium: `1.75rem` (28px) — device card primary readings
- Metric Small: `1.25rem` (20px) — inline sensor values, energy stats

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `56px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Device Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Device Grid Gap: `16px`
- Panel Min Height: `200px`
- Floorplan Container: `100%` width, `60vh` min height

## Components

### Device Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Min height: `140px`
- Status indicator: `10px` circle, top-right, color = device-online/offline/alert
- Device icon: `32px`, centered or top-left, primary color when active, secondary when off
- Primary reading: metric-medium font, bold, top-center
- Unit label: metric-unit color, `0.875rem`, adjacent to reading
- Toggle control: bottom-right, `44px` tap target
- Active state: `2px` left border in glow color, subtle `rgba(8, 145, 178, 0.04)` background tint

### Room Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Header: room name (semibold, `1.125rem`) + device count badge
- Device summary: row of mini device icons (`20px`) with status dots (`6px`)
- Temperature/humidity inline: metric-small font, right-aligned in header
- Background: subtle gradient from surface to surface-secondary on hover

### Automation Row

- Border radius: `8px` (md)
- Padding: `16px 20px`
- Border: `1px solid` border-primary
- Layout: icon (`24px`) | name + description | trigger badge | toggle
- Trigger badge: `0.75rem`, pill shape, automation-active or automation-paused background
- Active state: left border `3px solid` automation-active
- Paused state: opacity `0.6`, toggle off

### Scene Button

- Border radius: `16px` (xl)
- Padding: `16px 20px`
- Min width: `120px`
- Text align: center
- Icon: `28px`, centered above label
- Label: `0.875rem`, medium weight
- Active: scene-active background tint, scene-active border, filled icon
- Inactive: surface background, outline icon
- Hover: lift with `md` shadow

### Energy Chart Panel

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Header: title (semibold) + time range selector (pill toggles)
- Chart area: min height `240px`
- Color coding: generating = energy-generating, consuming = energy-consuming, peak = energy-peak
- Y-axis labels: mono font, `0.75rem`, metric-unit color
- Tooltip: dark surface, `8px` radius, `12px 16px` padding, white text

### Metric Tile

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Layout: icon (`24px`, muted) top-left | label (`0.75rem`, secondary) below icon | value (metric-medium, bold) bottom-left | sparkline (`60px` wide, `32px` tall) bottom-right
- Trend indicator: `▲` or `▼` + percentage, `0.75rem`, green (positive) or energy-peak (negative)

### Notification Toast

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Max width: `400px`
- Position: top-right, stacked with `8px` gap
- Device alert: device-alert left border (`4px`)
- Automation trigger: automation-active left border (`4px`)
- Dismiss: `×` button, `32px` tap target, right-aligned

### Sidebar Navigation

- Width: `260px` (collapsed: `72px`)
- Background: sidebar color (dark navy)
- Item padding: `10px 16px`
- Item border radius: `8px`
- Active item: sidebar-hover background, sidebar-active text, `3px` left accent in primary
- Icon size: `20px`
- Section dividers: `1px solid rgba(255, 255, 255, 0.08)`, `16px` vertical margin
- Room list: collapsible section, indent `12px`, smaller icons (`16px`)

### Floorplan View

- Background: surface-secondary (light), background-secondary (dark)
- Room zones: `1px dashed` border-primary, `4px` radius, semi-transparent fill on hover
- Device pin: `28px` circle, surface background, `md` shadow, device icon centered
- Active device pin: glow color ring (`2px`), subtle pulse animation (`2s` ease infinite)
- Selected pin: `lg` shadow, scaled `1.1×`
- Temperature overlay: gradient from `#3b82f6` (cool) through `#10b981` (comfort) to `#ef4444` (hot)

### Webhook Log Table

- Header background: surface-secondary
- Row hover: surface-secondary
- Border: `1px solid` border-primary
- Cell padding: `10px 16px`
- Status column: colored dot (`8px`) + status text
- Timestamp: mono font, `0.8125rem`, secondary text color
- Payload preview: mono font, `0.8125rem`, truncated with expandable row detail
- Method badge: pill, `0.6875rem`, bold — GET: info, POST: primary, PUT: accent, DELETE: error

### Cron Schedule Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border: `1px solid` border-primary
- Layout: cron expression (mono font, `0.875rem`, surface-secondary background pill) | description | next-run timestamp
- Active: left border `3px solid` primary
- Disabled: opacity `0.5`

## Design Principles (Smart Home Specific)

1. **Glanceable first** — the dashboard is a wall-mounted or quick-check interface; critical info (temperature, security status, energy) must be readable at arm's length with large metric fonts and high contrast
2. **Status through color** — device state is always communicated through consistent color coding (online/offline/alert); never rely on text alone
3. **Dark-mode native** — smart home dashboards are frequently viewed in dim rooms; dark theme is the primary design target, light is the alternate
4. **Realtime feel** — use the glow color and subtle animations (pulse rings, value transitions) to communicate liveness without distracting from readability
5. **Touch-friendly** — all interactive elements maintain minimum `44px` tap targets for wall-mounted tablet use
6. **Density control** — dashboards show many devices; use compact cards but never sacrifice readability; whitespace between groups, tight spacing within
