# DESIGN.md — Blog

## Brand Identity

- **App Name:** Inkwell
- **Tagline:** Write. Publish. Grow.
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1a8917` (Medium green)
- Primary Hover: `#156d12`
- Primary Light: `#e6f5e6`

### Backgrounds

- Background: `#ffffff`
- Surface: `#fafafa`
- Surface Secondary: `#f2f2f2`

### Text

- Primary: `#292929`
- Secondary: `#757575`
- Tertiary: `#b3b3b3`

### Status

- Draft: `#f59e0b` (amber)
- Published: `#1a8917` (green)
- Scheduled: `#3b82f6` (blue)

### Dark Theme Overrides

- Primary: `#2ecc40`
- Background: `#121212`
- Surface: `#1e1e1e`
- Text: `#e0e0e0`
- Text Secondary: `#a0a0a0`
- Border: `#333333`

## Typography

### Font Families

- Body/Articles: `"Georgia", "Charter", "Bitstream Charter", "Cambria", serif`
- Headings/UI: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Line Heights

- Article Body: `1.75` (relaxed reading)
- Normal: `1.5`
- Tight (headings): `1.25`

## Layout

- Content Max Width: `680px` (article body)
- Wide Content Max Width: `960px` (dashboard, post list)
- Sidebar Width: `280px`
- Top Bar Height: `56px`
- Article Padding (desktop): `48px 0`
- Article Padding (mobile): `24px 16px`

## Components

### Article Card

- Border radius: `12px` (lg)
- Shadow: `sm` — subtle elevation
- Image aspect ratio: `16:9`
- Title font size: `xl` (20px), weight `700`, serif
- Excerpt line clamp: `3`

### Reading Progress Bar

- Height: `3px`
- Color: primary green
- Position: fixed top, z-index `1100`

### Table of Contents

- Font size: `sm` (14px)
- Active item: primary color, left border `2px solid` primary
- Sticky offset: `80px`

### Author Block

- Avatar size: `48px`, radius: `full`
- Layout: inline — avatar, name, date, reading time

### Tags

- Border radius: `full` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Background: surface-secondary
- Hover: primary with inverse text

### Dashboard KPI Cards

- 4-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Icon + label + value + trend indicator
- Border-left accent in primary color

### Post Editor

- Centered layout (max-width: 680px)
- Large serif title input (2rem, Georgia)
- Markdown textarea with monospace font
- Tag pills with remove button
- Top bar: category select, Save Draft, Publish buttons
