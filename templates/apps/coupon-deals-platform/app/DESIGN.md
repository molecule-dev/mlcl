# DESIGN.md — Coupon/Deals Platform

## Brand Identity

- **App Name:** Snagr
- **Tagline:** Grab it before it's gone
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Energetic, playful, urgent, rewarding

## Target Persona

Deal-hunters and everyday shoppers who want to discover local and online promotions, track savings, and redeem coupons before they expire.

## Screens

| Name           | Route            | Auth | Purpose                                                                      | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home highlighting hot deals and categories                         | —          |
| Login          | /login           | No   | Sign in                                                                      | —          |
| Signup         | /signup          | No   | Create account                                                               | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                             | Login      |
| Deals          | /deals           | Yes  | Grid of active deals with filter sidebar                                     | —          |
| DealDetail     | /deals/:id       | Yes  | Detail view with coupon code, QR, merchant info                              | —          |
| Merchants      | /merchants       | Yes  | Browse participating merchants                                               | —          |
| MyCoupons      | /my-coupons      | Yes  | Saved, redeemed, and expired coupons                                         | —          |
| NearMe         | /near-me         | Yes  | Split map + deal list view                                                   | —          |
| Dashboard      | /dashboard       | Yes  | Savings stats, recent activity, trending deals                               | —          |
| Settings       | /settings        | Yes  | Account, notifications, preferences                                          | —          |
| MerchantDetail | /merchants/:id   | Yes  | Merchant profile with active deals, ratings, hours, location                 | —          |
| Notifications  | /notifications   | Yes  | Activity feed of deal alerts, expiry warnings, redemptions, merchant updates | —          |

## App Constraints

- Deal cards feature a scissor-cut dashed bottom edge and a savings badge in the accent green
- Hot deal/expiring badges use `#e8501c` / `#e0a020` with a subtle pulse when < 24h remain
- Coupon code blocks always use the monospace family with 2px letter-spacing and a copy button

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e8501c`
- Primary Hover: `#f06830`
- Primary Dark: `#c43d10`
- Accent: `#0cba6a`
- Accent Hover: `#10d87a`
- Accent Dark: `#099e58`

### Semantic

- Hot Deal: `#e8501c`
- Hot Deal Light: `#fde8e0`
- Expiring Soon: `#e0a020`
- Expiring Soon Light: `#fef5d4`
- Redeemed: `#0cba6a`
- Redeemed Light: `#d4f8e8`
- Expired: `#8c8c8c`
- Expired Light: `#f0f0f0`
- Savings: `#0cba6a`
- Merchant Verified: `#2563eb`
- Merchant Verified Light: `#dbeafe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f6`
- Deal Card: `#ffffff`
- Coupon Strip: `#fff7ed`

### Text

- Price: `#1a1a1a`
- Price Original: `#a0a0a0` (strikethrough)
- Price Deal: `#e8501c`
- Savings Badge: `#ffffff`
- Discount Percent: `#e8501c`
- Link: `#e8501c`
- Link Hover: `#c43d10`

### Borders

- Deal Card: `#f0ebe5`
- Coupon Dashed: `#d0c8be`

### Dark Theme Overrides

- Primary: `#f06830`
- Accent: `#34d886`
- Background: `#12100e`
- Surface: `#1e1b18`
- Surface Secondary: `#2a2622`
- Text Primary: `#f5f0eb`
- Text Secondary: `#b0a898`
- Border Primary: `#3a3530`
- Coupon Strip: `#2a2218`
- Deal Card: `#1e1b18`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code (redemption codes): `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`
- Price: `"DM Sans", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1320px`
- Deal Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Deal Grid Gap: `20px`
- Sidebar Filter Width: `280px`
- Map Panel Width: `45%` (split view)
- Dashboard Stat Columns: `4` (desktop), `2` (mobile)

## Components

### Deal Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md` with `translateY(-2px)` lift
- Image aspect ratio: `16:9`
- Padding: `0` (image flush) + `16px` (content area)
- Discount badge: hot-deal background, bold white text, `14px`, top-left absolute, border-radius `full`
- Expiry ribbon: bottom of image, semi-transparent dark overlay, white text, countdown timer
- Merchant logo: `32px` circle, bottom-right of image, `2px` white border, overlap into content
- Dashed coupon border: `1px dashed` coupon-dashed along bottom edge (scissor-cut effect via CSS)

### Coupon Code Block

- Background: coupon-strip
- Border: `1px dashed` coupon-dashed
- Border radius: `8px` (md)
- Padding: `12px 16px`
- Font: code family, `16px`, `600` weight, letter-spacing `2px`
- Copy button: ghost variant, primary color, right-aligned
- QR code: `120px` square, centered below code on detail view

### Savings Badge

- Background: accent
- Border radius: `full`
- Padding: `4px 12px`
- Font: `12px`, `700` weight, white text
- Format: "Save $X" or "XX% OFF"

### Expiry Timer

- Font: code family, tabular-nums
- Urgent (< 24h): hot-deal color, pulse animation (`1s ease-in-out infinite`)
- Warning (< 72h): expiring-soon color
- Normal: text-secondary
- Format: `2d 14h 32m` or `14:32:05` when < 24h

### Merchant Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Logo: `48px` circle
- Verified badge: merchant-verified color, `16px` checkmark icon, absolute top-right of logo
- Deal count: badge, secondary background
- Rating: star display (see below)

### Star Rating

- Star size: `14px`
- Filled color: `#f0a020`
- Half-filled: gradient mask
- Empty color: `#d8d0c8`

### Category Chips

- Border radius: `full`
- Padding: `6px 14px`
- Font: `13px`, `500` weight
- Default: secondary background, text-primary
- Active: primary background, white text
- Icon: `16px` emoji or icon, left of label

### Map Pin (Deals Near Me)

- Size: `36px` circle
- Background: primary
- Border: `3px solid white`
- Shadow: `md`
- Active/selected: accent background, scale `1.2`
- Cluster: `44px` circle, primary-dark, white count text, `700` weight

### Redemption Status

- Pending: expiring-soon color, dashed border
- Redeemed: redeemed color, solid border, checkmark icon
- Expired: expired color, solid border, cross icon
- QR verified: accent background, white checkmark overlay

### Dashboard Stats Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Value font: `28px`, `700` weight
- Label font: `13px`, `500` weight, text-secondary
- Trend arrow: accent (up/positive), hot-deal (down/negative), `12px`
- Sparkline: `60px` height, primary stroke `2px`, no fill

### Filter Sidebar

- Section spacing: `20px`
- Checkbox: rounded `4px`, primary color when checked
- Price range: dual-thumb slider, primary track color
- Distance radius: single slider, primary track, value label above thumb
- Category sections: collapsible with `8px` chevron icon
- "Clear all" link: text-secondary, bottom of sidebar

### Notification Bell

- Icon size: `20px`
- Badge: hot-deal background, white text, `10px`, `full` radius, top-right offset
- Dropdown width: `360px`
- Deal expiry alerts: expiring-soon left border accent
- New deal alerts: primary left border accent
- Redeemed confirmations: redeemed left border accent
