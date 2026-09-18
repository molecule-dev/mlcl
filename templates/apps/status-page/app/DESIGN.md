# DESIGN.md — Status Page

## Brand Identity

- **App Name:** Vigil
- **Tagline:** Every second, accounted for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), monospaced variant preferred for logo lockup
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Transparent, reliable, monitoring-ready, matter-of-fact

## Target Persona

Platform and SRE teams broadcasting service health and incident history to internal and external users.

## Screens

| Name              | Route            | Auth | Purpose                                                                 | deriveFrom     |
| ----------------- | ---------------- | ---- | ----------------------------------------------------------------------- | -------------- |
| PublicStatus      | /                | No   | Public status page with component health                                | —              |
| Login             | /login           | No   | Sign in                                                                 | —              |
| Signup            | /signup          | No   | Create account                                                          | Login          |
| ForgotPassword    | /forgot-password | No   | Request reset                                                           | Login          |
| ResetPassword     | /reset-password  | No   | Set new password                                                        | Login          |
| Dashboard         | /dashboard       | Yes  | Internal overview of all monitored components                           | —              |
| IncidentList      | /incidents       | Yes  | List of past and active incidents                                       | —              |
| IncidentDetail    | /incidents/:id   | Yes  | Single incident with timeline of updates                                | —              |
| Components        | /components      | Yes  | Manage components and groups                                            | —              |
| Subscribers       | /subscribers     | Yes  | Email/SMS/Webhook subscriber list                                       | —              |
| Settings          | /settings        | Yes  | Branding, auth, integrations                                            | —              |
| IncidentForm      | /incidents/new   | Yes  | Create/edit incident with severity, components, initial update          | —              |
| ComponentDetail   | /components/:id  | Yes  | Per-component drilldown with 90-day uptime, history, attached incidents | —              |
| MaintenanceList   | /maintenance     | Yes  | Scheduled and past maintenance windows                                  | —              |
| MaintenanceDetail | /maintenance/:id | Yes  | Single maintenance window with timeline                                 | IncidentDetail |
| Profile           | /profile         | Yes  | SRE/operator profile, on-call status, API tokens                        | —              |
| Notifications     | /notifications   | Yes  | In-app notification feed (subscribers, mentions, escalations)           | —              |
| Team              | /team            | Yes  | Team members, roles, on-call schedule                                   | —              |
| AuditLog          | /audit           | Yes  | Change log for incidents, components, maintenance, settings             | —              |

## App Constraints

- Uptime history bar uses 90-day green segmented bar (one square per day) with incident markers
- Operational emerald / Degraded amber / Partial outage orange / Major outage red semantic chain
- Monospace for timestamps and incident IDs

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Accent: `#6366f1`
- Accent Hover: `#818cf8`
- Accent Dark: `#4f46e5`

### Semantic

- Operational: `#10b981`
- Operational Light: `#d1fae5`
- Degraded: `#f59e0b`
- Degraded Light: `#fef3c7`
- Partial Outage: `#f97316`
- Partial Outage Light: `#ffedd5`
- Major Outage: `#ef4444`
- Major Outage Light: `#fee2e2`
- Maintenance: `#6366f1`
- Maintenance Light: `#e0e7ff`
- Unknown: `#6b7280`
- Unknown Light: `#f3f4f6`

### Backgrounds

- Primary: `#0b1120`
- Secondary: `#111827`
- Tertiary: `#1a2332`
- Surface: `#1e293b`
- Surface Secondary: `#243244`
- Input: `#1e293b`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Uptime Bar Filled: `#10b981`
- Uptime Bar Empty: `#374151`
- Uptime Bar Degraded: `#f59e0b`
- Uptime Bar Outage: `#ef4444`

### Text

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#34d399`
- Link Hover: `#6ee7b7`
- Uptime Percentage: `#10b981`
- Timestamp: `#64748b`

### Borders

- Primary: `#1e293b`
- Secondary: `#334155`
- Focus: `#6366f1`

### Light Theme Overrides

- Background Primary: `#f8fafc`
- Background Secondary: `#f1f5f9`
- Background Tertiary: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Input: `#ffffff`
- Text Primary: `#0f172a`
- Text Secondary: `#475569`
- Text Tertiary: `#64748b`
- Border Primary: `#e2e8f0`
- Border Secondary: `#cbd5e1`
- Link: `#059669`
- Link Hover: `#047857`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Usage

- Component names, incident IDs, timestamps, uptime percentages: **Mono**
- Body text, descriptions, incident updates: **Body**
- Page titles, section headers: **Heading** (weight `600`–`700`)

## Layout

- Content Max Width: `960px`
- Component List Width: `100%` (single column, full content width)
- Sidebar: none (landing layout — single scrollable page)
- Incident Timeline Width: `100%`
- Uptime Chart Height: `34px`
- Uptime Chart Day Width: `3px` (90-day view), `6px` (30-day view)
- Uptime Chart Gap: `2px`
- Header Height: `64px`
- Section Spacing: `48px`
- Subscribe Banner: full-width, sticky bottom or inline

## Components

### Status Banner

- Full width, top of page below header
- Border radius: `0` (flush edge-to-edge)
- Padding: `16px 24px`
- Font size: `lg` (18px)
- Font weight: `600`
- Icon: filled circle `12px` left of text
- Variants by status:
  - Operational: `operational` background, inverse text, green icon
  - Degraded: `degraded` background, inverse text, amber icon
  - Partial Outage: `partial-outage` background, inverse text, orange icon
  - Major Outage: `major-outage` background, inverse text, red icon
  - Maintenance: `maintenance` background, white text, indigo icon

### Component Row

- Border radius: `0` (flat rows, grouped in a card)
- Padding: `16px 20px`
- Border bottom: `1px solid` border-primary (except last)
- Layout: name left, status badge right
- Name font: body, weight `500`, size `base`
- Group header: font weight `600`, size `sm`, uppercase, letter-spacing `0.05em`, text-secondary, padding `12px 20px`

### Component Group Card

- Border radius: `12px` (lg)
- Border: `1px solid` border-secondary
- Shadow: none (flat, dark theme)
- Overflow: hidden (rows flush inside)
- Margin bottom: `16px`

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `sm` (14px)
- Font weight: `500`
- Font family: mono
- Variants:
  - Operational: operational text, operational-light bg
  - Degraded: degraded text, degraded-light bg
  - Partial Outage: partial-outage text, partial-outage-light bg
  - Major Outage: major-outage text, major-outage-light bg
  - Maintenance: maintenance text, maintenance-light bg
  - Unknown: unknown text, unknown-light bg

### Uptime Bar

- Height: `34px`
- Day segment width: `3px` (90 days) / `6px` (30 days)
- Gap between segments: `2px`
- Border radius per segment: `2px`
- Colors: filled = status color for that day (operational/degraded/outage)
- Hover tooltip: date, uptime %, incident count
- Uptime percentage label: mono font, weight `700`, size `lg`, positioned right-aligned above bar
- Date range labels: mono font, size `xs`, text-tertiary, below bar

### Incident Card

- Border radius: `8px` (md)
- Border-left: `4px solid` severity color
- Padding: `20px`
- Background: surface
- Margin bottom: `12px`
- Title: body font, weight `600`, size `base`
- Timestamp: mono font, size `xs`, text-tertiary
- Status label: mono font, weight `500`, size `sm`
- Update thread: indented `24px`, connected by `1px` vertical line in border-secondary

### Incident Update Entry

- Padding: `12px 0`
- Status dot: `8px` circle, left of timestamp
- Timestamp: mono font, size `xs`, text-tertiary
- Status change label: mono font, weight `600`, size `sm`, colored by new status
  - Investigating: `major-outage`
  - Identified: `partial-outage`
  - Monitoring: `degraded`
  - Resolved: `operational`
- Body text: body font, size `sm`, text-secondary, top margin `4px`

### Subscribe Widget

- Border radius: `12px` (lg)
- Border: `1px solid` border-secondary
- Padding: `24px`
- Background: surface
- Heading: weight `600`, size `lg`
- Description: text-secondary, size `sm`
- Input + button inline layout
- Input: dark input bg, border-secondary, mono font for email
- Button: primary bg, weight `600`, border-radius `8px`
- Channel options (email, webhook, RSS): icon + label, horizontal row, size `sm`

### Scheduled Maintenance Card

- Border radius: `8px` (md)
- Border-left: `4px solid` maintenance color
- Padding: `16px 20px`
- Background: surface
- Scheduled time: mono font, size `sm`, maintenance color
- Title: weight `600`, size `base`
- Affected components: comma-separated badges, size `xs`

### Header / Navigation

- Height: `64px`
- Background: background-primary with `backdrop-filter: blur(12px)` and `background-color` at 80% opacity
- Position: sticky top
- Logo left: app name in heading font, weight `700`, size `xl`
- Right items: "Subscribe" button (outline variant), theme toggle
- Border bottom: `1px solid` border-primary

### Footer

- Padding: `32px 0`
- Border top: `1px solid` border-primary
- Text: text-tertiary, size `sm`
- Links: link color, size `sm`
- Layout: centered, "Powered by Vigil" left, links right

### Metric Summary Row

- Layout: horizontal, evenly spaced
- Background: surface
- Border radius: `12px` (lg)
- Padding: `20px 24px`
- Metric value: mono font, weight `700`, size `2xl`
- Metric label: body font, weight `400`, size `sm`, text-secondary
- Dividers: `1px solid` border-primary between metrics

## Design Principles

1. **Dark-first** — the default theme is dark; light theme is an override. Status pages are often checked during incidents (late night, high stress) — dark reduces eye strain.
2. **Status color is sacred** — green means operational, amber means degraded, orange means partial outage, red means major outage, indigo means maintenance. Never use these colors decoratively.
3. **Monospace for data** — timestamps, percentages, incident IDs, and component names use the mono font. Prose uses the body font. Never mix.
4. **Density over decoration** — users scan status pages for signal. Minimize chrome, maximize information density. No hero images, no illustrations, no marketing fluff on the status page itself.
5. **Temporal clarity** — every event has a visible, unambiguous timestamp in the user's local timezone. Use relative time ("2 hours ago") alongside absolute time.
6. **Calm when operational** — when all systems are green, the page should feel quiet and confident. Visual noise scales with severity, not with design complexity.
