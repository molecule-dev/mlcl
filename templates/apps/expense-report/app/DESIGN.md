# DESIGN.md — Expense Report

## Brand Identity

- **App Name:** Recoup
- **Tagline:** Every receipt, recovered
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Professional, trustworthy, precise, calm

## Target Persona

Business travelers and employees submitting reimbursement requests, plus finance managers approving/rejecting expense reports against policy.

## Screens

| Name           | Route            | Auth | Purpose                                                                | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------- | ---------- |
| Login          | /login           | No   | Sign in                                                                | —          |
| Signup         | /signup          | No   | Create account                                                         | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                          | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                       | Login      |
| Dashboard      | /dashboard       | Yes  | Stat cards and recent reports                                          | —          |
| Expenses       | /expenses        | Yes  | Expense list with receipts                                             | —          |
| NewExpense     | /expenses/new    | Yes  | Add expense form with receipt upload                                   | —          |
| Reports        | /reports         | Yes  | Report detail with approval flow                                       | —          |
| Approvals      | /approvals       | Yes  | Manager approval queue                                                 | —          |
| Settings       | /settings        | Yes  | Profile, policies, payment methods                                     | —          |
| ReportsList    | /reports/list    | Yes  | Browse all expense reports across all statuses                         | —          |
| NewReport      | /reports/new     | Yes  | Group expenses into a report and submit for approval                   | —          |
| Notifications  | /notifications   | Yes  | Activity feed of approval, rejection, reimbursement, and policy events | —          |

## App Constraints

- All currency amounts render with tabular-nums; use amount-positive/negative colors consistently
- Approval flow timeline is a required component — never collapse into plain text
- Receipt thumbnails are mandatory on expense rows; use dashed border fallback for missing

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d7377`
- Primary Hover: `#0f9199`
- Primary Dark: `#0a5c5f`
- Accent: `#1b4965`
- Accent Hover: `#235d80`
- Accent Dark: `#143a50`

### Semantic

- Approved: `#0d7a3e`
- Approved Light: `#d1fae5`
- Rejected: `#be123c`
- Rejected Light: `#ffe4e6`
- Pending: `#c2790e`
- Pending Light: `#fef3c7`
- Reimbursed: `#0369a1`
- Reimbursed Light: `#e0f2fe`
- Over Budget: `#be123c`
- Under Budget: `#0d7a3e`
- Amount Positive: `#0d7a3e`
- Amount Negative: `#be123c`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafa`
- Sidebar: `#f0f5f5`
- Report Header: `#f0f7f7`

### Text

- Amount: `#111827`
- Amount Negative: `#be123c`
- Currency Symbol: `#6b7280`
- Link: `#0d7377`
- Link Hover: `#0a5c5f`
- Category Label: `#475569`

### Borders

- Primary: `#d5e0e0`
- Divider: `#e8efef`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#38bdf8`
- Background: `#0c1524`
- Surface: `#162032`
- Surface Secondary: `#1c2a3e`
- Sidebar: `#131f33`
- Text Primary: `#f0fdfa`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a50`
- Approved: `#34d399`
- Rejected: `#fb7185`
- Pending: `#fbbf24`
- Reimbursed: `#38bdf8`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Amount: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Report Detail Max Width: `960px`
- Receipt Thumbnail Size: `120px`
- Receipt Preview Width: `480px`

## Components

### Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Label font size: `sm` (14px), color: text-secondary, weight: `500`
- Value font size: `2xl` (24px), weight: `700`, font-variant-numeric: tabular-nums
- Trend indicator: `xs` (12px), inline with value, approved/rejected color for positive/negative
- Optional sparkline: `48px` height, bottom-aligned, primary stroke

### Expense Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-bottom: `1px solid` divider
- Hover: surface-secondary background
- Layout: icon (category) | merchant + date | category badge | amount (right-aligned)
- Amount font weight: `600`, tabular-nums
- Selected state: primary-light left border `3px`
- Batch select checkbox: `20px`, rounded `4px`, left edge

### Receipt Thumbnail

- Border radius: `8px` (md)
- Shadow: `sm`
- Size: `120px x 120px`
- Object-fit: `cover`
- Border: `1px solid` border-primary
- Hover: `md` shadow + `scale(1.02)`, transition: fast
- Missing receipt: dashed border, muted icon, text-secondary "No receipt"

### Approval Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `600`
- Letter spacing: `0.025em`
- Variants:
  - Draft: surface-secondary bg, text-secondary text
  - Submitted: pending-light bg, pending text
  - Approved: approved-light bg, approved text
  - Rejected: rejected-light bg, rejected text
  - Reimbursed: reimbursed-light bg, reimbursed text

### Report Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` status color (draft: secondary, submitted: pending, approved: approved, rejected: rejected, reimbursed: reimbursed)
- Header: report title `lg` bold + date range `sm` secondary
- Footer: total amount right-aligned `xl` bold + item count `sm` secondary
- Transition: shadow normal

### Amount Display

- Font weight: `700`
- Font variant: tabular-nums
- Positive: amount-positive color, no prefix
- Negative: amount-negative color, `-` prefix
- Currency symbol: `sm` size, currency-symbol color, `2px` right margin
- Large (totals): `2xl` size
- Inline (rows): `base` size

### Category Icon

- Size: `36px` container, `20px` icon
- Border radius: `8px` (md)
- Background: primary at `10%` opacity
- Color: primary
- Categories: meals, travel, lodging, transport, supplies, software, entertainment, other

### Policy Violation Alert

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Background: rejected-light
- Border-left: `4px solid` rejected
- Icon: warning, `16px`, rejected color
- Text: `sm`, text-primary
- Dismissible: close icon top-right

### Timeline / Approval Flow

- Vertical line: `2px` solid border-primary
- Node size: `32px` circle
- Active node: primary bg, white icon
- Completed node: approved bg, white checkmark
- Pending node: border-primary border, surface bg
- Rejected node: rejected bg, white x-icon
- Step label: `sm`, text-primary
- Step timestamp: `xs`, text-secondary
- Connector spacing: `32px` between nodes

### Filter Bar

- Background: surface
- Border-bottom: `1px solid` border-primary
- Padding: `12px 16px`
- Filter chips: pill radius, `sm` text, `6px 12px` padding
- Active chip: primary bg, white text
- Inactive chip: surface-secondary bg, text-secondary
- Date range picker: `240px` width, `md` radius

### Data Table

- Header: surface-secondary bg, `600` weight, `sm` size, text-secondary
- Row height: `52px`
- Cell padding: `12px 16px`
- Sortable header: pointer cursor, sort icon `14px`
- Row hover: surface-secondary bg
- Striped: off by default (clean look)
- Summary row: surface-secondary bg, `600` weight, top border `2px solid` border-primary

### Upload Zone

- Border radius: `12px` (lg)
- Border: `2px dashed` border-primary
- Padding: `32px`
- Background: surface-secondary
- Hover/drag-active: primary border, primary at `5%` bg
- Icon: `48px`, text-secondary
- Text: `base` primary line + `sm` secondary hint
- Accepted formats badge: `xs` mono text, surface bg, `4px` radius
