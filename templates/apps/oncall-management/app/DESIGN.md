# DESIGN.md — Oncall Management

## Brand Identity

- **App Name:** Klaxon
- **Tagline:** Never miss a page
- **Logo:** The Klaxon mark — a paging bell with radiating alert arcs (`public/logo.svg`, 32×32), shown at `LOGO_SIZE` (30px) in the sidebar + auth pages
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Terse, operational, glanceable, calm-under-paging. Banners speak in imperatives ("Ack now"), everything else in facts.

## Target Persona

On-call engineers, SRE leads, and incident commanders who rotate pager duty and need high-density, color-coded access to who holds the pager, what is still burning, and what was learned.

## Screens

| Name               | Route                | Auth | Purpose                                                                    | deriveFrom |
| ------------------ | -------------------- | ---- | -------------------------------------------------------------------------- | ---------- |
| Landing            | /                    | No   | Marketing hero with embedded live-pager demo + pricing                     | —          |
| Login              | /login               | No   | Sign in                                                                    | —          |
| Signup             | /signup              | No   | Create account                                                             | Login      |
| ForgotPassword     | /forgot-password     | No   | Request reset                                                              | Login      |
| ResetPassword      | /reset-password      | No   | Set new password                                                           | Login      |
| Dashboard          | /dashboard           | Yes  | On-call now per schedule, pager banner, KPI quad, open incidents, activity | —          |
| Incidents          | /incidents           | Yes  | Incident list with status/severity filters + search                        | —          |
| IncidentDetail     | /incidents/:id       | Yes  | Trigger→ack→resolve timeline, assign, escalate, notes, postmortem link     | —          |
| Schedules          | /schedules           | Yes  | Rotation cards with current on-call + create form                          | —          |
| ScheduleDetail     | /schedules/:id       | Yes  | Coverage calendar (4 weeks), rotation order editor, holiday overrides      | —          |
| EscalationPolicies | /escalation-policies | Yes  | Ordered notify ladders with wait minutes + create form                     | —          |
| Postmortems        | /postmortems         | Yes  | Review list with open-item badges + create-from-incident                   | —          |
| PostmortemDetail   | /postmortems/:id     | Yes  | Summary + contributing factors editor, action items with statuses          | —          |
| Team               | /team                | Yes  | Responders, roles, on-call toggles, invitations                            | —          |
| Notifications      | /notifications       | Yes  | In-app paging feed: pages, acks, resolves, escalations                     | —          |
| Settings           | /settings            | Yes  | Workspace settings + integrations                                          | —          |
| Profile            | /profile             | Yes  | Personal account settings (avatar, email, password, 2FA, API keys)         | Settings   |
| Pricing            | /pricing             | No   | Public tier ladder (Free / Pro / Team) with Stripe-backed upgrades         | —          |
| PlanUpdated        | /plan-updated        | Yes  | Post-upgrade confirmation (shared package)                                 | —          |
| About              | /about               | No   | Public about page                                                          | —          |
| Privacy            | /privacy             | No   | Privacy policy                                                             | —          |
| Terms              | /terms               | No   | Terms of service                                                           | —          |
| NotFound           | /404                 | No   | 404 page                                                                   | Login      |

## App Constraints

- Dark-first — default theme; light is an override. All timestamps, service names, escalation layers, and counts MUST render in JetBrains Mono
- Severity color is sacred (critical red, warning yellow, info blue, resolved green) — never used decoratively. Status color is workflow-scoped: triggered=red pulsing, acknowledged=amber, resolved=green
- Incident rows carry a 3px left severity accent; overrides/new-ness use the violet `severity-new` tint
- Density > whitespace — incident rows 48-56px, compact mono badges
- Paging is IN-APP ONLY (notifications table + banner). No SMS/Slack claims anywhere in the UI copy

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#06b6d4` (cyan — the pager light)
- Primary Hover: `#22d3ee`
- Primary Dark: `#0891b2`
- Primary Container: `#164e63`
- On Primary (dark mode ink): `#062a30` — deep ink, never white on cyan (2.1:1 fail)

### Semantic (sacred)

- Critical: `#ef4444`
- Error/Escalate: `#f97316`
- Warning/Acknowledged: `#eab308`
- Info: `#3b82f6`
- Resolved: `#10b981`
- Muted: `#64748b`
- New/Override: `#a78bfa`

### Backgrounds

Same slate-navy ladder as the fleet dev-tools console: `#0c0e14` / `#111318` / `#181b22` / surface `#1a1d26` / `#21252f` / `#282d3a`, input `#181b22`, code block `#0a0c10`.

### Text

- Primary: `#e2e8f0`, Secondary: `#94a3b8`, Tertiary: `#64748b`
- Link: `#06b6d4`, Link Hover: `#22d3ee`

### Borders

- Primary: `#1e2330`, Secondary: `#2a3040`, Focus: `#06b6d4`, Subtle: `#161a24`

### Dark Theme Overrides

Dark is the default theme. Light theme: primary darkens to `#0e7490` (white text 4.9:1), background `#f8fafc`, surface `#ffffff`, text primary `#0f172a`, border `#e2e8f0`, code block `#f1f5f9`.

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Headline (shared pricing/legal pages): `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif` via `--font-headline`

### Overrides

- Timestamps, service chips, schedule cadence, escalation layers, counts use Mono with `font-variant-numeric: tabular-nums`
- Uppercase 9-11px `font-black tracking-widest` for eyebrow labels and pill text
- Navigation and headings use Body font at semibold (`600`)

## Layout

- Content Max Width: fluid with `px-8` gutters inside the sidebar shell
- Sidebar Width: shared `SidebarLayout` defaults (220px, collapsed 56px)
- Dashboard: KPI quad (4-col grid) → on-call cards (3-col grid) → open incidents (8/12) + activity rail (4/12)
- ScheduleDetail: coverage calendar 7-col day grid (28 days), rotation editor + override form in the 4/12 rail

## Components

- `OncallLayout` — shared `SidebarLayout` with the on-call nav (Dashboard / Incidents / Schedules / Escalation Policies / Postmortems / Team / Notifications / Settings)
- `IncidentRow` — left severity accent row with severity+status pills, service·policy·L-level mono line, triggered/acked ages, assignee avatar
- `StatusPill` — triggered (pulsing red) / acknowledged (amber) / resolved (green); severity stays in `SeverityPill`
- `SeverityPill`, `StatsCounterCard`, `FrequencySparkline` — carried over from the error-tracker donor, unchanged semantics
- Pager banner — critical unacked incidents render a red `role="alert"` banner on Dashboard + IncidentDetail with a one-click Ack CTA
