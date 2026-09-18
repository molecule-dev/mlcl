# DESIGN.md — Invoice / Billing

## Brand Identity

- **App Name:** Remit
- **Tagline:** Send invoices, get paid faster
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Professional
- Trustworthy
- Efficient
- Money-focused

## Target Persona

Small-business owners, freelancers, and agencies who need to send polished invoices, track payments, and manage client billing without bookkeeping overhead.

## Screens

| Name           | Route            | Auth | Purpose                                                | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with features and pricing               | —          |
| Login          | /login           | No   | Sign in                                                | —          |
| Signup         | /signup          | No   | Create account                                         | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                          | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                       | Login      |
| Dashboard      | /dashboard       | Yes  | Revenue summary, outstanding invoices, recent activity | —          |
| Invoices       | /invoices        | Yes  | Invoice list with filters, search, bulk actions        | —          |
| InvoiceEditor  | /invoices/new    | Yes  | Create/edit invoice with live preview                  | —          |
| InvoiceDetail  | /invoices/:id    | Yes  | View invoice details, payment history, activity        | —          |
| Clients        | /clients         | Yes  | Client list with outstanding balances                  | —          |
| ClientDetail   | /clients/:id     | Yes  | Client profile with invoices, payments                 | —          |
| Payments       | /payments        | Yes  | Payment history and reconciliation                     | —          |
| Reports        | /reports         | Yes  | Revenue, tax, aging reports with charts                | —          |
| Settings       | /settings        | Yes  | Profile, branding, payment methods, tax rates          | —          |

## App Constraints

- Dark teal sidebar (`#0a5c5f`) on all authenticated screens, with accent coral (`#e86c3a`) for primary CTAs
- All monetary amounts use tabular-nums and right-alignment
- Every invoice surface shows a color-coded status badge

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d7377`
- Primary Hover: `#0f9199`
- Primary Dark: `#0a5c5f`
- Accent: `#e86c3a`
- Accent Hover: `#f0845a`
- Accent Dark: `#c4572d`

### Semantic

- Paid: `#16804a`
- Paid Light: `#dcfce7`
- Unpaid: `#d97706`
- Unpaid Light: `#fef3c7`
- Overdue: `#c42b2b`
- Overdue Light: `#fee2e2`
- Draft: `#6b7280`
- Draft Light: `#f3f4f6`
- Partial: `#7c3aed`
- Partial Light: `#ede9fe`
- Recurring: `#0891b2`
- Recurring Light: `#cffafe`
- Revenue: `#16804a`
- Expense: `#c42b2b`
- Tax: `#d97706`

### Chart Palette

- Series 1: `#0d7377`
- Series 2: `#e86c3a`
- Series 3: `#7c3aed`
- Series 4: `#16804a`
- Series 5: `#d97706`
- Series 6: `#0891b2`
- Series 7: `#c42b2b`
- Series 8: `#6b7280`

### Backgrounds

- Primary: `#f0f9f9`
- Surface: `#ffffff`
- Surface Secondary: `#f7fafa`
- Invoice Preview: `#ffffff`
- Sidebar: `#0a5c5f`
- Sidebar Hover: `#0d7377`

### Text

- Primary: `#1a1a2e`
- Secondary: `#64748b`
- Amount Positive: `#16804a`
- Amount Negative: `#c42b2b`
- Amount Neutral: `#1a1a2e`
- Amount Due: `#e86c3a`
- Sidebar: `#c0e8e9`
- Sidebar Active: `#ffffff`
- Link: `#0d7377`
- Link Hover: `#0a5c5f`

### Borders

- Primary: `#e2e8f0`
- Invoice: `#e5e7eb`
- Input Focus: `#0d7377`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#f0845a`
- Background: `#0c1a1a`
- Surface: `#142828`
- Surface Secondary: `#1a3333`
- Text Primary: `#f0fdfa`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e4040`
- Sidebar: `#081414`
- Amount Positive: `#34d399`
- Amount Negative: `#f87171`
- Amount Due: `#f0845a`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Amount: `"Tabular Nums", "Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Invoice Total: `2xl` (24px), weight `700`
- Amount Large: `xl` (20px), weight `600` — dashboard summary cards
- Amount Medium: `base` (16px), weight `600` — table cells, line items
- Amount Small: `sm` (14px), weight `500` — secondary amounts, tax lines
- Invoice Number: `sm` (14px), weight `600`, mono font

## Layout

- Content Max Width: `1360px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Sidebar Style: Dark (uses Sidebar background color), persistent on desktop
- Top Bar Height: `56px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Invoice Table Min Width: `860px` (horizontal scroll on smaller viewports)
- Invoice Preview Width: `680px` (A4-like proportion for PDF rendering)
- Client Detail Panel Width: `480px` (slide-over)
- Report Chart Height: `300px`
- Payment Timeline Height: `200px`

## Components

### Dashboard Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Label: `sm` font, secondary color, uppercase tracking `0.05em`
- Value: amount-large font, `700` weight, tabular-nums
- Trend indicator: inline arrow icon + percentage, revenue/expense color
- Hover: shadow `md`, `150ms` transition
- Variants:
  - Revenue: top border `3px solid` revenue color
  - Outstanding: top border `3px solid` accent color
  - Overdue: top border `3px solid` overdue color
  - Collected: top border `3px solid` paid color

### Invoice Table (Data Table)

- Header background: surface-secondary
- Header font weight: `600`, font size `sm`, text-secondary color
- Row height: `52px`
- Row hover: surface-secondary
- Row border: `1px solid` invoice border
- Cell padding: `12px 16px`
- Amount alignment: right-aligned, tabular-nums, `600` weight
- Amount colors: paid = amount-positive, overdue = overdue, unpaid = amount-due
- Invoice number: mono font, `500` weight, primary text
- Client name: `500` weight, primary text
- Date: `sm` font, secondary text
- Sortable column header: underline on hover, caret icon
- Sticky header on scroll
- Bulk action bar: slides in from top when rows selected, primary background, inverse text

### Invoice Document

- Border radius: `8px` (md)
- Shadow: `lg`
- Background: surface (white)
- Padding: `48px` (desktop), `24px` (mobile)
- Max width: `680px`, centered
- Company header: logo/name left, company address right
- Client block: "Bill To" label in `xs` uppercase muted, client name in `lg` `600` weight
- Invoice meta: invoice number, issue date, due date — right-aligned grid, labels muted
- Line item table: minimal borders, bottom border only per row, columns: Description, Qty, Rate, Amount
- Line item description: primary text `500` weight; optional note line below in `sm` secondary
- Subtotal row: right-aligned, `500` weight, separated by `1px` border top
- Tax rows: right-aligned, `sm` font, muted label
- Grand total: `invoice-total` font, `700` weight, primary-dark color, top border `2px solid` primary
- Notes/Terms section: `sm` font, secondary text, separated by `24px` top margin
- Status badge: top-right corner, uses status semantic colors
- Payment link button: accent background, inverse text, full width below total, `48px` height

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Text transform: uppercase
- Letter spacing: `0.03em`
- Variants:
  - Draft: draft-light background, draft text
  - Sent: unpaid-light background `#fef3c7`, text `#92400e`
  - Viewed: `#eff6ff` background, text `#1e40af`
  - Partial: partial-light background, text `#5b21b6`
  - Paid: paid-light background, text `#166534`
  - Overdue: overdue-light background, text `#991b1b`
  - Recurring: recurring-light background, text `#155e75`

### Client Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Shadow: `sm`, hover: `md`
- Client name: `lg` font, `600` weight
- Company: `sm` font, secondary text
- Email: `sm` font, link color
- Outstanding amount: right-aligned, amount-due color, `600` weight, tabular-nums
- Invoice count: `xs` badge, muted
- Last activity: `xs` font, muted, relative time

### Recurring Schedule Card

- Border radius: `12px` (lg)
- Padding: `16px 20px`
- Border-left: `4px solid` recurring color
- Background: surface
- Schedule label: `sm` font, `500` weight, primary text (e.g., "Monthly on the 1st")
- Next date: `sm` font, secondary text
- Amount: right-aligned, tabular-nums, `600` weight
- Client: `sm` font, muted
- Toggle: switch to enable/disable, primary color when active
- Status dot: `8px` circle, recurring color when active, draft color when paused

### Payment Row

- Height: `56px`
- Padding: `8px 16px`
- Border bottom: `1px solid` border-primary
- Payment method icon: `32px` square, `4px` radius (card brand, bank, PayPal)
- Amount: right-aligned, tabular-nums, `600` weight, amount-positive color
- Date: `sm` font, secondary text
- Reference/Transaction ID: `xs` font, mono, muted
- Status indicator: `6px` circle — green for completed, yellow for pending, red for failed

### Tax Report Summary

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Period selector: pill toggle group, top-right (Monthly / Quarterly / Annual)
- Summary grid: 2 columns — "Tax Collected" and "Tax Owed", each with amount-large font
- Breakdown table: category, taxable amount, tax rate, tax amount — right-aligned amounts
- Chart area height: `300px`
- Chart type: stacked bar for collected vs owed by period
- Export button: outline variant, `sm` size, top-right alongside period selector

### Report Chart Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Chart area height: `300px`
- Chart color palette: uses Chart Palette in order
- Legend: below chart, `sm` font, colored dots `8px`, wrapping horizontal layout
- Period selector: pill toggle group, top-right of card
- Empty state: centered muted text, `sm` font, dashed border around chart area

### Sidebar Navigation

- Background: sidebar color (`#0a5c5f`)
- Active item: `rgba(255, 255, 255, 0.15)` background, white text, left border `3px solid` accent
- Hover item: sidebar-hover background
- Icon size: `20px`, `1px` stroke
- Item padding: `10px 16px`
- Section divider: `1px solid rgba(255, 255, 255, 0.1)`
- Section label: `xs` font, uppercase, `0.08em` tracking, `rgba(255, 255, 255, 0.4)` color
- "New Invoice" button: accent background, inverse text, `36px` height, full sidebar width minus `16px` horizontal padding, `8px` border radius, positioned above nav items

### Quick Actions Bar

- Position: fixed bottom-right, `16px` offset
- Primary FAB: `56px` circle, accent background, `+` icon, shadow `lg`
- Expanded menu: vertical stack above FAB, `sm` cards with icon + label
- Options: New Invoice, New Client, Record Payment, New Expense
- Animation: scale + fade in, `150ms` ease

### Payment Portal (Client-Facing)

- Max width: `540px`, centered, `48px` top padding
- Invoice summary card: company logo, invoice number, amount due in `2xl` `700` weight accent color
- Line items: collapsed by default, expandable accordion
- Payment method selector: radio card group, `12px` radius, border highlight on selected
- Pay button: full width, accent background, `48px` height, `600` weight, "Pay Now" label
- Confirmation state: checkmark animation, paid-green background fade, "Payment Received" heading

### PDF Export Preview

- Renders inside invoice document component at A4 ratio (`210mm x 297mm`)
- Print-safe colors: all semantic colors have CMYK-safe equivalents
- Footer: page number centered, `xs` font, muted
- Watermark for draft: "DRAFT" diagonal, `rgba(0, 0, 0, 0.06)`, `4xl` font
- Company branding: uses brand primary for header bar and accent elements

### Import/Export Panel

- Border radius: `12px` (lg)
- Padding: `24px`
- Shadow: `md`
- Drop zone: dashed border `2px` primary, `120px` min height, centered upload icon + text
- Drop zone active: primary-light background, solid border
- File type badges: pill badges showing supported formats (CSV, QBO, PDF)
- Progress bar: `4px` height, primary fill, full radius
- Mapping table: editable column mapping with dropdown selectors, `sm` font
- Preview rows: first 3 imported rows in muted data table

## Design Principles

1. **Money front and center** — amounts use tabular-nums, right-alignment, and semantic coloring everywhere; outstanding amounts are always visible
2. **Status at a glance** — every invoice shows its lifecycle state via color-coded badges, left-border accents, and status dots
3. **Action-oriented** — the accent coral draws the eye to primary actions: send invoice, collect payment, create new; trust-building teal grounds everything else
4. **Print-ready** — invoice layouts render cleanly to PDF with no layout shifts; A4 proportions are maintained in the preview
5. **Dark sidebar, light workspace** — the persistent teal sidebar provides navigation grounding while the content area stays bright for number-heavy work
6. **Client-first hierarchy** — client relationships organize the data model; invoices, payments, and history roll up under client views
7. **Density without clutter** — tables pack information tightly (`52px` rows) but generous padding and clear borders prevent the view from feeling cramped
