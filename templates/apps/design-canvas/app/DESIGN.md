# DESIGN.md — Design Canvas

## Brand Identity

- **App Name:** Atelier
- **Tagline:** Shape every pixel with intent
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Crafty, expressive, playful, precise

## Target Persona

Designers and creative teams who need a fast, real-time design canvas for vector illustration, UI mockups, and collaborative ideation.

## Screens

| Name           | Route            | Auth | Purpose                                                                      | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                               | —          |
| Login          | /login           | No   | Sign in                                                                      | —          |
| Signup         | /signup          | No   | Create account                                                               | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                             | Login      |
| Dashboard      | /dashboard       | Yes  | Files grid, recent projects, team library                                    | —          |
| Editor         | /editor/:id      | Yes  | The canvas with toolbar, layers, properties                                  | —          |
| Templates      | /templates       | Yes  | Browse starter templates by category                                         | —          |
| Library        | /library         | Yes  | Shared assets, components, color tokens                                      | —          |
| Settings       | /settings        | Yes  | Account, preferences, team, billing                                          | —          |
| Profile        | /profile         | Yes  | Public designer profile, portfolio of recent work, followers/following       | —          |
| Team           | /team            | Yes  | Team members list with roles, pending invitations, permissions matrix        | —          |
| Notifications  | /notifications   | Yes  | Activity feed: comments, mentions, file shares, invitations, version updates | —          |
| Search         | /search          | Yes  | Global search across files, templates, library assets, comments, members     | —          |

## App Constraints

- Editor canvas must show top toolbar + left layers panel + right properties panel + bottom status bar simultaneously
- Coordinates, dimensions, and color hex values render in JetBrains Mono with tabular-nums
- Selection and collaborator cursors use the violet primary `#7c3aed` and the assigned collaborator color palette

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Canvas Accent: `#06b6d4`

### Semantic

- Layer Visible: `#7c3aed`
- Layer Hidden: `#94a3b8`
- Layer Locked: `#f59e0b`
- Shape Fill: `#3b82f6`
- Shape Stroke: `#1e293b`
- Selection: `#7c3aed`
- Selection Handle: `#ffffff`
- Guide: `#ec4899`
- Grid Line: `rgba(124, 58, 237, 0.08)`
- Snap: `#06b6d4`
- Collaborator 1: `#7c3aed`
- Collaborator 2: `#ec4899`
- Collaborator 3: `#06b6d4`
- Collaborator 4: `#f59e0b`
- Collaborator 5: `#10b981`

### Backgrounds

- Canvas: `#f8f7fc`
- Canvas Dark: `#18122b`
- Toolbar: `#ffffff`
- Toolbar Dark: `#1e1535`
- Properties Panel: `#ffffff`
- Layers Panel: `#faf9fe`
- Surface Secondary: `#f5f3ff`

### Text

- Primary: `#1e1535`
- Secondary: `#6b6380`
- Tertiary: `#9890a8`
- Canvas Label: `#475569`
- Property Label: `#6b6380`
- Property Value: `#1e1535`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Primary: `#e9e5f5`
- Secondary: `#d8d3e8`
- Focus: `#7c3aed`
- Canvas Object: `#7c3aed`
- Toolbar Divider: `#e9e5f5`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f472b6`
- Canvas Accent: `#22d3ee`
- Background: `#0c0a14`
- Surface: `#1e1535`
- Surface Secondary: `#261e3d`
- Toolbar: `#1e1535`
- Properties Panel: `#1e1535`
- Layers Panel: `#18122b`
- Text Primary: `#f0ecfa`
- Text Secondary: `#a89ec0`
- Border Primary: `#362c52`

## Typography

### Font Families

- UI (default): `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Canvas Text: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Mono (coordinates/values): `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`

### Font Sizes

- Property Label: `0.6875rem` (11px)
- Coordinate: `0.6875rem` (11px)
- Layer Name: `0.8125rem` (13px)
- Toolbar Label: `0.75rem` (12px)
- Canvas Heading (default): `1.5rem` (24px)
- Canvas Body (default): `1rem` (16px)

## Layout

- Canvas: full viewport, infinite scroll/pan
- Left Panel (Layers): `240px` width, collapsible to `0px`
- Right Panel (Properties): `280px` width, collapsible to `0px`
- Top Toolbar Height: `48px`
- Bottom Status Bar Height: `32px`
- Toolbar Icon Size: `20px`
- Toolbar Button Size: `36px`
- Toolbar Group Gap: `2px`
- Toolbar Section Divider: `1px` solid border, `8px` horizontal margin
- Zoom Controls: bottom-right, `160px` width
- Minimap: bottom-left overlay, `180px × 120px`

## Z-Index Scale (Canvas-Specific)

- Canvas Grid: `1`
- Canvas Objects: `10`
- Selection Handles: `20`
- Guides: `30`
- Collaborator Cursors: `40`
- Context Menu: `1000`
- Toolbar: `1100`
- Side Panels: `1100`
- Floating Toolbar (text editing): `1200`
- Color Picker Popover: `1400`
- Modal: `1300`
- Export Dialog: `1300`
- Tooltip: `1500`
- Toast: `1600`

## Components

### Canvas Toolbar

- Background: toolbar surface, `1px` bottom border
- Height: `48px`
- Tool buttons: `36px × 36px`, border radius `8px`
- Active tool: primary background at `12%` opacity, primary border
- Hover: background-secondary
- Icon size: `20px`, stroke width `1.5px`
- Tool groups separated by `1px` vertical divider with `8px` margin
- Tools: Select (V), Frame (F), Rectangle (R), Ellipse (O), Line (L), Pen (P), Text (T), Hand (H)

### Properties Panel

- Width: `280px`
- Section padding: `16px`
- Section header: `11px` uppercase, `600` weight, secondary text color, `8px` bottom margin
- Section divider: `1px` solid border-primary
- Property row: flex between label and value, `32px` row height
- Label: `11px`, secondary text, `400` weight
- Value input: `11px` mono font, `28px` height, `4px` border radius, right-aligned
- Color swatch: `24px × 24px`, `4px` border radius, checkered transparency background
- Slider track: `2px` height, border-secondary color
- Slider thumb: `12px` diameter, white fill, `1px` border, primary shadow

### Layers Panel

- Width: `240px`
- Layer row height: `36px`
- Layer row padding: `8px 12px`
- Layer indent per depth: `16px`
- Layer thumbnail: `24px × 24px`, `4px` border radius, checkered background
- Layer name: `13px`, `400` weight, truncate with ellipsis
- Layer name editing: inline input, primary border, `13px` font
- Active layer: primary background at `8%` opacity, left `2px` primary border
- Hover: surface-secondary background
- Visibility toggle: `16px` eye icon, right-aligned
- Lock toggle: `16px` lock icon, right of visibility
- Group expand/collapse: `12px` chevron, `4px` left of thumbnail
- Drag reorder: `2px` primary insertion line indicator

### Shape Objects

- Default fill: `#3b82f6` at `100%` opacity
- Default stroke: none
- Default stroke width: `1px` (when enabled)
- Selection outline: `1px` solid primary, `1px` offset
- Selection handles: `8px × 8px` white squares, `1px` primary border, `sm` shadow
- Corner radius handles: `6px` diameter circle, primary fill
- Rotation handle: `10px` from top-center selection handle, `6px` circle
- Multi-select: dashed `1px` primary outline
- Hover (non-selected): `1px` dashed primary at `40%` opacity

### Text Objects

- Default font: Canvas Text family
- Default size: `16px`
- Default color: `#1e1535`
- Text editing mode: blinking cursor, selection highlight at primary `20%` opacity
- Floating text toolbar: `40px` height, `8px` border radius, `lg` shadow, above selection
- Floating toolbar items: font family, font size, bold, italic, underline, alignment, color

### Collaborator Cursors

- Cursor: arrow SVG, `20px` height, filled with collaborator color
- Name label: `12px`, `500` weight, white text on collaborator color background
- Label border radius: `4px`
- Label offset: `16px` right, `20px` below cursor tip
- Fade out after `5s` idle, fade duration `1s`

### Color Picker

- Popover width: `240px`
- Border radius: `12px`
- Shadow: `lg`
- Saturation/brightness area: `240px × 160px`
- Hue slider: `240px × 12px`, `6px` border radius
- Opacity slider: `240px × 12px`, checkered background, `6px` border radius
- Hex input: `11px` mono font, `28px` height
- RGBA inputs: `4` fields, `11px` mono, `28px` height, `48px` width each
- Saved colors grid: `6` columns, `24px × 24px` swatches, `4px` gap, `4px` border radius

### Export Dialog

- Modal size: `480px` width
- Border radius: `12px`
- Preview area: `100%` width, max `320px` height, checkered background
- Format options: PNG, SVG, JPEG, PDF — pill radio buttons
- Scale options: `1×`, `2×`, `3×`, `4×` — pill radio buttons
- Pill button: `32px` height, `8px` horizontal padding, `4px` border radius
- Active pill: primary background, white text
- Export button: full width, `48px` height, primary background, `600` weight

### Zoom Controls

- Container: `160px × 36px`, `8px` border radius, surface background, `md` shadow
- Zoom out/in buttons: `36px × 36px`
- Zoom percentage: `13px` mono font, center-aligned, clickable (opens preset menu)
- Fit to screen shortcut: `Ctrl+0` — zoom presets: `25%`, `50%`, `100%`, `200%`, `400%`

### Context Menu

- Width: `200px`
- Border radius: `8px`
- Shadow: `lg`
- Item height: `32px`
- Item padding: `8px 12px`
- Item font: `13px`, `400` weight
- Hover: surface-secondary background
- Shortcut hint: right-aligned, `11px` mono, secondary text
- Divider: `1px` solid border-primary, `4px` vertical margin
- Sections: Edit (copy, paste, duplicate, delete), Arrange (bring forward, send back, group, ungroup), Align, Export

### Search / Command Palette

- Overlay: standard modal overlay
- Input container: `560px` width, top `20%` of viewport
- Border radius: `12px`
- Shadow: `xl`
- Search input: `48px` height, `16px` font, no border, large left search icon
- Results list: max `400px` height, scrollable
- Result item: `40px` height, `14px` font, icon + label + shortcut
- Active result: primary at `8%` background
- Categories: Layers, Shapes, Actions, Export

### Status Bar

- Height: `32px`
- Background: toolbar surface, `1px` top border
- Font: `11px` mono
- Items: cursor coordinates (X, Y), canvas zoom %, selection dimensions, object count
- Collaboration indicator: colored dots for active collaborators, right-aligned
