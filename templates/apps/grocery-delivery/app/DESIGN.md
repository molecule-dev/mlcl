# DESIGN.md — Grocery Delivery

## Brand Identity

- **App Name:** Bushel
- **Tagline:** Freshness at your door
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Fresh, dependable, neighborly, efficient

## Target Persona

Households and busy professionals restocking weekly groceries, prioritizing freshness, scheduled delivery slots, and smart reorder of staples.

## Screens

| Name              | Route                   | Auth | Purpose                                                                       | deriveFrom    |
| ----------------- | ----------------------- | ---- | ----------------------------------------------------------------------------- | ------------- |
| Landing           | /                       | No   | Marketing home with featured categories + delivery promise                    | —             |
| Login             | /login                  | No   | Sign in                                                                       | —             |
| Signup            | /signup                 | No   | Create account                                                                | Login         |
| ForgotPassword    | /forgot-password        | No   | Request reset                                                                 | Login         |
| ResetPassword     | /reset-password         | No   | Set new password                                                              | Login         |
| Shop              | /shop                   | Yes  | Product grid with category strip and filters                                  | —             |
| ProductDetail     | /product/:id            | Yes  | Single product with nutrition, reviews, add-to-cart                           | —             |
| Cart              | /cart                   | Yes  | Cart review with substitution prefs + delivery slot picker                    | —             |
| OrderTracking     | /order/:id              | Yes  | Live map + progress stepper + driver ETA                                      | —             |
| Orders            | /orders                 | Yes  | Past orders with reorder action                                               | —             |
| Settings          | /settings               | Yes  | Profile, addresses, payment methods, preferences                              | —             |
| Checkout          | /checkout               | Yes  | Final review with delivery address, slot, payment, tip + sticky order summary | —             |
| Search            | /search                 | Yes  | Global product search results with sidebar filters and 5-col grid             | —             |
| Lists             | /lists                  | Yes  | Saved shopping lists, weekly staples, smart reorder sidebar                   | —             |
| OrderConfirmation | /order/:id/confirmation | Yes  | Success hero after placing order with summary and ETA                         | OrderTracking |

## App Constraints

- Category strip sits directly below nav; product grid is 5-column desktop with badges (organic/sale) stacked top-left
- Cart/Order screens always show a delivery slot picker with visible calendar + time grid
- Substitution preferences surface inline on cart items with a distinct purple left border

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2d8a4e`
- Primary Hover: `#38a169`
- Primary Dark: `#22693b`
- Accent: `#e8603c`
- Accent Hover: `#f0764e`
- Accent Dark: `#c44a2a`

### Semantic

- Fresh: `#2d8a4e`
- Fresh Light: `#dcfce7`
- Expiring Soon: `#e09520`
- Expiring Soon Light: `#fef3c7`
- Out of Stock: `#94a3b8`
- Substitution: `#7c3aed`
- Substitution Light: `#ede9fe`
- Delivery Active: `#0284c7`
- Delivery Active Light: `#e0f2fe`
- Sale: `#dc2626`
- Sale Light: `#fee2e2`
- Organic Badge: `#16a34a`
- Organic Badge Light: `#f0fdf4`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f7faf8`
- Category Banner: `#f0fdf4`
- Cart Drawer: `#ffffff`
- Delivery Slot Selected: `#dcfce7`
- Tracking Map: `#f1f5f9`

### Text

- Price: `#1a1a2e`
- Price Sale: `#dc2626`
- Price Original: `#9ca3af` (strikethrough)
- Price Per Unit: `#64748b`
- Link: `#2d8a4e`
- Link Hover: `#22693b`
- Category: `#334155`

### Borders

- Cart Item: `#e2e8f0`
- Delivery Slot: `#cbd5e1`
- Delivery Slot Active: `#2d8a4e`

### Dark Theme Overrides

- Primary: `#4ade80`
- Accent: `#f0764e`
- Background: `#0c1a12`
- Surface: `#162920`
- Surface Secondary: `#1e352a`
- Text Primary: `#f0fdf4`
- Text Secondary: `#a7c4b8`
- Border Primary: `#2d4a3a`
- Category Banner: `#162920`
- Delivery Slot Selected: `#1a3a28`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1360px`
- Product Grid Columns: `5` (desktop), `3` (tablet), `2` (mobile)
- Product Grid Gap: `16px`
- Category Bar Height: `48px` (horizontal scrollable strip below nav)
- Sidebar Filter Width: `240px`
- Cart Drawer Width: `420px`
- Delivery Slot Grid: `3` columns (desktop), `2` (tablet), `1` (mobile)
- Map Panel Width: `55%` of viewport (tracking page, desktop only)
- Dashboard Sidebar Width: `280px` (order history, reorder panel)

## Components

### Product Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `1:1`
- Image background: `#f7faf8` (surface-secondary)
- Padding: `0` (image flush) + `12px` (content area)
- Badge row: top-left absolute, stacked vertically with `4px` gap
- Organic badge: `#16a34a` background, white text, `4px` radius, `xs` font
- Sale badge: `#dc2626` background, white bold text, `4px` radius
- Price per unit: `xs` font, `#64748b` color, displayed below main price
- Add button: circular `36px`, primary background, `+` icon, bottom-right of card
- Quantity stepper: replaces add button when item is in cart, `36px` height, `- [qty] +` inline

### Category Strip

- Height: `48px`
- Horizontal scroll with `12px` gap
- Each pill: `full` radius, `8px 16px` padding, `sm` font, `500` weight
- Active pill: primary background, inverse text
- Inactive pill: surface-secondary background, secondary text
- Optional emoji/icon prefix per category: `20px` size

### Cart Drawer

- Width: `420px` (slides from right)
- Shadow: `xl`
- Header: `56px` height with item count badge (accent color)
- Item row: `72px` min-height, thumbnail `56px` square, quantity stepper inline
- Substitution indicator: `#7c3aed` left border `3px`, `substitution-light` background
- Delivery fee bar: sticky bottom, `48px`, surface-secondary background
- Checkout button: full width, `48px` height, accent background, bold white text

### Delivery Slot Picker

- Grid of time-slot cards: `md` radius, `1px` border
- Slot card: `80px` height, date top `sm` bold, time range bottom `xs` secondary
- Available: default border, surface background
- Selected: primary border `2px`, `delivery-slot-selected` background, primary text
- Unavailable: `#f1f5f9` background, `#94a3b8` text, no pointer, strikethrough time
- Express badge: accent background, `xs` white text, top-right corner

### Order Tracking Card

- Border radius: `16px` (xl)
- Shadow: `md`
- Map section: `240px` height (mobile), `100%` of panel (desktop split view)
- Progress stepper: horizontal, 4 steps — Confirmed, Picking, On the Way, Delivered
- Active step: primary color dot `12px`, bold label
- Completed step: primary filled dot with checkmark
- Pending step: `#cbd5e1` dot, muted label
- Connector line: `2px` between dots, primary if completed, `#e2e8f0` if pending
- Driver info: avatar `40px` circle, name `sm` bold, "arriving in X min" `xs` accent

### Substitution Preference Card

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Layout: product thumbnail `48px`, product name, preference select dropdown
- Options: "Allow substitution", "Pick best match", "Refund item", "Contact me"
- Active preference: primary text, subtle primary-light background strip

### Search Bar

- Border radius: `full` (pill)
- Height: `44px`
- Background: surface-secondary (unfocused), surface (focused)
- Border: `1px solid transparent` (unfocused), `2px solid primary` (focused)
- Placeholder: "Search groceries..." in secondary text
- Voice/scan icon: right-aligned, `20px`, secondary color
- Recent searches dropdown: `md` radius, `md` shadow, max 6 items

### Reorder Button

- Border radius: `8px` (md)
- Height: `40px`
- Variant: outline with primary border and text
- Icon: circular arrow `16px` left of label
- Hover: primary-light background fill

### Add to Cart Button

- Border radius: `full` (pill) on product card, `8px` (md) on product detail
- Height: `36px` (card), `48px` (detail page)
- Font weight: `600`
- Background: primary
- Full width on product detail page
- Pulse animation on add: `150ms` scale to `1.1` then back

### Price Display

- Current price font weight: `700`
- Font size: `lg` on cards, `2xl` on detail
- Sale price color: `#dc2626`
- Original price: strikethrough, `#9ca3af`
- Per-unit price: `xs`, `#64748b`, e.g. "$0.50/oz"
- Savings callout: `sm`, sale color, bold, e.g. "Save $2.40"

### Notification Toast

- Border radius: `12px` (lg)
- Shadow: `lg`
- Position: bottom-center on mobile, bottom-right on desktop
- Delivery update: `delivery-active` left border `4px`
- Substitution alert: `substitution` left border `4px`
- Auto-dismiss: `5000ms` with progress bar at bottom
