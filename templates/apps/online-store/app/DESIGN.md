# DESIGN.md — Online Store

## Brand Identity

- **App Name:** Bazaar
- **Tagline:** Curating the finest digital experiences
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#16a34a`
- Primary Hover: `#22c55e`
- Primary Dark: `#15803d`
- Accent: `#f59e0b`
- Accent Hover: `#fbbf24`
- Accent Dark: `#d97706`

### Semantic

- Sale: `#dc2626`
- Sale Light: `#fee2e2`
- In Stock: `#16a34a`
- Low Stock: `#f59e0b`
- Out of Stock: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f9fafb`
- Cart Drawer: `#ffffff`

### Text

- Price: `#111827`
- Price Sale: `#dc2626`
- Price Original: `#9ca3af` (strikethrough)
- Link: `#16a34a`
- Link Hover: `#15803d`

### Dark Theme Overrides

- Primary: `#4ade80`
- Accent: `#fbbf24`
- Background: `#0f172a`
- Surface: `#1e293b`

## Typography

### Font Families

- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Price: `"Tabular Nums", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1280px`
- Product Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Product Grid Gap: `24px`
- Sidebar Filter Width: `260px`
- Cart Drawer Width: `400px`

## Components

### Product Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `1:1`
- Padding: `0` (image flush) + `16px` (content)
- Sale badge: accent background, bold white text, top-right absolute

### Add to Cart Button

- Border radius: `8px` (md)
- Height: `48px` (lg)
- Font weight: `600`
- Background: primary
- Full width on product detail page

### Price Display

- Current price font weight: `700`
- Sale price color: sale
- Original price: strikethrough, muted

### Star Rating

- Star size: `16px`
- Filled color: `#f59e0b` (accent)
- Empty color: `#d1d5db`

### Filter Sidebar

- Checkbox style: rounded `4px`
- Section spacing: `24px`
- Collapsible sections with `8px` icon
