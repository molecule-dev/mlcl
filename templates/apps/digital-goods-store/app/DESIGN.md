# DESIGN.md — Digital Goods Store

## Brand Identity

- **App Name:** Trove
- **Tagline:** Your creations, delivered instantly
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, confident, indie-maker-friendly, transactional

## Target Persona

Independent creators and small studios selling digital products (templates, ebooks, plugins, fonts, tutorials) who want a fast, branded storefront with delightful checkout and clear revenue dashboards.

## Screens

| Name            | Route              | Auth | Purpose                                                                                                  | deriveFrom |
| --------------- | ------------------ | ---- | -------------------------------------------------------------------------------------------------------- | ---------- |
| Landing         | /                  | No   | Marketing home with value props and signup CTA                                                           | —          |
| Storefront      | /shop              | No   | Public product catalog with featured products                                                            | —          |
| ProductDetail   | /shop/:slug        | No   | Single product page with previews and Buy CTA                                                            | —          |
| Login           | /login             | No   | Sign in                                                                                                  | —          |
| Signup          | /signup            | No   | Create account                                                                                           | Login      |
| ForgotPassword  | /forgot-password   | No   | Request reset                                                                                            | Login      |
| ResetPassword   | /reset-password    | No   | Set new password                                                                                         | Login      |
| Dashboard       | /dashboard         | Yes  | Revenue stats, recent sales, downloads                                                                   | —          |
| Products        | /products          | Yes  | Manage product catalog with upload/edit                                                                  | —          |
| Sales           | /sales             | Yes  | Orders, refunds, license keys, customer list                                                             | —          |
| Settings        | /settings          | Yes  | Storefront branding, payments, account                                                                   | —          |
| Cart            | /cart              | No   | Public shopping cart with line items, coupon, sticky order summary                                       | —          |
| Checkout        | /checkout          | No   | Single-page secure checkout — billing details, payment, order review                                     | —          |
| OrderConfirm    | /order/:id/confirm | No   | Post-purchase success — instant downloads + license keys + receipt summary                               | —          |
| CustomerLibrary | /library           | Yes  | Buyer's personal library of purchased digital products with re-download + license keys + version updates | —          |
| OrderHistory    | /orders            | Yes  | Buyer's chronological list of past orders with receipts, status, download-all per order                  | —          |
| ProductEditor   | /products/:id/edit | Yes  | Creator-facing form to upload/edit a digital product — files, cover, pricing model, license, visibility  | —          |

## App Constraints

- Prices must use tabular-nums and the warm brand orange `#e05a2d` for primary CTAs
- License keys always render in the JetBrains Mono font with the violet license color `#7c3aed`
- Product cards lift on hover (`translateY(-2px)`) — never use a plain border-only state

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e05a2d`
- Primary Hover: `#f06b3e`
- Primary Dark: `#c24a22`
- Accent: `#7c3aed`
- Accent Hover: `#8b5cf6`
- Accent Dark: `#6d28d9`

### Semantic

- Revenue: `#16a34a`
- Revenue Light: `#dcfce7`
- Refund: `#dc2626`
- Refund Light: `#fee2e2`
- Licensed: `#0d9488`
- Licensed Light: `#ccfbf1`
- Expired: `#9ca3af`
- Download Ready: `#e05a2d`
- Download Ready Light: `#fff1ec`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf9f7`
- Dashboard Panel: `#fffbf8`
- Code Block: `#1e1e2e`

### Text

- Price: `#1a1a1a`
- Price Discounted: `#dc2626`
- Price Original: `#9ca3af` (strikethrough)
- Revenue Positive: `#16a34a`
- Revenue Negative: `#dc2626`
- Link: `#e05a2d`
- Link Hover: `#c24a22`
- License Key: `#7c3aed`

### Borders

- Primary: `#e8e4df`
- Focus: `#e05a2d`

### Dark Theme Overrides

- Primary: `#f48c6a`
- Accent: `#a78bfa`
- Background: `#12100e`
- Surface: `#1c1917`
- Surface Secondary: `#292524`
- Dashboard Panel: `#1c1917`
- Text Primary: `#fafaf9`
- Text Secondary: `#a8a29e`
- Border Primary: `#44403c`
- Revenue Positive: `#4ade80`
- License Key: `#c4b5fd`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Price: `-apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Product Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Product Grid Gap: `24px`
- Checkout Max Width: `640px`
- Analytics Chart Height: `320px`

## Components

### Product Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md` with `translateY(-2px)` lift
- Cover image aspect ratio: `16:10`
- Padding: `0` (image flush) + `20px` (content area)
- Price font size: `xl` (20px), weight: `700`
- File type badge: `6px` radius, muted background, mono font, `xs` size
- Hover transition: `300ms ease` (normal)

### License Key Display

- Font family: mono
- Font size: `sm` (14px)
- Background: code-block background
- Text color: license-key color
- Padding: `12px 16px`
- Border radius: `8px` (md)
- Copy button: ghost variant, inline right-aligned
- Format: display as `XXXX-XXXX-XXXX-XXXX` with letter-spacing `0.05em`

### Download Button

- Border radius: `8px` (md)
- Height: `48px` (lg)
- Font weight: `600`
- Background: primary
- Icon: download arrow, `20px`, left of label
- Progress state: animated striped gradient overlay during download

### Revenue Stat Card

- Border radius: `12px` (lg)
- Background: dashboard-panel
- Padding: `24px`
- Label: `sm` (14px), text-secondary, weight `500`
- Value: `3xl` (30px), weight `700`, tabular-nums
- Trend indicator: `sm` (14px), revenue-positive or revenue-negative with up/down arrow
- Sparkline height: `48px`, stroke: primary, fill: primary at 10% opacity

### Analytics Chart

- Border radius: `12px` (lg)
- Background: surface
- Padding: `24px`
- Axis labels: `xs` (12px), text-secondary
- Grid lines: `1px dashed` border-primary at 50% opacity
- Tooltip: `8px` radius, shadow `lg`, padding `12px`
- Line stroke width: `2px`
- Area fill: primary at 8% opacity

### File Upload Zone

- Border radius: `12px` (lg)
- Border: `2px dashed` border-primary
- Active/drag border: `2px dashed` primary
- Background: surface-secondary, active: download-ready-light
- Padding: `48px`
- Icon size: `48px`, text-secondary
- Text: `base` (16px), text-secondary
- Max file size label: `sm` (14px), text-tertiary

### Pricing Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `sm` (14px), weight `600`
- Free: `#0d9488` text on licensed-light background
- Paid: primary text on download-ready-light background
- Pay What You Want: accent text on `#f3f0ff` background

### Sales Table

- Header background: surface-secondary
- Row hover: `#fffbf8` (dashboard-panel)
- Border: `1px solid` border-primary
- Cell padding: `14px 16px`
- Status badges: licensed (teal), refund (red), expired (gray) pill badges
- Revenue column: tabular-nums, right-aligned, weight `600`
- Customer avatar: `32px` circle, border `2px solid` surface

### Search Bar

- Border radius: `9999px` (pill)
- Height: `44px`
- Background: surface-secondary
- Border: `1px solid transparent`, focus: `2px solid` primary
- Padding: `8px 20px 8px 44px` (icon inset)
- Search icon: `20px`, text-secondary
- Placeholder: text-secondary, `sm` (14px)

### Notification Toast

- Border radius: `12px` (lg)
- Shadow: `lg`
- Padding: `16px 20px`
- Sale notification: left border `4px solid` revenue color, includes product thumbnail `40px` square
- Download notification: left border `4px solid` primary
- Auto-dismiss: `5000ms`
