# DESIGN.md — API Documentation

## Brand Identity

- **App Name:** Prism
- **Tagline:** Illuminate every endpoint
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), with a subtle spectral gradient on the "i" dot in accent contexts
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Clear, authoritative, developer-focused, precise

## Target Persona

API consumers and internal developers browsing, searching, and testing REST APIs with interactive examples.

## Screens

| Name              | Route               | Auth | Purpose                                                                                                                                                              | deriveFrom |
| ----------------- | ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing           | /                   | No   | Dark-mode developer-focused marketing home with API endpoint demos, green primary, features, pricing                                                                 | —          |
| Login             | /login              | No   | Dark centered card with green primary                                                                                                                                | —          |
| Signup            | /signup             | No   | Create account                                                                                                                                                       | Login      |
| ForgotPassword    | /forgot-password    | No   | Request reset                                                                                                                                                        | Login      |
| ResetPassword     | /reset-password     | No   | Set new password                                                                                                                                                     | Login      |
| DocsHome          | /docs               | Yes  | Dark nav sidebar left with sections, docs content center with quick-start code blocks, auth guide, on-this-page nav r...                                             | —          |
| EndpointReference | /docs/endpoints/:id | Yes  | Dark nav sidebar with collapsible resource groups, center content with endpoint description + method badge + paramete...                                             | —          |
| Endpoints         | /docs/endpoints     | Yes  | Dark nav sidebar, searchable list of all endpoints grouped by resource with colored method badges (GET/POST/PUT/DELET...                                             | —          |
| Guides            | /docs/guides        | Yes  | Dark nav sidebar, long-form guide article center with headings, code blocks (JetBrains Mono with syntax highlight), c...                                             | —          |
| APIKeys           | /settings/api-keys  | Yes  | Dark nav sidebar, API key table with name, key (masked), scopes, last-used, created, create new button                                                               | —          |
| Settings          | /settings           | Yes  | Dark nav sidebar, account, billing, team, integrations                                                                                                               | —          |
| Changelog         | /docs/changelog     | Yes  | Dark nav sidebar, vertical release timeline with version tags, dates, change-type chips (Added/Changed/Deprecated/Removed/Fixed), grouped entries, copy-link anchors | —          |
| Webhooks          | /docs/webhooks      | Yes  | Dark nav sidebar, webhook events list with event-name code, description, payload JSON sample, signature verification example, retry policy section                   | —          |
| SDKs              | /docs/sdks          | Yes  | Dark nav sidebar, grid of official client libraries (Node, Python, Go, Ruby, PHP, Java) with install snippet, version, GitHub link, quick example                    | —          |
| Errors            | /docs/errors        | Yes  | Dark nav sidebar, error code reference table grouped by category (4xx/5xx) with code, name, description, example response, troubleshooting note                      | —          |
| APIPlayground     | /playground         | Yes  | Dark nav sidebar, full-page interactive console: method+URL bar, headers/body tabs, environment selector, request history, large response viewer with status/timing  | —          |
| Status            | /status             | Yes  | Dark nav sidebar, overall status banner, services grid with uptime sparklines, current incident card, 90-day uptime history, scheduled maintenance                   | —          |
| Profile           | /profile            | Yes  | Personal profile: avatar, display name, public dev handle, bio, GitHub/Twitter links, time zone                                                                      | Settings   |
| Billing           | /settings/billing   | Yes  | Plan tier card, usage meter (requests/quota), invoices table, payment method                                                                                         | Settings   |
| Team              | /settings/team      | Yes  | Team members table with role (Admin/Developer/Viewer), invite form, pending invitations                                                                              | Settings   |
| NotFound          | /404                | No   | Dark centered 404 with monospace endpoint-not-found message and link back to docs                                                                                    | Landing    |

## App Constraints

- Dark mode default with #0c1222 background
- HTTP method badges use distinct colors: GET green, POST blue, PUT amber, DELETE red, PATCH violet
- Code samples use JetBrains Mono with syntax highlighting

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

- GET: `#10b981`
- GET Light: `#d1fae5`
- POST: `#3b82f6`
- POST Light: `#dbeafe`
- PUT: `#f59e0b`
- PUT Light: `#fef3c7`
- DELETE: `#ef4444`
- DELETE Light: `#fee2e2`
- PATCH: `#8b5cf6`
- PATCH Light: `#ede9fe`
- OPTIONS: `#6b7280`
- OPTIONS Light: `#f3f4f6`
- Deprecated: `#9ca3af`
- Required: `#ef4444`
- Optional: `#6b7280`
- Stable: `#10b981`
- Beta: `#f59e0b`
- Experimental: `#8b5cf6`

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111827`
- Tertiary: `#1a2332`
- Surface: `#1e293b`
- Surface Secondary: `#253344`
- Input: `#1e293b`
- Code Block: `#0d1117`
- Try It Console: `#111827`
- Overlay: `rgba(0, 0, 0, 0.7)`

### Text

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#10b981`
- Link Hover: `#34d399`
- Code: `#e2e8f0`
- Code Keyword: `#c084fc`
- Code String: `#86efac`
- Code Number: `#fbbf24`
- Code Comment: `#475569`

### Borders

- Primary: `#1e293b`
- Secondary: `#334155`
- Focus: `#10b981`
- Method Divider: `#1e293b`

### Dark Theme Overrides

Dark theme IS the default for this app. Light theme overrides:

- Primary: `#059669`
- Background: `#f8fafc`
- Secondary Background: `#f1f5f9`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Code Block: `#1e293b`
- Text Primary: `#1e293b`
- Text Secondary: `#475569`
- Border Primary: `#e2e8f0`

## Typography

### Font Families

- UI: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Overrides

- Body text: `14px` base (sm) — denser information display
- Code blocks: `13px` — one step smaller than body for comfortable reading
- Endpoint paths: Code font, `15px`, font-weight `500`
- Parameter names: Code font, `13px`, font-weight `500`

## Layout

- Content Max Width: `1400px`
- Sidebar Nav Width: `280px` (collapsed: `56px`)
- Sidebar Nav Background: `#0c1222`
- Right Panel Width: `480px` (code samples / try-it console)
- Three-Column Layout: sidebar (`280px`) + main content (`1fr`) + right panel (`480px`)
- Two-Column Breakpoint: below `1280px` — right panel stacks below main content
- Single-Column Breakpoint: below `768px` — sidebar becomes hamburger drawer
- Top Bar Height: `48px`
- Section Spacing: `48px` between endpoint groups
- Endpoint Spacing: `32px` between endpoints within a group
- Parameter Table Cell Padding: `10px 16px`

## Components

### Endpoint Card

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Background: surface
- Method badge + path on header row, left-aligned
- Header padding: `12px 16px`
- Body padding: `16px`
- Expandable — click header to toggle parameter/response details
- Collapsed state shows: method badge, path, one-line description
- Left border accent: `3px solid` matching method color (GET=green, POST=blue, etc.)
- Hover: border-secondary, slight background lighten

### Method Badge

- Border radius: `4px` (sm)
- Padding: `2px 8px`
- Font: code font, `12px`, font-weight `700`, uppercase
- Min width: `60px`, text-align center
- GET: `#10b981` text on `#10b98115` background
- POST: `#3b82f6` text on `#3b82f615` background
- PUT: `#f59e0b` text on `#f59e0b15` background
- DELETE: `#ef4444` text on `#ef444415` background
- PATCH: `#8b5cf6` text on `#8b5cf615` background
- OPTIONS: `#6b7280` text on `#6b728015` background

### Try-It Console

- Border radius: `8px` (md)
- Background: try-it-console background
- Border: `1px solid` border-secondary
- Header: `40px` height, "Try It" label + Send button
- URL bar: code font, editable, full width, `40px` height
- Request body: code editor textarea, min height `120px`
- Response area: syntax-highlighted, with status code badge + response time
- Send button: primary color, `32px` height, font-weight `600`
- Loading state: pulsing border animation, primary color

### Code Sample Block

- Border radius: `8px` (md)
- Background: code-block background
- Border: `1px solid` border-primary
- Tab bar: language selector tabs (cURL, JavaScript, Python, Go, Ruby)
- Tab height: `36px`
- Active tab: primary color bottom border (`2px`), primary text
- Inactive tab: secondary text, transparent background
- Code padding: `16px`
- Copy button: top-right, ghost style, `24px` icon
- Line numbers: tertiary text, right-aligned, `40px` gutter width
- Syntax highlighting uses text color tokens (keyword, string, number, comment)

### Parameter Table

- Header background: surface-secondary
- Header font: `12px`, uppercase, font-weight `600`, secondary text, letter-spacing `0.05em`
- Row border-bottom: `1px solid` border-primary
- Name column: code font, `13px`, font-weight `500`, primary text
- Type column: code font, `12px`, secondary text
- Required indicator: small red dot (`6px`) or "required" badge in error color
- Description column: UI font, `13px`, secondary text
- Default value: code font, `12px`, tertiary text, italic
- Nested parameters: indented `24px` with `1px` left border in border-secondary
- Expandable nested objects: chevron toggle, `16px`

### Response Viewer

- Border radius: `8px` (md)
- Status code tabs: `200`, `400`, `401`, `404`, `500` — each a clickable tab
- Status badge: border-radius `4px`, padding `2px 8px`, code font
- 2xx: success color on success-light background
- 4xx: warning color on warning-light background
- 5xx: error color on error-light background
- Response body: syntax-highlighted JSON with collapsible objects/arrays
- Schema view toggle: switch between "Example" and "Schema" views
- Collapse depth: top-level keys expanded, nested objects collapsed by default

### Schema Viewer

- Tree structure with indentation `20px` per level
- Property name: code font, `13px`, font-weight `500`
- Type badge: border-radius `4px`, padding `1px 6px`, font `11px`, background surface-secondary
- String type: `#86efac`
- Number type: `#fbbf24`
- Boolean type: `#f472b6`
- Array type: `#60a5fa`
- Object type: `#c084fc`
- Connecting lines: `1px solid` border-primary, vertical + horizontal

### Search (Command Palette)

- Trigger: `Cmd+K` / `Ctrl+K`
- Modal: centered, `600px` max width, `400px` max height
- Border radius: `12px` (lg)
- Shadow: `xl`
- Background: surface
- Border: `1px solid` border-secondary
- Input: full width, `48px` height, code font, no visible border
- Results: scrollable list, `40px` row height
- Result row: endpoint path in code font + method badge + group label
- Active result: surface-secondary background, primary left border `2px`
- Keyboard hint badges: border-radius `4px`, `20px` min-width, `#334155` background, `11px` code font

### Sidebar Navigation

- Background: sidebar-nav background
- Group headers: `11px`, uppercase, font-weight `700`, letter-spacing `0.08em`, secondary text
- Group spacing: `24px`
- Endpoint links: `13px`, UI font, secondary text
- Active endpoint: primary text, primary-dark left border `2px`, surface background
- Hover: primary text, slight background lighten
- Method mini-badge: inline before path, `10px` code font, matching method color
- Version selector: dropdown at top, `32px` height, border-radius `6px`
- Collapse/expand group: chevron icon, `12px`, tertiary color

### Auth Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font: `11px`, font-weight `600`
- Variants: "API Key" (accent), "OAuth 2.0" (primary), "Bearer" (info `#17a2b8`), "None" (secondary)
- Positioned inline after endpoint path

### Keyboard Shortcuts Overlay

- Trigger: `?` key
- Modal: `500px` max width
- Two-column layout: action label + key combo
- Key combo badges: `24px` height, `6px` border-radius, `#334155` background, `12px` code font
- Sections: Navigation, Search, Try-It Console, General

### Stability Badge

- Border radius: `9999px` (pill)
- Padding: `2px 8px`
- Font: `10px`, uppercase, font-weight `700`, letter-spacing `0.05em`
- Stable: stable color on transparent
- Beta: beta color on `#f59e0b15` background
- Experimental: experimental color on `#8b5cf615` background
- Deprecated: deprecated color, strikethrough on endpoint path
