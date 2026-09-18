# DESIGN.md — Time Tracking

## Brand Identity

- **App Name:** Chrono
- **Tagline:** Every second, accounted for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, professional, motivating, clear

## Target Persona

Freelancers, consultants, and agencies who track billable hours across projects and clients.

## Screens

| Name           | Route            | Auth | Purpose                                                   | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                            | —          |
| Login          | /login           | No   | Sign in                                                   | —          |
| Signup         | /signup          | No   | Create account                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                          | Login      |
| Dashboard      | /dashboard       | Yes  | Timer bar, weekly overview, stats                         | —          |
| TimeEntries    | /entries         | Yes  | Log of all tracked time entries grouped by date           | —          |
| Timesheet      | /timesheet       | Yes  | Weekly grid view of hours per project per day             | —          |
| Projects       | /projects        | Yes  | List of projects with budgets and hours tracked           | —          |
| ProjectDetail  | /projects/:id    | Yes  | Single project — entries, budget burn, team               | —          |
| Clients        | /clients         | Yes  | List of clients                                           | —          |
| ClientDetail   | /clients/:id     | Yes  | Single client — projects, invoices, total hours           | —          |
| Reports        | /reports         | Yes  | Analytics — billable hours, revenue, by-project breakdown | —          |
| Invoices       | /invoices        | Yes  | List of invoices with status and amounts                  | —          |
| InvoiceDetail  | /invoices/:id    | Yes  | Single invoice — line items, status, send actions         | —          |
| Settings       | /settings        | Yes  | Workspace settings, profile, billing, integrations        | —          |

## App Constraints

- Sticky Timer Bar at top always visible, primary green when running
- All durations render in JetBrains Mono with tabular-nums
- Dark sidebar nav, light content area

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#3b82f6`
- Primary Dark: `#1d4ed8`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Timer Running: `#10b981`
- Timer Running Light: `#d1fae5`
- Timer Paused: `#f59e0b`
- Timer Paused Light: `#fef3c7`
- Timer Stopped: `#64748b`
- Billable: `#8b5cf6`
- Billable Light: `#ede9fe`
- Non-Billable: `#94a3b8`
- Over Budget: `#ef4444`
- Over Budget Light: `#fee2e2`
- Under Budget: `#10b981`
- Revenue: `#059669`
- Expense: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Timer Bar: `#f1f5f9`
- Timer Bar Active: `#ecfdf5`
- Sidebar: `#0f172a`
- Sidebar Hover: `#1e293b`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Duration: `#0f172a`
- Duration Running: `#059669`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#2563eb`
- Timer: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#34d399`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Timer Bar: `#1e293b`
- Timer Bar Active: `#064e3b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e293b`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Duration: `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Consolas, monospace` (font-variant-numeric: tabular-nums)
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Sizes

- Timer Display: `2.25rem` (36px)
- Timer Display Compact: `1.5rem` (24px)
- Duration Inline: `0.875rem` (14px) monospace
- Report Headline: `1.875rem` (30px)

### Font Weights

- Timer Display: `600`
- Duration Inline: `500`
- Table Header: `600`
- Sidebar Label: `500`

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Sidebar Background: sidebar color (dark persistent nav)
- Top Timer Bar Height: `64px`
- Timer Bar Position: sticky top
- Report Chart Height: `320px`
- Time Entry Row Height: `56px`
- Weekly Grid Columns: `7` equal columns for day-of-week view

## Components

### Timer Bar

- Height: `64px`
- Background: timer-bar (active: timer-bar-active)
- Border bottom: `1px solid` border-timer
- Padding: `12px 24px`
- Position: sticky top, z-index `1100`
- Play/Stop button: `44px` circle, accent background, white icon
- Duration display: duration font, `24px`, semibold, tabular-nums
- Project selector: inline dropdown, `200px` max width
- Description input: borderless, full remaining width, `16px` font

### Timer Button

- Border radius: `9999px` (circle)
- Size: `44px` (default), `56px` (hero)
- Running state: accent background, white square stop icon (`14px`)
- Stopped state: accent background, white play triangle icon (`16px`)
- Shadow: `0 2px 8px rgba(16, 185, 129, 0.3)` when running
- Transition: `150ms ease` scale on press (`0.95`)

### Time Entry Row

- Height: `56px`
- Padding: `8px 16px`
- Border bottom: `1px solid` border-primary
- Hover: surface-secondary background
- Project color dot: `10px` circle, left of project name
- Duration: duration font, right-aligned, `14px`, medium weight
- Billable indicator: small `$` icon in billable color when billable
- Actions: edit/delete icons on hover, `32px` hit target
- Grouped header: date label left, daily total right, `600` weight, surface-secondary background

### Project Color Dot

- Size: `10px` (inline), `12px` (cards/headers)
- Border radius: `9999px`
- Margin right: `8px`
- Default palette: `#ef4444`, `#f59e0b`, `#10b981`, `#3b82f6`, `#8b5cf6`, `#ec4899`, `#06b6d4`, `#84cc16`

### Project Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border left: `4px solid` project color
- Client name: secondary text, `12px`, uppercase tracking `0.05em`
- Project name: `16px`, `600` weight
- Hours tracked: duration font, `20px`, `600` weight
- Budget bar: `6px` height, `9999px` radius, background tertiary, fill with project color
- Over budget bar fill: over-budget color

### Report Chart

- Height: `320px`
- Border radius: `12px` (lg)
- Background: surface
- Padding: `24px`
- Bar chart bar radius: `4px` top corners
- Bar colors: project colors from palette
- Axis labels: secondary text, `12px`
- Grid lines: `1px solid` border-primary, dashed
- Tooltip: surface background, `md` shadow, `8px` radius, `12px` padding

### Weekly Timesheet Grid

- Cell min height: `48px`
- Cell padding: `8px`
- Header: day abbreviation + date, secondary text, `12px`
- Today column: faint primary tint background (`rgba(37, 99, 235, 0.04)`)
- Daily total row: `600` weight, border-top `2px solid` border-secondary
- Weekly total: `700` weight, primary color
- Editable cell: borderless input, duration font, click-to-edit

### Invoice / Billing Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Status badge: pill, `12px` font, `500` weight
  - Draft: secondary background, secondary text
  - Sent: info-light background, info text
  - Paid: success-light background, success text
  - Overdue: error-light background, error text
- Amount: `24px`, `700` weight, tabular-nums
- Line items: alternating surface/surface-secondary, `12px 16px` cell padding

### Summary Stat Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Shadow: `sm`
- Label: secondary text, `12px`, uppercase, tracking `0.05em`
- Value: `28px`, `700` weight, duration font for time values
- Trend indicator: small arrow + percentage, accent (up) or error (down), `12px`
- Icon: `20px`, secondary color, top-right or left of label

### Sidebar Navigation

- Background: sidebar color (dark)
- Active item: left `3px` border primary, sidebar-active text, `rgba(255,255,255,0.08)` background
- Hover: sidebar-hover background
- Icon size: `20px`
- Label: `14px`, `500` weight, sidebar text color
- Section divider: `1px solid rgba(255,255,255,0.08)`, `16px` vertical margin
- Workspace switcher: bottom of sidebar, `48px` height, avatar + name

### Tag Chip

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`
- Font weight: `500`
- Background: `rgba(37, 99, 235, 0.08)`
- Text: primary color
- Removable: `14px` x icon, hover darken
