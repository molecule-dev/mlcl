# DESIGN.md — Payroll Manager

## Brand Identity

- **App Name:** Coffer
- **Tagline:** Every cycle, covered
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, reliable, composed, auditable

## Target Persona

HR and finance operators at small-to-midsize employers who run biweekly payroll and need every cycle to land compliant and on-time.

## Screens

| Name           | Route             | Auth | Purpose                                                                                                                  | deriveFrom |
| -------------- | ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                 | No   | Marketing home with value props and signup CTA                                                                           | —          |
| Login          | /login            | No   | Sign in                                                                                                                  | —          |
| Signup         | /signup           | No   | Create account                                                                                                           | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                                                                            | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                                                                         | Login      |
| Dashboard      | /dashboard        | Yes  | KPI summary cards, upcoming pay runs, compliance snapshot                                                                | —          |
| Employees      | /employees        | Yes  | Employee table with search, filters, bulk actions                                                                        | —          |
| EmployeeDetail | /employees/:id    | Yes  | Profile, pay rate, tax withholdings, history                                                                             | —          |
| PayRuns        | /pay-runs         | Yes  | List of past and upcoming pay runs with status                                                                           | —          |
| RunPayroll     | /run-payroll      | Yes  | Multi-step wizard to review and process a pay run                                                                        | —          |
| PayStub        | /pay-stub/:id     | Yes  | Printable pay stub detail                                                                                                | —          |
| TaxCenter      | /taxes            | Yes  | Tax summary, filings, withholdings by type                                                                               | —          |
| Reports        | /reports          | Yes  | Charts: payroll spend, headcount, tax breakdown                                                                          | —          |
| Settings       | /settings         | Yes  | Company profile, pay schedule, integrations                                                                              | —          |
| PayRunDetail   | /pay-runs/:id     | Yes  | Read-only summary of a processed pay run with per-employee breakdown, run metadata, activity timeline, compliance checks | —          |
| AuditLog       | /audit-log        | Yes  | Compliance audit trail — chronological feed of every system action with filters, severity, and changed-field diffs       | —          |
| Notifications  | /notifications    | Yes  | Activity center for pay-run approvals, tax deadlines, integration errors, and mentions                                   | —          |
| Billing        | /settings/billing | Yes  | Subscription, seat usage, payment method, invoice history, plan options                                                  | —          |
| Profile        | /profile          | Yes  | Current user profile and preferences                                                                                     | Settings   |

## App Constraints

- All monetary values render with tabular-nums for perfect vertical alignment in tables and pay stubs
- Sidebar uses deep navy (#0c1f2e) regardless of theme — brand anchoring
- Pay stub pages must be print-optimized (800px max width, clean structure)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7490`
- Primary Hover: `#22a3c4`
- Primary Dark: `#0a5e75`
- Accent: `#059669`
- Accent Hover: `#34d399`
- Accent Dark: `#047857`

### Semantic

- Positive Amount: `#16a34a`
- Positive Amount Light: `#dcfce7`
- Negative Amount: `#dc2626`
- Negative Amount Light: `#fee2e2`
- Pending: `#d97706`
- Pending Light: `#fef3c7`
- Processed: `#0e7490`
- Processed Light: `#cffafe`
- Compliant: `#16a34a`
- Non-Compliant: `#dc2626`
- Tax Withheld: `#7c3aed`
- Tax Withheld Light: `#ede9fe`
- Garnishment: `#be185d`
- Garnishment Light: `#fce7f3`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0f9ff`
- Sidebar: `#0c1f2e`
- Sidebar Hover: `#133347`
- Sidebar Active: `#1a4460`
- Pay Stub: `#fafcff`

### Text

- Amount: `#111827`
- Amount Positive: `#16a34a`
- Amount Negative: `#dc2626`
- Amount Muted: `#9ca3af`
- Link: `#0e7490`
- Link Hover: `#0a5e75`
- Sidebar: `#94a3b8`
- Sidebar Active: `#ffffff`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0e7490`
- Table Row: `#f1f5f9`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#0b1120`
- Surface: `#152033`
- Surface Secondary: `#1a2940`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Amount Positive: `#4ade80`
- Amount Negative: `#f87171`
- Tax Withheld: `#a78bfa`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Numeric: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Weights

- Table Headers: `600`
- Amount Values: `600`
- Section Labels: `600`
- Summary Totals: `700`
- Metadata Labels: `500`

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `60px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Table Min Width: `900px` (horizontal scroll on mobile)
- Pay Stub Max Width: `800px` (printable)
- Summary Card Min Width: `240px`

## Components

### KPI Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Label font size: `sm` (14px), weight `500`, color text-secondary
- Value font size: `2xl` (24px), weight `700`, font-variant-numeric: tabular-nums
- Trend indicator: `sm` (12px), inline with value, positive=accent, negative=error
- Icon: `40px` container, `20px` icon, `8px` radius, light-tinted background matching semantic color
- Border-left: `4px solid` primary (active/selected variant)

### Employee Table

- Border radius: `12px` (lg) on wrapper
- Header background: surface-secondary
- Header font size: `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`, color text-secondary
- Cell padding: `14px 16px`
- Row hover: surface-secondary
- Row border: `1px solid` table-row border
- Avatar: `32px` circle, font size `xs`, weight `600`, primary background with inverse text
- Status badge inline: `6px` dot + label
- Sticky first column on horizontal scroll
- Bulk select checkbox: `18px`, radius `4px`, primary color when checked

### Pay Run Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Status strip: `4px` top border (pending=pending, processed=processed, error=error)
- Period label: font size `lg` (18px), weight `600`
- Amount: font size `xl` (20px), weight `700`, tabular-nums
- Metadata row: font size `sm` (14px), color text-secondary, `8px` gap between items
- Action button: ghost variant, right-aligned

### Pay Stub / Payslip

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Background: pay-stub
- Padding: `32px`
- Max width: `800px` (print-optimized)
- Company header: font size `xl` (20px), weight `700`
- Section divider: `1px solid` border-primary, `24px` vertical spacing
- Line item grid: 3 columns (description, hours/units, amount), `12px` row gap
- Totals row: `600` weight, top border `2px solid` border-secondary
- Net pay: font size `2xl` (24px), weight `700`, primary color

### Tax Summary Panel

- Border radius: `12px` (lg)
- Background: surface-secondary
- Padding: `24px`
- Category label: font size `sm` (14px), weight `600`, color text-secondary
- Tax type: font size `base` (16px), weight `500`
- Amount: font size `base` (16px), weight `600`, tabular-nums, right-aligned
- Subtotal row: weight `700`, top border `1px dashed` border-secondary
- Expandable sections: `chevron` icon, `150ms` rotate transition

### Compliance Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px), weight `600`
- Compliant: compliant background light + compliant text
- Non-Compliant: non-compliant background light + non-compliant text
- Pending Review: pending background light + pending text
- Icon: `12px` inline, `4px` gap before label

### Audit Log Entry

- Padding: `12px 16px`
- Border-bottom: `1px solid` table-row border
- Timestamp: font size `xs` (12px), mono font, color text-secondary
- Actor: font size `sm` (14px), weight `600`
- Action description: font size `sm` (14px), weight `400`
- Changed fields: `mono` font, `xs` (12px), background surface-secondary, `4px` radius, `2px 8px` padding

### Report Chart Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Title: font size `base` (16px), weight `600`
- Chart area min height: `280px`
- Chart colors (ordered): primary, accent, `#7c3aed`, `#f59e0b`, `#ec4899`, `#6366f1`
- Legend: font size `xs` (12px), `8px` dot indicators, `16px` gap between items
- Tooltip: `8px` radius, `sm` shadow, `8px 12px` padding, font size `sm` (14px)

### Import/Export Panel

- Border radius: `12px` (lg)
- Border: `2px dashed` border-secondary (drop zone)
- Drop zone padding: `48px 24px`, text-center
- Drop zone active: `2px dashed` primary, surface-secondary background
- File type badges: `4px` radius, `xs` font, surface-secondary background
- Progress bar height: `6px`, `9999px` radius, primary fill, `300ms` width transition
- Format selector: segmented control, `8px` radius, `36px` height

### Sidebar Navigation

- Background: sidebar
- Width: `260px` (collapsed: `72px`)
- Item padding: `10px 16px`
- Item border radius: `8px`
- Item font size: `sm` (14px), weight `500`
- Item color: sidebar text
- Item hover: sidebar-hover background
- Item active: sidebar-active background, sidebar-active text, weight `600`
- Icon size: `20px`, `12px` gap to label
- Section label: `xs` (12px), uppercase, letter-spacing `0.08em`, weight `600`, color text-secondary, `24px` top margin
- Badge count: `18px` min-width, `9999px` radius, primary background, inverse text, `xs` font, weight `600`

### Run Payroll Wizard

- Step indicator: horizontal, `32px` numbered circles connected by `2px` lines
- Active step: primary fill, inverse text
- Completed step: accent fill, checkmark icon, inverse text
- Inactive step: border-secondary border, text-secondary
- Step connector completed: accent color
- Content area padding: `32px`
- Summary sidebar: `320px` width, surface-secondary background, sticky
- Confirmation totals: `2xl` font, `700` weight, primary color
