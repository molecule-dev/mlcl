# DESIGN.md — Property Listing

## Brand Identity

- **App Name:** PropertyHub
- **Tagline:** Find your perfect home
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0284c7`
- Primary Hover: `#38bdf8`
- Primary Dark: `#0369a1`

### Semantic

- For Sale: `#0284c7`
- For Rent: `#8b5cf6`
- Sold: `#dc2626`
- New Listing: `#16a34a`
- Price Drop: `#f59e0b`
- Featured: `#f59e0b`

### Backgrounds

- Primary: `#f0f9ff`
- Surface: `#ffffff`
- Surface Secondary: `#f7fafc`
- Map Overlay: `rgba(255, 255, 255, 0.95)`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Price: `#0f172a`, weight `700`
- Link: `#0284c7`
- Link Hover: `#0369a1`

### Dark Theme Overrides

- Primary: `#38bdf8`
- Background: `#0c1929`
- Surface: `#1a2a3e`

## Typography

### Font Families

- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `-apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Property Price: `xl` (20px), weight `700`
- Property Address: `base` (16px)
- Property Details: `sm` (14px)

## Layout

- Content Max Width: `1400px`
- Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Grid Gap: `24px`
- Map Split: `50%` list / `50%` map (desktop)
- Map Min Height: `400px` (mobile, stacked)
- Gallery Thumbnail Size: `80px`

## Components

### Property Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image: `16:9` aspect ratio, carousel dots overlay
- Padding: `0` (image flush) + `16px` (content)
- Favorite heart: top-right, `32px` circle, white background
- Type badge: top-left, pill, status color

### Image Gallery

- Main image: `4:3` aspect ratio, border radius `12px`
- Thumbnail strip: `80px` squares, `8px` gap, `4px` radius
- Lightbox: full screen, `z-index` modal, swipe navigation

### Map Pin

- Size: `32px` height
- Color: primary (default), sale/rent/sold by status
- Selected: `1.3x` scale, shadow `lg`
- Cluster: `40px` circle, primary background, inverse text count

### Detail Specs Row

- Icon size: `20px`, secondary color
- Label: `sm` font, secondary text
- Value: `sm` font, primary text, `600` weight
- Separator: `1px solid` border-primary
- Items: beds, baths, sqft, lot size, year built

### Price History Chart

- Height: `200px`
- Line: `2px solid` primary
- Fill: primary at `0.1` opacity
- Points: `6px` circles, primary
- Axis labels: `xs` font, secondary text
