# DESIGN.md — Travel Booking

## Brand Identity

- **App Name:** Sojourn
- **Tagline:** Wander without worry
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, reassuring, well-traveled, effortlessly confident

## Target Persona

Busy professionals and couples planning leisure getaways who want inspiration, trustworthy stays, and a frictionless path from daydream to booked.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                     | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with hero search, featured destinations, and deals                                           | —          |
| Login          | /login           | No   | Sign in                                                                                                     | —          |
| Signup         | /signup          | No   | Create account                                                                                              | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                               | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                            | Login      |
| Search         | /search          | Yes  | Property results list with filters and map split view                                                       | —          |
| PropertyDetail | /property/:id    | Yes  | Photo gallery, amenities, reviews, booking summary                                                          | —          |
| Booking        | /booking/:id     | Yes  | Checkout flow with guest info, dates, payment, price breakdown                                              | —          |
| Trips          | /trips           | Yes  | Upcoming and past itineraries with status badges                                                            | —          |
| Favorites      | /favorites       | Yes  | Saved properties with bookmark management                                                                   | —          |
| Account        | /account         | Yes  | Profile, preferences, payment methods, notifications                                                        | —          |
| TripDetail     | /trips/:id       | Yes  | Single confirmed itinerary — confirmation code, day-by-day plan, host info, payment summary, manage actions | —          |
| Notifications  | /notifications   | Yes  | Inbox of bookings, host messages, price drops, reminders, security alerts with category filters             | —          |

## App Constraints

- Search page uses a resizable list+map split; property cards stay synchronized with map pin hover/click
- All nightly rates display with tabular-nums, `/night` suffix muted, plus total estimate line
- Trip status uses Available/Limited/Sold Out semantic palette — never generic success/warning colors

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0c7a8a`
- Primary Hover: `#0e9aad`
- Primary Dark: `#096272`
- Accent: `#e8634a`
- Accent Hover: `#f07a63`
- Accent Dark: `#c9503a`

### Semantic

- Available: `#16a34a`
- Available Light: `#dcfce7`
- Limited: `#d97706`
- Limited Light: `#fef3c7`
- Sold Out: `#6b7280`
- Sold Out Light: `#f3f4f6`
- Best Deal: `#7c3aed`
- Best Deal Light: `#ede9fe`
- Verified Review: `#0c7a8a`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafb`
- Search Bar: `#ffffff`
- Map Overlay: `rgba(255, 255, 255, 0.95)`
- Hero Gradient Start: `#064e5c`
- Hero Gradient End: `#0c7a8a`

### Text

- Price: `#111827`
- Price Per Night: `#6b7280`
- Price Strikethrough: `#9ca3af`
- Price Deal: `#7c3aed`
- Link: `#0c7a8a`
- Link Hover: `#096272`
- Rating: `#111827`

### Dark Theme Overrides

- Primary: `#22b8cc`
- Accent: `#f07a63`
- Background: `#0b1420`
- Surface: `#162031`
- Surface Secondary: `#1c2a3e`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a50`
- Hero Gradient Start: `#041c24`
- Hero Gradient End: `#0a3842`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1360px`
- Search Results Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Search Results Grid Gap: `24px`
- Map Panel Width: `50%` (split view), `0` (list view)
- Filter Sidebar Width: `280px`
- Search Bar Height: `72px` (hero), `56px` (sticky)
- Itinerary Sidebar Width: `360px`
- Photo Gallery Grid: `2x2` with hero image spanning left column

## Components

### Property Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md` with `translateY(-2px)` lift
- Image aspect ratio: `16:10`
- Image carousel: dot indicators bottom-center, swipeable
- Padding: `0` (image flush) + `16px` (content area)
- Bookmark icon: top-right absolute, `32px` circle, white background, `sm` shadow
- Rating badge: inline with reviews count, `600` weight
- Price block: bottom-right of content, aligned baseline

### Search Bar

- Border radius: `12px` (lg), `16px` on hero variant
- Shadow: `lg` (hero), `md` (sticky)
- Segments: Destination | Check-in | Check-out | Guests | Search button
- Segment dividers: `1px solid` border-secondary, `24px` height
- Active segment: `2px solid` primary bottom border
- Search button: `48px` height, accent background, white icon, `8px` radius
- Sticky behavior: collapses to single-line at scroll threshold

### Date Picker

- Border radius: `12px` (lg)
- Shadow: `xl`
- Calendar grid: `7` columns, `40px` cell size
- Selected range: primary at `0.1` opacity fill between dates
- Range endpoints: primary solid background, white text
- Disabled dates: `0.3` opacity, no pointer events
- Price hints: `10px` font below date number, muted text

### Guest Selector

- Border radius: `12px` (lg)
- Shadow: `lg`
- Counter buttons: `32px` circle, outline style, `1px` border
- Increment/decrement: `+` / `−` symbols, `500` weight
- Category labels: Adults, Children, Infants — with age hint in secondary text

### Filter Sidebar

- Section spacing: `24px`
- Section headers: `600` weight, `14px`
- Collapsible sections with chevron icon, `150ms` rotation
- Price range slider: dual-thumb, primary color track, `16px` thumb
- Checkbox style: rounded `4px`, primary fill when checked
- Star filter: clickable star row, filled/empty states
- Map filter toggle: outline button with map pin icon

### Star Rating

- Star size: `14px` (card), `18px` (detail page)
- Filled color: `#f59e0b`
- Empty color: `#d1d5db`
- Half-star: clipped fill
- Review count: secondary text, parenthesized, beside stars

### Review Card

- Border radius: `8px` (md)
- Border bottom: `1px solid` border-primary (divider between reviews)
- Avatar: `40px` circle
- Reviewer name: `500` weight
- Date: secondary text, relative format ("3 weeks ago")
- Verified badge: small primary-colored checkmark icon beside name

### Price Display

- Nightly rate: `24px`, `700` weight
- "per night" label: `12px`, secondary text, beside rate
- Strikethrough original: `14px`, `400` weight, muted, line-through
- Deal percentage: best-deal color, `600` weight, `-X%` format
- Total estimate: `14px`, secondary text, "X nights · $Y total"

### Booking Summary Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Border: `1px solid` border-primary
- Position: sticky top on detail page
- Sections: Price | Dates | Guests | Total | Book button
- Book button: full width, `48px` height, accent background, `600` weight, white text
- Breakdown toggle: expandable fees/taxes section

### Map Pin

- Default: `32px` circle, white background, primary border, `sm` shadow
- Price label inside pin: `12px`, `600` weight
- Hover: scale `1.15`, `md` shadow, z-index bump
- Selected: primary solid background, white text, `lg` shadow
- Cluster: `40px` circle, primary at `0.15` opacity, count in center

### Itinerary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Left accent border: `4px solid` primary
- Thumbnail: `80px` square, `8px` radius
- Date range: `600` weight, primary color
- Status badges: Confirmed (available), Pending (limited), Cancelled (error)

### Photo Gallery

- Border radius: `12px` (lg), with overflow hidden
- Grid: hero left (spans 2 rows) + 4 thumbnails right (2x2)
- Gap: `4px`
- Overlay button: "Show all photos" bottom-right, white bg, `sm` shadow
- Lightbox: full-screen overlay, `xl` shadow, arrow navigation

### Amenity Icon Grid

- Icon size: `20px`
- Grid: `2` columns on detail page
- Row height: `40px`
- Icon color: primary text
- Label: `14px`, `400` weight, beside icon
- "Show all" link: primary color, after first 8 items
