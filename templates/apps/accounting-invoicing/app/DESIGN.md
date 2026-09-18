# DESIGN.md — Accounting / Invoicing

## Brand Identity

- **App Name:** Ledger
- **Tagline:** Every cent, accounted for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Trustworthy, precise, calm, authoritative

## Target Persona

Small-business owners, bookkeepers, and accountants managing invoices, expenses, and financial reporting.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                                                                                                                              | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with hero showing invoice mockup, features (invoicing, expenses, reports), pricing                                                                                                                                    | —          |
| Login          | /login           | No   | Centered card with navy accent, email/password, Sign In button                                                                                                                                                                       | —          |
| Signup         | /signup          | No   | Create account                                                                                                                                                                                                                       | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                                                                                                                                        | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                                                                                                                                     | Login      |
| Dashboard      | /dashboard       | Yes  | Dark navy sidebar, top bar, summary cards (cash flow, outstanding invoices, MTD revenue, expenses), revenue line char...                                                                                                             | —          |
| Invoices       | /invoices        | Yes  | Dark sidebar, filter chips (status, date, client), data table with columns (invoice #, client, amount, due date, stat...                                                                                                             | —          |
| InvoiceDetail  | /invoices/:id    | Yes  | Centered A4-sized invoice document with company logo top, line items table, subtotal/tax/total section, status badge ...                                                                                                             | —          |
| Expenses       | /expenses        | Yes  | Dark sidebar, ledger table of expenses with category color left-borders, receipt thumbnails, merchant, date, amount (...                                                                                                             | —          |
| Reports        | /reports         | Yes  | Dark sidebar, date range picker top, grid of chart cards (P&L bar chart, cash flow line, expense pie chart, revenue b...                                                                                                             | —          |
| Settings       | /settings        | Yes  | Dark sidebar, settings nav (company, tax, integrations, team), right content with form fields and Save button                                                                                                                        | —          |
| NewInvoice     | /invoices/new    | Yes  | Centered A4 invoice form with editable client picker, line items with add-row, tax/discount controls, save-as-draft and send buttons                                                                                                 | —          |
| Customers      | /customers       | Yes  | Dark sidebar, customer ledger table with company name, contact, balance, last invoice, total billed, with search and add-customer button                                                                                             | —          |
| CustomerDetail | /customers/:id   | Yes  | Dark sidebar, customer profile header with summary cards (outstanding balance, YTD billed, avg days to pay), tabs (Invoices/Payments/Activity/Notes) over invoice ledger, right column with contact + address + payment terms + tags | —          |
| ExpenseDetail  | /expenses/:id    | Yes  | Dark sidebar, expense detail with large amount + status pill, receipt preview card, transaction details, tax treatment, reconciliation match card, audit trail timeline                                                              | —          |
| NewExpense     | /expenses/new    | Yes  | Dark sidebar, expense entry form with receipt upload zone, vendor/date/amount/category fields, tax treatment, AI categorization suggestions, summary card                                                                            | —          |
| Payments       | /payments        | Yes  | Dark sidebar, KPI strip (received MTD, pending, refunded, unmatched), filter bar, ledger table of received payments with method pills, status badges, reconciliation indicators, expandable rows for splits                          | —          |
| Taxes          | /taxes           | Yes  | Dark sidebar, period selector, KPI strip (collected/owed/estimated/deductible), sales-tax-by-jurisdiction bar chart, deductibles donut, quarterly estimates table, filing checklist, deadlines list                                  | —          |

## App Constraints

- Persistent dark navy sidebar (#0f2847) with light workspace content area
- All monetary amounts use tabular-nums, right-aligned, with semantic color coding (green positive / red negative)
- Invoice documents render at A4 proportion with print-safe layout

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1a3c6e`
- Primary Hover: `#2a5494`
- Primary Dark: `#0f2847`
- Accent: `#c5a047`
- Accent Hover: `#d4b35c`
- Accent Dark: `#a8873a`

### Semantic

- Income: `#1a8754`
- Income Light: `#dcfce7`
- Expense: `#c42b2b`
- Expense Light: `#fee2e2`
- Overdue: `#d97706`
- Overdue Light: `#fef3c7`
- Paid: `#1a8754`
- Pending: `#c5a047`
- Draft: `#6b7280`
- Reconciled: `#0891b2`
- Reconciled Light: `#cffafe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f9fb`
- Ledger Row Alt: `#f3f5f8`
- Sidebar: `#0f2847`
- Sidebar Hover: `#1a3c6e`

### Text

- Amount Positive: `#1a8754`
- Amount Negative: `#c42b2b`
- Amount Neutral: `#1f2937`
- Muted: `#6b7280`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`
- Link: `#1a3c6e`
- Link Hover: `#0f2847`

### Borders

- Ledger: `#e5e7eb`
- Input Focus: `#1a3c6e`

### Dark Theme Overrides

- Primary: `#5b8fd9`
- Accent: `#d4b35c`
- Background: `#0c1829`
- Surface: `#162032`
- Surface Secondary: `#1c2a3e`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3f5a`
- Sidebar: `#0a1220`
- Amount Positive: `#34d399`
- Amount Negative: `#f87171`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Amount: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Amount Large: `1.5rem` (24px) — dashboard totals, invoice grand total
- Amount Medium: `1.125rem` (18px) — line item totals, report summaries
- Amount Small: `0.875rem` (14px) — table cells, transaction lists

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Sidebar Style: Dark (uses Sidebar background color), persistent on desktop
- Top Bar Height: `56px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Ledger Table Min Width: `900px` (horizontal scroll on smaller viewports)
- Invoice Preview Width: `680px` (A4-like proportion for PDF fidelity)
- Report Chart Height: `320px`
- Detail Panel Width: `480px` (slide-over for transaction/invoice detail)

## Components

### Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Label: `sm` font, muted color, uppercase tracking `0.05em`
- Value: `amount-large` font, `700` weight, tabular-nums
- Trend indicator: inline arrow icon + percentage, income/expense color
- Hover: shadow `md`, `150ms` transition

### Data Table (Ledger)

- Header background: surface-secondary
- Header font weight: `600`, font size `sm`, text-secondary color
- Row height: `48px`
- Row hover: surface-secondary
- Row border: `1px solid` ledger border
- Alternating rows: surface / ledger-row-alt
- Cell padding: `12px 16px`
- Amount alignment: right-aligned, tabular-nums, `500` weight
- Amount colors: positive = amount-positive, negative = amount-negative
- Sortable column header: underline on hover, caret icon
- Sticky header on scroll

### Invoice Document

- Border radius: `8px` (md)
- Shadow: `lg`
- Background: surface (white)
- Padding: `48px` (desktop), `24px` (mobile)
- Max width: `680px`, centered
- Header: app logo left, invoice number + date right
- Line item table: minimal borders, bottom border only per row
- Subtotal/Tax/Total section: right-aligned, separated by `1px` border top
- Grand total: `amount-large` font, `700` weight, primary-dark color
- Status badge: top-right corner, uses status semantic colors

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Text transform: uppercase
- Letter spacing: `0.03em`
- Variants:
  - Draft: draft background `#f3f4f6`, draft text `#6b7280`
  - Pending: pending background `#fef3c7`, pending text `#92400e`
  - Paid: paid background `#dcfce7`, paid text `#166534`
  - Overdue: overdue-light background, overdue text `#92400e`
  - Reconciled: reconciled-light background, reconciled text `#155e75`

### Expense Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` category color
- Background: surface
- Merchant name: `500` weight, primary text
- Category: `sm` font, muted, with colored dot indicator
- Amount: right-aligned, tabular-nums, `600` weight, expense color
- Receipt thumbnail: `32px` square, `4px` radius, on hover expands to lightbox

### Reconciliation Row

- Same base as data table row
- Matched state: left border `3px solid` reconciled color
- Unmatched state: left border `3px solid` overdue color
- Checkbox: `18px` square, `4px` radius, primary color when checked
- Match confidence: `sm` font, muted, percentage with colored bar

### Report Chart Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Chart area height: `320px`
- Chart color palette (ordered): `#1a3c6e`, `#2a5494`, `#c5a047`, `#1a8754`, `#0891b2`, `#7c3aed`, `#c42b2b`, `#6b7280`
- Legend: below chart, `sm` font, colored dots, wrapping horizontal layout
- Period selector: pill toggle group, top-right of card

### Sidebar Navigation

- Background: sidebar color (`#0f2847`)
- Active item: `rgba(255, 255, 255, 0.12)` background, white text, left border `3px solid` accent
- Hover item: sidebar-hover background
- Icon size: `20px`, `1px` stroke
- Item padding: `10px 16px`
- Section divider: `1px solid rgba(255, 255, 255, 0.08)`
- Section label: `xs` font, uppercase, `0.08em` tracking, `rgba(255, 255, 255, 0.4)` color

### Search / Command Bar

- Border radius: `12px` (lg)
- Shadow: `xl`
- Background: surface
- Max width: `640px`, centered overlay
- Input height: `48px`
- Result item height: `44px`
- Result item hover: surface-secondary
- Keyboard shortcut hint: `Ctrl+K` / `Cmd+K`, `xs` font, border `1px solid` border-primary, `4px` radius
- Category icons: muted color, `16px`

### PDF Export Preview

- Renders inside invoice document component at A4 ratio (`210mm x 297mm`)
- Print-safe colors: all semantic colors have CMYK-safe equivalents
- Footer: page number centered, `xs` font, muted
- Watermark for draft: "DRAFT" diagonal, `rgba(0, 0, 0, 0.06)`, `4xl` font

## Design Principles

1. **Numbers are first-class** — amounts use tabular-nums, right-alignment, and semantic coloring everywhere
2. **Scannable density** — ledger views prioritize information density without feeling cramped; `48px` row height, clear borders
3. **Status at a glance** — every invoice, expense, and transaction shows its state via color-coded badges and left-border accents
4. **Print-ready** — invoice and report layouts must render cleanly to PDF with no layout shifts
5. **Dark sidebar, light workspace** — the persistent dark sidebar provides navigation grounding while the content area stays bright and legible for number-heavy work
