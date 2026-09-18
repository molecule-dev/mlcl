# DESIGN.md — Itinerary Planner

## Brand Identity

- **App Name:** Waypoint
- **Tagline:** Every stop tells a story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Adventurous
- Warm
- Organized
- Story-driven

## Target Persona

Leisure travelers and travel planners building multi-day trip plans with transport, lodging, and activity details.

## Screens

| Name           | Route            | Auth | Purpose                                                                             | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                                      | —          |
| Login          | /login           | No   | Sign in                                                                             | —          |
| Signup         | /signup          | No   | Create account                                                                      | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                       | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                    | Login      |
| Dashboard      | /dashboard       | Yes  | Upcoming trips overview with countdown cards                                        | —          |
| Trips          | /trips           | Yes  | All trips list with status, dates, destinations                                     | Dashboard  |
| TripPlanner    | /trips/new       | Yes  | Build/edit a trip with day timeline, stops, transport                               | Dashboard  |
| TripDetail     | /trips/:id       | Yes  | View trip itinerary, bookings, map, notes                                           | Dashboard  |
| Destinations   | /destinations    | Yes  | Browse saved and suggested destinations                                             | Dashboard  |
| Bookings       | /bookings        | Yes  | Flights, hotels, activities with confirmations                                      | Dashboard  |
| Expenses       | /expenses        | Yes  | Trip spending tracker with per-category breakdown                                   | Dashboard  |
| Settings       | /settings        | Yes  | Profile, preferences, currency, integrations                                        | Dashboard  |
| Notifications  | /notifications   | Yes  | Activity feed of trip updates, collaborator actions, booking confirmations          | —          |
| Calendar       | /calendar        | Yes  | Month-grid view of all trips, transit segments, lodging stays across multiple trips | —          |

## App Constraints

- Soft travel-journal atmosphere
- Map-forward visuals
- Day-by-day timeline with transport icons

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7490`
- Primary Hover: `#22a3c4`
- Primary Dark: `#0c5f75`
- Accent: `#f97316`
- Accent Hover: `#fb923c`
- Accent Dark: `#ea580c`

### Semantic

- Confirmed: `#0e7490`
- Confirmed Light: `#cffafe`
- Tentative: `#eab308`
- Tentative Light: `#fef9c3`
- Cancelled: `#dc2626`
- Cancelled Light: `#fee2e2`
- Free Time: `#8b5cf6`
- Free Time Light: `#ede9fe`
- Transit: `#6b7280`
- Transit Light: `#f3f4f6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafb`
- Map Overlay: `rgba(255, 255, 255, 0.92)`
- Timeline Rail: `#e5eef4`

### Text

- Price: `#111827`
- Time: `#0e7490`
- Duration: `#6b7280`
- Location: `#374151`
- Link: `#0e7490`
- Link Hover: `#0c5f75`

### Borders

- Timeline: `#0e7490`
- Day Divider: `#cbd5e1`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#fb923c`
- Background: `#0c1222`
- Surface: `#1a2536`
- Surface Secondary: `#1e2d3d`
- Text Primary: `#f0f9ff`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a4a`
- Timeline Rail: `#2a3a4a`
- Map Overlay: `rgba(12, 18, 34, 0.92)`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Plus Jakarta Sans", "Inter", -apple-system, sans-serif`
- Time: `"Tabular Nums", "Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `12`
- Sidebar Width: `320px` (trip list / filters)
- Sidebar Collapsed: `64px`
- Map Panel Min Width: `400px`
- Map Panel Default: `50%` of viewport
- Timeline Column Width: `480px`
- Day Header Height: `48px`
- Top Bar Height: `56px`

## Components

### Trip Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Cover image aspect ratio: `16:9`
- Padding: `0` (image flush) + `16px` (content)
- Date range badge: muted background, `sm` text, `4px` radius, top-left absolute
- Collaborator avatars: stacked, `28px` circles, `-8px` overlap, bottom-right
- Status dot: `8px` circle, confirmed/tentative/cancelled color, inline with title

### Activity Card

- Border radius: `8px` (md)
- Shadow: `none` (flat), hover: `sm`
- Border-left: `4px solid` category color
- Padding: `12px 16px`
- Time display: `600` weight, time color, left-aligned fixed `72px` column
- Duration pill: `xs` font, muted background, `9999px` radius
- Drag handle: `6px` dotted grip icon, left edge, visible on hover
- Category colors:
  - Accommodation: `#0e7490` (primary)
  - Food & Drink: `#ea580c` (warm orange)
  - Sightseeing: `#8b5cf6` (purple)
  - Transport: `#6b7280` (gray)
  - Activity: `#16a34a` (green)
  - Shopping: `#ec4899` (pink)

### Day Timeline

- Rail width: `2px`, timeline-rail color
- Node size: `12px` circle, primary color, centered on rail
- Active node: `16px` circle with `3px` white ring
- Day header: `600` weight, `lg` font, sticky top, surface background
- Date subtext: `sm` font, secondary text, includes day-of-week
- Connector lines: dashed `1px` transit color between activities

### Map Markers

- Default pin: `32px` tall, primary color, white icon center
- Active pin: `40px` tall, accent color, elevated shadow `lg`
- Cluster badge: `28px` circle, primary-dark background, white bold count
- Route line: `3px` dashed, primary color, `0.7` opacity
- Info popup: `12px` radius, `md` shadow, `200px` max width

### Collaborator Avatar

- Size: `32px` (list), `24px` (inline/stacked)
- Border radius: `9999px` (full circle)
- Border: `2px solid` surface color (for stacking contrast)
- Status ring: `2px` solid, confirmed = green, pending = yellow
- Overflow indicator: `+N` in muted background circle, same size

### Share Modal

- Border radius: `12px` (lg)
- Width: `480px`
- Permission pills: `9999px` radius, `sm` font, `4px 12px` padding
- Role selector: dropdown, options: Viewer, Editor, Admin
- Link copy field: input with copy button, `8px` radius, monospace font

### Date Range Picker

- Border radius: `12px` (lg) on container
- Day cell: `36px` square, `8px` radius on hover
- Selected range: primary-light background fill between dates
- Range endpoints: primary solid background, white text
- Today indicator: `4px` dot below date number, accent color

### Budget Tracker

- Progress bar height: `8px`, `9999px` radius
- Under budget: primary color fill
- Near budget (>80%): accent color fill
- Over budget: error color fill
- Amount font: tabular-nums, `600` weight
- Currency symbol: `400` weight, secondary text

### Transport Segment

- Border radius: `8px` (md)
- Background: transit-light
- Padding: `8px 12px`
- Mode icon: `20px`, transit color
- Dashed connector: `1px` dashed transit color, vertical between stops
- Duration: centered on connector, `xs` font, muted background pill

### Empty State (No Activities)

- Illustration: outlined map/pin icon, `64px`, muted
- Heading: `lg` font, `600` weight
- Subtext: `sm` font, secondary text
- CTA button: primary, `md` size
