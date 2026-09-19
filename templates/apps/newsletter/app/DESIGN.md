# DESIGN.md — Newsletter

## Brand Identity

- **App Name:** Dispatch
- **Tagline:** Write. Send. Grow.
- **Logo:** Envelope mark (outline + filled notification dot) in the brand orange; text logo uses the app name in the heading font (black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#c2410c` (editorial warm orange)
- Primary Hover: `#9a3412`
- Primary Light: `#ffe8d9`

### Backgrounds

- Background: `#ffffff`
- Surface: `#fafafa`
- Surface Secondary: `#f2f2f2`

### Text

- Primary: `#292929`
- Secondary: `#6b6b6b`
- Tertiary: `#b3b3b3`

### Status

- Draft: `#f59e0b` (amber)
- Published / brand accent: `#c2410c` (orange — doubles as the nav brand color)
- Scheduled: `#3b82f6` (blue)

### Dark Theme Overrides

- Primary: `#fb923c`
- Background: `#0d0d0d`
- Surface: `#171717`
- Text: `#f5f5f5`
- Text Secondary: `#c4c4c4`
- Border: `#2a2a2a`

## Typography

### Font Families

- Headlines/issue subjects: `"Newsreader", serif` (var `--font-headline`)
- Body/UI: `"Inter", sans-serif`
- Code: `SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Line Heights

- Issue body: `1.75` (relaxed reading)
- Normal: `1.5`
- Tight (headings): `1.25`

## Layout

- Content Max Width: `680px` (public issue body)
- Wide Content Max Width: `1100px`–`1440px` (dashboard, issue list, subscriber table)
- Sidebar Width: `240px`
- Top Bar Height: `56px` (fixed, `pt-24` page offset)
- Issue Padding (desktop): `48px 0`

## Components

### Issue Row (creator list)

- Border radius: `12px` (xl)
- Surface: container-lowest, hover container-low
- Status chip: `xs`, uppercase, tracking-widest, status color
- Row actions: Stats (published only) / Edit / Delete text buttons

### KPI Cards (Dashboard)

- 4-column grid (desktop), 1-column (mobile)
- Label (`xs` uppercase) + value (`3xl` serif, black weight) + hint (`xs`)
- Container-lowest surface, radius `12px`

### Growth / Opens Charts

- Bar rows, height 96px–160px
- Bars: `bg-primary/70`, hover `bg-primary`
- Min bar height 4% so zero-days stay visible

### Subscribe Form (Landing)

- Pill input + pill CTA side by side, max-width `448px`
- Success state replaces the form (`role="status"`)

### Issue Editor

- Centered layout (max-width: `720px`)
- Large serif subject input (`xl`, bold, bottom-border only)
- Preview-text input (bottom-border only, `sm`)
- Markdown textarea (18 rows, container-lowest surface)
- Header actions: Save draft (tonal) + Publish (primary)
- Schedule block: datetime-local input + Schedule button (secondary container)

### Subscriber Table

- Full-width, `sm` text, container-lowest surface
- Status chip: pill, container colors by status (primary=subscribed, secondary=pending, error=unsubscribed)
- Row actions: Unsubscribe/Resubscribe + Delete

### Public Issue Page

- Single column, `680px`, serif headline (`3xl`, black)
- `## ` markdown sections render as serif `h2`
- Footer: unsubscribe link (tokened) or subscribe link
