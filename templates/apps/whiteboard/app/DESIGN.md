# DESIGN.md — Whiteboard

## Brand Identity

- **App Name:** Tessera
- **Tagline:** Where ideas converge
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Playful, collaborative, creative, generous

## Target Persona

Design teams, workshop facilitators, product managers, and educators who run live multiplayer brainstorms and need a canvas that feels instant.

## Screens

| Name             | Route              | Auth | Purpose                                                                   | deriveFrom |
| ---------------- | ------------------ | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing          | /                  | No   | Marketing home with value props and signup CTA                            | —          |
| Login            | /login             | No   | Sign in                                                                   | —          |
| Signup           | /signup            | No   | Create account                                                            | Login      |
| ForgotPassword   | /forgot-password   | No   | Request reset                                                             | Login      |
| ResetPassword    | /reset-password    | No   | Set new password                                                          | Login      |
| Boards           | /boards            | Yes  | Browse all boards with previews and folders                               | —          |
| BoardCanvas      | /board/:id         | Yes  | Live infinite canvas editor with toolbar, panels, collaborators           | —          |
| Templates        | /templates         | Yes  | Template gallery for quick-start boards                                   | —          |
| TemplateDetail   | /templates/:id     | Yes  | Preview a template with metadata, screenshots, and "Use template" CTA     | —          |
| Shared           | /shared            | Yes  | Boards shared with the user, permission view                              | —          |
| Notifications    | /notifications     | Yes  | Mentions, comments, share invitations, and team activity feed             | —          |
| Profile          | /profile           | Yes  | Public collaborator card — bio, social links, cursor color, recent boards | —          |
| Workspace        | /workspace         | Yes  | Team members, invitations, roles, and workspace admin                     | —          |
| Billing          | /billing           | Yes  | Subscription plan, payment method, invoices, usage stats                  | —          |
| VersionHistory   | /board/:id/history | Yes  | Timeline of board versions with snapshot preview and restore              | —          |
| PresentationMode | /board/:id/present | Yes  | Full-screen frame-by-frame presentation with audience reactions           | —          |
| Settings         | /settings          | Yes  | Profile, workspace, appearance, integrations                              | —          |

## App Constraints

- The canvas always uses a subtle dot-grid background `#e2e2e2` (or `#2a2a40` in dark) — never a flat solid
- Floating toolbar lives bottom-center with glass-morphism (`rgba(255,255,255,0.95)` + `backdrop-blur(12px)`); never docked to the edges
- Collaborator cursors use the distinct cursor-remote palette (`#f97316`, `#06b6d4`, `#ec4899`, `#84cc16`, `#f43f5e`, `#a78bfa`) with name tags; never primary/accent brand colors

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b5bf7` (indigo — creative energy, modern tooling)
- Primary Hover: `#7676ff`
- Primary Dark: `#4444d4`
- Accent: `#00c4a8` (teal — collaboration, connectivity)
- Accent Hover: `#00dbbe`
- Accent Dark: `#00a88e`
- Canvas Accent: `#a855f7` (violet — drawing tools, creative expression)
- Canvas Accent Hover: `#c084fc`
- Canvas Accent Dark: `#7c3aed`

### Semantic

- Cursor Self: `#5b5bf7` (your own cursor matches brand)
- Cursor Remote 1: `#f97316` (orange — collaborator)
- Cursor Remote 2: `#06b6d4` (cyan — collaborator)
- Cursor Remote 3: `#ec4899` (pink — collaborator)
- Cursor Remote 4: `#84cc16` (lime — collaborator)
- Cursor Remote 5: `#f43f5e` (rose — collaborator)
- Cursor Remote 6: `#a78bfa` (lavender — collaborator)
- Locked: `#f59e0b` (element locked by another user)
- Shared: `#22c55e` (board shared / public)
- Private: `#6b7280` (board private / restricted)
- Online: `#22c55e`
- Away: `#f59e0b`
- Offline: `#9ca3af`

### Backgrounds

- Canvas: `#fafafa` (the infinite canvas surface)
- Canvas Dot Grid: `#e2e2e2` (subtle dot grid pattern)
- Canvas Line Grid: `#ebebeb` (line grid alternative)
- Toolbar: `#ffffff`
- Toolbar Floating: `rgba(255, 255, 255, 0.95)` (floating toolbar with backdrop-blur)
- Panel: `#ffffff`
- Selection: `rgba(91, 91, 247, 0.08)` (multi-select highlight area)

### Text

- Link: `#5b5bf7`
- Link Hover: `#4444d4`
- Canvas Label: `#1e1e2e` (text on canvas objects)
- Canvas Label Muted: `#6b7280`

### Borders

- Focus: `#5b5bf7`
- Selection: `#5b5bf7` (selected element outline)
- Selection Secondary: `rgba(91, 91, 247, 0.4)` (multi-select bounding box)
- Resize Handle: `#5b5bf7` (corner/edge resize grips)

### Dark Theme Overrides

- Primary: `#7676ff`
- Accent: `#00dbbe`
- Canvas Accent: `#c084fc`
- Background: `#0c0c1d`
- Surface: `#1a1a2e`
- Canvas: `#141425`
- Canvas Dot Grid: `#2a2a40`
- Canvas Line Grid: `#232338`
- Toolbar: `#1a1a2e`
- Toolbar Floating: `rgba(26, 26, 46, 0.95)`
- Panel: `#1a1a2e`
- Selection: `rgba(118, 118, 255, 0.12)`
- Text Primary: `#f0f0ff`
- Text Secondary: `#a0a0c0`
- Border Primary: `#2a2a40`
- Canvas Label: `#e8e8f0`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Canvas: `Inter, -apple-system, sans-serif` (text on shapes/sticky notes — clean and legible at all zoom levels)
- Handwriting: `"Caveat", "Segoe Print", "Comic Sans MS", cursive` (freeform text tool option)
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace` (code blocks on canvas)

### Font Sizes (Canvas-Specific)

- Canvas XS: `12px` (annotations, min readable at 100% zoom)
- Canvas SM: `14px` (sticky note body, shape labels)
- Canvas MD: `18px` (default text tool)
- Canvas LG: `24px` (headings on canvas)
- Canvas XL: `36px` (section titles)
- Canvas 2XL: `48px` (presentation mode headings)

## Layout

- Canvas: infinite scroll, no max width (pannable/zoomable)
- Toolbar Position: bottom-center, floating (like Figma/tldraw)
- Toolbar Height: `52px`
- Toolbar Border Radius: `12px`
- Toolbar Shadow: `0 4px 24px rgba(0, 0, 0, 0.12)`
- Left Panel Width: `280px` (pages/layers panel, collapsible)
- Right Panel Width: `260px` (properties/style panel, collapsible)
- Top Bar Height: `48px` (board title, share, collaborators)
- Minimap Size: `180px x 120px` (bottom-right corner)
- Zoom Controls Width: `140px` (bottom-left corner)
- Collaborator Avatars: stacked in top-right, `28px` diameter, `-8px` overlap

## Z-Index Scale (Canvas-Specific)

- Canvas Grid: `0`
- Canvas Objects: `1–999` (user-controlled layering)
- Selection Overlay: `1000`
- Remote Cursors: `1100`
- Floating Toolbar: `1200`
- Side Panels: `1300`
- Context Menu: `1400`
- Modal: `1500`
- Tooltip: `1600`
- Toast: `1700`

## Components

### Floating Toolbar

- Border radius: `12px`
- Shadow: `0 4px 24px rgba(0, 0, 0, 0.12)`
- Background: toolbar-floating with `backdrop-filter: blur(12px)`
- Padding: `6px`
- Tool button size: `40px x 40px`
- Tool button radius: `8px`
- Active tool: primary background, white icon
- Hover: surface-secondary background
- Divider: `1px solid` border-primary, `16px` height, `6px` horizontal margin
- Tool groups: Select | Shapes | Drawing | Text | Sticky | Connector | Eraser

### Shape (Canvas Object)

- Default stroke: `#1e1e2e` (dark), `2px` width
- Default fill: `transparent`
- Selected border: `2px solid` selection color
- Resize handles: `8px x 8px` white squares with primary border, border-radius `2px`
- Rotation handle: `10px` circle, `24px` above top-center
- Corner radius (rectangles): `0` (sharp), `8px` (rounded), `9999px` (pill) — user toggle
- Minimum size: `20px x 20px`
- Available shapes: Rectangle, Ellipse, Diamond, Triangle, Arrow, Line, Star, Hexagon

### Sticky Note

- Default size: `200px x 200px`
- Border radius: `4px` (subtle, like real sticky)
- Shadow: `2px 3px 8px rgba(0, 0, 0, 0.1)` (slight offset, like paper)
- Font family: canvas font
- Font size: canvas-sm (`14px`), auto-shrinks to fit
- Padding: `12px`
- Preset colors:
  - Yellow: `#fef08a` (default)
  - Blue: `#bfdbfe`
  - Green: `#bbf7d0`
  - Pink: `#fecdd3`
  - Purple: `#e9d5ff`
  - Orange: `#fed7aa`
  - Gray: `#e5e7eb`
- Dark theme sticky colors:
  - Yellow: `#854d0e`
  - Blue: `#1e3a5f`
  - Green: `#14532d`
  - Pink: `#881337`
  - Purple: `#581c87`
  - Orange: `#9a3412`
  - Gray: `#374151`

### Connector / Arrow

- Stroke width: `2px` (default), `1px` (thin), `4px` (thick)
- Stroke style: solid, dashed (`8px 4px`), dotted (`2px 4px`)
- Arrow head size: `10px`
- Arrow styles: none, triangle, diamond, circle, open
- Color: defaults to text-primary, user-customizable
- Curvature: straight, elbow (orthogonal), curved (bezier)
- Connection points: shape center-edges, snaps at `4px` proximity

### Freehand Drawing

- Stroke width: `2px` (pen), `4px` (marker), `20px` (highlighter)
- Highlighter opacity: `0.35`
- Smoothing: cubic bezier interpolation, `3px` tolerance
- Eraser size: `20px` diameter (visual circle cursor)
- Pen pressure sensitivity: supported when available

### Text Block (Canvas)

- Min width: `100px`
- Padding: `8px 12px`
- Border: none by default, `1px dashed #cbd5e1` while editing
- Font size: canvas-md (`18px`) default
- Line height: `1.5`
- Supports bold, italic, underline, strikethrough
- Auto-resize: width grows to `480px` max, then wraps

### Remote Cursor

- Cursor icon: standard arrow, filled with collaborator's assigned color
- Name tag: `12px` font, white text on collaborator color, border-radius `4px`, positioned `16px` right and `20px` below cursor tip
- Name tag padding: `2px 6px`
- Fade out after `5s` of inactivity (opacity `0.3`, transition `2s`)
- Disappear after `30s` of inactivity

### Collaborator Avatar Stack

- Size: `28px` diameter
- Border: `2px solid` surface color (creates separation between stacked avatars)
- Overlap: `-8px` horizontal
- Max visible: `5` (overflow shows `+N` pill)
- Online indicator: `8px` green dot, bottom-right, `2px` white border
- Hover: expand with `4px` gap, show name tooltip

### Share Dialog

- Width: `480px`
- Border radius: `12px`
- Sections: Link sharing toggle, Invite by email, Collaborator list
- Permission levels: `Can edit`, `Can comment`, `Can view`
- Permission badge: `8px` radius, `24px` height, muted background
- Copy link button: full-width, outline variant

### Context Menu (Right-Click)

- Min width: `200px`
- Border radius: `8px`
- Shadow: `lg`
- Item height: `36px`
- Item padding: `8px 12px`
- Separator: `1px solid` border-primary, `4px` vertical margin
- Keyboard shortcut text: right-aligned, text-secondary, mono font, `12px`
- Sub-menu indicator: chevron right, `12px`

### Minimap

- Size: `180px x 120px`
- Border radius: `8px`
- Border: `1px solid` border-primary
- Background: surface with `0.9` opacity
- Viewport indicator: `2px solid` primary, semi-transparent fill
- Objects: simplified colored rectangles
- Hover: expand to `270px x 180px`, transition fast

### Zoom Controls

- Border radius: `8px`
- Background: toolbar-floating with backdrop-blur
- Shadow: `sm`
- Button size: `32px`
- Zoom percentage: `48px` wide, center-aligned, `13px` font
- Layout: `[ - ] 100% [ + ]` horizontal, `[ Fit ]` below
- Zoom range: `10%` to `800%`
- Zoom steps: 10, 25, 50, 75, 100, 150, 200, 400, 800

### Pages Panel (Left Sidebar)

- Page thumbnail: `64px` height, rounded `4px`, border on hover
- Active page: primary border `2px`, slight primary background tint
- Page name: `13px`, truncated with ellipsis at `180px`
- Add page button: dashed border, `+` icon, full width

### Properties Panel (Right Sidebar)

- Section title: `11px` uppercase, text-secondary, `600` weight, `16px` bottom margin
- Color picker: `24px` swatches in `6`-column grid, selected has `2px` primary ring
- Stroke width selector: visual line previews, `32px` height each
- Opacity slider: `0–100%`, `4px` track height, `16px` thumb
- Alignment buttons: `32px` square icon buttons, `6`-grid (left/center/right/top/middle/bottom)

## Canvas Interactions

### Selection

- Click: select single object
- Shift+Click: add/remove from selection
- Drag on empty canvas: marquee selection (dashed primary border, selection background fill)
- Marquee selection mode: intersect (default), contain (hold Alt)

### Pan & Zoom

- Scroll wheel: zoom (centered on cursor)
- Space + drag: pan
- Trackpad pinch: zoom
- Trackpad two-finger: pan
- Double-click minimap: center viewport

### Grid & Snapping

- Dot grid spacing: `20px`
- Snap to grid: `10px` increments (toggleable)
- Snap to objects: `4px` proximity guides (magenta `#ff00ff` guide lines, `1px`)
- Smart spacing: shows equal-distance indicators between aligned objects

## Transitions (Canvas-Specific)

- Zoom animation: `200ms ease-out`
- Pan inertia: deceleration over `400ms`
- Object appear (paste/create): `150ms` scale from `0.9` to `1.0`, opacity `0` to `1`
- Collaborator cursor movement: `80ms` linear interpolation (smooth remote cursors)
- Panel slide: `200ms ease`
- Toolbar appear: `150ms ease`, translate-y from `8px`
