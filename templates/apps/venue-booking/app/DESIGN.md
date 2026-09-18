# DESIGN.md — Venue Booking

## Brand Identity

- **App Name:** Alcove
- **Tagline:** Every space, a story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Curated, warm, story-forward, quietly premium

## Target Persona

Event planners, small teams, and hosts booking distinctive spaces for meetings, photoshoots, workshops, and gatherings — they prize character, transparent hourly/daily pricing, and instant confirmation.

## Screens

| Name                | Route                     | Auth | Purpose                                                                                                    | deriveFrom |
| ------------------- | ------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Landing             | /                         | No   | Marketing home with hero search, category tiles, featured venues                                           | —          |
| Login               | /login                    | No   | Sign in                                                                                                    | —          |
| Signup              | /signup                   | No   | Create account                                                                                             | Login      |
| ForgotPassword      | /forgot-password          | No   | Request reset                                                                                              | Login      |
| ResetPassword       | /reset-password           | No   | Set new password                                                                                           | Login      |
| Search              | /search                   | Yes  | Venue grid + map split with filter chips (type, price, capacity, amenities, instant book)                  | —          |
| VenueDetail         | /venue/:id                | Yes  | Gallery, amenities, reviews, host card, booking sidebar                                                    | —          |
| Booking             | /book/:venueId            | Yes  | Guest info, date/time range, price breakdown, confirmation                                                 | —          |
| Reservations        | /reservations             | Yes  | Upcoming and past bookings with status and host contact                                                    | —          |
| Favorites           | /favorites                | Yes  | Saved venues with heart toggle and quick compare                                                           | —          |
| Account             | /account                  | Yes  | Profile, payment methods, host switch, notifications                                                       | —          |
| ReservationDetail   | /reservations/:id         | Yes  | Single reservation detail with booking summary, host card, price breakdown, modify/cancel actions          | —          |
| BookingConfirmation | /booking/confirmation/:id | Yes  | Post-booking success page with confirmation number, summary, next steps, host card                         | —          |
| Messages            | /messages                 | Yes  | Inbox of guest/host conversations with filter tabs, unread badges, venue context chips                     | —          |
| MessageThread       | /messages/:id             | Yes  | Single conversation detail with full history, booking context, photo attachments, composer                 | —          |
| HostDashboard       | /host                     | Yes  | Host overview with KPIs, upcoming bookings, listing performance chart, mini calendar, quick actions        | —          |
| Notifications       | /notifications            | Yes  | Activity feed grouped by date with type-coded icons, unread dots, filters, quiet hours                     | —          |
| Settings            | /settings                 | Yes  | App preferences with sidebar nav (notifications, privacy, language, appearance, accessibility, host prefs) | —          |

## App Constraints

- Venue cards show hourly OR daily pricing — never both simultaneously; unit color differentiates
- Superhost and Instant Book badges are visually distinct (superhost color vs instant-book color)
- Search hero collapses from 520px to 200px on results — preserve breathing room

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2b7a6f`
- Primary Hover: `#359183`
- Primary Dark: `#1f5c53`
- Accent: `#c47d3f`
- Accent Hover: `#d49355`
- Accent Dark: `#a66830`

### Semantic

- Available: `#2b9a4f`
- Available Light: `#dcfce7`
- Booked: `#9ca3af`
- Booked Light: `#f3f4f6`
- Instant Book: `#0d9488`
- Instant Book Light: `#ccfbf1`
- Superhost: `#c47d3f`
- Superhost Light: `#fef3e2`
- Per Hour: `#6366f1`
- Per Day: `#8b5cf6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f7f9f8`
- Hero: `linear-gradient(135deg, #1a3a35 0%, #2b7a6f 100%)`
- Map Overlay: `rgba(255, 255, 255, 0.95)`
- Gallery Overlay: `rgba(0, 0, 0, 0.4)`

### Text

- Price: `#111827`
- Price Unit: `#6b7280`
- Review Score: `#111827`
- Amenity: `#374151`
- Link: `#2b7a6f`
- Link Hover: `#1f5c53`

### Borders

- Card: `#e5e7eb`
- Calendar Today: `#2b7a6f`
- Calendar Selected: `#2b7a6f`
- Calendar Range: `#d1fae5`

### Dark Theme Overrides

- Primary: `#5eead4`
- Accent: `#f0b472`
- Background: `#0c1a17`
- Surface: `#162822`
- Surface Secondary: `#1c332c`
- Text Primary: `#f0fdf4`
- Text Secondary: `#a7c4bc`
- Border Primary: `#2a4a42`

## Typography

### Font Families

- Headings: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Price: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-variant-numeric: tabular-nums)

### Font Weights

- Logo: `800`
- Venue Title: `700`
- Section Heading: `600`
- Price Amount: `700`
- Price Unit: `400`

## Layout

- Content Max Width: `1320px`
- Venue Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Venue Grid Gap: `24px`
- Map Split Width: `50%` (right panel in search view)
- Map Min Width: `400px`
- Filter Bar Height: `64px`
- Search Hero Height: `520px` (landing), `200px` (results)
- Gallery Grid: `2x2 + 1 large left` (5 images, detail page)
- Sidebar Booking Width: `380px`

## Components

### Venue Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `4:3`
- Image carousel: dots indicator bottom-center, swipe enabled
- Padding: `0` (image flush) + `16px` (content area)
- Title: `base` size, weight `600`, single line truncate
- Location: `sm` size, secondary text color, with map pin icon
- Price: weight `700`, followed by `/hr` or `/day` in price-unit color
- Rating: inline star + score + review count in parentheses
- Favorite heart: top-right absolute, `32px` hit target, outline default, filled on active
- Instant Book badge: `Instant Book` pill, instant-book background, white text, top-left

### Search Bar

- Border radius: `12px` (lg)
- Shadow: `lg`
- Height: `64px`
- Background: surface
- Segments: Location | Date Range | Guest Count | Search Button
- Dividers: `1px solid` border-primary between segments
- Search button: `48px` circle, primary background, white search icon
- Expanded state: full overlay on mobile, dropdown panels on desktop

### Availability Calendar

- Cell size: `40px` square
- Today: primary border, no fill
- Selected: primary background, white text
- Range: calendar-range background
- Unavailable: booked color, strikethrough, no pointer
- Price hint: `10px` text below date number in price-unit color
- Border radius: `8px` (md) on container

### Map Pin

- Default: `36px` circle, primary background, white text (price)
- Hover: scale `1.15`, shadow `md`
- Active/Selected: accent background, scale `1.2`, shadow `lg`
- Cluster: `44px` circle, primary-dark background, white count
- Font size: `xs` (12px), weight `700`

### Review Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border bottom: `1px solid` border-primary (list separator)
- Avatar: `40px` circle
- Name: weight `600`, `sm` size
- Date: secondary text, `xs` size
- Rating: 5 stars inline, filled color `#f59e0b`, empty `#d1d5db`, size `14px`
- Body: `sm` size, max 4 lines with "Show more" toggle
- Host response: indented `16px` left, surface-secondary background, `8px` radius

### Price Breakdown

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `24px`
- Line items: flex between label and amount, `16px` vertical spacing
- Subtotal divider: `1px solid` border-secondary
- Total: weight `700`, `lg` size, `16px` top padding
- Service fee: secondary text with info tooltip icon

### Amenity Grid

- Columns: `2` (desktop), `1` (mobile)
- Icon size: `24px`, secondary text color
- Label: `sm` size, `12px` left of icon
- Row height: `40px`
- Max visible: `10`, then "Show all N amenities" button

### Host Card

- Border radius: `12px` (lg)
- Padding: `24px`
- Avatar: `64px` circle
- Name: `lg` size, weight `700`
- Superhost badge: superhost color pill, `xs` text
- Stats: Reviews count · Years hosting, `sm` size, secondary color
- Response rate: progress bar, primary fill
- Contact button: outline variant, full width

### Gallery

- Detail page: 5-image grid (1 large left 50%, 4 small right 2x2), `4px` gap
- Border radius: `12px` outer corners only
- Overlay button: "Show all photos" bottom-right, surface background, `sm` text, `md` radius
- Lightbox: full-screen overlay, counter top-center, close button top-right
- Mobile: single image with swipe carousel, dot indicators

### Filter Chips

- Border radius: `9999px` (pill)
- Padding: `8px 16px`
- Border: `1px solid` border-primary
- Active: primary background, white text, no border
- Font size: `sm`
- Categories: Space Type, Price Range, Capacity, Amenities, Instant Book, Rating
