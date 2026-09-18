# DESIGN.md — Price Comparison

## Brand Identity

- **App Name:** Bargain
- **Tagline:** Never overpay again
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Savvy, sharp, practical, trustworthy

## Target Persona

Deal-hunters and shoppers who want to compare product prices across retailers and get alerted to drops.

## Screens

| Name           | Route                 | Auth | Purpose                                                                 | deriveFrom |
| -------------- | --------------------- | ---- | ----------------------------------------------------------------------- | ---------- |
| Landing        | /                     | No   | Marketing home with search CTA                                          | —          |
| Login          | /login                | No   | Sign in                                                                 | —          |
| Signup         | /signup               | No   | Create account                                                          | Login      |
| ForgotPassword | /forgot-password      | No   | Request reset                                                           | Login      |
| ResetPassword  | /reset-password       | No   | Set new password                                                        | Login      |
| Search         | /search               | Yes  | Product search results grid                                             | —          |
| ProductDetail  | /products/:id         | Yes  | Single product with retailer price comparison and history chart         | —          |
| Alerts         | /alerts               | Yes  | Price alerts list                                                       | —          |
| Deals          | /deals                | Yes  | Trending deals feed                                                     | —          |
| Watchlist      | /watchlist            | Yes  | Watched products grid                                                   | —          |
| Settings       | /settings             | Yes  | Account, notifications, preferences                                     | —          |
| Dashboard      | /dashboard            | Yes  | Logged-in home — savings summary, recent drops, watchlist trending      | —          |
| AlertDetail    | /alerts/:id           | Yes  | Single alert config — target, retailers, notification channels, history | —          |
| Notifications  | /notifications        | Yes  | Activity feed — price drops, back-in-stock, alerts triggered, deals     | —          |
| Categories     | /categories           | Yes  | Browse-by-category hub — featured collections, category tiles, trending | —          |
| PriceHistory   | /products/:id/history | Yes  | Full deep-dive on a product's price history across retailers and time   | —          |
| Profile        | /profile              | Yes  | Public profile — savings achievements, public watchlist, share card     | —          |
| Billing        | /settings/billing     | Yes  | Subscription/Pro tier management — plans, payment, invoices             | —          |

## App Constraints

- Price values use tabular-nums for clean column alignment across retailer rows
- Price drop % highlighted with accent green; price rise with red
- Savings badge "SAVE $X" uses accent color and bold weight

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e05a2b`
- Primary Hover: `#f06d3f`
- Primary Dark: `#c04a20`
- Accent: `#1a9960`
- Accent Hover: `#22b874`
- Accent Dark: `#14804e`

### Semantic

- Price Drop: `#1a9960`
- Price Drop Light: `#d1fae5`
- Price Rise: `#dc2626`
- Price Rise Light: `#fee2e2`
- Best Price: `#e05a2b`
- Best Price Light: `#fff1eb`
- Alert Active: `#7c3aed`
- Alert Active Light: `#ede9fe`
- Expired Deal: `#9ca3af`
- In Stock: `#1a9960`
- Out of Stock: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f7`
- Comparison Tray: `#ffffff`
- Price History: `#fefcfb`

### Text

- Price: `#1a1a1a`
- Price Best: `#e05a2b`
- Price Savings: `#1a9960`
- Price Strikethrough: `#9ca3af`
- Retailer: `#555555`
- Link: `#e05a2b`
- Link Hover: `#c04a20`

### Dark Theme Overrides

- Primary: `#f06d3f`
- Accent: `#34d399`
- Background: `#0c0a09`
- Surface: `#1c1917`
- Surface Secondary: `#292524`
- Text Primary: `#fafaf9`
- Text Secondary: `#a8a29e`
- Border Primary: `#44403c`
- Price History: `#1c1917`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

## Layout

- Content Max Width: `1360px`
- Product Grid Columns: `4` (desktop), `3` (laptop), `2` (tablet), `1` (mobile)
- Product Grid Gap: `20px`
- Sidebar Filter Width: `280px`
- Comparison Tray Height: `80px` (collapsed), `400px` (expanded)
- Price History Chart Height: `280px`
- Dashboard Widget Min Width: `320px`

## Components

### Product Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `1:1`
- Padding: `0` (image flush) + `16px` (content area)
- Best price badge: primary background, bold white text, `border-radius: 9999px`, top-left absolute
- Price drop indicator: accent color, downward arrow icon, `font-weight: 700`
- Retailer count: secondary text, bottom of card, `font-size: sm`
- Hover: lift `translateY(-2px)`, shadow transition `150ms ease`

### Price Comparison Table

- Border radius: `12px` (lg) on container
- Row height: `64px`
- Retailer logo: `32px` height, left-aligned with `12px` gap to name
- Price column: right-aligned, `font-weight: 700`, `font-size: lg`
- Best price row: `best-price-light` background, `2px` left border in primary
- Shipping info: secondary text, `font-size: xs`, below price
- Row hover: surface-secondary background

### Price History Chart

- Line color: primary
- Fill: primary at `0.08` opacity
- Axis labels: secondary text, `font-size: xs`
- Tooltip: surface background, `shadow: lg`, `border-radius: 8px`, `padding: 8px 12px`
- Low point marker: accent color, `8px` circle
- High point marker: price-rise color, `8px` circle
- Grid lines: `border-primary` at `0.5` opacity

### Price Alert Card

- Border radius: `8px` (md)
- Border-left: `4px solid` alert-active
- Padding: `12px 16px`
- Target price: `font-weight: 700`, accent color when reached
- Current price: secondary text, `font-size: sm`
- Toggle switch: primary color when active

### Drop Alert Badge

- Border radius: `9999px` (pill)
- Padding: `4px 10px`
- Background: `price-drop-light`
- Text: `price-drop` color, `font-weight: 600`, `font-size: xs`
- Icon: downward arrow, `12px`
- Format: `-$XX` or `-XX%`

### Search Bar

- Border radius: `12px` (lg)
- Height: `48px`
- Shadow: `sm`, focus: `md`
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Padding: `8px 16px 8px 44px` (icon space)
- Search icon: `20px`, secondary color
- Placeholder: `"Search products, brands, or categories..."`
- Autocomplete dropdown: surface background, `shadow: lg`, `border-radius: 12px`, `max-height: 400px`

### Retailer Badge

- Border radius: `6px`
- Padding: `4px 8px`
- Border: `1px solid` border-primary
- Logo: `20px` height
- Font size: `xs`
- Font weight: `500`

### Savings Summary

- Border radius: `12px` (lg)
- Background: `accent` at `0.06` opacity
- Border: `1px solid` accent at `0.2` opacity
- Padding: `20px`
- Savings amount: accent color, `font-size: 2xl`, `font-weight: 700`
- Label: secondary text, `font-size: sm`

### Dashboard Stat Widget

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Value: `font-size: 2xl`, `font-weight: 700`
- Label: secondary text, `font-size: sm`, `margin-top: 4px`
- Trend indicator: accent for positive, price-rise for negative, `font-size: xs`, `font-weight: 600`

### Notification Toast

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Price drop: accent left border, accent icon
- Alert triggered: alert-active left border
- Back in stock: primary left border
- Auto-dismiss: `5000ms`
