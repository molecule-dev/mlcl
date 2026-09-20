# DESIGN.md — Field Service

## Brand Identity

- **App Name:** Toolbelt
- **Tagline:** Run every job from quote to cash
- **Logo:** Wrench glyph (Material `build` icon) + text app name; favicon is the wrench on a blue rounded square
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Plain-spoken, blue-collar, workmanlike. Short sentences. No buzzwords — a job is a job, money is money.

## Target Persona

Owner-operators and office dispatchers at small trades businesses (HVAC, plumbing, electrical, handyman) who quote, schedule, and invoice the work themselves.

## Signature Flow

quote → send → accept → becomes job → dispatch to tech → checklist completes → invoice generated → mark paid. Money is integer cents end to end.

## Screens

| Name           | Route            | Auth | Purpose                                                                  | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                           | —          |
| Login          | /login           | No   | Sign in                                                                  | —          |
| Signup         | /signup          | No   | Create account                                                           | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                            | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                         | Login      |
| Pricing        | /pricing         | No   | Subscription tiers                                                       | —          |
| About          | /about           | No   | Product story                                                            | —          |
| Dashboard      | /dashboard       | Yes  | Today's jobs board, quotes waiting, revenue this week                    | —          |
| Customers      | /customers       | Yes  | Customer list with search                                                | —          |
| NewCustomer    | /customers/new   | Yes  | Add a customer (name, contact, address, notes)                           | —          |
| CustomerDetail | /customers/:id   | Yes  | Customer profile with service history, quotes, invoices                  | —          |
| Quotes         | /quotes          | Yes  | Quote list with status filters draft/sent/accepted/declined              | —          |
| QuoteNew       | /quotes/new      | Yes  | Quote editor with line items (qty × unit × rate)                         | —          |
| QuoteDetail    | /quotes/:id      | Yes  | Quote with items, total, send/accept/decline actions                     | —          |
| QuoteEdit      | /quotes/:id/edit | Yes  | Edit a draft quote                                                       | QuoteNew   |
| Jobs           | /jobs            | Yes  | Job list with day + status filters                                       | —          |
| JobDetail      | /jobs/:id        | Yes  | Signature screen: schedule window, technician, address, checklist, notes | —          |
| Dispatch       | /dispatch        | Yes  | Weekly grid: technicians × days; pick job → pick tech/day                | —          |
| Technicians    | /technicians     | Yes  | Crew records with trade tags, skills, open-job counts                    | —          |
| Invoices       | /invoices        | Yes  | Invoice list with paid/outstanding/draft totals                          | —          |
| InvoiceDetail  | /invoices/:id    | Yes  | Invoice with copied line items; send + mark paid                         | —          |
| Notifications  | /notifications   | Yes  | Shop feed (quote replies, unassigned jobs, payments)                     | —          |
| Settings       | /settings        | Yes  | Company profile, scheduling defaults, notification preferences           | —          |
| PlanUpdated    | /plan-updated    | Yes  | Post-checkout plan confirmation                                          | —          |

## App Constraints

- Sidebar admin layout (`@molecule/app-sidebar-layout-react`); nav order is Dashboard → Dispatch → Jobs → Quotes → Invoices → Customers → Technicians → Notifications → Settings
- Dispatch grid: rows = active technicians, columns = Mon–Sat of the selected week; assignment is pick-job → pick-tech/day (no drag)
- Status colors are reserved: blue=scheduled, amber=en_route, primary-container=in_progress, green=completed, neutral=cancelled; quote declined and errors are red
- No payment processing anywhere — invoice `paid` is data only, and the invoice detail page says so

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1d4ed8` (workwear blue)
- Primary Light: `#60a5fa`
- Primary Dark: `#1e40af`
- Secondary: `#0369a1`
- Accent (tertiary): `#ea580c` (safety orange)
- Dispatch dark rail: `#0c1929` / `#14213d`

### Semantic

- Success: `#16a34a` (paid, accepted, completed)
- Warning: `#d97706` (en_route, needs-a-tech)
- Danger: `#dc2626` (declined, errors)

### Backgrounds

- Light: `#eff6ff` page, `#ffffff` surface, `#dbeafe` surface-alt
- Dark: `#0d1117` page, `#161b22` surface (GitHub-style cool neutrals)

### Text

- On-light: `#1e3a8a` primary text, `#334e8a` secondary, `#4a6491` muted
- On-dark: `#f5f5f5` / `#c4c4c4` / `#8a8a8a`

### Borders

- `#bfdbfe` on light, `#21262d` on dark; border-active `#1d4ed8` (light) / `#3b82f6` (dark)

## Typography

- Body: Inter; mono (money, invoice numbers, blocks of time): JetBrains Mono; headline: Georgia serif stack (shared molecule pages)

## Components

- `StatusBadge` — the one status pill (jobs/quotes/invoices), tone-mapped, shared component in `components/StatusBadge.tsx`
- `QuoteForm` — shared line-item editor for QuoteNew/QuoteEdit; rate input in dollars, stored and summed in integer cents
- Money renders via `lib/format.ts#formatMoney` — never ad-hoc `toFixed`
