# DESIGN.md — Feature Flag Manager

## Brand Identity

- **App Name:** Rollout
- **Tagline:** Ship fearlessly, toggle instantly
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), with a small triangular flag glyph accent
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Developer-centric, terse, precise, confident

## Target Persona

Software engineers and product managers who ship code behind feature flags and need a refined control-panel UI to toggle, target, and audit rollouts across environments.

## Screens

| Name           | Route            | Auth | Purpose                                             | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------- | ---------- |
| Login          | /login           | No   | Sign in                                             | —          |
| Signup         | /signup          | No   | Create account                                      | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                       | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                    | Login      |
| Dashboard      | /dashboard       | Yes  | Flag stats, recent changes, stale alerts            | —          |
| Flags          | /flags           | Yes  | Flag list with toggles and env badges               | —          |
| FlagDetail     | /flags/:key      | Yes  | Targeting rules, rollout bar, audit log             | —          |
| AuditLog       | /audit           | Yes  | Organization-wide change history                    | —          |
| Environments   | /environments    | Yes  | Environment management and SDK keys                 | —          |
| Settings       | /settings        | Yes  | Org, teams, integrations                            | —          |
| Segments       | /segments        | Yes  | Reusable user segments with attribute rules         | —          |
| SegmentDetail  | /segments/:key   | Yes  | Edit segment attribute rules and review members     | FlagDetail |
| NewFlag        | /flags/new       | Yes  | Create flag form (key, name, description, variants) | FlagDetail |

## App Constraints

- Dark-first — default theme; light is secondary
- All flag keys, SDK keys, percentages, timestamps render in JetBrains Mono
- Sharp 8px corners, subtle 1px borders, no heavy shadows — control-panel aesthetic

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Accent: `#8b5cf6`
- Accent Hover: `#a78bfa`
- Accent Dark: `#7c3aed`

### Semantic

- Flag On: `#10b981`
- Flag On Light: `#d1fae5`
- Flag Off: `#6b7280`
- Flag Off Light: `#f3f4f6`
- Flag Killed: `#ef4444`
- Flag Killed Light: `#fee2e2`
- Rollout Partial: `#f59e0b`
- Rollout Partial Light: `#fef3c7`
- Targeting Active: `#8b5cf6`
- Targeting Active Light: `#ede9fe`
- Stale Flag: `#f97316`
- Stale Flag Light: `#fff7ed`

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111827`
- Tertiary: `#1e293b`
- Surface: `#1a2332`
- Surface Secondary: `#243044`
- Input: `#1e293b`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Code Block: `#0d1117`

### Text

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#10b981`
- Link Hover: `#34d399`
- Code: `#e2e8f0`

### Borders

- Primary: `#1e293b`
- Secondary: `#334155`
- Focus: `#10b981`
- Subtle: `#162032`

### Dark Theme Overrides

Dark is the default theme for Rollout. Light theme overrides:

- Primary: `#059669`
- Background: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#e2e8f0`
- Code Block: `#f1f5f9`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (flag keys, code, values): `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600-700)

### Font Usage

- Flag keys always render in Mono
- Percentage values and numeric rollout weights render in Mono with `font-variant-numeric: tabular-nums`
- Audit log timestamps render in Mono at `xs` size
- Environment names render in Mono at `sm` size with uppercase transform

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12`
- Sidebar Nav Width: `260px` (collapsed: `64px`)
- Flag List: single-column, full content width
- Flag Detail Panel: `480px` right drawer or full page
- Audit Log Max Width: `960px`
- Targeting Rules Editor Width: `100%` of content area, max `800px`

## Components

### Flag Row

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Hover: border shifts to border-secondary, subtle background lighten
- Layout: flag key (mono, `sm`) + name (body, `base`, semibold) on left, toggle + environment badges on right
- Toggle vertically centered, environment badges as pills
- Stale indicator: small `stale-flag` colored dot before the flag name when flag hasn't been evaluated in 30+ days

### Flag Toggle

- Width: `44px`, Height: `24px`
- Border radius: `full` (pill)
- Off state: `flag-off` background, white knob
- On state: `flag-on` background, white knob
- Killed state: `flag-killed` background, white knob, disabled cursor
- Transition: `150ms ease` (fast)
- Knob size: `18px` circle with `sm` shadow

### Environment Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font: Mono, `xs` (12px), weight `500`, uppercase
- Production: `flag-killed` background at 15% opacity, `flag-killed` text
- Staging: `rollout-partial` background at 15% opacity, `rollout-partial` text
- Development: `flag-on` background at 15% opacity, `flag-on` text
- Custom: `accent` background at 15% opacity, `accent` text

### Targeting Rule Card

- Border radius: `8px` (md)
- Background: surface-secondary
- Border: `1px solid` border-primary
- Padding: `16px`
- Margin between rules: `8px`
- Drag handle: `6px` wide, `24px` tall, border-secondary dots pattern, left edge
- Condition groups separated by an "AND" / "OR" connector pill (`accent` background, `xs` mono text)
- Attribute names render in Mono
- Operator selects: `sm` height, border-secondary border, `8px` radius

### Rollout Bar

- Height: `8px`
- Border radius: `full`
- Background track: `flag-off-light` (at 20% opacity on dark)
- Fill: gradient from `flag-on` to `flag-on` at rollout %, then transparent
- Percentage label: Mono, `sm`, right-aligned above bar
- Variants (multi-variate): stacked segments with distinct colors — `flag-on`, `accent`, `rollout-partial`, `#06b6d4`, `#ec4899` — separated by `1px` gap

### Audit Log Entry

- Border bottom: `1px solid` border-primary
- Padding: `12px 16px`
- Layout: avatar (24px circle) + actor name (body `sm` semibold) + action description (body `sm`) + timestamp (mono `xs` tertiary text) on one line
- Action verb highlighted: created (`flag-on`), updated (`rollout-partial`), toggled on (`flag-on`), toggled off (`flag-off`), deleted (`flag-killed`), targeting changed (`accent`)
- Diff preview: collapsible, code-block background, mono `xs`, red/green diff coloring

### Search & Filter Bar

- Height: `40px`
- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary, focus: `border-focus`
- Search icon: `16px`, secondary text color
- Placeholder text: "Search flags by key or name..."
- Filter chips: pill-shaped, surface-secondary background, `sm` text, `x` dismiss icon
- Keyboard shortcut hint: `/` rendered as a `kbd` element inside the search input (mono `xs`, border-secondary border, `4px` radius)

### Stat Card (Dashboard)

- Border radius: `12px` (lg)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `20px`
- Metric value: `2xl` (24px), `700` weight
- Metric label: `sm`, secondary text
- Trend indicator: small arrow icon + percentage in `flag-on` (up) or `flag-killed` (down)
- Variants: Total Flags, Active Flags, Stale Flags, Environments

### SDK Key Display

- Border radius: `8px` (md)
- Background: code-block
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Font: Mono, `sm`
- Copy button: ghost variant, right-aligned, `sm` size
- Key partially masked by default (last 8 chars visible), click to reveal
- Environment label above: Mono, `xs`, uppercase, environment-appropriate color

### Side Navigation

- Width: `260px`, collapsed: `64px`
- Background: secondary background
- Logo area: `56px` height, `20px` horizontal padding, bold heading font
- Nav items: `40px` height, `12px` horizontal padding, `8px` border-radius
- Active item: `primary` at 15% opacity background, `primary` text
- Hover: `surface` background
- Section dividers: `1px` border-primary, `16px` vertical margin
- Sections: Flags, Segments, Environments, Audit Log, Settings
- Collapse toggle: bottom of sidebar, chevron icon

## Design Principles

1. **Dark-first** — Rollout defaults to a dark theme befitting developer tools; light theme is available but secondary
2. **Monospace for machine values** — flag keys, SDK keys, percentages, timestamps, environment names always render in mono
3. **Status at a glance** — flag state is always visible via color-coded toggles and badges without requiring interaction
4. **Density over whitespace** — flag lists and audit logs favor compact, scannable rows; avoid excessive padding
5. **Terminal precision** — UI should feel like a refined control panel, not a marketing page; favor sharp corners (`8px` max) and subtle borders over heavy shadows
