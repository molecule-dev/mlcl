# DESIGN.md — Property Management

## Brand Identity

- **App Name:** Hearthstone
- **Tagline:** Every unit, under one roof
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Established, dependable, orderly, refined

## Target Persona

Property managers and landlords overseeing multi-unit buildings, tenant leases, rent collection, and maintenance.

## Screens

| Name              | Route            | Auth | Purpose                                                          | deriveFrom |
| ----------------- | ---------------- | ---- | ---------------------------------------------------------------- | ---------- |
| Landing           | /                | No   | Marketing home with property value prop                          | —          |
| Login             | /login           | No   | Sign in                                                          | —          |
| Signup            | /signup          | No   | Create account                                                   | Login      |
| ForgotPassword    | /forgot-password | No   | Request reset                                                    | Login      |
| ResetPassword     | /reset-password  | No   | Set new password                                                 | Login      |
| Dashboard         | /dashboard       | Yes  | Portfolio overview with occupancy, rent roll, alerts             | —          |
| Properties        | /properties      | Yes  | List of properties with photos and occupancy badges              | —          |
| PropertyDetail    | /properties/:id  | Yes  | Building detail with units, leases, finances                     | —          |
| Tenants           | /tenants         | Yes  | Tenant directory with status                                     | —          |
| Maintenance       | /maintenance     | Yes  | Work order tickets with status kanban                            | —          |
| Finances          | /finances        | Yes  | Rent roll, arrears, reports                                      | —          |
| Settings          | /settings        | Yes  | Company, team, notifications                                     | —          |
| TenantDetail      | /tenants/:id     | Yes  | Tenant profile with lease, payments, contacts, documents         | —          |
| MaintenanceDetail | /maintenance/:id | Yes  | Work order ticket with timeline, comments, vendor assignment     | —          |
| Leases            | /leases          | Yes  | Lease portfolio table with renewal status filters                | —          |
| Reports           | /reports         | Yes  | Analytical reporting with KPIs, charts, and breakdowns           | —          |
| Notifications     | /notifications   | Yes  | Activity feed for property events, lease, payment, system alerts | —          |

## App Constraints

- Occupancy stats use tabular-nums for tidy reporting
- Unit status badges: Occupied emerald, Vacant amber, Overdue red, Maintenance Open orange
- Navy primary anchors the professional aesthetic, accent terracotta for call-to-action warmth

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1e3a5f`
- Primary Hover: `#2a4f7f`
- Primary Dark: `#152a47`
- Accent: `#c57b3c`
- Accent Hover: `#d4914f`
- Accent Dark: `#a86630`

### Semantic

- Occupied: `#16a34a`
- Occupied Light: `#dcfce7`
- Vacant: `#f59e0b`
- Vacant Light: `#fef3c7`
- Overdue: `#dc2626`
- Overdue Light: `#fee2e2`
- Maintenance Open: `#e06c2e`
- Maintenance Open Light: `#fff1e6`
- Maintenance Closed: `#6b7280`
- Lease Expiring: `#8b5cf6`
- Lease Expiring Light: `#ede9fe`
- Positive Amount: `#16a34a`
- Negative Amount: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafb`
- Sidebar: `#0f1f33`
- Sidebar Hover: `#1a2f4d`

### Text

- Primary: `#1a2332`
- Secondary: `#64748b`
- Sidebar: `#c8d6e5`
- Sidebar Active: `#ffffff`
- Amount Positive: `#16a34a`
- Amount Negative: `#dc2626`
- Link: `#1e3a5f`
- Link Hover: `#152a47`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#1e3a5f`

### Dark Theme Overrides

- Primary: `#5b9bd5`
- Accent: `#d4914f`
- Background: `#0c1421`
- Surface: `#162032`
- Surface Secondary: `#1c2a40`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2d3f56`
- Sidebar: `#080e18`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight: 700)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Amount: `"Tabular Nums", "Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Sidebar Style: Dark (`#0f1f33`), fixed, full-height
- Top Bar Height: `64px`
- Table Max Width: `100%` (fluid within content area)
- Detail Panel Width: `480px` (slide-over from right)

## Components

### Property Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:9` (property photo or placeholder gradient)
- Padding: `0` (image flush) + `20px` (content area)
- Status indicator: `8px` colored dot + label, top-right of content area
- Footer: unit count, occupancy %, monthly revenue — separated by `1px` border-top
- Font: property name `lg` weight `600`, address `sm` secondary text

### Unit Row

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Layout: unit number (mono, `600` weight) | status badge | tenant name | lease end | rent amount
- Hover: surface-secondary background
- Status dot: `10px` circle, color-coded (occupied/vacant/maintenance)

### Tenant Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Avatar: `48px` circle, initials with primary-dark background
- Name: `lg` weight `600`
- Details: phone, email, lease dates — `sm` secondary text
- Balance indicator: positive (green) or overdue (red) badge, right-aligned

### Maintenance Request Card

- Border radius: `8px` (md)
- Border-left: `4px solid` priority color (high: error, medium: accent, low: secondary)
- Shadow: `sm`
- Padding: `16px 20px`
- Header: title `base` weight `600` + priority badge
- Meta: unit number, tenant name, date submitted — `sm` secondary
- Status badge: open (maintenance-open), in progress (accent), completed (occupied/green), closed (maintenance-closed)
- Photo thumbnails: `64px` square, `8px` radius, `8px` gap, max 4 visible

### Financial Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Title: `sm` uppercase tracking `0.05em` secondary text
- Amount: `3xl` weight `700`, tabular-nums
- Trend indicator: up/down arrow + percentage, `sm`, green (positive) or red (negative)
- Spark chart: `64px` height, primary color stroke, no axes

### Lease Timeline

- Border radius: `8px` (md)
- Track height: `8px`, radius `full`
- Track background: background-tertiary
- Fill: gradient from primary to primary-hover
- Expiry marker: `12px` circle, lease-expiring color when < 60 days
- Labels: start/end dates `xs` secondary text, below track

### Accounting Table

- Header background: surface-secondary
- Header font: `sm` weight `600` uppercase tracking `0.05em`
- Row hover: surface-secondary
- Border: `1px solid` border-primary between rows
- Cell padding: `14px 20px`
- Amount cells: right-aligned, tabular-nums, `500` weight
- Positive: positive-amount color
- Negative: negative-amount color, parenthesized
- Category column: `12px` colored dot + label
- Totals row: `600` weight, border-top `2px solid` border-secondary

### Dashboard Stat Widget

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Icon: `40px` square, `8px` radius, tinted background (primary at 10% opacity)
- Label: `sm` secondary
- Value: `2xl` weight `700`
- Variants: default (white surface), highlighted (primary background, inverse text)

### Notification Bell

- Badge: `18px` circle, error color, white text, `xs` weight `700`
- Dropdown width: `380px`
- Item padding: `14px 16px`
- Unread indicator: `8px` primary dot, left side
- Categories: maintenance (orange icon), lease (purple icon), payment (green icon), system (blue icon)

### Payment Status Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs`, weight `600`
- Variants:
  - Paid: occupied background + occupied text
  - Pending: vacant-light background + accent-dark text
  - Overdue: overdue-light background + overdue text
  - Partial: lease-expiring-light background + lease-expiring text

### Sidebar Navigation

- Background: sidebar color
- Item padding: `12px 20px`
- Item radius: `8px`
- Icon size: `20px`, sidebar text color
- Active: sidebar-hover background, white text, `2px` left accent bar (accent color)
- Section divider: `1px solid` rgba(255,255,255,0.08), `16px` vertical margin
- Section label: `xs` uppercase tracking `0.1em`, rgba(255,255,255,0.4)
- Collapsed: icon only, centered, tooltip on hover

### Quick Action FAB (Floating Action Button)

- Size: `56px` circle
- Shadow: `lg`
- Background: accent
- Icon: `24px`, white
- Position: bottom-right, `32px` from edges
- Hover: accent-hover, shadow `xl`
- Expanded menu: vertical stack of `48px` circle buttons, `12px` gap, labels to the left
