# DESIGN.md — Food Delivery

## Brand Identity

- **App Name:** Chariot
- **Tagline:** Feast at your door
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Appetizing, warm, energetic, reliable

## Target Persona

Busy urban professionals and families ordering meals from local restaurants, prioritizing speed, variety, and live delivery tracking.

## Screens

| Name              | Route                      | Auth | Purpose                                                                     | deriveFrom |
| ----------------- | -------------------------- | ---- | --------------------------------------------------------------------------- | ---------- |
| Landing           | /                          | No   | Marketing home with featured restaurants and CTA                            | —          |
| Login             | /login                     | No   | Sign in                                                                     | —          |
| Signup            | /signup                    | No   | Create account                                                              | Login      |
| ForgotPassword    | /forgot-password           | No   | Request reset                                                               | Login      |
| ResetPassword     | /reset-password            | No   | Set new password                                                            | Login      |
| Restaurants       | /restaurants               | Yes  | Browse restaurants grid with category filters                               | —          |
| RestaurantMenu    | /restaurant/:id            | Yes  | Single restaurant menu with add-to-cart                                     | —          |
| Checkout          | /checkout                  | Yes  | Cart review, address, payment, place order                                  | —          |
| OrderTracking     | /order/:id                 | Yes  | Live map + driver details + ETA + status                                    | —          |
| Orders            | /orders                    | Yes  | Past orders with reorder action                                             | —          |
| Settings          | /settings                  | Yes  | Profile, addresses, payment methods, preferences                            | —          |
| Search            | /search                    | Yes  | Global search across restaurants, cuisines, and dishes with filters         | —          |
| Favorites         | /favorites                 | Yes  | Saved restaurants and dishes with tabs and quick reorder                    | —          |
| Notifications     | /notifications             | Yes  | Activity feed of order updates, driver messages, promos, and account events | —          |
| OrderConfirmation | /checkout/confirmation/:id | Yes  | Post-checkout success confirming order placement with ETA and tracking CTA  | —          |
| OrderDetail       | /orders/:id                | Yes  | Past completed order detail / receipt with reorder action                   | —          |

## App Constraints

- Primary surface is a restaurant grid with hero search; category pills scroll horizontally below nav
- Order tracking always pairs a live map with an order-details panel side-by-side on desktop
- Cart drawer slides from right with sticky checkout CTA; never a full-page cart on desktop

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e8552d`
- Primary Hover: `#f06e4a`
- Primary Dark: `#c94422`
- Accent: `#1db954`
- Accent Hover: `#23d160`
- Accent Dark: `#18a048`

### Semantic

- Order Pending: `#f59e0b`
- Order Pending Light: `#fef3c7`
- Order Confirmed: `#1db954`
- Order Confirmed Light: `#dcfce7`
- Order Cancelled: `#dc2626`
- Order Cancelled Light: `#fee2e2`
- Prep Time: `#6366f1`
- Delivery Active: `#e8552d`
- Promo: `#e8552d`
- Promo Light: `#fff1ee`
- Closed: `#9ca3af`
- Rating Star: `#f59e0b`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f6`
- Map Overlay: `rgba(255, 255, 255, 0.92)`
- Cart Drawer: `#ffffff`
- Category Bar: `#fff7f5`

### Text

- Price: `#1a1a1a`
- Price Discount: `#dc2626`
- Price Original: `#9ca3af`
- Delivery Fee: `#6b7280`
- ETA: `#e8552d`
- Link: `#e8552d`
- Link Hover: `#c94422`

### Dark Theme Overrides

- Primary: `#f06e4a`
- Accent: `#34d399`
- Background: `#1a1210`
- Surface: `#2a2220`
- Surface Secondary: `#322a28`
- Text Primary: `#faf8f6`
- Text Secondary: `#c8b8b0`
- Border Primary: `#3d3230`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Price: `"Tabular Nums", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- ETA: `"DM Sans", -apple-system, sans-serif` (font-weight: 700)

## Layout

- Content Max Width: `1200px`
- Restaurant Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Restaurant Grid Gap: `24px`
- Menu Item Grid Columns: `1` (single column list)
- Category Sidebar Width: `220px`
- Cart Drawer Width: `420px`
- Map Panel Width: `50%` (tracking view, side-by-side with order details)
- Top Category Bar Height: `64px` (horizontal scroll, below nav)

## Components

### Restaurant Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:9`
- Image height: `180px`
- Padding: `0` (image flush) + `16px` (content area)
- Delivery time badge: primary background, bold white text, bottom-right of image
- Rating: inline star icon + numeric score, font-weight `600`
- Delivery fee: secondary text, right-aligned on same line as rating
- Promo banner: promo-light background, promo text, `8px` padding, full width below image

### Menu Item Row

- Border radius: `12px` (lg)
- Padding: `16px`
- Border bottom: `1px solid` border-primary
- Image: `120px × 120px`, border-radius `8px`, right-aligned
- Name font weight: `600`, size `base`
- Description: secondary text, max 2 lines, ellipsis overflow
- Price font weight: `700`
- Add button: `36px` circular, primary background, white `+` icon

### Category Pill

- Border radius: `9999px` (full)
- Padding: `8px 20px`
- Font weight: `500`
- Background: surface-secondary (inactive), primary (active)
- Text: secondary (inactive), inverse (active)
- Horizontal scroll with `12px` gap
- Active indicator: none (background change is sufficient)

### Cart Item

- Padding: `12px 0`
- Border bottom: `1px solid` border-primary
- Quantity selector: `32px` height, `80px` width, border-radius `8px`, inline `−` / count / `+`
- Item name: font-weight `500`
- Price: right-aligned, font-weight `600`
- Remove: ghost button, error color, `xs` text

### Order Status Tracker

- Horizontal stepper with 4 stages: Placed → Preparing → Picked Up → Delivered
- Active stage: primary color, filled circle `24px`
- Completed stage: accent color, checkmark icon
- Pending stage: border-secondary, hollow circle
- Connecting line: `2px` solid, accent when completed, border-secondary when pending
- Stage label: `xs` font, secondary text, centered below circle

### Driver Map Card

- Border radius: `16px` (xl)
- Shadow: `lg`
- Padding: `20px`
- Driver avatar: `48px` circle
- Driver name: font-weight `600`
- Vehicle info: secondary text, `sm` font
- ETA: `2xl` font, `700` weight, primary color
- Contact buttons: `40px` circular, outline variant, side-by-side (call + message)

### ETA Badge

- Border radius: `8px` (md)
- Padding: `6px 12px`
- Background: primary
- Text: inverse, font-weight `700`, `sm` font
- Variant "range": shows `15–25 min` format
- Variant "live": pulses with `1s ease` animation when under 5 min

### Search Bar

- Border radius: `9999px` (full, pill-shaped)
- Height: `48px`
- Background: surface-secondary
- Border: none (flat style)
- Focus: `2px solid` primary with `2px` offset
- Left icon: magnifying glass, secondary color
- Right icon: filter funnel, tappable, secondary color
- Placeholder: `"Search restaurants or dishes..."`

### Promo Banner

- Border radius: `12px` (lg)
- Padding: `20px 24px`
- Background: gradient from `#e8552d` to `#f06e4a`
- Text: inverse, heading font
- CTA button: white background, primary text, font-weight `600`
- Max width: full bleed within content area

### Rating Display

- Star size: `14px` (inline), `20px` (detail page)
- Filled color: `#f59e0b` (rating-star)
- Empty color: `#e5e7eb`
- Numeric score: font-weight `700`, same line
- Review count: secondary text, parenthetical

### Checkout Summary

- Border radius: `16px` (xl)
- Shadow: `md`
- Padding: `24px`
- Subtotal / fees / total: table layout, `16px` row spacing
- Total row: font-weight `700`, `lg` font, top border `2px solid` border-primary
- Place Order button: full width, `56px` height (xl), primary, font-weight `700`
- Delivery address: clickable row with map pin icon + right chevron
