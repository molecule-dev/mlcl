# DESIGN.md — Rental Marketplace

## Brand Identity

- **App Name:** Roost
- **Tagline:** Stay like you belong
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Welcoming, trust-building, wanderlust, human

## Target Persona

Travelers browsing short-term rentals and hosts managing their listings and bookings.

## Screens

| Name              | Route              | Auth | Purpose                                                           | deriveFrom |
| ----------------- | ------------------ | ---- | ----------------------------------------------------------------- | ---------- |
| Landing           | /                  | No   | Marketing home with destination search                            | —          |
| Login             | /login             | No   | Sign in                                                           | —          |
| Signup            | /signup            | No   | Create account                                                    | Login      |
| ForgotPassword    | /forgot-password   | No   | Request reset                                                     | Login      |
| ResetPassword     | /reset-password    | No   | Set new password                                                  | Login      |
| Search            | /search            | Yes  | Listings search results with map                                  | —          |
| ListingDetail     | /listings/:id      | Yes  | Single listing with photos, amenities, booking                    | —          |
| Bookings          | /bookings          | Yes  | User's past and upcoming bookings                                 | —          |
| Wishlist          | /wishlist          | Yes  | Saved listings                                                    | —          |
| HostDashboard     | /host              | Yes  | Host overview with calendar and earnings                          | —          |
| Messages          | /messages          | Yes  | Host/guest conversations                                          | —          |
| Settings          | /settings          | Yes  | Profile, verifications, payment                                   | —          |
| BookingDetail     | /bookings/:id      | Yes  | Single booking with itinerary, host info, payment summary, cancel | —          |
| MessageThread     | /messages/:id      | Yes  | Conversation view with full history and listing context           | —          |
| HostListings      | /host/listings     | Yes  | Host's own listings with status and edit actions                  | —          |
| HostListingDetail | /host/listings/:id | Yes  | Manage single listing — calendar, pricing, photos, settings       | —          |
| Reservations      | /host/reservations | Yes  | Host's incoming reservation requests and confirmed bookings       | —          |
| CreateListing     | /host/listings/new | Yes  | Multi-step host onboarding to create new property listing         | —          |
| Profile           | /users/:id         | Yes  | Public user profile with trips, reviews, verifications            | —          |
| Notifications     | /notifications     | Yes  | Platform notifications: bookings, messages, reviews, payments     | —          |

## App Constraints

- Instant book badge uses purple to distinguish from standard listings
- Superhost gold badge is visually distinct — never competes with listing title
- Photo galleries use 16:9 hero + grid of supporting photos

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488` (warm teal — trust, travel, water)
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#e07052` (terracotta — warmth, home, hospitality)
- Accent Hover: `#eb8a70`
- Accent Dark: `#c85a3e`

### Semantic

- Available: `#16a34a`
- Available Light: `#dcfce7`
- Booked: `#6b7280`
- Booked Light: `#f3f4f6`
- Instant Book: `#7c3aed` (distinguishes instant-bookable listings)
- Instant Book Light: `#ede9fe`
- Superhost: `#d97706` (gold badge for top hosts)
- Superhost Light: `#fef3c7`
- Deal: `#dc2626` (price drops, limited-time offers)
- Deal Light: `#fee2e2`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8faf9` (slight warm-cool tint)
- Map Overlay: `rgba(255, 255, 255, 0.92)`
- Search Bar: `#ffffff`

### Text

- Price: `#111827`
- Price Deal: `#dc2626`
- Price Original: `#9ca3af` (strikethrough)
- Price Per Night: `#6b7280` (the "/night" suffix)
- Link: `#0d9488`
- Link Hover: `#0f766e`

### Borders

- Card Hover: `#0d9488`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#f0917d`
- Background: `#0c1520`
- Surface: `#162032`
- Surface Secondary: `#1c2a3e`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a50`
- Map Overlay: `rgba(12, 21, 32, 0.92)`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (geometric, modern — used for hero text, listing titles, nav branding)
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Price: `"Tabular Nums", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1280px`
- Listing Grid Columns: `4` (desktop), `3` (laptop), `2` (tablet), `1` (mobile)
- Listing Grid Gap: `24px`
- Map Split: `55% listings / 45% map` (desktop), full-width toggle (mobile)
- Search Bar Height: `64px` (hero), `48px` (sticky nav)
- Filter Bar Height: `52px`
- Image Carousel Height: `280px` (grid card), `480px` (detail page)
- Sidebar Width (booking widget): `380px`
- Message Thread Width: `360px` (sidebar), fluid (main)

## Components

### Listing Card

- Border radius: `16px` (xl)
- Shadow: `none` default, `md` on hover
- Border: `1px solid transparent`, hover: `1px solid` card-hover
- Image aspect ratio: `4:3`
- Image carousel: dots indicator, swipeable, rounded top only (`16px 16px 0 0`)
- Padding: `0` (image flush) + `14px 4px` (content below)
- Bookmark icon: top-right absolute, `32px` hit target, heart shape
- Superhost badge: top-left absolute, `superhost` background, bold white text, `8px` radius
- Title: `base` size, `600` weight, single line truncate
- Location: `sm` size, secondary text
- Date range: `sm` size, tertiary text
- Price: `base` size, `700` weight + "/night" suffix in price-per-night color
- Star rating: inline before price row, `sm` size

### Search Bar (Hero)

- Border radius: `9999px` (pill)
- Shadow: `lg`
- Height: `64px`
- Background: surface
- Divided into segments: Location | Check-in | Check-out | Guests | Search button
- Segment dividers: `1px solid` border-primary, `24px` height
- Search button: circular `48px`, primary background, white search icon
- On mobile: collapses to single tappable bar that opens full-screen search

### Search Bar (Sticky Nav)

- Border radius: `9999px` (pill)
- Shadow: `md`
- Height: `48px`
- Compact display: "Location - Dates - Guests" as single line
- Expands to full search on click

### Filter Chips

- Border radius: `9999px` (pill)
- Border: `1px solid` border-primary
- Padding: `8px 16px`
- Font size: `sm`
- Active state: `2px solid` primary, primary-light background
- Height: `36px`

### Map Pin

- Size: `40px` wide, auto height
- Border radius: `9999px` (pill shape)
- Background: surface
- Shadow: `md`
- Font weight: `600`
- Font size: `sm`
- Active/hover: primary background, inverse text
- Price displayed inside pin

### Booking Widget (Detail Page Sidebar)

- Border radius: `12px` (lg)
- Shadow: `lg`
- Border: `1px solid` border-primary
- Padding: `24px`
- Sticky position: `top: 80px`
- Date picker: inline calendar, `8px` radius cells
- Guest selector: dropdown with increment/decrement controls
- Book button: full width, `48px` height, primary background, `700` weight
- Price breakdown: line items with dotted border-bottom separator

### Review Card

- Border radius: `0` (flat, separated by border-bottom)
- Padding: `24px 0`
- Border bottom: `1px solid` border-primary
- Avatar: `48px` circle
- Reviewer name: `base` size, `600` weight
- Date: `sm` size, secondary text
- Rating: star row, `14px` stars
- Body: `base` size, normal line height, max 4 lines with "Show more"

### Star Rating

- Star size: `14px` (card), `16px` (detail), `20px` (review summary)
- Filled color: `#111827` (text-primary — not gold, for a cleaner look)
- Empty color: `#d1d5db`
- Half-star supported via gradient fill
- Rating number: `sm` size, `600` weight, displayed after stars

### Image Carousel

- Border radius: `16px` top corners (card), `0` (detail page hero)
- Navigation arrows: `32px` circle, `rgba(255,255,255,0.9)` background, centered vertically
- Dot indicators: `6px` circles, `rgba(255,255,255,0.6)` inactive, `#ffffff` active
- Transition: `300ms ease` slide
- Swipe-enabled on touch devices

### Messaging Thread

- Message bubble (sent): primary background, inverse text, `16px 16px 4px 16px` radius
- Message bubble (received): surface-secondary background, primary text, `16px 16px 16px 4px` radius
- Bubble max width: `75%`
- Bubble padding: `10px 14px`
- Timestamp: `xs` size, secondary text, center-aligned between message groups
- Input bar: `48px` height, `9999px` radius, surface background, bottom-fixed

### Host Profile Badge

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Avatar: `64px` circle
- Name: `lg` size, `700` weight
- Superhost indicator: superhost color, inline badge after name
- Stats row: reviews count, rating, years hosting — separated by `middot`

### Date Range Picker

- Calendar cell size: `40px` square
- Selected range: primary-light background
- Range start/end: primary background, inverse text, `9999px` one-sided radius
- Today: `2px solid` primary, no fill
- Unavailable: secondary text, strikethrough, no pointer
- Month navigation: `32px` arrow buttons

### Guest Counter

- Border radius: `8px` (md)
- Increment/decrement buttons: `32px` circle, border-primary, centered `+`/`-`
- Count: `base` size, `600` weight, `40px` min-width centered
- Category labels: Adults, Children, Infants, Pets — each row `48px` height

## Design Principles

1. **Photography first** — listings sell through images; give them maximum real estate, minimal chrome
2. **Scannable pricing** — price per night must be instantly visible on every card, no hunting
3. **Trust through detail** — reviews, superhost badges, and response rates reduce booking anxiety
4. **Map-list duality** — both views are first-class; neither is an afterthought
5. **Warm, not loud** — teal and terracotta create warmth without the visual noise of bright saturated colors
6. **Instant orientation** — location, dates, and guest count are always visible or one tap away
