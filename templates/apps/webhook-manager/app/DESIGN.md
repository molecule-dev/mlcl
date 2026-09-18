# DESIGN.md — Webhook Manager

## Brand Identity

- **App Name:** Pylon
- **Tagline:** Every payload, delivered
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), monospace variant
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Technical, concise, developer-fluent, calm-under-pressure

## Target Persona

Backend engineers, platform operators, and integrations teams who need live delivery observability, retry control, and clean payload inspection.

## Screens

| Name           | Route              | Auth | Purpose                                                                          | deriveFrom |
| -------------- | ------------------ | ---- | -------------------------------------------------------------------------------- | ---------- |
| Landing        | /                  | No   | Marketing home with value props and signup CTA                                   | —          |
| Login          | /login             | No   | Sign in                                                                          | —          |
| Signup         | /signup            | No   | Create account                                                                   | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                                    | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                                 | Login      |
| Dashboard      | /dashboard         | Yes  | Live delivery metrics, failure feed, endpoint health                             | —          |
| Endpoints      | /endpoints         | Yes  | All configured webhook endpoints with status                                     | —          |
| EndpointDetail | /endpoints/:id     | Yes  | Single endpoint config, secret, recent deliveries, test panel                    | —          |
| Deliveries     | /deliveries        | Yes  | Full searchable delivery log with filters and detail slide-over                  | —          |
| Events         | /events            | Yes  | Event catalog and schema browser                                                 | —          |
| Settings       | /settings          | Yes  | API keys, team, billing, notification channels                                   | —          |
| DeliveryDetail | /deliveries/:id    | Yes  | Full-page view of a single delivery — payload, headers, response, retry timeline | —          |
| EventDetail    | /events/:id        | Yes  | Single event schema doc with sample payload and subscribers                      | —          |
| NewEndpoint    | /endpoints/new     | Yes  | Multi-section form to create a new webhook endpoint                              | —          |
| Notifications  | /notifications     | Yes  | Operational alerts feed — failures, secret rotations, threshold breaches         | —          |
| AuditLog       | /audit             | Yes  | Security audit trail — every config change, signed and immutable                 | —          |
| APIKeys        | /settings/api-keys | Yes  | Manage API keys for programmatic access                                          | Settings   |
| Team           | /settings/team     | Yes  | Team members, invites, and role assignments                                      | Settings   |
| Billing        | /settings/billing  | Yes  | Plan, delivery usage, payment methods                                            | Settings   |
| Profile        | /profile           | Yes  | Personal account profile and preferences                                         | Settings   |
| NotFound       | *                  | No   | 404 not found page                                                               | Landing    |

## App Constraints

- All URLs, HTTP methods, status codes, timestamps, IDs, and payload data render in JetBrains Mono; only labels and narrative text use Inter
- HTTP method badges use strict method-specific colors (GET emerald, POST indigo, PUT/PATCH amber, DELETE red); never deviate
- Syntax-highlighted payload viewer uses the specified token palette: keys slate-400, strings emerald, numbers indigo, booleans amber, null slate-500

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

- Delivered: `#10b981`
- Delivered Light: `#d1fae5`
- Failed: `#ef4444`
- Failed Light: `#fee2e2`
- Retrying: `#f59e0b`
- Retrying Light: `#fef3c7`
- Pending: `#6366f1`
- Pending Light: `#e0e7ff`
- Disabled: `#64748b`
- Disabled Light: `#f1f5f9`
- HTTP 2xx: `#10b981`
- HTTP 3xx: `#06b6d4`
- HTTP 4xx: `#f59e0b`
- HTTP 5xx: `#ef4444`
- Timeout: `#8b5cf6`

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111a2e`
- Tertiary: `#162032`
- Surface: `#1a2744`
- Surface Secondary: `#1e2d4d`
- Input: `#162032`
- Overlay: `rgba(0, 0, 0, 0.65)`
- Code Block: `#0a0f1a`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0c1222`
- Link: `#10b981`
- Link Hover: `#34d399`
- Code: `#10b981`
- Muted Code: `#4ade80`

### Borders

- Primary: `#1e3a5f`
- Secondary: `#2d4a6f`
- Focus: `#10b981`

### Dark Theme Overrides

Dark is the default theme. Light mode overrides:

- Primary: `#059669`
- Background: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#e2e8f0`
- Code Block: `#f1f5f9`
- Code Text: `#059669`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (primary for data): `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`

### Usage

- All payload data, URLs, HTTP methods, status codes, timestamps, and IDs render in Mono
- Body text and navigation labels render in Body
- Headings and page titles render in Heading with weight 600

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `256px` (collapsed: `56px`)
- Top Bar Height: `48px`
- Detail Panel Width: `480px` (slide-over for delivery log detail)
- Log Table Row Height: `44px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Endpoint List Max Width: `960px`

## Components

### Endpoint Card

- Border radius: `8px` (md)
- Shadow: none (border-driven)
- Border: `1px solid` border-primary
- Padding: `16px`
- Hover: border shifts to `primary` color, subtle glow `0 0 0 1px rgba(16, 185, 129, 0.15)`
- Left accent bar: `3px solid` status color (delivered/failed/disabled)
- URL in mono font, `14px`, truncated with ellipsis
- Method badge inline: `GET` `POST` `PUT` etc. in uppercase mono, `11px`, `600` weight

### HTTP Method Badge

- Border radius: `4px` (sm)
- Padding: `2px 6px`
- Font: mono, `11px`, weight `700`, uppercase
- Colors by method:
  - GET: `#10b981` text on `rgba(16, 185, 129, 0.12)` bg
  - POST: `#6366f1` text on `rgba(99, 102, 241, 0.12)` bg
  - PUT: `#f59e0b` text on `rgba(245, 158, 11, 0.12)` bg
  - PATCH: `#f59e0b` text on `rgba(245, 158, 11, 0.12)` bg
  - DELETE: `#ef4444` text on `rgba(239, 68, 68, 0.12)` bg

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`, weight `500`
- Dot indicator: `6px` circle, matching status color, left of label
- Variants:
  - Delivered: green dot, `delivered` text, `rgba(16, 185, 129, 0.12)` bg
  - Failed: red dot, `failed` text, `rgba(239, 68, 68, 0.12)` bg
  - Retrying: amber dot, `retrying` text, `rgba(245, 158, 11, 0.12)` bg
  - Pending: indigo dot, `pending` text, `rgba(99, 102, 241, 0.12)` bg
  - Disabled: slate dot, `disabled` text, `rgba(100, 116, 139, 0.12)` bg

### Delivery Log Table

- Header: `12px` uppercase mono, `600` weight, secondary text color, no border
- Row height: `44px`, vertically centered
- Row border: `1px solid` border-primary, bottom only
- Row hover: `rgba(16, 185, 129, 0.04)` background
- Alternating rows: none (clean uniform rows)
- Status code column: mono font, colored by HTTP range (2xx green, 4xx amber, 5xx red)
- Timestamp column: mono font, `13px`, secondary text, relative format ("2m ago")
- Duration column: mono font, `13px`, suffix "ms"
- Clickable rows open the detail slide-over panel

### Payload Viewer

- Border radius: `8px` (md)
- Background: code-block color
- Border: `1px solid` border-primary
- Padding: `16px`
- Font: mono, `13px`, line-height `1.6`
- Syntax highlighting: JSON keys in `#94a3b8`, strings in `#10b981`, numbers in `#6366f1`, booleans in `#f59e0b`, null in `#64748b`
- Collapsible nested objects with `12px` indent
- Copy button: top-right, ghost style, mono "Copy" label

### Retry Indicator

- Circular progress ring: `32px` diameter, `3px` stroke
- Ring color: retrying amber
- Center text: attempt number in mono `12px` bold
- Label below: "Retry N of M" in `12px` secondary text
- Animation: ring fills clockwise over the retry delay duration

### Stats Card (Dashboard)

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Background: surface color
- Padding: `20px`
- Metric value: `28px`, mono font, weight `700`, primary text
- Metric label: `12px`, uppercase, `600` weight, secondary text, `4px` letter-spacing
- Trend indicator: `12px`, mono, green for positive, red for negative, with arrow prefix
- Sparkline: `48px` tall, `100%` wide, stroke `1.5px`, primary color, no fill

### Endpoint URL Input

- Border radius: `8px` (md)
- Height: `44px`
- Font: mono, `14px`
- Prefix label: protocol dropdown ("https://") in muted style, `13px`
- Placeholder: `"api.example.com/webhooks"` in tertiary text
- Validation: green checkmark icon on valid URL, red border on invalid

### Secret Key Field

- Same as URL input but with mask toggle (eye icon)
- Masked display: `"whsec_••••••••••••"` in mono
- Copy button: ghost, appears on hover

### Test Payload Panel

- Split view: editor left (60%), response right (40%)
- Editor: payload viewer component with editable textarea
- Response: read-only payload viewer with status code header
- Send button: primary color, `"Send Test"` label, loading spinner on send
- Divider: `1px solid` border-primary, vertical

### Sidebar Navigation

- Width: `256px`, collapsible to `56px`
- Background: secondary bg color
- Border-right: `1px solid` border-primary
- Nav item height: `40px`
- Nav item padding: `8px 16px`
- Active item: `rgba(16, 185, 129, 0.1)` bg, primary text color, `3px` left border in primary
- Hover item: `rgba(16, 185, 129, 0.05)` bg
- Icon size: `18px`, `1px` stroke weight
- Section headers: `11px` uppercase mono, `600` weight, secondary text, `24px` top margin

### Search Bar

- Border radius: `8px` (md)
- Height: `36px`
- Background: tertiary bg color
- Border: `1px solid` border-primary, focus: border-focus
- Icon: magnifying glass, `16px`, secondary text
- Font: `14px`, body font
- Placeholder: `"Search endpoints, events, URLs..."` in tertiary text
- Keyboard shortcut hint: `/` key badge, right side, `20px` rounded square, border-secondary
