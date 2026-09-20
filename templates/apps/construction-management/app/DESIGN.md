# DESIGN.md — Construction Management (Groundwork)

## Brand Identity

- **App Name:** Groundwork
- **Tagline:** Run the job from groundbreaking to closeout
- **Logo:** Mark = white structural triangle (A-frame with cross-brace) on a safety-orange rounded square; wordmark in Inter bold
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary (safety orange): `#c2410c`
- Primary Hover: `#9a3412`
- Primary Light (containers): `#ffedd5`
- Secondary (blueprint teal): `#155e75`
- Accent (safety green): `#4d7c0f`

### Surfaces

- Background (warm paper): `#faf9f7`
- Surface: `#ffffff`
- Surface containers: `#f5f2ee` → `#efece7` → `#e7e5e4`
- Outline variant: `#e7e5e4`

### Semantic

- Severity High: `#b91c1c` (error)
- Severity Medium: `#b45309` (warning)
- Severity Low: neutral container
- Status open: secondary container (info)
- Status in_progress: primary container (progress)
- Status closed: neutral
- Status answered / active: tertiary container (success)
- Status terminated: error container

### Dark mode

Warm charcoal (`#171412` background, `#1f1b18` surfaces). CTA fills stay at
the `#c2410c` brand stop with white text; link/accent text uses hi-vis
`#fb923c` for contrast.

## Typography

- Sans (all UI): Inter
- Mono (codes, drawing refs): JetBrains Mono
- Headline: Inter (bold, tight tracking) — shared legal/billing pages read `var(--font-headline)`

## Layout

- Shell: `SidebarLayout` (`@molecule/app-sidebar-layout-react`) — Dashboard / Projects / Settings
- Project pages carry a sub-nav (Overview · Daily logs · Punch list · RFIs · Subcontractors) via `ProjectNav`
- Money is integer cents everywhere; display via `formatMoney` (no decimals at budget scale)
- Dates display as "Sep 19"; RFI aging counts days since `created_at`

## Components

- `StatusBadge` — the only status/severity chip (tone lookup tables `SEVERITY_TONE`, `STATUS_TONE`)
- `ProjectNav` — project-scoped tab navigation
- `GroundworkLayout` + `UserMenu` — app shell and account panel
- Auth surfaces (LoginCard/SignupCard/forms) use the shared `brand-gradient` class for CTAs
