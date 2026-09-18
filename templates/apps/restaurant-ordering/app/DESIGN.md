# DESIGN.md — Restaurant Ordering

## Brand Identity

- **App Name:** Hearth
- **Tagline:** Every table, served
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, appetizing, efficient, service-oriented

## Target Persona

Restaurant managers tracking orders and guests ordering for dine-in, pickup, or delivery.

## Screens

| Name           | Route             | Auth | Purpose                                                                 | deriveFrom |
| -------------- | ----------------- | ---- | ----------------------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home for restaurants                                          | —          |
| Login          | /login            | No   | Sign in                                                                 | —          |
| Signup         | /signup           | No   | Create account                                                          | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                           | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                        | Login      |
| OrderDashboard | /dashboard        | Yes  | Kitchen/manager order board with kanban columns                         | —          |
| Menu           | /menu             | Yes  | Menu management with items and categories                               | —          |
| MenuItemDetail | /menu/:id         | Yes  | Edit a single menu item with photo, modifiers, dietary, pricing         | —          |
| OrderDetail    | /orders/:id       | Yes  | Single order with items, customer, status timeline                      | —          |
| OrderHistory   | /orders/history   | Yes  | Searchable archive of completed/cancelled orders for accounting         | —          |
| Tables         | /tables           | Yes  | Floor plan with table statuses                                          | —          |
| TableDetail    | /tables/:id       | Yes  | Single table with active order, guests, server, ticket timer            | —          |
| Reservations   | /reservations     | Yes  | Reservation timeline with party assignments and waitlist                | —          |
| Customers      | /customers        | Yes  | Customer directory with order history                                   | —          |
| CustomerDetail | /customers/:id    | Yes  | Single customer profile with order history, lifetime value, preferences | —          |
| Analytics      | /analytics        | Yes  | Revenue, top items, hourly patterns                                     | —          |
| Notifications  | /notifications    | Yes  | Activity feed: kitchen alerts, ready bells, rush flags, mentions        | —          |
| Settings       | /settings         | Yes  | Restaurant profile, hours, team                                         | —          |
| Billing        | /settings/billing | Yes  | Subscription tier, plan, invoices, payment method                       | —          |
| Profile        | /profile          | Yes  | Personal user account: avatar, security, schedule preferences           | —          |
| GuestMenu      | /menu/guest       | No   | Guest-facing QR menu (mobile-first, no manager chrome)                  | —          |
| GuestCart      | /cart             | No   | Guest-side cart and checkout (tip, split bill, payment)                 | —          |

## App Constraints

- Order status kanban columns (New, Preparing, Ready, Served) each color-coded per Semantic tokens
- Table floor plan uses colored cells for occupancy state
- Menu item cards always show photo + price with tabular-nums

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e8590c`
- Primary Hover: `#f97316`
- Primary Dark: `#c2410c`
- Accent: `#059669`
- Accent Hover: `#10b981`
- Accent Dark: `#047857`

### Semantic

- Order New: `#3b82f6`
- Order New Light: `#dbeafe`
- Order Preparing: `#f59e0b`
- Order Preparing Light: `#fef3c7`
- Order Ready: `#16a34a`
- Order Ready Light: `#dcfce7`
- Order Served: `#6b7280`
- Order Cancelled: `#dc2626`
- Order Cancelled Light: `#fee2e2`
- Rush: `#dc2626`
- Table Available: `#059669`
- Table Occupied: `#e8590c`
- Table Reserved: `#8b5cf6`
- Table Dirty: `#d97706`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5f2`
- Kitchen Display: `#1a1a2e`
- POS Panel: `#ffffff`

### Text

- Price: `#1f2937`
- Price Discount: `#dc2626`
- Category: `#e8590c`
- Timer Warning: `#f59e0b`
- Timer Critical: `#dc2626`
- Link: `#e8590c`
- Link Hover: `#c2410c`

### Borders

- Primary: `#e7e0db`
- Focus: `#e8590c`

### Dark Theme Overrides

- Primary: `#fb923c`
- Accent: `#34d399`
- Background: `#1a1a2e`
- Surface: `#16213e`
- Surface Secondary: `#1e293b`
- Text Primary: `#f8fafc`
- Text Secondary: `#cbd5e1`
- Border Primary: `#334155`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Kitchen: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Price: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12` (desktop), `8` (tablet), `4` (mobile)
- Dashboard Grid Gap: `16px`
- Sidebar Nav Width: `240px` (collapsed: `64px`)
- POS Panel Width: `380px` (right-side order builder)
- Floor Plan Min Width: `800px`
- Kitchen Display Columns: `4` (desktop), `2` (tablet)
- Kitchen Display Card Min Width: `280px`
- Menu Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Menu Grid Gap: `20px`
- QR Order Max Width: `480px` (mobile-first guest view)

## Components

### Order Ticket (Kitchen Display)

- Background: `#16213e` on dark kitchen display
- Border radius: `8px` (md)
- Border-left: `4px solid` order status color
- Padding: `12px 16px`
- Header: order number (bold `20px`), table number, elapsed timer
- Timer font: kitchen mono, `16px`, tabular-nums
- Timer color: default text → warning at 10min → critical at 15min
- Items list: `14px`, checkable with strikethrough on completion
- Shadow: none (flat cards for glanceability on kitchen screens)
- Rush badge: `#dc2626` background, white bold text, pulsing animation

### Menu Item Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `4:3`
- Padding: `0` (image flush) + `16px` (content area)
- Title: `16px`, font weight `600`
- Description: `14px`, secondary text, 2-line clamp
- Price: `18px`, font weight `700`, bottom-right
- Dietary badges: `10px` uppercase, `4px` radius, inline row below title
- Out-of-stock overlay: `rgba(255, 255, 255, 0.7)` with "Unavailable" centered

### Table Map Tile

- Shape: rounded rectangle, `12px` radius
- Size: scalable, min `80px x 80px`
- Border: `2px solid` table status color
- Background: table status color at `10%` opacity
- Label: table number centered, `16px` bold
- Seat count: small badge, top-right corner
- Guest count: bottom-center, `12px`
- Active order indicator: small dot, primary color, top-left

### POS Order Builder (Side Panel)

- Background: surface
- Border-left: `1px solid` border-primary
- Header: table number + guest count, `18px` semibold
- Line items: `14px`, quantity selector inline, swipe-to-remove on touch
- Subtotal/Tax/Total section: top border separator, `16px`
- Total: `24px`, font weight `700`
- Pay button: full-width, `56px` height (xl), primary background, `700` weight

### QR Guest Order View

- Max width: `480px`, centered
- Menu categories: horizontal scrollable pill tabs, primary color active
- Item cards: compact, `8px` radius, no shadow (flat mobile style)
- Cart FAB: fixed bottom-right, `56px` circle, primary color, item count badge
- Cart sheet: bottom sheet, slides up, `16px` top radius

### Order Status Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `12px` (xs)
- Font weight: `600`
- Variants map to semantic order colors:
  - New: order-new bg light, order-new text
  - Preparing: order-preparing bg light, order-preparing text
  - Ready: order-ready bg light, order-ready text
  - Served: muted bg, muted text
  - Cancelled: order-cancelled bg light, order-cancelled text

### Table Status Badge

- Border radius: `9999px` (pill)
- Padding: `4px 10px`
- Font size: `11px`
- Font weight: `600`
- Text transform: uppercase
- Variants: Available (accent), Occupied (primary), Reserved (purple), Dirty (amber)

### Category Nav (Menu Management)

- Horizontal scrollable row on mobile
- Vertical sidebar list on desktop, `200px` wide
- Active: primary color text, `2px` bottom border (horizontal) or left border (vertical)
- Padding: `10px 16px`
- Font weight: `500`, active `600`
- Drag handle for reordering: `16px` grip icon, secondary color

### Dietary Badge

- Border radius: `4px`
- Padding: `2px 6px`
- Font size: `10px`
- Font weight: `600`
- Text transform: uppercase
- Variants:
  - Vegetarian: `#16a34a` bg, white text (V)
  - Vegan: `#059669` bg, white text (VG)
  - Gluten-Free: `#7c3aed` bg, white text (GF)
  - Spicy: `#dc2626` bg, white text (flame icon)
  - Allergen: `#f59e0b` bg, `#1f2937` text (warning icon)

### Notification Toast

- Position: top-right on POS, bottom-center on guest view
- Border radius: `8px`
- Shadow: `lg`
- Padding: `12px 16px`
- Sound cue types: new-order (chime), order-ready (bell), rush (urgent beep)
- Auto-dismiss: `5s` default, `10s` for rush orders
- Variants:
  - New Order: accent left-border, order-new icon
  - Ready: accent left-border, order-ready icon
  - Rush: rush color left-border, pulsing background

### Payment Modal

- Size: `lg` (640px)
- Sections: split method selector (cash/card/mixed), amount display `36px` bold
- Tip presets: row of `4` pill buttons (`15%`, `18%`, `20%`, custom)
- Split bill: toggle with guest count selector
- Confirm button: full-width, `56px`, accent color (green — confirms payment)

### Dashboard Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Metric value: `30px`, font weight `700`
- Metric label: `14px`, secondary text
- Trend indicator: `12px`, inline arrow + percentage, success/error color
- Sparkline: `48px` height, primary color stroke, no axis labels

### Real-Time Order Queue

- Kanban-style columns: New → Preparing → Ready → Served
- Column header: status color top-border, `3px`
- Card spacing: `8px` vertical gap
- Cards: drag-and-drop between columns on POS, auto-move on kitchen display
- New order animation: slide-in from left, brief `#e8590c` glow border
