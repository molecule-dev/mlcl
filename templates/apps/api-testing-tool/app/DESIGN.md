# DESIGN.md — API Testing Tool

## Brand Identity

- **App Name:** Pylon
- **Tagline:** Fire requests, forge confidence
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), monospaced alternate for in-editor contexts
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Sharp, engineering-focused, efficient, confident

## Target Persona

Backend developers and QA engineers testing REST APIs with request collections, environments, and test assertions.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                  | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Dark-mode marketing home with API request demos, green-violet palette, features, pricing                                 | —          |
| Login          | /login           | No   | Dark centered card with green primary                                                                                    | —          |
| Signup         | /signup          | No   | Create account                                                                                                           | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                            | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                         | Login      |
| Workspace      | /workspace       | Yes  | Three-pane dark layout: collections sidebar left (tree view with method badges), request editor center with method dr... | —          |
| Collections    | /collections     | Yes  | Dark sidebar, tree of request collections with folders, method badges, last-run timestamps, run-all button per collec... | —          |
| Environments   | /environments    | Yes  | Dark sidebar, environment list with active toggle, variable key-value editor per environment                             | —          |
| History        | /history         | Yes  | Dark sidebar, run history table with method+URL, status code colored badges, response time colored by speed, timestam... | —          |
| Mocks          | /mocks           | Yes  | Dark sidebar, mock server cards with endpoint list, response templates, hit counts, enable toggle                        | —          |
| Settings       | /settings        | Yes  | Dark sidebar, account, team, proxy, integrations                                                                         | —          |
| TestRunner     | /tests           | Yes  | Suite runner — pass/fail/skip results with assertion diffs, summary bar, run history mini-list                           | —          |
| Monitors       | /monitors        | Yes  | Scheduled API health checks — uptime sparklines, latency charts, alert rules per monitor                                 | —          |
| Profile        | /profile         | Yes  | User identity — avatar, bio, contributed collections, recent activity, API keys, sessions                                | —          |

## App Constraints

- Dark mode default with #0c0f14 background
- HTTP method dropdown color-coded (GET green, POST blue, etc.)
- Response time colored: fast <200ms green, normal amber, slow >500ms red

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Accent: `#a78bfa`
- Accent Hover: `#c4b5fd`
- Accent Dark: `#7c3aed`

### Semantic — HTTP Methods

- GET: `#10b981`
- GET Light: `#d1fae5`
- POST: `#3b82f6`
- POST Light: `#dbeafe`
- PUT: `#f59e0b`
- PUT Light: `#fef3c7`
- PATCH: `#a78bfa`
- PATCH Light: `#ede9fe`
- DELETE: `#ef4444`
- DELETE Light: `#fee2e2`
- OPTIONS: `#6b7280`
- HEAD: `#6b7280`

### Semantic — Status Codes

- 2xx Success: `#10b981`
- 2xx Light: `#d1fae5`
- 3xx Redirect: `#3b82f6`
- 3xx Light: `#dbeafe`
- 4xx Client Error: `#f59e0b`
- 4xx Light: `#fef3c7`
- 5xx Server Error: `#ef4444`
- 5xx Light: `#fee2e2`

### Semantic — Response Timing

- Fast (< 200ms): `#10b981`
- Normal (200–500ms): `#f59e0b`
- Slow (> 500ms): `#ef4444`

### Backgrounds

- Primary: `#0c0f14`
- Secondary: `#111621`
- Tertiary: `#1a1f2e`
- Surface: `#161b26`
- Surface Secondary: `#1e2433`
- Input: `#111621`
- Overlay: `rgba(0, 0, 0, 0.65)`
- Editor: `#0c0f14`
- Response Pane: `#111621`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0c0f14`
- Link: `#10b981`
- Link Hover: `#34d399`
- URL: `#e2e8f0`
- URL Param: `#f59e0b`
- URL Variable: `#a78bfa`

### Borders

- Primary: `#1e293b`
- Secondary: `#334155`
- Focus: `#10b981`

### Dark Theme Overrides

(Pylon defaults to dark. These are the light-mode overrides.)

- Primary: `#059669`
- Background: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#e2e8f0`
- Editor: `#ffffff`
- Response Pane: `#f8fafc`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- URL Bar: `"JetBrains Mono", SFMono-Regular, Menlo, monospace`
- Headers/Tabs: `Inter, -apple-system, BlinkMacSystemFont, sans-serif` (font-weight: 600, letter-spacing: -0.01em)

### Overrides

- Default body font: Code (monospace) for request/response panels; Body (sans) for navigation, labels, and settings
- URL bar font size: `sm` (14px)
- Response body font size: `sm` (14px)
- Tab labels: `xs` (12px), uppercase, `600` weight, `0.05em` letter-spacing
- Status badge font: `xs` (12px), `700` weight, tabular-nums

## Layout

- Content Max Width: `none` (full viewport — IDE-style)
- Sidebar (Collections): `280px` (collapsed: `48px`)
- Request Pane / Response Pane: `50% / 50%` horizontal split (resizable)
- Top Bar Height: `48px`
- URL Bar Height: `44px`
- Tab Bar Height: `36px`
- Environment Selector Width: `200px`
- Right Sidebar (History): `300px` (hidden by default, toggled)
- Bottom Panel (Console/Test Results): `240px` (collapsible)

### Pane Split

- Default orientation: horizontal (request left, response right) on screens > `1024px`
- Vertical (request top, response bottom) on screens <= `1024px`
- Resizable via drag handle: `4px` wide, `border-secondary` color, `primary` on hover

## Components

### URL Bar

- Border radius: `8px` (md)
- Height: `44px`
- Background: `input`
- Border: `1px solid` border-primary, `2px solid` primary on focus
- Font: Code family, `sm` size
- Method badge: inline left, `8px` horizontal padding, `4px` border-radius, bold `xs` text, colored per HTTP method semantic
- Send button: `primary` background, `8px 20px` padding, `8px` right radius, `600` weight

### Request Tab

- Height: `36px`
- Padding: `0 16px`
- Font: Body family, `xs` size, `500` weight
- Active: `surface` background, `primary` bottom border (`2px`)
- Inactive: transparent background, `text-secondary` color
- Hover: `surface-secondary` background
- Close button: `16px` icon, visible on hover, `4px` border-radius
- Method dot: `8px` circle, colored per HTTP method, left of tab label
- Unsaved indicator: `6px` dot, `text-tertiary`, right of label

### Collection Tree

- Indent per level: `16px`
- Row height: `32px`
- Padding: `4px 12px`
- Font: Body family, `sm` size
- Folder icon: `16px`, `text-secondary`
- Active item: `surface-secondary` background, `primary` left border (`3px`)
- Hover: `surface-secondary` background
- Drag handle: `12px` grip dots, visible on hover
- Collapse chevron: `12px`, `150ms` rotation transition

### Key-Value Editor (Headers, Params, Body form-data)

- Row height: `36px`
- Grid: `checkbox (28px)` | `key (1fr)` | `value (1fr)` | `description (0.8fr)` | `actions (28px)`
- Cell padding: `4px 8px`
- Cell font: Code family, `sm` size
- Cell border: `1px solid` border-primary
- Enabled checkbox: `16px`, `4px` radius, `primary` fill when checked
- Disabled row: `0.4` opacity
- Add row: dashed `1px` border-secondary bottom, `text-tertiary` placeholder
- Autocomplete dropdown: `surface` background, `lg` shadow, `8px` radius, max-height `240px`

### Response Panel

- Status badge: pill shape (`9999px` radius), `4px 12px` padding, colored per status code range, `700` weight
- Time badge: `text-secondary`, Code font, `xs` size
- Size badge: `text-secondary`, Code font, `xs` size
- Body viewer: full-height code editor with syntax highlighting, `editor` background
- Tab bar (Body, Headers, Cookies, Test Results): same style as request tabs

### Environment Selector

- Border radius: `6px`
- Height: `32px`
- Background: `surface-secondary`
- Border: `1px solid` border-primary
- Font: Body family, `xs` size, `500` weight
- Active environment color dot: `8px` circle, user-assigned color
- Dropdown: `surface` background, `lg` shadow, `8px` radius
- Variable preview on hover: tooltip with key-value pairs, Code font

### History Panel

- Grouped by date (Today, Yesterday, older dates)
- Row height: `36px`
- Padding: `4px 12px`
- Method badge: `xs` bold text, colored per HTTP method, `28px` min-width
- URL: Code font, `sm` size, truncated with ellipsis
- Status dot: `8px` circle, colored per status code range
- Timestamp: `text-tertiary`, `xs` size, right-aligned
- Hover: `surface-secondary` background

### Test Runner

- Pass indicator: `success` colored check, `12px` icon
- Fail indicator: `error` colored X, `12px` icon
- Skip indicator: `text-tertiary` dash, `12px` icon
- Summary bar: `surface-secondary` background, `8px` radius, `12px 16px` padding
- Pass/fail counts: bold, colored per semantic
- Duration: `text-secondary`, Code font
- Assertion detail: Code font, `sm` size, indented `24px` under test name

### Request Body Editor

- Full Monaco-style code editor region
- Background: `editor`
- Line numbers: `text-tertiary`, `xs` size, `48px` gutter
- Active line: `rgba(16, 185, 129, 0.05)` highlight
- Syntax highlighting: JSON keys `#10b981`, strings `#f59e0b`, numbers `#3b82f6`, booleans `#a78bfa`, null `#ef4444`

### Keyboard Shortcut Hints

- Badge style: `surface-secondary` background, `1px solid` border-secondary, `4px` radius
- Font: Code family, `xs` size, `text-secondary`
- Padding: `2px 6px`
- Displayed inline-right on menu items and button tooltips

### Search / Command Palette

- Overlay: centered, `640px` max-width, `surface` background, `lg` radius, `xl` shadow
- Input: `48px` height, no border, `lg` font, `primary` caret color
- Result rows: `40px` height, `12px 16px` padding, `surface-secondary` hover
- Category headers: `xs` size, `text-tertiary`, uppercase, `600` weight
- Keyboard nav indicator: `primary` left border (`3px`) on active row

### Auth Configuration Panel

- Nested within request settings tab
- Auth type selector: segmented control, `32px` height, `6px` radius, `surface-secondary` background
- Token/credential fields: same as key-value editor cells
- Inherit badge: `info` colored pill, `xs` size, "Inherited from collection"
- Types: None, Bearer Token, Basic Auth, API Key, OAuth 2.0

## Design Principles (Pylon-specific)

1. **Dark-first** — dark theme is the default; every color is chosen for dark backgrounds first, light mode is the override
2. **Density over whitespace** — developer tools favor information density; use `sm` and `xs` sizing, tight `4px`/`8px` spacing in panels
3. **Color encodes meaning** — HTTP methods and status codes always use their semantic color; never use arbitrary colors for these
4. **Monospace where data flows** — URLs, headers, bodies, and values use the Code font; only chrome/navigation uses the Body font
5. **Keyboard-native** — every action has a shortcut; shortcut hints are always visible in menus and tooltips
6. **Split-pane sovereignty** — request and response are always simultaneously visible; never navigate away from one to see the other
