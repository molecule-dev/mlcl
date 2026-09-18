# DESIGN.md — Photo Editor

## Brand Identity

- **App Name:** Lustra
- **Tagline:** Light bends to your will
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, powerful, dark-crafted, creative

## Target Persona

Creators and photographers who demand a dense, keyboard-friendly editor with a dark chrome that never color-casts the canvas.

## Screens

| Name           | Route            | Auth | Purpose                                                          | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with product showcase                             | —          |
| Login          | /login           | No   | Sign in                                                          | —          |
| Signup         | /signup          | No   | Create account                                                   | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                    | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                 | Login      |
| Editor         | /editor          | Yes  | Main editing canvas with tools, layers, adjustments              | —          |
| Library        | /library         | Yes  | Photo library with grid/list view                                | —          |
| Export         | /export          | Yes  | Export dialog / page with format and quality options             | —          |
| Settings       | /settings        | Yes  | Preferences, color profile, keyboard shortcuts                   | —          |
| AlbumDetail    | /album/:id       | Yes  | Single album with cover, curated photo grid, share/edit controls | —          |
| Presets        | /presets         | Yes  | Browse and manage filter presets / LUTs library                  | —          |
| Profile        | /profile         | Yes  | Creator profile — avatar, bio, public gallery showcase           | —          |

## App Constraints

- Editor chrome is always dark (panel #1e1e36, toolbar #16162a) to avoid color-casting the canvas
- Slider/value readouts use JetBrains Mono for precision numeric display
- Canvas area uses checkerboard for transparency, always dark regardless of app theme

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#8b5cf6`
- Primary Hover: `#a78bfa`
- Primary Dark: `#7c3aed`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Canvas Accent: `#06b6d4` (selection handles, guides, rulers)

### Semantic

- Destructive Edit: `#ef4444` (crop discard, layer delete, undo warning)
- Destructive Edit Light: `#fee2e2`
- Applied Filter: `#8b5cf6` (active filter indicator)
- Applied Filter Light: `#ede9fe`
- Locked Layer: `#94a3b8` (locked/hidden layer icon tint)
- Active Layer: `#22d3ee` (selected layer highlight border)
- Export Ready: `#10b981` (export confirmation, save success)
- Export Ready Light: `#d1fae5`

### Backgrounds

- Canvas: `#1a1a2e` (the editing canvas area — always dark regardless of theme)
- Canvas Checkerboard Light: `#2a2a3e`
- Canvas Checkerboard Dark: `#1a1a2e`
- Toolbar: `#16162a`
- Panel: `#1e1e36`
- Panel Secondary: `#252542`
- Surface: `#ffffff`
- Surface Secondary: `#f5f3ff`

### Text

- Panel: `#e2e0f0`
- Panel Secondary: `#a09bb8`
- Canvas Overlay: `#ffffff` (text over canvas — crop dimensions, zoom level)
- Value: `#c4b5fd` (numeric slider values, input readouts)
- Link: `#8b5cf6`
- Link Hover: `#7c3aed`

### Borders

- Panel: `#2d2b50`
- Panel Divider: `#3b3868`
- Focus: `#8b5cf6`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f472b6`
- Background: `#0c0c1d`
- Surface: `#16162a`
- Surface Secondary: `#1e1e36`
- Text Primary: `#f0eef8`
- Text Secondary: `#9892b0`
- Border Primary: `#2d2b50`

## Typography

### Font Families

- UI: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Values: `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace` (slider readouts, coordinate displays, pixel dimensions)

## Layout

- Content Max Width: `100vw` (full-bleed — photo editors use every pixel)
- Canvas Area: fluid, fills remaining space between toolbar and panels
- Left Toolbar Width: `52px` (icon-only tool strip)
- Right Panel Width: `300px` (layers, adjustments, filters)
- Right Panel Collapsed: `0px` (hidden, canvas expands)
- Bottom Panel Height: `48px` (status bar — zoom, dimensions, color picker readout)
- Top Bar Height: `48px` (menu bar + document tabs)
- Panel Section Gap: `1px` (tight, accordion-style sections)

## Components

### Toolbar Button

- Size: `40px` square
- Border radius: `6px`
- Background: transparent, hover: `rgba(139, 92, 246, 0.15)`
- Active: `rgba(139, 92, 246, 0.25)` with left `2px` primary border accent
- Icon size: `20px`
- Tooltip: right-aligned, `300ms` delay

### Adjustment Slider

- Track height: `4px`
- Track background: `#2d2b50`
- Track fill: primary gradient (`#8b5cf6` → `#ec4899`)
- Thumb size: `14px` circle
- Thumb background: `#ffffff`
- Thumb shadow: `0 1px 3px rgba(0, 0, 0, 0.4)`
- Value readout: monospace font, `12px`, right-aligned, `#c4b5fd`
- Label: `13px`, `400` weight, panel text color

### Layer Card

- Height: `56px`
- Border radius: `6px`
- Background: `#252542`, selected: `rgba(139, 92, 246, 0.2)`
- Selected border-left: `3px solid #8b5cf6`
- Thumbnail: `40px` square, `4px` radius, left-aligned
- Name: `13px`, `500` weight, truncate with ellipsis
- Opacity readout: monospace, `12px`, `#a09bb8`
- Visibility icon: `16px`, toggles on click
- Drag handle: `4px` dotted grip, left of thumbnail

### Filter Thumbnail

- Size: `72px` square
- Border radius: `8px`
- Border: `2px solid transparent`, selected: `2px solid #8b5cf6`
- Label: `11px`, centered below, `500` weight
- Hover: `md` shadow + slight scale (`1.03`)
- Grid: `3` columns in the right panel

### Canvas Overlay Controls

- Crop handles: `10px` square, `#ffffff`, `1px` border `rgba(0, 0, 0, 0.3)`
- Crop grid lines: `1px solid rgba(255, 255, 255, 0.3)` (rule of thirds)
- Selection marquee: `1px dashed #ffffff` animated (marching ants, `400ms` cycle)
- Zoom badge: `12px` monospace, `rgba(0, 0, 0, 0.6)` pill, bottom-right of canvas

### Panel Section (Accordion)

- Header height: `36px`
- Header background: `#1a1a30`
- Header text: `12px`, `600` weight, uppercase, `0.5px` letter-spacing
- Chevron icon: `14px`, rotates `90deg` on open (`150ms ease`)
- Content padding: `12px`
- Divider: `1px solid #2d2b50`

### Export Dialog

- Border radius: `12px`
- Shadow: `xl`
- Width: `480px`
- Background: panel color (`#1e1e36`)
- Format selector: pill toggle group (PNG / JPG / WebP / AVIF)
- Quality slider: same style as adjustment slider
- Preview: `200px` thumbnail with file size estimate below
- Export button: full width, `48px` height, primary background, `600` weight

### Color Picker Swatch

- Size: `28px` square
- Border radius: `4px`
- Border: `2px solid #2d2b50`, selected: `2px solid #ffffff`
- Inner border: `1px solid rgba(0, 0, 0, 0.1)` (visible on light swatches)
- Checkerboard behind for transparency indication

### History Entry

- Height: `32px`
- Icon: `14px`, left-aligned, panel secondary color
- Label: `13px`, `400` weight
- Current state: primary text color + `500` weight
- Future (redoable) states: `0.5` opacity
- Hover: `rgba(139, 92, 246, 0.1)` background

## Design Principles

1. **Canvas is king** — the photo always takes center stage; UI panels are minimal, dark, and stay out of the way
2. **Dark UI, bright content** — editor chrome is always dark to avoid color cast on the photo; only the canvas area shows the user's actual colors
3. **Precision over decoration** — use monospace for values, show exact numbers, avoid rounded/estimated displays
4. **Non-destructive by default** — UI should always communicate that edits are reversible (history panel visible, undo always available)
5. **Density over whitespace** — panels pack information tight; this is a power tool, not a landing page
