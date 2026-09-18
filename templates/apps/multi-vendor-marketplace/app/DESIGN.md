# DESIGN.md — Multi-vendor Marketplace

## Brand Identity

- **App Name:** Vendry
- **Tagline:** Every maker, one marketplace
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Inclusive
- Curated
- Bold
- Market-fresh

## Target Persona

Shoppers browsing products from multiple makers, and vendors managing storefronts within a shared marketplace.

## Screens

| Name              | Route                | Auth | Purpose                                                                          | deriveFrom |
| ----------------- | -------------------- | ---- | -------------------------------------------------------------------------------- | ---------- |
| Landing           | /                    | No   | Marketing home                                                                   | —          |
| Login             | /login               | No   | Sign in                                                                          | —          |
| Signup            | /signup              | No   | Create account                                                                   | Login      |
| ForgotPassword    | /forgot-password     | No   | Request reset                                                                    | Login      |
| ResetPassword     | /reset-password      | No   | Set new password                                                                 | Login      |
| Catalog           | /catalog             | No   | Browse products with filters, sorting, vendor chips                              | —          |
| ProductDetail     | /products/:id        | No   | Product page with images, vendor, reviews, add-to-cart                           | —          |
| VendorStorefront  | /vendors/:slug       | No   | Vendor's storefront with their products                                          | —          |
| Cart              | /cart                | Yes  | Cart grouped by vendor with shipping per seller                                  | —          |
| VendorDashboard   | /vendor/dashboard    | Yes  | Vendor admin: sales, orders, inventory                                           | —          |
| Orders            | /orders              | Yes  | Buyer orders with status by vendor                                               | —          |
| Settings          | /settings            | Yes  | Buyer/vendor profile, payouts, shipping                                          | —          |
| Checkout          | /checkout            | Yes  | Shipping address + payment + review-by-vendor before placing order               | —          |
| OrderDetail       | /orders/:id          | Yes  | Single order: status timeline, items grouped by vendor, shipping/tracking        | —          |
| VendorProducts    | /vendor/products     | Yes  | Vendor admin: list/manage own products with inventory and status                 | —          |
| VendorProductForm | /vendor/products/new | Yes  | Vendor admin: create/edit a product (images, pricing, variants, inventory)       | —          |
| VendorOrders      | /vendor/orders       | Yes  | Vendor admin: incoming orders for the vendor's products with fulfillment actions | —          |
| VendorPayouts     | /vendor/payouts      | Yes  | Vendor admin: payout history, balance, commission breakdown                      | —          |
| Notifications     | /notifications       | Yes  | Activity feed: new orders, reviews, payouts, vendor mentions                     | —          |
| VendorOnboarding  | /vendor/apply        | No   | Apply to sell on Vendry: business info, shop name, categories, payout method     | —          |

## App Constraints

- Dual perspective: buyer storefront + vendor admin
- Product cards emphasize vendor attribution
- Warm coral primary for buyer CTAs

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#d95030`
- Primary Hover: `#e06848`
- Primary Dark: `#b84228`
- Accent: `#2a9d8f`
- Accent Hover: `#3db0a2`
- Accent Dark: `#1f7a6e`
- Vendor: `#7c3aed`
- Vendor Hover: `#8b5cf6`
- Vendor Dark: `#6d28d9`

### Semantic

- Commission: `#7c3aed`
- Commission Light: `#ede9fe`
- Payout: `#16a34a`
- Payout Light: `#dcfce7`
- Pending Payout: `#f59e0b`
- Pending Payout Light: `#fef3c7`
- Suspended: `#dc2626`
- Suspended Light: `#fee2e2`
- Featured: `#d95030`
- Featured Light: `#fde8e3`
- In Stock: `#16a34a`
- Low Stock: `#f59e0b`
- Out of Stock: `#6b7280`
- Sale: `#dc2626`
- Sale Light: `#fee2e2`
- Verified Vendor: `#2a9d8f`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf9f7`
- Surface Warm: `#fdf6f3`
- Vendor Panel: `#f5f3ff`
- Admin Panel: `#faf9f7`
- Cart Drawer: `#ffffff`

### Text

- Price: `#1a1a1a`
- Price Sale: `#dc2626`
- Price Original: `#9ca3af`
- Vendor Name: `#7c3aed`
- Commission Rate: `#7c3aed`
- Link: `#d95030`
- Link Hover: `#b84228`

### Borders

- Vendor Card: `#e9e5ff`
- Product Card: `#e8e4e0`

### Dark Theme Overrides

- Primary: `#f07058`
- Accent: `#5eead4`
- Vendor: `#a78bfa`
- Background: `#121010`
- Surface: `#1e1c1a`
- Surface Secondary: `#2a2826`
- Surface Warm: `#261e1a`
- Vendor Panel: `#1e1a2e`
- Text Primary: `#f5f0eb`
- Text Secondary: `#a8a29e`
- Border Primary: `#3a3632`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Price: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Weights

- Vendor Name: `600`
- Price Current: `700`
- Commission Label: `500`
- Dashboard Stat: `700`

## Layout

- Content Max Width: `1400px`
- Product Grid Columns: `4` (desktop), `3` (tablet), `2` (mobile)
- Product Grid Gap: `20px`
- Vendor Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Vendor Grid Gap: `24px`
- Sidebar Width: `280px` (collapsed: `68px`)
- Top Bar Height: `60px`
- Cart Drawer Width: `420px`
- Vendor Panel Width: `320px`
- Dashboard Stats Row: `4` columns, gap `16px`

## Components

### Product Listing Card

- Border radius: `10px`
- Border: `1px solid` product-card border
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `4:5`
- Padding: `0` (image flush) + `14px` (content area)
- Vendor tag: small pill below image with vendor name in vendor color, font size `xs`, font weight `500`
- Sale badge: `#dc2626` background, white bold text, top-left absolute, border radius `0 0 8px 0`
- Favorite icon: top-right absolute, `32px` hit area, heart outline, filled on active in primary color

### Vendor Card

- Border radius: `12px`
- Border: `1px solid` vendor-card border
- Background: surface, hover: vendor-panel
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Avatar: `56px` circle, top-left
- Verified badge: accent color checkmark, `18px`, overlapping avatar bottom-right
- Stats row: products count | rating | total sales — font size `sm`, secondary text
- Follow button: outline variant, vendor color, border radius `full`

### Vendor Dashboard Stats Card

- Border radius: `12px`
- Background: surface
- Border: `1px solid` border-primary
- Padding: `20px`
- Label: font size `sm`, secondary text, font weight `400`
- Value: font size `2xl`, font weight `700`, primary text
- Trend indicator: `sm` font, inline arrow + percentage, green for positive, red for negative

### Commission Badge

- Border radius: `full`
- Background: commission-light
- Text color: commission
- Padding: `2px 10px`
- Font size: `xs`
- Font weight: `600`
- Format: "15% commission"

### Payout Status Badge

- Border radius: `full`
- Padding: `4px 12px`
- Font size: `xs`
- Font weight: `600`
- Variants:
  - Paid: payout background, white text
  - Pending: pending-payout-light background, pending-payout text
  - Processing: info-light background, info text
  - Failed: suspended-light background, suspended text

### Order Table

- Header background: surface-secondary
- Header font weight: `600`, font size `sm`
- Row hover: surface-warm
- Cell padding: `14px 16px`
- Border: `1px solid` border-primary between rows
- Status cell: uses payout status badge styling
- Vendor cell: vendor name in vendor color, font weight `500`
- Amount cell: tabular-nums, font weight `600`, right-aligned

### Star Rating

- Star size: `16px` (inline), `20px` (detail page)
- Filled color: `#f59e0b`
- Half-filled: gradient split at 50%
- Empty color: `#d4d0cc`
- Review count: `sm` font, secondary text, parenthesized

### Search Bar

- Border radius: `full`
- Height: `48px`
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Background: surface
- Left icon: magnifying glass, `20px`, secondary text color
- Category dropdown: right-side pill, border-left separator, accent text on hover
- Shadow: `sm` on focus

### Category Navigation

- Horizontal scrollable row on mobile
- Icon + label per category, `14px` icon, `sm` font
- Active: primary color text + `2px` bottom border in primary
- Inactive: secondary text, hover: primary text
- Spacing: `24px` between items

### Vendor Sidebar Panel

- Width: `320px`
- Background: vendor-panel
- Border-left: `3px solid` vendor color
- Padding: `24px`
- Sections: profile, stats, recent orders, payout summary
- Section divider: `1px solid` vendor-card border, `20px` vertical margin

### Add to Cart Button

- Border radius: `8px`
- Height: `48px`
- Font weight: `600`
- Font size: `base`
- Background: primary
- Full width on product detail page
- Disabled state: `0.5` opacity, no pointer events

### Notification Badge

- Size: `20px` circle
- Background: primary
- Text: white, `xs` font, `700` weight
- Position: top-right of bell icon, offset `-4px` both axes
- Pulse animation on new notification: `1s ease` infinite subtle scale
