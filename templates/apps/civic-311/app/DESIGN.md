# DESIGN.md — CivicPulse (civic-311)

## Brand Identity

- **App Name:** CivicPulse
- **City:** Riverton (fictional — single-city scope, no multi-municipality)
- **Tagline:** Riverton 311
- **Logo:** pin-on-grid mark (public/logo.svg) + wordmark in the sidebar/auth pages
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0f766e` (deep civic teal)
- Primary Hover: `#115e59`
- Primary Container: `#0b4f49`
- Login/accent gradient: `#0f766e → #0b4f49` (`.bg-login-gradient`)

### Issue status semantics (one-way workflow)

- Submitted: `#0e7490`
- Acknowledged: `#2563eb`
- In Review: `#f59e0b`
- Resolved: `#16a34a`
- Dismissed: `#6b7280`

### Category accents (map pins, chips, icons)

- Pothole `#b45309` · Streetlight `#b8860b` · Graffiti `#9333ea` · Trash `#0f766e` · Tree `#15803d` · Parking `#dc2626` · Other `#475569`

### Map chrome

- Grid lines `var(--color-map-grid)`, river `var(--color-map-water)`, parks `var(--color-map-park)`, roads `var(--color-map-road)` — the SVG grid map is the only "map" in this app (fictional city, no real tiles)

### Surfaces & text

- Background `#ffffff`, secondary `#f6faf9`, tertiary `#ecf3f1`
- Text `#10201d` / `#3f5652` / `#58706b` (all ≥ 4.5:1 on white)
- Official-note highlight: `#ecfdf5` with a primary left rule

## Typography

- Body/UI: Inter (`--mol-font-sans`)
- Headline (legal/pricing shells): serif stack via `--font-headline`
- Mono: JetBrains Mono

## Layout

- Dashboard shell: fixed 240px left sidebar (brand, Report-an-issue CTA, Explore / My reports / Watch areas / Notifications / Settings, user card) + main canvas at `ml-[240px]`
- Public pages (Landing, Pricing, About, Terms, Privacy): Header + Footer chrome, no sidebar
- Auth pages: centered card on tinted background with brand gradient logo chip

## Components

- `MiniMap` — the SVG street-grid map: picker mode (click/arrow-keys to drop a pin, crosshair cursor, focus ring) and display mode (issue pins colored by category, watch-area circles dashed, selected pin ring). Coordinate system IS the city grid (viewBox 0 0 100 100) — see `lib/geo.ts`.
- `StatusBadge` / `CategoryBadge` — chips for workflow status and report category
- `PageHeader` — title/subtitle/action row used by the bespoke pages
- Settings/auth/legal components inherited from the fleet shell

## Voice

Plain, neighborly, civic. "Report it, confirm it, watch it get fixed." No emergency-service claims (Terms states call volumes go to the emergency number). The city is Riverton; addresses are derived from grid coordinates, never geocoded.
