# DESIGN.md — CRM

## Brand Identity

- **App Name:** Pipeline
- **Tagline:** Close more deals
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#1d4ed8`
- Primary Dark: `#1e40af`

### Semantic

- Won: `#16a34a`
- Lost: `#dc2626`
- Pending: `#f59e0b`
- Qualified: `#2563eb`
- Contacted: `#0891b2`

### Backgrounds

- Primary: `#f8f9fc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f3f9`
- Dashboard Card: `#ffffff`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Background: `#0f0e1a`
- Surface: `#1e1b3a`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Data: `"Inter", sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Metric Value: `2xl` (24px)
- Metric Label: `xs` (12px)

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Table Min Width: `1024px`

## Components

### Metric Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Shadow: `sm`
- Trend indicator: success (up arrow) or error (down arrow), `xs` font

### Pipeline Column

- Border radius: `8px` (md)
- Background: surface-secondary
- Header: `600` weight, column total in secondary text
- Card gap: `8px`
- Drop zone highlight: `2px dashed` primary

### Deal Card

- Border radius: `8px` (md)
- Padding: `12px`
- Shadow: `sm`
- Left border: `3px solid` stage color
- Contact avatar: `32px`, radius full

### Data Table

- Header: `600` weight, `xs` font, uppercase, secondary text
- Row height: `48px`
- Hover: surface-secondary
- Sortable column indicator: `12px` chevron icon

### Activity Timeline

- Line: `2px solid` border-primary
- Dot size: `10px`, primary background
- Timestamp: `xs` font, secondary text
