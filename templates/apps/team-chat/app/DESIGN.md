# DESIGN.md — Team Chat

## Brand Identity

- **App Name:** Pulse
- **Tagline:** Stay connected
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`

### Semantic

- Online: `#22c55e`
- Away: `#f59e0b`
- Busy: `#ef4444`
- Offline: `#9ca3af`
- Mention: `#fef3c7`
- Unread: `#7c3aed`

### Backgrounds

- Primary: `#f5f3ff`
- Surface: `#ffffff`
- Surface Secondary: `#faf8ff`
- Own Message: `#ede9fe`
- Other Message: `#f3f4f6`

### Text

- Primary: `#1c1917`
- Secondary: `#6b7280`
- Timestamp: `#9ca3af`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Background: `#0c0a1a`
- Surface: `#1a1730`
- Own Message: `#2e1065`
- Other Message: `#27272a`

## Typography

### Font Families

- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Sizes

- Message Body: `sm` (14px)
- Timestamp: `xs` (12px)
- Channel Name: `base` (16px), weight `600`

## Spacing

Compact message spacing:

- Message Group Gap: `4px` (same author, within 5 min)
- Message Block Gap: `16px` (different author or time break)
- Message Padding: `4px 16px`

## Layout

- Channel Sidebar Width: `260px` (collapsed: `0`)
- Member Panel Width: `240px`
- Message Input Min Height: `44px`
- Message Input Max Height: `200px`
- Thread Panel Width: `400px`

## Components

### Message Bubble

- Border radius: `12px` (lg), `4px` top-left for own messages
- Padding: `8px 12px`
- Max width: `65%`
- Reactions bar: below message, `4px` gap

### Channel Item

- Padding: `6px 12px`
- Border radius: `6px`
- Active: primary with `0.1` opacity background
- Unread: `600` weight, unread dot `8px`

### Avatar

- Sizes: `24px` (inline), `32px` (message), `40px` (profile)
- Radius: `full` (9999px)
- Status dot: `10px`, bottom-right, `2px` white border

### Reaction Chip

- Border radius: `full` (pill)
- Padding: `2px 6px`
- Font size: `xs` (12px)
- Border: `1px solid` border-primary
- Own reaction: primary light background

### Typing Indicator

- Three dots animation: `300ms` stagger
- Dot size: `6px`
- Color: secondary text
