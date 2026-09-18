# DESIGN.md — Flight Search

## Brand Identity

- **App Name:** Skylark
- **Tagline:** Every route, one search
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Confident, efficient, journey-minded, pragmatic

## Target Persona

Frequent travelers and deal hunters comparing flight options across airlines and dates, often tracking price changes over time.

## Screens

| Name           | Route            | Auth | Purpose                                                                             | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with search form and deals                                           | —          |
| Login          | /login           | No   | Sign in                                                                             | —          |
| Signup         | /signup          | No   | Create account                                                                      | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                       | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                    | Login      |
| Results        | /search          | Yes  | Flight results list with filters                                                    | —          |
| FlightDetail   | /flight/:id      | Yes  | Single flight details with fare breakdown                                           | —          |
| Booking        | /book/:id        | Yes  | Passenger info and checkout                                                         | —          |
| Trips          | /trips           | Yes  | My booked trips and itineraries                                                     | —          |
| PriceAlerts    | /alerts          | Yes  | Tracked routes with price sparklines                                                | —          |
| Settings       | /settings        | Yes  | Profile, loyalty programs, preferences                                              | —          |
| TripDetail     | /trips/:id       | Yes  | Single booked trip — full itinerary, segments, passengers, ticket numbers, check-in | —          |

## App Constraints

- Hero search form appears on Landing with gradient background (#1e3a5f to #2a5298) and is the visual anchor
- Price labels use deal/cheapest/expensive semantic colors consistently (green cheapest, orange deal, red expensive)
- Flight result cards show airline logo | times + route connector with layover | duration + stops | price + CTA in single row layout

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1e3a5f`
- Primary Hover: `#2a4f7f`
- Primary Dark: `#142945`
- Accent: `#e86a2e`
- Accent Hover: `#f07d45`
- Accent Dark: `#c85a22`

### Semantic

- Cheapest: `#16a34a`
- Cheapest Light: `#dcfce7`
- Deal: `#e86a2e`
- Deal Light: `#fff1e6`
- Expensive: `#dc2626`
- Expensive Light: `#fee2e2`
- Nonstop: `#0d9488`
- Layover: `#6b7280`
- Tracked: `#7c3aed`
- Tracked Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f4f7fb`
- Search Hero: `linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%)`
- Result Highlight: `#fffbeb`

### Text

- Price: `#111827`
- Price Cheapest: `#16a34a`
- Price Deal: `#e86a2e`
- Duration: `#6b7280`
- Airline: `#374151`
- Link: `#1e3a5f`
- Link Hover: `#142945`

### Borders

- Route Connector: `#cbd5e1`
- Card Selected: `#1e3a5f`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#f07d45`
- Background: `#0c1929`
- Surface: `#162032`
- Surface Secondary: `#1c2a3e`
- Search Hero: `linear-gradient(135deg, #0c1929 0%, #1e3a5f 100%)`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3f5a`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Duration: `"DM Mono", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1120px`
- Search Hero Height: `400px` (desktop), `auto` (mobile, stacked inputs)
- Results List Width: `100%` (no sidebar on landing layout)
- Filter Bar Height: `56px` (sticky below nav)
- Flight Card Min Height: `96px`
- Multi-city Segment Spacing: `16px`
- Grid Columns: `1` (results are single-column list)
- Sidebar Filter Width: `280px` (appears on results page)

## Components

### Search Form (Hero)

- Background: Search Hero gradient
- Border radius: `16px` (xl) for the form container
- Shadow: `lg`
- Input height: `56px` (xl)
- Input border radius: `12px` (lg)
- Input background: `#ffffff` with `0.95` opacity
- Input font size: `lg` (18px)
- Airport code font weight: `700`
- Airport code font size: `xl` (20px)
- Swap button: `40px` circle, outline variant, centered between origin/destination
- Trip type tabs: pill style, `full` border radius, `32px` height
- Search button: accent background, `56px` height, `600` weight, `12px` radius
- Passenger selector: dropdown with +/- steppers, `md` padding
- Date inputs: calendar popover with range selection, cheapest dates highlighted in green

### Flight Result Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px 20px`
- Border: `1px solid` border-primary
- Selected state: `2px solid` primary, light primary background
- Layout: horizontal — airline logo | times + route | duration + stops | price + book CTA
- Airline logo size: `32px` height, rounded `4px`
- Departure/arrival time font size: `xl` (20px), weight `700`
- Route connector: dashed `1px` line with circle endpoints (`8px`), layover city code centered
- Stop indicator: `Nonstop` in nonstop color, `1 stop` / `2 stops` in layover color
- Duration font family: Duration (monospace)
- Duration font size: `sm` (14px)
- Price font size: `2xl` (24px), weight `700`
- Price cheapest tag: cheapest background, cheapest text, `sm` font, pill badge
- "Deal" badge: deal background, deal-light text, positioned top-left
- Book/Select CTA: accent solid button, `md` size, right-aligned
- Expand arrow: chevron down, `20px`, reveals leg details on click

### Flight Leg Detail (Expanded)

- Background: surface-secondary
- Border radius: `8px` (md)
- Padding: `16px`
- Vertical timeline: `2px` solid route-connector line with `10px` circle markers
- Airport code: `lg` font, `600` weight
- Airport name: `sm` font, secondary text color
- Layover callout: dashed border, `8px` radius, warning-light background, layover duration in `600` weight

### Price Alert Card

- Border radius: `12px` (lg)
- Border-left: `4px solid` tracked color
- Padding: `16px`
- Route display: origin code arrow destination code, `lg` font, `600` weight
- Current price: `xl` font, `700` weight
- Price trend: sparkline chart, `64px` height, primary stroke
- Alert threshold: tracked color badge, pill style
- Toggle: switch for active/paused, tracked color when active

### Filter Bar

- Position: sticky below top nav
- Background: surface with `blur(8px)` backdrop
- Height: `56px`
- Border-bottom: `1px solid` border-primary
- Filter chips: pill border radius, `32px` height, outline by default, solid primary when active
- Sort dropdown: `160px` width, `sm` font
- Price range slider: primary color track, `16px` thumb

### Bookmark Button

- Size: `36px` square
- Icon: heart outline (default), heart filled (bookmarked)
- Bookmarked color: accent
- Transition: fast (150ms) scale + color
- Position: top-right of flight card

### Trip Type Tabs

- Variants: `Round Trip`, `One Way`, `Multi-City`
- Style: segmented control, pill radius
- Active: primary background, inverse text
- Inactive: transparent, secondary text
- Height: `36px`
- Font size: `sm` (14px), weight `500`

### Airport Autocomplete Dropdown

- Border radius: `12px` (lg)
- Shadow: `lg`
- Max height: `320px` (scrollable)
- Item padding: `12px 16px`
- Airport code: `600` weight, primary color
- Airport name: normal weight, primary text
- City/country: `sm` font, secondary text
- Hover: surface-secondary background
- Grouped by: recent searches (icon: clock), nearby airports (icon: location), all results

### Calendar Date Picker

- Border radius: `12px` (lg)
- Shadow: `lg`
- Day cell size: `40px`
- Selected range: primary background at `0.1` opacity, endpoints solid primary
- Cheapest date indicator: `6px` green dot below date number
- Today: `600` weight, underline
- Disabled (past): `0.3` opacity
- Month navigation: chevron arrows, `md` padding

### Multi-City Builder

- Segment card: outline card variant, `md` padding
- Add segment button: ghost variant, primary color, dashed border, `48px` height
- Remove segment: `24px` icon button, error color on hover, top-right
- Connector between segments: vertical dashed line, `24px` height, route-connector color
- Max segments: `6`

### Notification Toast

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Price drop: cheapest border-left accent, includes old price (strikethrough) and new price
- Alert triggered: tracked border-left accent, includes route and threshold
- Auto-dismiss: `6000ms`
