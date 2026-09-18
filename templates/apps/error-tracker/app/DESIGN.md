# DESIGN.md — Error Tracker

## Brand Identity

- **App Name:** Faultline
- **Tagline:** Catch what breaks
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), with a subtle hairline crack through the "l" letterform achieved via CSS pseudo-element
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Terse, technical, glanceable, serious

## Target Persona

Software engineers and SREs who triage production errors multiple times per day and need high-density, color-coded, keyboard-driven access to stack traces, release diffs, and alert rules.

## Screens

| Name           | Route              | Auth | Purpose                                                                           | deriveFrom |
| -------------- | ------------------ | ---- | --------------------------------------------------------------------------------- | ---------- |
| Login          | /login             | No   | Sign in                                                                           | —          |
| Signup         | /signup            | No   | Create account                                                                    | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                                     | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                                  | Login      |
| Dashboard      | /dashboard         | Yes  | Error stats, frequency, recent issues                                             | —          |
| Issues         | /issues            | Yes  | Issue list with severity borders                                                  | —          |
| IssueDetail    | /issues/:id        | Yes  | Stack trace, events timeline, frequency sparkline                                 | —          |
| Alerts         | /alerts            | Yes  | Alert rule management                                                             | —          |
| Releases       | /releases          | Yes  | Release tracking and regression detection                                         | —          |
| Settings       | /settings          | Yes  | Projects, teams, integrations                                                     | —          |
| Projects       | /projects          | Yes  | Project list with health overview, used to switch context                         | —          |
| AlertDetail    | /alerts/:id        | Yes  | Edit alert rule conditions, thresholds, channels, history                         | —          |
| ReleaseDetail  | /releases/:version | Yes  | Single release: regressions, commits, files, adoption, deploy timeline            | —          |
| Discover       | /discover          | Yes  | Event explorer with query builder, time series, results table                     | —          |
| Performance    | /performance       | Yes  | Transaction monitoring: P50/P75/P95/P99, slow endpoints, slow queries, web vitals | —          |
| Notifications  | /notifications     | Yes  | Activity feed: assignments, mentions, alerts, regressions, status changes         | —          |
| Team           | /team              | Yes  | Members, roles, on-call rotation, invitations, audit log                          | —          |
| Profile        | /profile           | Yes  | Personal account settings (avatar, email, password, 2FA, API keys)                | Settings   |
| NotFound       | /404               | No   | 404 page                                                                          | Login      |

## App Constraints

- Dark-first — default theme; light is an override. All stack traces, timestamps, error counts MUST render in JetBrains Mono
- Severity color is sacred (critical red, error orange, warning yellow, info blue) — never used decoratively
- Density > whitespace — issue rows 48-56px, no excessive padding, compact badges

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Terminal: `#22d3ee`
- Terminal Dim: `#164e63`

### Semantic

- Critical: `#ef4444`
- Critical Light: `#fca5a5`
- Critical Bg: `#1c1117`
- Error: `#f97316`
- Error Light: `#fdba74`
- Error Bg: `#1c1510`
- Warning: `#eab308`
- Warning Light: `#fde047`
- Warning Bg: `#1a1908`
- Info: `#3b82f6`
- Info Light: `#93c5fd`
- Resolved: `#10b981`
- Resolved Light: `#6ee7b7`
- Muted: `#64748b`
- New (unseen): `#a78bfa`

### Backgrounds

- Primary: `#0c0e14`
- Secondary: `#111318`
- Tertiary: `#181b22`
- Surface: `#1a1d26`
- Surface Secondary: `#21252f`
- Surface Elevated: `#282d3a`
- Input: `#181b22`
- Code Block: `#0a0c10`
- Overlay: `rgba(0, 0, 0, 0.7)`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0c0e14`
- Link: `#10b981`
- Link Hover: `#34d399`
- Code: `#22d3ee`

### Borders

- Primary: `#1e2330`
- Secondary: `#2a3040`
- Focus: `#10b981`
- Subtle: `#161a24`

### Dark Theme Overrides

Dark is the default theme. Light theme overrides:

- Primary: `#059669`
- Background: `#f1f5f9`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#e2e8f0`
- Code Block: `#f1f5f9`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Overrides

- Stack traces, error messages, file paths, and code snippets MUST use the Mono font
- Error counts and numeric badges use Mono with `font-variant-numeric: tabular-nums`
- Navigation and headings use Body font at semibold (`600`)

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `220px` (collapsed: `56px`)
- Top Bar Height: `48px`
- Issue List Width: `380px` (in split-pane view)
- Detail Panel: fills remaining width
- Grid Columns: `12` (dashboard widgets)
- Dashboard Widget Gap: `16px`
- Dashboard Min Column Width: `320px`

## Components

### Error Group Row

- Border radius: `8px` (md)
- Background: surface
- Border-left: `3px solid` severity color (critical/error/warning/info)
- Padding: `12px 16px`
- Hover: surface-secondary background
- Selected: `1px solid` primary border, subtle primary tint background
- Title: body font, `500` weight, `14px`
- Metadata (count, last seen, users): mono font, `12px`, secondary text
- Unresolved badge: small colored dot before title

### Stack Trace Block

- Background: code-block
- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `16px`
- Font: mono, `13px`, line-height `1.6`
- App frames: primary text color, clickable
- Vendor frames: tertiary text, collapsed by default
- Highlighted frame: `rgba(16, 185, 129, 0.08)` background, primary left border `2px`
- Line numbers: tertiary text, right-aligned, `48px` gutter

### Severity Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font: mono, `11px`, `600` weight, uppercase
- Critical: critical bg, critical-light text
- Error: error bg, error-light text
- Warning: warning bg, warning-light text
- Info: surface-elevated bg, info-light text

### Event Timeline

- Vertical line: `2px solid` border-primary, left offset `20px`
- Node dot: `10px` circle, severity-colored, centered on line
- Timestamp: mono font, `12px`, tertiary text
- Entry spacing: `16px`

### Sparkline Chart (Frequency)

- Height: `32px`
- Bar width: `3px`, gap `1px`
- Color: primary (normal), critical (spike detected)
- Background: transparent
- No axes or labels — purely visual density indicator

### Alert Rule Card

- Border radius: `12px` (lg)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Status indicator: `8px` dot, resolved-green (active) or muted (disabled)
- Threshold value: mono font, `600` weight, `16px`
- Trigger conditions: mono font, `13px`, secondary text

### Release Tag

- Border radius: `6px`
- Background: surface-elevated
- Border: `1px solid` border-secondary
- Padding: `4px 10px`
- Font: mono, `12px`, `500` weight
- Icon: small deploy arrow before version string
- Adopted: primary border tint; Regressed: critical border tint

### Stats Counter

- Font: mono, `28px`, `700` weight
- Label: body font, `12px`, secondary text, uppercase, `0.05em` letter-spacing
- Trend arrow: `12px`, inline, colored (resolved-green for decrease, critical for increase)
- Container: no border, no shadow — flush with dashboard background

### Search & Filter Bar

- Height: `40px`
- Background: surface
- Border: `1px solid` border-primary
- Border radius: `8px` (md)
- Icon: `16px`, tertiary text
- Input font: body, `14px`
- Filter chips: `24px` height, `6px` radius, surface-elevated bg, `12px` mono text
- Keyboard shortcut hint: tertiary text, mono, bordered, `18px` square

### Issue Status Toggle

- States: Unresolved, Ignored, Resolved
- Style: segmented control, `32px` height
- Active segment: primary background, inverse text
- Inactive segment: transparent, secondary text
- Border radius: `6px` outer, `4px` inner segments
- Transition: fast (`150ms`)

### Notification Toast

- Border radius: `8px` (md)
- Background: surface-elevated
- Border-left: `4px solid` severity color
- Shadow: lg
- Padding: `12px 16px`
- Auto-dismiss: `5000ms` with progress bar at bottom (severity color, `2px` height)
- Max width: `420px`
- Position: top-right, `16px` from edges

## Design Principles

1. **Dark-first** — the primary theme is dark; light mode is the override, not the default
2. **Severity is sacred** — red means critical, orange means error, yellow means warning, blue means info — never use these colors decoratively
3. **Monospace for machine data** — stack traces, file paths, error messages, counts, and hashes always render in mono
4. **Density over whitespace** — dashboards and issue lists should maximize information density; use tight spacing and compact rows
5. **Glanceable status** — every list item and card should communicate its severity and state within the first 100ms of viewing via color-coded borders, dots, or badges
