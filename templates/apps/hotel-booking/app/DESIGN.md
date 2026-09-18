# DESIGN.md — Hotel Booking

## Brand Identity

- **App Name:** Auberge
- **Tagline:** Stay somewhere extraordinary
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Aspirational, refined, welcoming, trustworthy

## Target Persona

Discerning travelers planning leisure and business trips who value curated properties, transparent pricing, and an elegant booking experience over bargain-basement aggregators.

## Screens

| Name                | Route                     | Auth | Purpose                                                                                            | deriveFrom |
| ------------------- | ------------------------- | ---- | -------------------------------------------------------------------------------------------------- | ---------- |
| Landing             | /                         | No   | Hero search + featured destinations and editorial content                                          | —          |
| Login               | /login                    | No   | Sign in                                                                                            | —          |
| Signup              | /signup                   | No   | Create account                                                                                     | Login      |
| ForgotPassword      | /forgot-password          | No   | Request reset                                                                                      | Login      |
| ResetPassword       | /reset-password           | No   | Set new password                                                                                   | Login      |
| SearchResults       | /search                   | No   | Map + list split view of properties with filters                                                   | —          |
| PropertyDetail      | /property/:id             | No   | Gallery, amenities, reviews, room types, booking sidebar                                           | —          |
| BookingCheckout     | /booking/:id              | Yes  | Guest details, payment, booking summary                                                            | —          |
| Trips               | /trips                    | Yes  | Upcoming and past reservations                                                                     | —          |
| Favorites           | /favorites                | Yes  | Saved properties                                                                                   | —          |
| Account             | /account                  | Yes  | Profile, loyalty tier, payment methods, preferences                                                | —          |
| BookingConfirmation | /booking/:id/confirmation | Yes  | Post-checkout success — confirmation #, itinerary, calendar/PDF actions, what's-next               | —          |
| TripDetail          | /trips/:id                | Yes  | Full reservation detail — gallery, itinerary, host messaging, modify/cancel actions, price summary | —          |
| Notifications       | /notifications            | Yes  | Activity feed — booking updates, host messages, price drops, loyalty milestones, trip reminders    | —          |

## App Constraints

- Property images are always `4:3` aspect, never cropped square; photography is the primary conversion driver
- Map and list views are peers — equal visual weight in search results, not subordinated
- Loyalty tier is ambient — a subtle badge in the nav, never a modal or popup

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e4d6e`
- Primary Hover: `#1a6d96`
- Primary Dark: `#093a54`
- Accent: `#c8913a`
- Accent Hover: `#daa54e`
- Accent Dark: `#a87628`

### Semantic

- Available: `#1a8a5c`
- Available Light: `#dcfce7`
- Limited: `#d97706`
- Limited Light: `#fef3c7`
- Sold Out: `#9ca3af`
- Sold Out Light: `#f3f4f6`
- Deal: `#b91c1c`
- Deal Light: `#fee2e2`
- Star Rating: `#eab308`
- Loyalty Gold: `#c8913a`
- Loyalty Silver: `#94a3b8`
- Loyalty Platinum: `#334155`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafb`
- Search Bar: `#ffffff`
- Map Overlay: `rgba(14, 77, 110, 0.06)`
- Hero Gradient Start: `#0e4d6e`
- Hero Gradient End: `#1a6d96`

### Text

- Price: `#111827`
- Price Per Night: `#6b7280`
- Price Strike: `#9ca3af`
- Price Deal: `#b91c1c`
- Amenity: `#4b5563`
- Link: `#0e4d6e`
- Link Hover: `#093a54`

### Borders

- Card: `#e5e7eb`
- Input Focus: `#0e4d6e`
- Divider: `#f0f0f0`

### Dark Theme Overrides

- Primary: `#38bdf8`
- Accent: `#daa54e`
- Background: `#0c1524`
- Surface: `#162032`
- Surface Secondary: `#1e293b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2d3f56`
- Search Bar: `#1e293b`

## Typography

### Font Families

- Heading: `"DM Serif Display", Georgia, "Times New Roman", serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes (overrides)

- Hero Title: `3.5rem` (56px)
- Section Title: `1.75rem` (28px)
- Property Name: `1.125rem` (18px)
- Price Large: `1.5rem` (24px)
- Amenity Label: `0.8125rem` (13px)

## Layout

- Content Max Width: `1280px`
- Search Bar Max Width: `960px`
- Property Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Property Grid Gap: `24px`
- Map Panel Width: `50%` (split view), collapsible
- Filter Sidebar Width: `280px`
- Gallery Grid: `2x2` with hero (large left + 2x2 right grid)
- Booking Sidebar Width: `360px`
- Top Bar Height: `64px`

## Components

### Search Bar (Hero)

- Border radius: `12px` (lg), or `9999px` (pill variant on landing)
- Shadow: `lg`
- Height: `64px`
- Background: surface
- Divided sections: Destination | Check-in | Check-out | Guests
- Section dividers: `1px solid` border-primary, `32px` height
- Search button: primary background, `48px` height, `48px` min-width, `8px` radius
- Padding: `8px 8px 8px 24px`

### Property Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `4:3`
- Image carousel: dot indicators, `8px` from bottom
- Padding: `0` (image flush) + `16px` (content area)
- Content spacing: `8px` between elements
- Bookmark icon: top-right of image, `32px` circle, white background, `sm` shadow
- Deal badge: deal color background, white bold text, top-left absolute, `4px` radius
- Star rating: inline with review count, `14px` stars

### Property Detail Gallery

- Main image: `60%` width, `400px` height, `12px` radius top-left + bottom-left
- Grid images: `2x2`, `8px` gap, `12px` radius top-right (first) + bottom-right (last)
- "Show all photos" button: ghost variant, bottom-right overlay
- Lightbox: full-screen overlay, `xl` shadow

### Price Display

- Current price font size: `1.5rem` (24px)
- Current price font weight: `700`
- Per-night label: `0.875rem`, secondary text, inline
- Deal price: deal color
- Original price: strikethrough, muted (`#9ca3af`)
- Total line: `0.875rem`, secondary text, below nightly rate

### Date Picker

- Border radius: `12px` (lg)
- Shadow: `lg`
- Day cell: `40px` square
- Selected range: primary with `0.1` opacity fill between dates
- Range endpoints: primary solid, white text
- Unavailable dates: `0.3` opacity, strikethrough, no pointer
- Today: `2px` primary underline
- Min-nights indicator: subtle text below calendar

### Guest Selector

- Border radius: `12px` (lg)
- Shadow: `lg`
- Padding: `16px`
- Row height: `48px`
- Stepper buttons: `32px` circle, outline variant, `1px` border
- Counter font weight: `600`
- Categories: Adults, Children, Infants — each row with label + description + stepper

### Star Rating

- Star size: `14px` (cards), `16px` (detail), `20px` (reviews)
- Filled color: `#eab308` (star-rating)
- Empty color: `#e5e7eb`
- Score display: `600` weight, inline after stars
- Review count: secondary text, parenthesized

### Amenity Tags

- Border radius: `8px` (md)
- Padding: `6px 12px`
- Background: surface-secondary
- Font size: `13px` (amenity-label)
- Icon size: `16px`, inline before text
- Gap: `8px` between tags
- Max display: `6` on card, expand link for more

### Filter Panel

- Section spacing: `24px`
- Section title: `600` weight, `14px`
- Checkbox/radio: `4px` radius, `18px` size
- Price range slider: primary color track, `16px` thumb
- Collapsible sections: `150ms` transition
- Active filter count: primary badge on section title
- "Clear all" link: primary text, right-aligned in header

### Map View

- Default zoom: city level
- Pin style: primary color, `32px` height, price label inside
- Active pin: accent color, `1.2x` scale, `lg` shadow
- Cluster: primary dark, `40px` circle, white count text
- Info popup: `280px` width, property card mini layout, `md` shadow

### Booking Summary Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Position: sticky, `24px` from top
- Border: `1px solid` border-primary
- Price breakdown: label left, value right, `12px` row spacing
- Divider: `1px solid` border-primary, `16px` vertical margin
- Total row: `700` weight, `1.125rem` size
- CTA button: primary, full width, `48px` height, `600` weight

### Review Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border bottom: `1px solid` divider
- Avatar: `40px` circle
- Reviewer name: `600` weight
- Date: secondary text, `0.875rem`
- Rating: inline stars after name
- Body: `1rem`, `1.6` line height, clamp to 4 lines with "Read more"

### Loyalty Tier Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `0.75rem` (xs)
- Font weight: `600`
- Gold tier: loyalty-gold background, white text
- Silver tier: loyalty-silver background, white text
- Platinum tier: loyalty-platinum background, white text
- Points display: `600` weight, accent color, tabular-nums

### Room Type Card

- Border radius: `8px` (md)
- Shadow: `sm`
- Padding: `16px`
- Border: `1px solid` border-primary
- Image: `120px` width, `1:1` aspect, `8px` radius, left-aligned
- Layout: horizontal on desktop, vertical on mobile
- Amenity icons: `14px`, inline row, `6px` gap
- Select button: outline variant, right-aligned, `40px` height
- Selected state: primary border, primary light background

## Design Principles (Domain-Specific)

1. **Trust through clarity** — pricing, availability, and policies must be immediately scannable. No hidden fees, no ambiguity.
2. **Photography-forward** — property images drive conversion. Give them generous space and high-quality aspect ratios. Never crop to squares.
3. **Dates and guests first** — the search-to-book funnel must feel effortless. Search bar fields should be logically ordered and always accessible.
4. **Map and list are peers** — users think spatially about lodging. The map view is not secondary; it gets equal design investment.
5. **Loyalty is ambient** — tier status and points are visible but never intrusive. A subtle badge, a points counter in the nav — never a popup.
6. **Mobile books too** — the full booking flow (search, filter, detail, checkout) must work flawlessly on a phone. No "complete on desktop" dead ends.
