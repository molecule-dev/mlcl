# DESIGN.md — Mind Mapping

## Brand Identity

- **App Name:** Dendrite
- **Tagline:** Where ideas branch out
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Imaginative
- Organic
- Spacious
- Clear

## Target Persona

Thinkers and designers creating brainstorming maps and concept diagrams.

## Screens

| Name           | Route             | Auth | Purpose                                                 | deriveFrom |
| -------------- | ----------------- | ---- | ------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home                                          | —          |
| Login          | /login            | No   | Sign in                                                 | —          |
| Signup         | /signup           | No   | Create account                                          | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                           | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                        | Login      |
| Dashboard      | /dashboard        | Yes  | Recent maps with thumbnails and last edited             | —          |
| Maps           | /maps             | Yes  | Browse all maps by folder                               | Dashboard  |
| MapEditor      | /maps/:id         | Yes  | Infinite canvas with nodes, branches, toolbar           | Dashboard  |
| Templates      | /templates        | Yes  | Template gallery (SWOT, brainstorm, etc.)               | Dashboard  |
| Share          | /maps/:id/share   | Yes  | Share map with permissions, links                       | Dashboard  |
| Settings       | /settings         | Yes  | Account, canvas defaults, integrations                  | Dashboard  |
| Profile        | /profile          | Yes  | Public identity, bio, social links, stats               | Dashboard  |
| Notifications  | /notifications    | Yes  | Mentions, share invites, comments, activity feed        | Dashboard  |
| Billing        | /settings/billing | Yes  | Plan, usage, payment method, invoices                   | Dashboard  |
| VersionHistory | /maps/:id/history | Yes  | Time-travel through saved snapshots with diff + restore | MapEditor  |
| TemplateDetail | /templates/:id    | Yes  | Preview a template before cloning into a new map        | Templates  |
| Trash          | /trash            | Yes  | Recently deleted maps with restore / permanent-delete   | Maps       |

## App Constraints

- Infinite canvas with zoom/pan
- Node branching with curved connectors
- Right-side node details panel

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#3b82f6`
- Primary Dark: `#1d4ed8`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Canvas Blue: `#dbeafe` (selection highlight, drag ghost)

### Semantic

- Node Default: `#2563eb`
- Node Idea: `#8b5cf6`
- Node Task: `#f59e0b`
- Node Reference: `#06b6d4`
- Node Note: `#64748b`
- Connection Default: `#94a3b8`
- Connection Active: `#2563eb`
- Selection Ring: `#3b82f6`
- Collaborator Cursor A: `#f43f5e`
- Collaborator Cursor B: `#a855f7`
- Collaborator Cursor C: `#f97316`
- Collaborator Cursor D: `#14b8a6`

### Backgrounds

- Canvas: `#f8fafc`
- Canvas Dot Grid: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Toolbar: `#ffffff`
- Minimap: `rgba(241, 245, 249, 0.92)`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Node Label: `#1e293b`
- Placeholder: `#94a3b8`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Node: `#cbd5e1`
- Node Selected: `#2563eb`
- Focus: `#2563eb`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#34d399`
- Canvas: `#0c1222`
- Canvas Dot Grid: `#1e293b`
- Background: `#0f172a`
- Surface: `#1e293b`
- Surface Secondary: `#283548`
- Toolbar: `#1e293b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Node Label: `#e2e8f0`
- Border Primary: `#334155`
- Node Border: `#475569`
- Connection Default: `#475569`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Node Label: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Font Sizes (Canvas-Specific)

- Node Label (root): `1.25rem` (20px), weight `700`
- Node Label (branch): `1rem` (16px), weight `600`
- Node Label (leaf): `0.875rem` (14px), weight `500`
- Node Note: `0.75rem` (12px), weight `400`
- Zoom Indicator: `0.75rem` (12px), weight `500`, mono
- Minimap Label: `0.625rem` (10px), weight `500`

## Layout

- Canvas: full viewport width/height minus toolbar (no max-width constraint)
- Top Toolbar Height: `48px`
- Side Panel Width: `320px` (properties/outline panel, collapsible)
- Side Panel Collapsed: `0px` (fully hidden, not icon rail)
- Minimap Size: `180px x 120px`, bottom-right corner, `16px` inset
- Toolbar Group Gap: `8px`
- Toolbar Divider: `1px solid` border-primary, `8px` horizontal margin
- Keyboard Shortcuts Panel Width: `360px`

## Canvas

### Grid

- Dot grid pattern, `24px` spacing
- Dot size: `1.5px` radius
- Dot color: canvas-dot-grid
- Grid fades out below `40%` zoom, fades in above `50%`

### Zoom

- Default: `100%`
- Min: `10%`
- Max: `400%`
- Zoom step (scroll): `10%`
- Zoom step (keyboard): `25%`
- Fit-to-content padding: `64px`

### Pan

- Middle-click drag or Space + left-click drag
- Trackpad two-finger scroll
- Inertia: `300ms ease-out` deceleration

## Components

### Node

- Border radius: `12px` (lg)
- Shadow: `sm`, selected: `md`
- Min width: `120px`
- Max width: `280px`
- Padding: `12px 16px`
- Border: `2px solid` node-border, selected: `2px solid` node-selected
- Background: surface
- Label: editable inline text, auto-resize height
- Color indicator: `4px` left border accent in the node's type color
- Hover: shadow `md`, border transitions to secondary
- Drag ghost: `0.7` opacity, `4px` offset shadow

### Root Node

- Border radius: `16px`
- Padding: `16px 24px`
- Font size: node-label-root
- Shadow: `md`
- Border: `2px solid` primary
- Background: surface with subtle primary tint (`rgba(37, 99, 235, 0.04)`)

### Connection Line

- Stroke width: `2px`, hover: `3px`
- Color: connection-default, hover: connection-active
- Style: cubic bezier curve (smooth S-curve between nodes)
- Arrow: none by default, optional `6px` arrowhead
- Animated dash on drag-to-connect: `5px` dash, `300ms` cycle
- Hit area: `12px` invisible stroke for easier click targeting

### Toolbar (Floating, Top Center)

- Border radius: `12px` (lg)
- Shadow: `md`
- Background: toolbar
- Padding: `6px 8px`
- Position: fixed top center, `12px` from top
- Button size: `36px x 36px`
- Button border radius: `8px` (md)
- Button hover: surface-secondary background
- Button active: primary background, inverse text
- Icon size: `18px`
- Sections: pointer/hand tool | node tools | undo/redo | zoom controls | share

### Minimap

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Shadow: `sm`
- Background: minimap
- Viewport indicator: `2px solid` primary, `4px` border radius
- Node dots: `3px` circles, muted primary
- Opacity: `0.85`, hover: `1.0`
- Transition: opacity `150ms ease`

### Side Panel (Properties / Outline)

- Border-left: `1px solid` border-primary
- Background: surface
- Header height: `48px` (aligns with toolbar)
- Section padding: `16px`
- Section divider: `1px solid` border-primary
- Slide transition: `200ms ease`

### Collaborator Cursors

- Cursor icon: `20px` pointer with `12px` name label
- Name label: `9px` font, `600` weight, `4px 8px` padding, `9999px` radius
- Label background: collaborator's assigned color
- Label text: `#ffffff`
- Fade on idle: `3s` delay, `500ms` fade to `0.3` opacity

### Context Menu (Right-Click)

- Border radius: `8px` (md)
- Shadow: `lg`
- Background: surface
- Min width: `200px`
- Item height: `36px`
- Item padding: `8px 12px`
- Item hover: surface-secondary
- Keyboard shortcut hint: secondary text, mono font, right-aligned
- Divider: `1px solid` border-primary, `4px` vertical margin

### Keyboard Shortcuts Panel

- Overlay panel, slides in from right
- Border radius: `12px` left side only
- Shadow: `xl`
- Background: surface
- Grouped by category (Navigation, Editing, Selection, View)
- Key badge: `4px` radius, `#f1f5f9` background, `1px solid` border-primary, mono font, `0.75rem`

### Zoom Controls (Bottom-Right, Above Minimap)

- Horizontal pill: `border-radius: 9999px`
- Shadow: `sm`
- Background: surface
- Buttons: `32px x 32px` for +/- with zoom percentage label between
- Zoom label: mono font, `0.75rem`, `500` weight
- Padding: `4px`

### Share / Collaboration Modal

- Standard modal: `lg` size (640px)
- Collaborator list: avatar (`32px` circle) + name + permission badge
- Permission badge: `outline` variant, colors by role (owner: primary, editor: accent, viewer: secondary)
- Invite input: full width, with role dropdown and "Invite" button

## Design Principles

1. **Canvas is king** — minimize chrome, maximize workspace. The map IS the interface.
2. **Invisible until needed** — toolbars, panels, and controls should feel ambient, not crowding.
3. **Spatial clarity** — use whitespace, subtle grid, and consistent node sizing to prevent visual clutter.
4. **Smooth motion** — all canvas interactions (zoom, pan, drag, connect) must feel fluid with proper easing.
5. **Collaboration-aware** — every design choice must work with multiple cursors and simultaneous editing.
6. **Keyboard-first power users** — all primary actions accessible via shortcuts; visual hints reinforce discoverability.
