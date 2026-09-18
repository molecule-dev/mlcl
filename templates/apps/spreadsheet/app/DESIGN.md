# DESIGN.md — Spreadsheet

## Brand Identity

- **App Name:** Calcite
- **Tagline:** Structure your thinking
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Structured, analytic, precise, keyboard-fluent

## Target Persona

Analysts, finance teams, and power users working with grid-based data, formulas, and pivot-style analysis.

## Screens

| Name            | Route                  | Auth | Purpose                                                        | deriveFrom |
| --------------- | ---------------------- | ---- | -------------------------------------------------------------- | ---------- |
| Landing         | /                      | No   | Marketing home with spreadsheet demo                           | —          |
| Login           | /login                 | No   | Sign in                                                        | —          |
| Signup          | /signup                | No   | Create account                                                 | Login      |
| ForgotPassword  | /forgot-password       | No   | Request reset                                                  | Login      |
| ResetPassword   | /reset-password        | No   | Set new password                                               | Login      |
| Workbooks       | /workbooks             | Yes  | List of user's spreadsheets                                    | —          |
| Editor          | /workbooks/:id         | Yes  | Spreadsheet editor with cells, formula bar                     | —          |
| Charts          | /workbooks/:id/charts  | Yes  | Chart builder / visualization panel                            | —          |
| Templates       | /templates             | Yes  | Templates library                                              | —          |
| Settings        | /settings              | Yes  | Account, preferences, sharing defaults                         | —          |
| TemplatePreview | /templates/:id         | Yes  | Detail view of a single template before "Use this template"    | —          |
| Automations     | /automations           | Yes  | Workflow builder for triggers + actions on workbook data       | —          |
| Integrations    | /integrations          | Yes  | Connect Calcite to external services (Stripe, Postgres, etc.)  | —          |
| History         | /workbooks/:id/history | Yes  | Workbook version history with cell-level diffs                 | —          |
| Notifications   | /notifications         | Yes  | Mentions, comments, share invites, automation alerts           | —          |
| Team            | /team                  | Yes  | Workspace members management — list, roles, invites, groups    | —          |
| Profile         | /profile               | Yes  | User account: personal info, sessions, API tokens, danger zone | —          |
| Billing         | /billing               | Yes  | Workspace subscription, usage meters, invoices, payment method | —          |
| NotFound        | /*                     | No   | 404 — cell-not-found in-app variant with recovery actions      | —          |

## App Constraints

- Grid cells use tabular-nums for numeric values
- Formula bar uses mono font with syntax-highlighted =SUM() and cell references
- Column/row headers highlight with primary blue on selection

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

- Formula: `#7c3aed`
- Formula Light: `#ede9fe`
- Cell Selected: `#dbeafe`
- Cell Editing: `#eff6ff`
- Row Hover: `#f8fafc`
- Column Resize: `#2563eb`
- Drag Handle: `#94a3b8`
- Positive Value: `#16a34a`
- Negative Value: `#dc2626`
- Linked Record: `#6366f1`
- Linked Record Light: `#e0e7ff`
- Collaborator Cursors:
  - Cursor A: `#f59e0b`
  - Cursor B: `#ec4899`
  - Cursor C: `#8b5cf6`
  - Cursor D: `#14b8a6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Grid Header: `#f1f5f9`
- Toolbar: `#ffffff`
- Sidebar: `#f8fafc`
- Formula Bar: `#f8fafc`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Cell: `#1e293b`
- Column Header: `#475569`
- Row Number: `#94a3b8`
- Formula: `#7c3aed`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Borders

- Grid Line: `#e2e8f0`
- Grid Line Strong: `#cbd5e1`
- Selection: `#2563eb`
- Focus: `#2563eb`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#34d399`
- Formula: `#a78bfa`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Grid Header: `#1e293b`
- Grid Line: `#334155`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Cell: `#e2e8f0`
- Column Header: `#cbd5e1`
- Row Number: `#64748b`
- Cell Selected: `rgba(37, 99, 235, 0.15)`
- Border Primary: `#334155`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Cell: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-variant-numeric: tabular-nums)
- Formula: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Column Header: `Inter, -apple-system, sans-serif` (font-weight: 600, text-transform: none)

### Cell Font Sizes

- Default: `0.8125rem` (13px)
- Compact: `0.75rem` (12px)
- Comfortable: `0.875rem` (14px)

## Layout

- Content Max Width: `100%` (full-width grid)
- Sidebar Width: `280px` (table list / views panel)
- Sidebar Collapsed: `0px` (hidden, not icon-only)
- Toolbar Height: `44px`
- Formula Bar Height: `36px`
- Top Bar Height: `48px`
- Row Height Default: `32px`
- Row Height Medium: `56px`
- Row Height Tall: `80px`
- Column Width Default: `180px`
- Column Width Min: `60px`
- Column Width Max: `800px`
- Row Number Column Width: `56px`
- Frozen Column Divider: `2px solid` grid-line-strong

## Components

### Grid Cell

- Border: `1px solid` grid-line on right and bottom edges only
- Padding: `0 8px`
- Font size: cell default (`13px`)
- Font variant: tabular-nums for number cells
- Line height: matches row height
- Text overflow: ellipsis (single-line), clip (multi-line enabled)
- Selected: `2px solid` selection border, cell-selected background
- Editing: white background, `2px solid` primary border, inner shadow `inset 0 0 0 1px rgba(37, 99, 235, 0.2)`, slight expansion (`-1px` margin on all sides)
- Error state: `#fee2e2` background, `#dc2626` text

### Column Header

- Background: grid-header
- Font size: `0.75rem` (12px)
- Font weight: `600`
- Color: column-header text
- Padding: `0 8px`
- Height: `32px`
- Border-bottom: `2px solid` grid-line-strong
- Border-right: `1px solid` grid-line
- Resize handle: `4px` wide invisible hit area, `2px` visible blue line on hover
- Sort indicator: `10px` chevron, secondary text color, primary when active
- Type icon: `14px`, secondary text color, `4px` right margin

### Column Type Icons

- Text: `T` glyph or paragraph icon
- Number: `#` glyph
- Checkbox: square checkbox icon
- Date: calendar icon
- Select: chevron-down circle
- Multi-select: tags icon
- URL: link icon
- Email: `@` glyph
- Phone: phone icon
- Formula: `fx` glyph in formula color
- Linked Record: arrow-up-right icon in linked-record color
- Attachment: paperclip icon
- All icons: `14px`, `500` weight, secondary text color

### Row Number

- Width: row-number-column-width (`56px`)
- Font size: `0.6875rem` (11px)
- Color: row-number text
- Text align: center
- Background: grid-header
- Hover: shows checkbox instead of number

### Formula Bar

- Height: formula-bar-height (`36px`)
- Background: formula-bar
- Border-bottom: `1px solid` grid-line
- Cell reference display: `120px` max width, `12px` font, `600` weight, right border separator
- Formula input: formula font family, `13px`, formula text color
- `fx` prefix icon: formula color, `14px`

### Toolbar

- Height: toolbar-height (`44px`)
- Background: toolbar
- Border-bottom: `1px solid` grid-line
- Button size: `28px` height, `6px 8px` padding
- Button border radius: `6px`
- Button gap: `2px`
- Divider: `1px solid` grid-line, `16px` height, `8px` horizontal margin
- Icon size: `16px`
- Sections: formatting | alignment | data type | actions

### View Tabs

- Height: `36px`
- Tab padding: `8px 12px`
- Tab font size: `0.8125rem` (13px)
- Tab font weight: `500`
- Active tab: primary text, `2px` bottom border in primary color
- Inactive tab: secondary text
- Tab icon: `14px`, `4px` right margin
- Add view button: ghost style, `+` icon
- Tab types: Grid (default), Form, Kanban, Gallery, Calendar

### Cell Editor Dropdown (Select/Multi-select)

- Border radius: `8px`
- Shadow: `lg`
- Max height: `300px`
- Option padding: `8px 12px`
- Option font size: `13px`
- Search input at top: `36px` height, no border-radius (flush with dropdown top)
- Color dot: `8px` circle, `8px` right margin
- Selected check: primary color checkmark, right-aligned

### Expand Row Modal

- Width: `720px`
- Border radius: `12px`
- Shadow: `xl`
- Header: field name as `18px` bold title
- Field layout: label left (`140px` fixed width, `13px`, `600` weight, secondary color), value right (flex-1)
- Field row padding: `8px 24px`
- Field row border-bottom: `1px solid` grid-line
- Activity/comments tab at bottom: `200px` collapsible panel

### Collaborator Presence

- Avatar size: `24px` circle
- Border: `2px solid` matching cursor color
- Stack overlap: `-6px` margin-left
- Max visible: `4` + overflow count badge
- Active cell highlight: `2px solid` cursor color around the cell, name tooltip on hover
- Cursor label: `12px` bold, white text on cursor-color background, `4px` border-radius, positioned above-left of cell

### Import/Export Panel

- Width: `480px` slide-over from right
- Border-radius: `0` (flush to viewport edge)
- Shadow: `xl` on left edge
- File drop zone: `120px` height, dashed `2px` border, primary color on drag-over
- Preview table: compact grid style, `10` row max, `24px` row height
- Column mapping: drag-handle + source column → target column dropdown
- Progress bar: `4px` height, primary color, border-radius `full`

### Search Overlay

- Position: centered top, `40%` width, `48px` height
- Border radius: `12px`
- Shadow: `xl`
- Input font size: `15px`
- Results dropdown: `400px` max-height, cell reference + value preview per result
- Match highlight: `#fef08a` background (light), `rgba(250, 204, 21, 0.3)` (dark)
- Keyboard hint badges: `20px` height, `4px` radius, `#f1f5f9` background, `11px` mono font

### Filter Bar

- Height: `36px`
- Background: surface-secondary
- Pill style: `6px` border-radius, `#e2e8f0` background, `12px` font, `4px 10px` padding
- Active filter pill: primary-light background, primary border
- Connector word ("and"/"or"): `11px`, secondary text, italic
- Add filter: ghost button, `+` icon, `12px` font

### Sort Indicator

- In column header: small arrow (▲/▼), `10px`, primary color when active
- Sort rank badge: `14px` circle, primary background, white text, `10px` font, superscript position

### Frozen Columns

- Divider: `2px solid` grid-line-strong, with `4px` shadow on right (`rgba(0,0,0,0.06)`)
- Frozen area background: surface (slightly distinct from scrollable area in dark mode)

## Design Principles

1. **Data density over decoration** — minimize chrome, maximize visible cells; every pixel of padding is a tradeoff against data visibility
2. **Keyboard-first** — all grid operations must be accessible via keyboard; visual affordances for mouse users should not break keyboard flow
3. **Type-aware rendering** — each column type (number, date, select, formula) gets distinct visual treatment so users can scan data types at a glance
4. **Real-time without distraction** — collaborator presence is visible but subtle; cursor highlights and avatars should inform, not interrupt
5. **Progressive disclosure** — show simple editing inline, reveal complex features (formulas, filters, sorts) in focused panels
6. **Spatial consistency** — grid lines, column widths, and row heights must remain pixel-stable during scrolling, editing, and collaboration events
