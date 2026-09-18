# DESIGN.md — Personal Finance

## Brand Identity

- **App Name:** Ledger
- **Tagline:** Smart money management
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#059669`
- Primary Hover: `#10b981`
- Primary Dark: `#047857`

### Semantic

- Income: `#059669`
- Expense: `#dc2626`
- Savings: `#0891b2`
- Investment: `#8b5cf6`
- Budget On Track: `#059669`
- Budget Warning: `#f59e0b`
- Budget Over: `#dc2626`

### Chart Palette

- Series 1: `#059669`
- Series 2: `#0891b2`
- Series 3: `#8b5cf6`
- Series 4: `#f59e0b`
- Series 5: `#ec4899`
- Series 6: `#6366f1`

### Backgrounds

- Primary: `#f0fdf4`
- Surface: `#ffffff`
- Surface Secondary: `#f7faf8`

### Text

- Primary: `#111827`
- Secondary: `#6b7280`
- Amount Positive: `#059669`
- Amount Negative: `#dc2626`
- Link: `#059669`
- Link Hover: `#047857`

### Dark Theme Overrides

- Primary: `#34d399`
- Background: `#0a1612`
- Surface: `#132a22`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Numbers: `"Inter", sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Balance Large: `3xl` (30px)
- Transaction Amount: `base` (16px), weight `600`

## Layout

- Content Max Width: `1200px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Chart Min Height: `280px`

## Components

### Balance Card

- Border radius: `16px` (xl)
- Padding: `24px`
- Shadow: `md`
- Background: gradient from primary to primary-dark
- Text: inverse, balance in `3xl` weight `700`

### Transaction Row

- Height: `56px`
- Padding: `8px 16px`
- Border bottom: `1px solid` border-primary
- Category icon: `36px` circle, muted background
- Amount: right-aligned, tabular-nums, color by income/expense

### Budget Progress Bar

- Height: `8px`
- Border radius: `full`
- Background: border-primary
- Fill: on-track/warning/over color based on percentage
- Label: amount spent / total, `sm` font

### Chart Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Shadow: `sm`
- Header: title left, period selector right
- Legend: bottom, `xs` font, dot indicators `8px`

### Account Tile

- Border radius: `12px` (lg)
- Padding: `16px`
- Border: `1px solid` border-primary
- Institution logo: `24px`
- Last four digits: `mono` font, secondary text
