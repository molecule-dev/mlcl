# DESIGN.md — Helpdesk

## Brand Identity

- **App Name:** Resolve
- **Tagline:** Support made simple
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#ea580c`
- Primary Hover: `#f97316`
- Primary Dark: `#c2410c`

### Semantic

- Open: `#ea580c`
- In Progress: `#0891b2`
- Waiting: `#f59e0b`
- Resolved: `#16a34a`
- Closed: `#6b7280`
- Critical: `#dc2626`
- High: `#ea580c`
- Medium: `#f59e0b`
- Low: `#6b7280`

### Backgrounds

- Primary: `#fff7ed`
- Surface: `#ffffff`
- Surface Secondary: `#faf5f0`
- Ticket Detail: `#ffffff`
- Internal Note: `#fef9c3`

### Text

- Primary: `#1c1917`
- Secondary: `#78716c`
- SLA Warning: `#dc2626`
- Link: `#ea580c`
- Link Hover: `#c2410c`

### Dark Theme Overrides

- Primary: `#fb923c`
- Background: `#1a120c`
- Surface: `#292018`
- Internal Note: `#422006`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Font Sizes

- Ticket Subject: `base` (16px), weight `600`
- Ticket ID: `xs` (12px), `mono` font, secondary text

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Ticket Detail Panel: `60%` of viewport
- Ticket List Panel: `40%` of viewport
- Conversation Max Width: `800px`

## Components

### Ticket Row

- Height: `56px`
- Padding: `8px 16px`
- Border left: `3px solid` status color
- Hover: surface-secondary
- Unread: `600` weight title
- SLA indicator: `xs` font, warning color when breaching

### Status Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px), weight `500`
- Background: status color at `0.1` opacity
- Text: status color

### Priority Icon

- Size: `16px`
- Critical: filled red circle
- High: up arrow, orange
- Medium: dash, amber
- Low: down arrow, gray

### Conversation Message

- Border radius: `8px` (md)
- Padding: `16px`
- Agent: surface-secondary background
- Customer: surface background, border left `3px solid` primary
- Internal note: internal-note background, dashed border
- Timestamp: `xs` font, secondary text

### SLA Timer

- Font: `mono`, `sm` (14px)
- Normal: secondary text
- Warning (< 1hr): warning color
- Breached: error color, `600` weight
