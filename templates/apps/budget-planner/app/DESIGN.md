# DESIGN.md — Budget Planner

## Brand Identity

- **App Name:** Coffer
- **Tagline:** Your money, on purpose
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Calm, trustworthy, precise, confident

## Target Persona

Households and individuals who use a zero-based, envelope-style monthly budget to give every dollar a job.

## Screens

| Name               | Route             | Auth | Purpose                                                              | deriveFrom |
| ------------------ | ----------------- | ---- | -------------------------------------------------------------------- | ---------- |
| Landing            | /                 | No   | Marketing home explaining envelope budgeting                         | —          |
| Login              | /login            | No   | Sign in                                                              | —          |
| Signup             | /signup           | No   | Create account                                                       | Login      |
| ForgotPassword     | /forgot-password  | No   | Request reset                                                        | Login      |
| ResetPassword      | /reset-password   | No   | Set new password                                                     | Login      |
| Budget             | /budget           | Yes  | Monthly envelope budget table with categories                        | —          |
| Accounts           | /accounts         | Yes  | Connected accounts and balances                                      | —          |
| Transactions       | /transactions     | Yes  | All transactions with categorization                                 | —          |
| Goals              | /goals            | Yes  | Savings goals with progress tracking                                 | —          |
| Reports            | /reports          | Yes  | Spending trends and net-worth charts                                 | —          |
| Settings           | /settings         | Yes  | Profile, categories, accounts, preferences                           | —          |
| Dashboard          | /dashboard        | Yes  | Net-worth + spend summary cards, sparkline trends, recent activity   | —          |
| AccountDetail      | /accounts/:id     | Yes  | Single account: balance trend, ledger, reconcile entry point         | —          |
| TransactionDetail  | /transactions/:id | Yes  | Single transaction: payee, splits, memo, attachments, recurring rule | —          |
| GoalDetail         | /goals/:id        | Yes  | Single goal: progress chart, contribution ledger, target projection  | —          |
| Categories         | /categories       | Yes  | Manage envelope categories and groups (CRUD + reorder)               | —          |
| AddTransaction     | /transactions/new | Yes  | New transaction form with payee/account/split/recurring              | —          |
| ImportTransactions | /import           | Yes  | Drag-drop import (CSV/OFX/QFX/QIF) with mapping + dedupe preview     | —          |
| Profile            | /settings/profile | Yes  | Personal info, password, household members                           | Settings   |
| Billing            | /settings/billing | Yes  | Plan, payment method, invoices                                       | Settings   |

## App Constraints

- All monetary amounts render with tabular-nums, right-aligned, two decimal places
- Monthly budget is the primary workflow — every authenticated screen has a month selector or month context
- Use amount-positive (#15803d) for inflows, amount-negative (#dc2626) only for genuinely overspent — not for outflows in general

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0f766e`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0d5d56`
- Accent: `#d97706`
- Accent Hover: `#f59e0b`
- Accent Dark: `#b45309`

### Semantic

- Income: `#15803d`
- Income Light: `#dcfce7`
- Overspent: `#dc2626`
- Overspent Light: `#fee2e2`
- Assigned: `#0f766e`
- Assigned Light: `#ccfbf1`
- Available: `#d97706`
- Available Light: `#fef3c7`
- Goal Met: `#15803d`
- Goal Partial: `#2563eb`
- Goal Unstarted: `#9ca3af`
- Transfer: `#7c3aed`
- Transfer Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa`
- Budget Header: `#0f766e`
- Category Group: `#f0fdfa`
- Inspector Panel: `#ffffff`

### Text

- Amount Positive: `#15803d`
- Amount Negative: `#dc2626`
- Amount Zero: `#6b7280`
- Amount Assigned: `#0f766e`
- Category Muted: `#6b7280`
- Link: `#0f766e`
- Link Hover: `#0d5d56`

### Borders

- Category Divider: `#e5e7eb`
- Group Divider: `#ccfbf1`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#fbbf24`
- Background: `#0c1a19`
- Surface: `#162726`
- Surface Secondary: `#1c3230`
- Text Primary: `#f0fdfa`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a4a47`
- Amount Positive: `#4ade80`
- Amount Negative: `#f87171`
- Amount Assigned: `#2dd4bf`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Amount: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace`

## Layout

- Content Max Width: `1440px`
- Budget Grid Columns: `12`
- Sidebar Nav Width: `220px`
- Inspector Panel Width: `340px`
- Month Selector Height: `48px`
- Category Row Height: `44px`
- Category Group Header Height: `40px`
- Budget Table Column Widths: Category `flex`, Assigned `140px`, Activity `140px`, Available `140px`
- Reports Content Max Width: `960px`
- Reports Chart Height: `320px`

## Components

### Budget Row

- Height: `44px`
- Padding: `0 16px`
- Border bottom: `1px solid` category-divider
- Hover background: surface-secondary
- Font size: `sm` (14px) for category name, `sm` for amounts
- Amount font weight: `500`
- Amount alignment: right
- Editable cell (Assigned): `1px dashed` border on hover, solid on focus
- Overspent indicator: amount-negative color + subtle overspent-light background on the Available cell

### Category Group Header

- Height: `40px`
- Background: category-group
- Font weight: `700`
- Font size: `xs` (12px), uppercase, letter-spacing `0.05em`
- Color: category-muted
- Padding: `0 16px`
- Sticky top: below month selector
- Collapse toggle: `16px` chevron icon, left side

### Month Selector

- Height: `48px`
- Background: budget-header
- Text color: inverse (white)
- Arrow buttons: ghost variant, inverse text
- Current month font weight: `700`
- Font size: `lg` (18px)
- Navigation: left/right arrows with month name centered

### Envelope Card (Mobile)

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px`
- Category name: font weight `600`, font size `base`
- Available amount: font size `xl` (20px), font weight `700`
- Progress bar height: `6px`, border radius `full`
- Progress colors: assigned (funded portion), available (remaining goal), overspent (exceeds budget)

### Goal Progress

- Bar height: `6px`
- Border radius: `full` (9999px)
- Track color: `#e5e7eb`
- Fill colors: goal-met when 100%, goal-partial when in progress, goal-unstarted when 0%
- Percentage label: font size `xs`, font weight `500`, right-aligned above bar
- Target date: font size `xs`, color category-muted

### Amount Input

- Border radius: `6px`
- Height: `32px`
- Font variant: tabular-nums
- Text align: right
- Padding: `4px 8px`
- Border: `1px solid transparent` (default), `1px solid` primary (focus)
- Negative values: amount-negative color
- Quick-assign dropdown: primary background, inverse text, `8px` border radius

### Transaction Row

- Height: `48px`
- Padding: `0 16px`
- Columns: Date `100px`, Payee `flex`, Category `180px`, Amount `120px`, Cleared `40px`
- Cleared indicator: `16px` circle — filled primary (cleared), outline border-primary (uncleared), `#7c3aed` (reconciled)
- Inflow color: amount-positive
- Outflow color: amount-negative
- Selected row: assigned-light background

### Spending Report Chart

- Bar chart border radius: `4px` top corners
- Category colors: rotate through `#0f766e`, `#2563eb`, `#d97706`, `#7c3aed`, `#dc2626`, `#0891b2`, `#65a30d`, `#c026d3`
- Tooltip: surface background, `md` shadow, `8px` border radius, `12px 16px` padding
- Axis labels: font size `xs`, color category-muted
- Grid lines: `1px solid` `#f3f4f6`

### Trend Sparkline

- Stroke width: `2px`
- Stroke color: primary
- Fill: primary at `0.1` opacity
- Height: `40px`
- No axis labels (inline context only)

### Import/Export Panel

- Border radius: `12px` (lg)
- Drag-drop zone: `2px dashed` border-primary, `24px` padding, centered icon + text
- Drag-over state: assigned-light background, primary border
- File format badges: pill shape, `xs` font, secondary background
- Supported formats: CSV, OFX, QFX, QIF

### Account Sidebar Item

- Height: `40px`
- Padding: `8px 16px`
- Active: primary background at `0.1` opacity, primary text, `3px` left border primary
- Balance: right-aligned, tabular-nums, font weight `500`
- Negative balance: amount-negative color
- Account type icon: `18px`, left of name

### Data Table (Reports)

- Header background: surface-secondary
- Header font: `xs` (12px), uppercase, letter-spacing `0.05em`, font weight `600`
- Row hover: surface-secondary
- Cell padding: `10px 16px`
- Amount columns: right-aligned, tabular-nums
- Totals row: font weight `700`, top border `2px solid` border-primary
- Striped: alternating surface / surface-secondary

## Design Principles

1. **Numbers are king** — monetary amounts must be instantly scannable: tabular-nums, right-aligned, consistent decimal formatting, color-coded positive/negative
2. **Envelope metaphor** — the UI should reinforce the mental model of putting money into categories; visual progress bars and assignment flows make this tangible
3. **Calm confidence** — deep teal conveys trust and control; avoid alarming reds except for genuinely overspent states
4. **Dense but not cramped** — budget tables show many rows; keep row heights compact (`44px`) with generous horizontal padding for readability
5. **Month as the frame** — every budget view is anchored to a specific month; the month selector is always visible and prominent
