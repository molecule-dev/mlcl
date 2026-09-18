# DESIGN.md — AI Chatbot Builder

## Brand Identity

- **App Name:** Botforge
- **Tagline:** Build intelligent conversations
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#8b5cf6`
- Primary Hover: `#a78bfa`
- Primary Dark: `#7c3aed`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`

### Semantic

- AI Response: `#8b5cf6`
- User Message: `#06b6d4`
- Node Connect: `#22c55e`
- Node Error: `#ef4444`
- Node Inactive: `#6b7280`

### Backgrounds (Dark Mode First)

- Primary: `#0f172a`
- Secondary: `#1e293b`
- Surface: `#1e293b`
- Surface Secondary: `#334155`
- Canvas: `#0b1120`
- Node: `#1e293b`
- Input: `#334155`

### Text (Dark Mode First)

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`

### Borders (Dark Mode First)

- Primary: `#334155`
- Secondary: `#475569`
- Focus: `#8b5cf6`

### Light Theme Overrides

- Background: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Text Primary: `#1e293b`
- Text Secondary: `#64748b`
- Border Primary: `#e2e8f0`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

## Layout

- Canvas Min Width: `100vw`
- Canvas Min Height: `100vh`
- Sidebar Width: `320px`
- Properties Panel Width: `360px`
- Chat Preview Width: `380px`
- Top Bar Height: `48px`

## Components

### Flow Node

- Border radius: `12px` (lg)
- Padding: `16px`
- Shadow: `md`
- Border: `1px solid` border-primary, selected: `2px solid` primary
- Min width: `220px`
- Header: `600` weight, icon `20px`
- Port dot: `12px`, border `2px solid` surface

### Connection Line

- Stroke width: `2px`
- Color: border-secondary, active: primary
- Style: bezier curve
- Arrow size: `8px`

### Chat Preview Bubble

- Border radius: `16px`, `4px` bottom-left for AI
- Padding: `10px 14px`
- AI background: surface-secondary
- User background: primary with inverse text
- Max width: `80%`
- Typing animation: three dots, `400ms` stagger

### Template Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Hover: `primary` border with `0.15` opacity glow
- Icon: `32px`, primary color

### Code Editor Panel

- Font: code family, `sm` (14px)
- Line height: `1.6`
- Background: canvas
- Gutter: surface-secondary background
