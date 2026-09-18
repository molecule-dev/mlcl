# DESIGN.md — Database Admin

## Brand Identity

- **App Name:** Quarry
- **Tagline:** Extract. Query. Command.
- **Logo:** Text-based logo using the app name in monospace heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, technical, power-user, keyboard-first

## Target Persona

Database engineers, backend developers, and DevOps operators managing multiple Postgres/MySQL/Redis/Mongo connections, writing queries, inspecting schemas, and monitoring performance.

## Screens

| Name             | Route                           | Auth | Purpose                                                                            | deriveFrom    |
| ---------------- | ------------------------------- | ---- | ---------------------------------------------------------------------------------- | ------------- |
| Login            | /login                          | No   | Sign in                                                                            | —             |
| Signup           | /signup                         | No   | Create account                                                                     | Login         |
| ForgotPassword   | /forgot-password                | No   | Request reset                                                                      | Login         |
| ResetPassword    | /reset-password                 | No   | Set new password                                                                   | Login         |
| Connections      | /connections                    | Yes  | List of DB connections with status                                                 | —             |
| QueryEditor      | /query/:connectionId            | Yes  | SQL editor with results pane (main workspace)                                      | —             |
| TableBrowser     | /table/:connectionId/:table     | Yes  | Browse table rows with filter and edit-in-place                                    | —             |
| SchemaExplorer   | /schema/:connectionId           | Yes  | ER diagram + schema inspector                                                      | —             |
| QueryHistory     | /history                        | Yes  | Saved queries and recent execution history                                         | —             |
| Monitoring       | /monitoring                     | Yes  | Connection metrics, slow queries, locks                                            | —             |
| Settings         | /settings                       | Yes  | Account, connections, shortcuts, appearance                                        | —             |
| NewConnection    | /connections/new                | Yes  | Form to add a new database connection (type, host/port/credentials, SSL, advanced) | —             |
| EditConnection   | /connections/:connectionId/edit | Yes  | Edit existing connection settings                                                  | NewConnection |
| SavedQueryDetail | /history/saved/:queryId         | Yes  | View/edit a saved query, parameters, execution history, schedule, sharing          | —             |

## App Constraints

- Dark IS the default theme (Quarry). All primary designs are dark mode first
- Query editor uses JetBrains Mono with SQL syntax highlighting (keyword #ff7b72, string #a5d6ff, number #79c0ff, function #d2a8ff, table #ffa657, alias #7ee787)
- Results table uses JetBrains Mono tabular-nums, NULL cells italicize with gray, primary-key column has 2px amber left border
- Keyboard shortcut hints display inline with monospace chips (⌘K, ⌘R, etc.)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Connected: `#10b981`
- Disconnected: `#ef4444`
- Query Success: `#10b981`
- Query Error: `#ef4444`
- Slow Query: `#f59e0b`
- Read Only: `#06b6d4`
- Null Value: `#6b7280`
- Primary Key: `#f59e0b`
- Foreign Key: `#8b5cf6`

### Backgrounds

- Primary: `#010409`
- Surface: `#0d1117`
- Surface Secondary: `#161b22`
- Editor: `#0d1117`
- Results Pane: `#161b22`
- Sidebar: `#010409`
- Input: `#0d1117`

### Text

- Primary: `#e6edf3`
- Secondary: `#7d8590`
- Tertiary: `#484f58`
- Code: `#e6edf3`
- Link: `#10b981`
- Link Hover: `#34d399`
- Table Header: `#7d8590`

### Borders

- Primary: `#21262d`
- Secondary: `#30363d`
- Focus: `#10b981`

### Dark Theme Overrides

Dark IS the default theme for Quarry. The colors above define the dark theme. Light mode overrides:

- Primary: `#059669`
- Background: `#f6f8fa`
- Surface: `#ffffff`
- Surface Secondary: `#f0f2f5`
- Text Primary: `#1f2328`
- Text Secondary: `#656d76`
- Border Primary: `#d0d7de`

## Typography

### Font Families

- UI: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- Data: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `100%` (full-width dashboard, no max constraint)
- Schema Sidebar Width: `280px` (collapsed: `48px`)
- Query Editor Height: `40%` of viewport (resizable via drag handle)
- Results Pane Height: `60%` of viewport (resizable via drag handle)
- Properties Panel Width: `320px`
- Tab Bar Height: `36px`
- Toolbar Height: `40px`
- Status Bar Height: `24px`

## Components

### Query Editor

- Background: editor background
- Font: code font family, `14px`
- Line height: `1.6`
- Line numbers: secondary text, right-aligned, `48px` gutter width
- Active line highlight: `rgba(16, 185, 129, 0.06)`
- Selection: `rgba(16, 185, 129, 0.2)`
- Cursor color: primary
- Padding: `8px 0`
- Border: none (borderless, flush with container)
- Minimap: hidden by default

### SQL Syntax Highlighting

- Keyword: `#ff7b72` (SELECT, FROM, WHERE, JOIN, etc.)
- String: `#a5d6ff`
- Number: `#79c0ff`
- Function: `#d2a8ff`
- Operator: `#e6edf3`
- Comment: `#7d8590` italic
- Table name: `#ffa657`
- Column name: `#e6edf3`
- Alias: `#7ee787`

### Results Table

- Header background: surface secondary
- Header text: secondary text, uppercase, `11px`, `600` weight, `1px` letter-spacing
- Cell font: data font family, `13px`
- Cell padding: `6px 12px`
- Row height: `32px`
- Row hover: `rgba(16, 185, 129, 0.04)`
- Selected row: `rgba(16, 185, 129, 0.1)`, left border `2px solid` primary
- Null cell: italic, null-value color, displays `NULL`
- Primary key column: left border `2px solid` primary-key color
- Border: `1px solid` border-primary between cells
- Alternating rows: surface / surface-secondary
- Max cell width: `300px`, ellipsis truncation, expand on click
- Row count badge: bottom-left, secondary text, `12px`

### Schema Tree

- Indent per level: `16px`
- Node height: `28px`
- Icon size: `14px`
- Font: UI font, `13px`
- Active node: primary at `10%` opacity background, primary text
- Table icon: `#f59e0b`
- View icon: `#8b5cf6`
- Column icon: `#7d8590`
- Index icon: `#06b6d4`
- Function icon: `#d2a8ff`
- Trigger icon: `#ff7b72`
- Expand/collapse chevron: `12px`, secondary text

### Connection Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`
- Connected: `6px` green dot with `0 0 4px` glow + "Connected" text
- Disconnected: `6px` red dot with `0 0 4px` glow + "Disconnected" text

### Tab Bar

- Tab height: `36px`
- Tab padding: `0 16px`
- Active tab: primary text, bottom border `2px solid` primary
- Inactive tab: secondary text
- Close button: `14px`, appears on hover only
- Background: sidebar background
- Font: UI font, `13px`
- New tab button: `+` icon, ghost style, `28px` square

### Toolbar

- Height: `40px`
- Background: surface secondary
- Button style: ghost by default, `28px` height
- Run Query button: solid primary, `28px` height, play triangle icon
- Explain button: outline accent, `28px` height
- Stop button: outline error, `28px` height (visible during execution)
- Separator: `1px solid` border-primary, `16px` vertical margin
- Format SQL button: ghost, code icon

### Status Bar

- Height: `24px`
- Background: `#010409`
- Font: UI font, `11px`
- Text color: secondary text
- Connection info: left-aligned (host, database name, user)
- Query stats: right-aligned (rows returned, execution time, timestamp)
- Execution time badge: green if < 100ms, yellow if < 1s, red if >= 1s

### Data Visualization

- Chart container: surface secondary background, `16px` padding, `8px` border-radius
- Axis labels: secondary text, `11px`
- Grid lines: border-primary, `0.5` opacity
- Series colors (ordered): `#10b981`, `#06b6d4`, `#8b5cf6`, `#f59e0b`, `#ff7b72`, `#d2a8ff`, `#7ee787`
- Tooltip: surface background, `sm` shadow, `8px` border-radius, `12px` padding
- Legend: secondary text, `12px`, circle indicators `8px`

### Keyboard Shortcut Hints

- Background: `rgba(110, 118, 129, 0.4)`
- Border radius: `4px`
- Padding: `1px 6px`
- Font: code font, `11px`
- Border: `1px solid` border-secondary
- Display inline next to menu items and toolbar buttons

### Search / Command Palette

- Overlay: `rgba(0, 0, 0, 0.6)`
- Input height: `48px`
- Input font: UI font, `16px`
- Width: `560px`
- Border radius: `12px` (lg)
- Background: surface
- Shadow: `xl`
- Result item height: `36px`
- Result item font: `14px`
- Matched characters: primary color, `600` weight
- Category labels: secondary text, uppercase, `11px`
