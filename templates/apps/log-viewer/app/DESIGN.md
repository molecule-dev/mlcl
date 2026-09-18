# DESIGN.md — Log Viewer

## Brand Identity

- **App Name:** Signalink
- **Tagline:** Every signal, instantly traced
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Technical
- Fast
- Clinical
- Precise

## Target Persona

Site reliability and platform engineers searching logs across services to debug incidents.

## Screens

| Name           | Route            | Auth | Purpose                                                                   | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                            | —          |
| Login          | /login           | No   | Sign in                                                                   | —          |
| Signup         | /signup          | No   | Create account                                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                          | Login      |
| Dashboard      | /dashboard       | Yes  | Recent incidents, saved searches, log volume chart                        | —          |
| Search         | /search          | Yes  | Log search with query bar, filters, time range, live tail                 | —          |
| Traces         | /traces          | Yes  | Distributed trace viewer with span waterfall                              | —          |
| Streams        | /streams         | Yes  | Manage log streams and sources                                            | —          |
| Alerts         | /alerts          | Yes  | Alert rules based on log patterns                                         | —          |
| Saved          | /saved           | Yes  | Saved searches and dashboards                                             | —          |
| Settings       | /settings        | Yes  | Retention, integrations, API keys                                         | —          |
| TraceDetail    | /traces/:id      | Yes  | Distributed trace with span tree, waterfall timeline, span detail panel   | —          |
| StreamDetail   | /streams/:id     | Yes  | Single log stream config with parsing rules, ingestion stats, sample logs | —          |
| AlertDetail    | /alerts/:id      | Yes  | Alert rule with condition editor, fire history, channels, runbook         | —          |
| Incidents      | /incidents       | Yes  | Active and recent incidents with severity, status, owner, time            | —          |
| IncidentDetail | /incidents/:id   | Yes  | Single incident with timeline, impact, linked logs/traces, postmortem     | —          |
| Services       | /services        | Yes  | Service catalog grid showing health, log volume, error rate, owner team   | —          |

## App Constraints

- Dark console look with mono font for log lines
- Severity colors: info cyan, warn amber, error red, fatal magenta
- Live tail indicator

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#22d3ee`
- Primary Hover: `#67e8f9`
- Primary Dark: `#0891b2`
- Accent: `#a78bfa`
- Accent Hover: `#c4b5fd`
- Accent Dark: `#7c3aed`

### Semantic

- Severity Fatal: `#ef4444`
- Severity Fatal Light: `#fecaca`
- Severity Error: `#f97316`
- Severity Error Light: `#fed7aa`
- Severity Warn: `#eab308`
- Severity Warn Light: `#fef08a`
- Severity Info: `#22d3ee`
- Severity Info Light: `#cffafe`
- Severity Debug: `#64748b`
- Severity Debug Light: `#e2e8f0`
- Severity Trace: `#475569`
- Severity Trace Light: `#cbd5e1`
- Live Tail Active: `#22c55e`
- Live Tail Paused: `#f59e0b`
- Query Match Highlight: `rgba(250, 204, 21, 0.25)`
- Latency Fast: `#22c55e`
- Latency Medium: `#eab308`
- Latency Slow: `#ef4444`

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111a2e`
- Tertiary: `#162036`
- Surface: `#1a2744`
- Surface Secondary: `#1e2d4d`
- Input: `#0f1a30`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Log Row Hover: `rgba(34, 211, 238, 0.06)`
- Log Row Selected: `rgba(34, 211, 238, 0.12)`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#22d3ee`
- Link Hover: `#67e8f9`
- Timestamp: `#64748b`
- JSON Key: `#a78bfa`
- JSON String: `#86efac`
- JSON Number: `#fbbf24`
- JSON Boolean: `#f472b6`
- JSON Null: `#64748b`

### Borders

- Primary: `#1e3a5f`
- Secondary: `#253d5e`
- Focus: `#22d3ee`

### Dark Theme Overrides

Dark theme is the **default and only** theme. The colors above ARE the dark theme. Light mode is not supported — log viewers are used in dark environments and light backgrounds cause eye strain during long debugging sessions.

## Typography

### Font Families

- UI: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Log Body: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- Timestamp: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)

### Font Sizes

- Log Line: `0.8125rem` (13px) — optimized density for scanning
- Log Detail: `0.875rem` (14px)
- Sidebar Label: `0.6875rem` (11px) — uppercase, letter-spacing: 0.05em

## Layout

- Content Max Width: `100%` (full viewport — no max width)
- Sidebar Filter Width: `280px` (collapsible to `0px`)
- Detail Panel Width: `480px` (slide-in from right, resizable)
- Top Bar Height: `48px`
- Query Bar Height: `44px`
- Log Line Height: `28px` (tight rows for maximum density)
- Timeline Minimap Height: `48px` (above log list)
- Status Bar Height: `28px` (bottom, shows count + live tail status)

### Three-Panel Layout

```
+----------+---------------------------+--------------+
| Filters  |       Log Stream          | Log Detail   |
| Sidebar  |   (scrollable list)       |   Panel      |
| 280px    |       flex: 1             |   480px      |
+----------+---------------------------+--------------+
```

## Components

### Log Line Row

- Height: `28px` fixed
- Font: Log Body (monospace), `13px`
- Padding: `0 12px`
- Border bottom: `1px solid` border-primary (subtle separator)
- Hover: log-row-hover background
- Selected: log-row-selected background, left border `2px solid` primary
- Severity indicator: `3px` left border colored by severity level
- Timestamp: muted (text-timestamp), fixed-width column `180px`
- Service name: accent color, fixed-width column `140px`, truncate with ellipsis
- Message: text-primary, flex: 1, truncate single line

### Severity Badge

- Border radius: `4px` (sm)
- Padding: `1px 6px`
- Font size: `11px`
- Font weight: `600`
- Text transform: `uppercase`
- Letter spacing: `0.03em`
- Background: severity color at `15%` opacity
- Text: severity color
- Fixed width: `52px` (consistent alignment)

### Query Bar

- Height: `44px`
- Background: input background
- Border: `1px solid` border-primary
- Border radius: `6px`
- Font: Log Body (monospace), `14px`
- Placeholder text: text-tertiary
- Focus: `1px solid` primary, glow `0 0 0 2px rgba(34, 211, 238, 0.2)`
- Icon left: search icon, text-secondary
- Supports syntax highlighting inline (field names in accent, operators in primary, strings in JSON-string green)

### Filter Sidebar

- Background: surface
- Section headers: sidebar-label size (`11px`), uppercase, text-secondary, `600` weight
- Section spacing: `20px`
- Facet items: checkbox + label + count badge (right-aligned, text-tertiary)
- Checkbox: `14px` square, `3px` radius, primary fill when checked
- Collapsible sections: chevron icon, `150ms` transition
- Active filter count badge: primary background, inverse text, pill shape

### Log Detail Panel

- Background: secondary background
- Border left: `1px solid` border-primary
- Header: service name + severity badge + timestamp
- Sections: collapsible (Message, Metadata, Stack Trace, Context)
- JSON viewer: syntax-highlighted, collapsible nodes
- Key-value pairs: key in JSON-key purple, value in text-primary
- Copy button on hover for each field value
- Stack trace: monospace, error-colored function names, muted file paths

### Timeline Minimap

- Height: `48px`
- Background: secondary background
- Border bottom: `1px solid` border-primary
- Bar chart: vertical bars representing log volume per time bucket
- Bar color: primary at `40%` opacity, hover: primary at `80%`
- Error spike overlay: severity-error color bars stacked
- Selection brush: primary background at `15%` opacity, `1px` primary border
- Time labels: `10px` monospace, text-tertiary

### Live Tail Indicator

- Position: status bar (bottom) and top bar
- Active state: live-tail-active green, pulsing dot animation (`1s` ease-in-out infinite)
- Paused state: live-tail-paused amber, static dot
- Label font: UI font, `12px`, `500` weight
- Dot size: `8px`, border-radius full

### Structured Data Table (within Detail Panel)

- Header background: tertiary background
- Row height: `32px`
- Cell padding: `6px 12px`
- Font: Log Body, `13px`
- Alternating rows: surface / surface-secondary
- Key column width: `40%`, text-secondary
- Value column: text-primary, word-break

### Search Result Highlighting

- Background: query-match-highlight (translucent yellow)
- Border radius: `2px`
- No text color change — highlight only
- Current match: `2px` solid primary border added

### Status Bar

- Height: `28px`
- Background: primary background
- Border top: `1px solid` border-primary
- Font: UI font, `12px`
- Items: total count, filtered count, time range, live tail status, connection indicator
- Spacing between items: `16px` with `1px` vertical dividers in border-primary

### Toast Notifications

- Position: bottom-right, `16px` from edges
- Border radius: `8px`
- Background: surface
- Border left: `3px solid` (colored by type — primary/success/warning/error)
- Shadow: `lg`
- Font: UI font, `13px`
- Auto-dismiss: `4s` for info, `8s` for errors
- Used for: connection status changes, export complete, saved searches
