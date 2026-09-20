# DESIGN.md — Donor Management

## Brand Identity

- **App Name:** Givingly
- **Tagline:** Donor relationships, gifts, and year-end receipts
- **Logo:** Heart mark on a rounded teal tile (`public/logo.svg`), app name in the heading font beside it
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0f766e` (deep teal — calm, trustworthy, nonprofit-warm)
- Primary Hover: `#115e59`
- Primary Dark: `#134e4a`
- Secondary: `#b45309` (warm amber — goals, campaigns)

### Semantic

- Receipted / success: `#16a34a`
- Error / lapsed: `#dc2626`
- Campaign active: `#047857`
- Campaign completed: `#1d4ed8`
- Info: `#0891b2`

### Backgrounds

- Primary: `#ffffff`
- Surface: `#f4faf8` (faint mint cast)
- Surface Secondary: `#e9f4f0`
- Dashboard KPI cards: primary / info / secondary / success containers (M3 container pairs)

### Text

- Primary: `#10201c`
- Secondary: `#4b5f59`
- Link: `#0f766e`
- Link Hover: `#115e59`

### Dark Theme Overrides

- Primary: `#14b8a6` (brightened for dark canvas; `on-primary` flips to `#042f2a`)
- Background: `#0c1513`
- Surface: `#13201d`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Headline (receipt sheet, shared pricing/legal pages): `Georgia, 'Iowan Old Style', serif` via `--font-headline`
- Data: `"Inter", sans-serif` (font-variant-numeric: tabular-nums — every money figure)

### Font Sizes

- Metric Value: `2xl` (24px)
- Metric Label: `xs` (12px), uppercase tracking-wider

## Layout

- Content Max Width: `1280px` (7xl)
- Sidebar: shared `SidebarLayout` (`@molecule/app-sidebar-layout-react`)
- Dashboard Grid Columns: `4` (desktop), stacks on tablet/mobile
- Table Min Width: `900px`, horizontal scroll on small screens

## Money

- Integer cents end-to-end; format with `formatMoney()` (`src/lib/format.ts`)
- Never floats; never string math

## Components

### KPI Card

- M3 container pair background (primary / info / secondary / success)
- Padding: `20px`
- Label: `xs`, uppercase, tracking-wider; Value: `2xl`, bold

### Campaign Progress Bar

- Track: `h-2`/`h-3`, rounded-full, surface-container
- Fill: `bg-primary`, width = `min(100, raised/goal)`%
- `role="progressbar"` with aria-valuenow/min/max and the campaign name as label

### Donor Tag Pill

- `rounded-full`, `xs` font, surface-container + on-surface-variant
- Tag palette tokens: `--color-tag-*` (monthly, major, volunteer, board, lapsed, new)

### Receipt Sheet (signature)

- Plain white card (`.receipt-sheet`), black-on-white in print
- `@media print` rules in `src/index.css` hide everything else (`.no-print`)
- No PDF binary, no email send — documents + emails bonds are the integration point

### Data Table

- Header: `600` weight, `xs` font, uppercase, secondary text
- Row hover: surface-container
- Donor/gift/receipt ids link to their detail pages
