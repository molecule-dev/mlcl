# DESIGN.md — Bill Split

## Brand Identity

- **App Name:** Evenly
- **Tagline:** Shared costs, settled simply
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight); mark is a green split-arrow glyph
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Friendly, fair, precise, calm — roommates and friends, not a finance department

## Target Persona

- Friends, flatmates, and trip groups who share costs and want the "who owes whom" question answered without a shared spreadsheet
- The group organizer: creates the group, fronted some costs, wants settle-up suggestions

## Screens

| Name           | Route            | Auth | Purpose                                                                   | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing page + sign-up CTA                                              | —          |
| Login          | /login           | No   | Sign in                                                                   | —          |
| Signup         | /signup          | No   | Create account                                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                          | Login      |
| About          | /about           | No   | About page                                                                | —          |
| Privacy        | /privacy         | No   | Privacy policy                                                            | —          |
| Terms          | /terms           | No   | Terms of service                                                          | —          |
| Dashboard      | /dashboard       | Yes  | Net balance cards (you owe / owed to you / net), groups list, recent feed | —          |
| Groups         | /groups          | Yes  | Group cards with member stack + my balance; create-group form             | —          |
| GroupDetail    | /groups/:id      | Yes  | Member balances, simplify-debts settle-up, expenses, settlements, members | —          |
| NewExpense     | /expenses/new    | Yes  | Add expense: payer, amount, split equal/exact/shares, category, date      | —          |
| Balances       | /balances        | Yes  | Cross-group per-friend nets + per-group rows                              | —          |
| Activity       | /activity        | Yes  | Chronological feed of every group event                                   | —          |
| Friends        | /friends         | Yes  | Address book of people you split with                                     | —          |
| Settings       | /settings        | Yes  | Profile, settlement-method preference, notifications, language, theme     | —          |

## App Constraints

- Money is INTEGER CENTS everywhere; format only at render time via `lib/money.ts` helpers
- All currency amounts render with tabular-nums; owed-to-you uses primary, you-owe uses error/danger color consistently
- Balances always display signed (−) for debts; zero renders as an em-dash or "Settled up", never "$0.00 owed"
- Settle-up suggestions come from the API's simplify-debts engine — never recompute balances client-side
- Every group's member nets must sum to zero; never show a balance state that implies otherwise

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#15803d` (green-700)
- Primary Hover: `#166534`
- Primary Light / Container: `#dcfce7`
- Secondary: `#6d28d9` (violet-700, deepened for 7.3:1 white contrast)
- Secondary Container: `#ede9fe`

### Semantic

- Owed to you (amount positive): primary `#15803d`
- You owe (amount negative): danger `#dc2626`
- Success / settled: `#16a34a`
- Warning (fallback banners): `#ea580c`
- Danger: `#dc2626`, hover `#b91c1c`

### Backgrounds

- Background: `#f0fdf4` (green-50 tint)
- Surface: `#ffffff`
- Surface Container Low: `#f0fdf4`
- Surface Container: `#e6fbee`
- Sidebar: `--color-surface` with outline-variant divider

### Text

- Text: `#14532d`
- Text Secondary: `#475569`
- Muted: `#94a3b8`

### Borders

- Border: `#bbf7d0`
- Border Focus: `#15803d`
- Dividers: outline-variant at 40% opacity

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Amount: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `260px`, sticky, border-r outline-variant/40
- Top Bar Height: `56px` (`h-14`), sticky, surface/80 + backdrop-blur
- Balance cards grid: `3` (desktop md+), `1` (mobile)
- Group cards grid: `3` (xl), `2` (md), `1` (mobile)
- Group detail: two-column `lg` grid (balances | settle-up), expenses full-width below

## Components

### Balance Hero Card

- Border radius: `16px` (2xl)
- Padding: `24px`
- Variants: you-owe (error-container/40 + error/30 border), owed-to-you (primary-container/50 + primary/30 border), net (surface + outline)
- Label: xs bold uppercase tracking-widest with leading arrow_outward / arrow_inward / balance icon
- Value: 3xl extrabold tabular-nums

### Group Card

- Border radius: `16px`, shadow-sm, hover: xl + translate-y(-1)
- Avatar stack: 7x7 (28px) circles, overlapping −0.5rem, primary/secondary-container alternating, 2-letter initials
- Footer: total tracked (left) + my balance (right, signed color)

### Expense Row

- Layout: category icon tile (9x9 rounded-lg primary-container) | description + "paid by · split method · date" | amount (bold tabular-nums) | delete icon-button
- Hover: surface-container-low; delete hover: error text + error-container/40

### Settle-Up Suggestion Row

- surface-container-low rounded-xl row: "A pays B $X.YZ" prose + gradient "Record payment" pill button
- Empty state: task_alt icon + "Everyone is square" panel in primary-container/40
- Below: recorded-payments mini-list (handshake icon, from → to, note)

### Split Method Chips

- Pill, xs semibold uppercase tracking-widest
- Active: bg-primary text-white shadow-sm; inactive: surface-container-low + on-surface-variant
- Per-member rows: checkbox label + per-person preview (equal), dollar input w-32 (exact), weight input w-24 (shares)

### Category Chip

- Same pill anatomy as split-method chips; icon + label
- Categories: groceries, meals, lodging, rent, utilities, transport, activities, other

### Activity Feed Row

- surface rounded-2xl row: kind icon tile + prose + group link + short date
- Kind icons: group_add, person_add, person_remove, receipt_long, delete, handshake

### Amount Display

- Font weight: `700`, tabular-nums
- Owed to you: primary; you owe: error, − prefix (minus sign U+2212)
- Zero: em-dash or "Settled up" text, on-surface-variant
- Approximate per-person previews: ≈ prefix, on-surface-variant

### Primary Action (CTA)

- Pill (rounded-full), white text on gradient `linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))`, shadow-md shadow-primary/20
- Inline icon (add / save / check) at text-base

### Empty State

- rounded-2xl dashed border-outline-variant panel, centered
- 5xl on-surface-variant icon, lg semibold title, sm secondary body
