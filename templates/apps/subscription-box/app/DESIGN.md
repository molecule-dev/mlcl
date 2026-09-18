# DESIGN.md — Subscription Box

## Brand Identity

- **App Name:** Trove
- **Tagline:** Unbox the unexpected
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, playful, anticipatory, crafted

## Target Persona

Subscribers who want curated surprise-and-delight boxes, with easy tier management, shipment tracking, and customization controls.

## Screens

| Name           | Route            | Auth | Purpose                                                                   | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Hero, box previews, tier tiers, CTA                                       | —          |
| Login          | /login           | No   | Sign in                                                                   | —          |
| Signup         | /signup          | No   | Create account                                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                          | Login      |
| Dashboard      | /dashboard       | Yes  | Active subscription, next box, stats                                      | —          |
| Boxes          | /boxes           | Yes  | Browse available box themes                                               | —          |
| BoxDetail      | /boxes/:id       | Yes  | Single box preview with items, retail value, and subscribe CTA            | —          |
| Customize      | /customize       | Yes  | Swap/exclude items, tier selector                                         | —          |
| Shipments      | /shipments       | Yes  | Shipment tracking timeline                                                | —          |
| Billing        | /billing         | Yes  | Active plan, payment method, invoice history, billing contact             | —          |
| Settings       | /settings        | Yes  | Profile, preferences, notifications, addresses, pause/cancel, danger zone | —          |

## App Constraints

- Tier selector must show monthly/annual toggle with savings badge on annual
- Box cards use 4:3 image with corner ribbon for New or Limited Edition
- Active subscription badge uses accent green; paused uses renewal-due amber

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e85d3a`
- Primary Hover: `#f27052`
- Primary Dark: `#c94a2e`
- Accent: `#2db87a`
- Accent Hover: `#3ed492`
- Accent Dark: `#249962`

### Semantic

- Active Subscription: `#2db87a`
- Paused Subscription: `#f0a030`
- Cancelled: `#9ca3af`
- Shipping: `#3b82f6`
- Delivered: `#2db87a`
- Processing: `#e85d3a`
- Renewal Due: `#e0a020`
- Out of Stock: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f6`
- Box Preview: `#fff7f4`
- Sidebar: `#fefcfb`

### Text

- Price: `#1a1a1a`
- Price Monthly: `#e85d3a`
- Price Annual: `#2db87a`
- Price Original: `#9ca3af` (strikethrough)
- Link: `#e85d3a`
- Link Hover: `#c94a2e`

### Borders

- Primary: `#ede4dd`
- Secondary: `#ddd3ca`
- Focus: `#e85d3a`

### Dark Theme Overrides

- Primary: `#f27052`
- Accent: `#3ed492`
- Background: `#141010`
- Surface: `#221c1a`
- Surface Secondary: `#2c2422`
- Text Primary: `#f5f0ed`
- Text Secondary: `#bfb3a8`
- Border Primary: `#3d3330`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Box Builder Panel Width: `420px`
- Top Bar Height: `60px`
- Box Preview Card Min Height: `320px`

## Components

### Box Card

- Border radius: `16px` (xl)
- Shadow: `0 2px 8px rgba(232, 93, 58, 0.08)`, hover: `0 8px 24px rgba(232, 93, 58, 0.14)`
- Image aspect ratio: `4:3`
- Padding: `0` (image flush) + `20px` (content area)
- Status badge: top-left absolute, `8px` inset, pill shape
- Active badge: accent background, white bold text
- Paused badge: renewal-due background, `#1a1a1a` bold text
- Corner ribbon for "New" or "Limited Edition": primary background, white text, rotated 45°

### Subscription Tier Selector

- Border radius: `12px` (lg)
- Border: `2px solid` border-primary, selected: `2px solid` primary
- Padding: `24px`
- Selected state: primary-tinted background (`rgba(232, 93, 58, 0.06)`), primary border
- Popular badge: primary background, white text, centered top overlap
- Hover: subtle shadow `sm`, border transitions to secondary

### Billing Toggle (Monthly / Annual)

- Pill container: `full` radius, border-primary background
- Active tab: primary background, white text, `full` radius
- Inactive tab: transparent, text-secondary
- Savings badge: accent background, white bold text, attached right of annual option
- Transition: `150ms ease`

### Shipment Tracker

- Vertical timeline layout, left-aligned dots connected by lines
- Active step dot: `12px`, primary solid
- Completed step dot: `10px`, accent solid with white checkmark
- Upcoming step dot: `10px`, border-primary outline
- Connecting line: `2px`, completed: accent, upcoming: border-primary dashed
- Step content: `16px` left of line, includes date (text-secondary, `sm`) and status (text-primary, `base`)

### Item Customization Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px`
- Thumbnail: `64px × 64px`, `8px` radius
- Swap button: ghost variant, primary text, icon-only on mobile
- Quantity stepper: `32px` height, `md` radius, inline flex
- "Excluded" state: `0.5` opacity, strikethrough item name, red outline

### Pricing Display

- Current price font weight: `700`
- Monthly price color: price-monthly
- Annual price color: price-annual
- Original price: strikethrough, muted
- Per-box breakdown: text-secondary, `sm` font
- Currency symbol: `600` weight, slightly smaller than amount

### Renewal Banner

- Border radius: `12px` (lg)
- Background: `rgba(232, 93, 58, 0.06)`
- Border-left: `4px solid` primary
- Padding: `16px 20px`
- Icon: calendar, primary color, `20px`
- CTA button: primary solid, right-aligned

### Box Preview Grid

- Grid: `2` columns (desktop), `1` column (mobile)
- Gap: `16px`
- Item card: `8px` radius, `1px` border, `12px` padding
- Item image: `48px × 48px`, `full` radius for circular crop
- Retail value: text-secondary with "Value:" label
- Total value bar: accent-tinted background, bold accent text

### Dashboard Stats Row

- Grid: `4` columns (desktop), `2` (tablet), `1` (mobile)
- Card padding: `20px`
- Card radius: `12px`
- Icon container: `40px × 40px`, `full` radius, tinted background matching stat type
- Stat value: `2xl` font, `700` weight
- Stat label: `sm` font, text-secondary
- Trend indicator: accent (up) or error (down), `sm` font with arrow icon

### Notification Toast (Shipment Updates)

- Border radius: `12px` (lg)
- Shadow: `lg`
- Padding: `16px`
- Left accent: `4px` solid, color matches notification type (shipping: blue, delivered: accent, renewal: primary)
- Auto-dismiss: `5000ms`
- Icon: `20px`, color matches accent
