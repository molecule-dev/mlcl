# DESIGN.md — Animation Tool

## Brand Identity

- **App Name:** Vivace
- **Tagline:** Motion brought to life
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Creative, kinetic, precise, playful

## Target Persona

Motion designers and animators creating web animations, micro-interactions, and UI transitions.

## Screens

| Name           | Route                | Auth | Purpose                                                                                                                                                                                                                                      | deriveFrom |
| -------------- | -------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                    | No   | Dark-mode marketing home with motion demos, violet-magenta palette, features, pricing                                                                                                                                                        | —          |
| Login          | /login               | No   | Dark centered card with violet primary on animated background                                                                                                                                                                                | —          |
| Signup         | /signup              | No   | Create account                                                                                                                                                                                                                               | Login      |
| ForgotPassword | /forgot-password     | No   | Request reset                                                                                                                                                                                                                                | Login      |
| ResetPassword  | /reset-password      | No   | Set new password                                                                                                                                                                                                                             | Login      |
| Dashboard      | /dashboard           | Yes  | Dark sidebar, project cards grid with animated preview thumbnails, last-edited dates, duration chips, recent activity...                                                                                                                     | —          |
| Editor         | /projects/:id        | Yes  | Full-bleed dark editor: top toolbar, left layers/assets panel (280px), canvas center, right property inspector (320px...                                                                                                                     | —          |
| Projects       | /projects            | Yes  | Dark sidebar, grid of project cards with animated preview loops, duration, last-edited                                                                                                                                                       | —          |
| Library        | /library             | Yes  | Dark sidebar, preset grid with easing curve visualizations, transition presets, keyframe templates grouped by category                                                                                                                       | —          |
| Export         | /projects/:id/export | Yes  | Dark sidebar, export format tabs (CSS, Lottie, GIF, MP4) with options panel per format, preview pane right, download ...                                                                                                                     | —          |
| Settings       | /settings            | Yes  | Dark sidebar, account, preferences (default easing, frame rate), team, billing                                                                                                                                                               | —          |
| Assets         | /assets              | Yes  | Dark sidebar, asset library — images, SVGs, videos, audio, fonts. Filter pills by type, storage usage bar, 6-col grid with thumbnails + mono file metadata, right detail panel                                                               | —          |
| StateMachine   | /projects/:id/states | Yes  | Full-bleed dark canvas with dotted grid, node-graph editor for interactive state machines (Idle/Hover/Pressed/etc.), bezier transitions, left States/Triggers/Variables panel, right transition inspector, Timeline/StateMachine view toggle | —          |
| SharePreview   | /share/:token        | No   | Public-facing animation preview — large 16:9 canvas with violet-glow ring, transport bar, comments, embed code card, related animations sidebar, "Try Vivace Free" CTA                                                                       | —          |

## App Constraints

- Dark mode default (#16162a surface) for creative workspace
- Timeline scrubber at bottom with 32px track rows and red (#ef4444) playhead
- Keyframes use violet default, magenta when selected

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#8b5cf6`
- Primary Hover: `#a78bfa`
- Primary Dark: `#7c3aed`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`

### Semantic

- Keyframe Active: `#8b5cf6`
- Keyframe Selected: `#ec4899`
- Easing Curve: `#06b6d4`
- State Idle: `#6b7280`
- State Active: `#22c55e`
- State Transition: `#f59e0b`
- Layer Visible: `#8b5cf6`
- Layer Hidden: `#94a3b8`
- Layer Locked: `#f59e0b`
- Playhead: `#ef4444`
- Onion Skin: `rgba(139, 92, 246, 0.2)`

### Backgrounds

- Canvas: `#1a1a2e`
- Surface: `#16162a`
- Surface Secondary: `#1e1e36`
- Panel: `#12122a`
- Timeline: `#0f0f24`
- Timeline Row Alt: `#14142c`

### Text

- Primary: `#f1f0f5`
- Secondary: `#a09cb5`
- Tertiary: `#6e6a85`
- Property Label: `#8b8aa0`
- Property Value: `#e0dff0`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`

### Borders

- Primary: `#2d2b45`
- Secondary: `#3d3a5c`
- Focus: `#8b5cf6`
- Panel Divider: `#252340`

### Dark Theme Overrides

Dark is the default theme for Vivace. Light overrides are provided for embed/export previews:

- Primary: `#8b5cf6`
- Background: `#f8f7fc`
- Surface: `#ffffff`
- Surface Secondary: `#f3f1fa`
- Text Primary: `#1e1b2e`
- Text Secondary: `#6e6a85`
- Border Primary: `#e2dff0`
- Canvas: `#ffffff`
- Timeline: `#f3f1fa`

## Typography

### Font Families

- UI: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (property values, timecodes): `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, monospace`

## Layout

- Canvas Area: fluid, fills remaining space after panels
- Content Max Width: `none` (full-bleed workspace)
- Left Panel Width: `280px` (layers/assets, collapsible to `48px`)
- Right Panel Width: `320px` (properties/inspector, collapsible to `0px`)
- Timeline Height: `260px` (resizable, min `140px`, max `50vh`)
- Toolbar Height: `48px`
- Top Bar Height: `48px`

## Components

### Timeline Track

- Track height: `32px`
- Track padding: `0 8px`
- Background: alternating timeline / timeline-row-alt
- Selected track: `rgba(139, 92, 246, 0.1)` background
- Track label width: `180px`
- Font size: `sm` (14px)
- Font family: UI

### Keyframe Diamond

- Size: `12px` (rotated 45deg square)
- Fill: keyframe-active color
- Selected fill: keyframe-selected color
- Stroke: `2px` darker shade on hover
- Hit area: `20px` (invisible expanded click target)
- Drag ghost opacity: `0.5`

### Easing Curve Editor

- Panel size: `240px x 200px`
- Grid lines: `rgba(139, 92, 246, 0.1)`
- Curve stroke: easing-curve color, `2px` width
- Control point handles: `8px` circles, accent color
- Handle lines: `1px` dashed, accent at `0.5` opacity
- Preset pills: border-radius `9999px`, padding `4px 12px`, font size `xs`

### Layer Row

- Height: `36px`
- Padding: `0 12px`
- Indent per depth level: `20px`
- Visibility toggle icon: `16px`
- Lock toggle icon: `16px`
- Thumbnail: `28px x 28px`, border-radius `4px`
- Drag handle: `4px` wide grip dots, secondary text color
- Selected: primary at `0.12` opacity background, primary-dark left border `2px`

### Property Inspector

- Section header: font weight `600`, font size `sm`, text-secondary
- Property row height: `32px`
- Label width: `90px`, font family mono, font size `xs`, color property-label
- Value input: font family mono, font size `sm`, color property-value
- Scrubable values: cursor `ew-resize`, hover underline dashed
- Color swatch: `20px x 20px`, border-radius `4px`, border `1px` border-secondary

### State Machine Node

- Border radius: `8px`
- Min width: `140px`
- Padding: `12px 16px`
- Shadow: `lg`
- Background: surface-secondary
- Border: `2px solid` border-primary
- Selected border: primary color
- Active state indicator: `8px` circle, state-active color, top-right
- Font size: `sm`
- Font weight: `500`
- Connection port: `10px` circle, centered on edges
- Transition arrow: `2px` stroke, state-transition color, with arrowhead

### State Machine Connection

- Stroke width: `2px`
- Color: state-transition
- Hover color: accent
- Arrowhead size: `8px`
- Label background: surface, padding `2px 8px`, border-radius `4px`, font size `xs`
- Bezier control offset: `60px`

### Toolbar

- Height: `48px`
- Background: panel
- Border bottom: `1px solid` panel-divider
- Tool icon size: `20px`
- Tool button: `36px x 36px`, border-radius `8px`
- Active tool: primary at `0.15` opacity background, primary icon color
- Separator: `1px` vertical line, `24px` tall, border-primary color
- Tooltip delay: `500ms`

### Playback Controls

- Transport button size: `32px x 32px`
- Play/Pause icon: `16px`
- Timecode display: font family mono, font size `sm`, letter-spacing `0.05em`
- Playhead line: `1px solid` playhead color, full timeline height
- Playhead handle: `12px` wide triangle, playhead color
- Scrub area: full timeline width, cursor `col-resize`

### Export Dialog

- Border radius: `12px`
- Width: `560px`
- Background: surface
- Format selector: pill group, border-radius `9999px`
- Quality slider track: `4px` height, border-radius `9999px`
- Quality slider thumb: `16px` circle, primary color, shadow `md`
- Preview area: `320px x 240px`, background canvas, border-radius `8px`, border `1px` border-primary
- Export button: full width, height `48px`, primary background, font weight `600`

### Canvas

- Background: canvas color
- Grid dots: `rgba(139, 92, 246, 0.08)`, `20px` spacing
- Selection box: `1px dashed` primary, `rgba(139, 92, 246, 0.05)` fill
- Artboard border: `1px solid` border-secondary
- Artboard label: font size `xs`, text-secondary, `8px` above artboard
- Transform handles: `8px` squares, white fill, `1px` primary stroke
- Rotation handle: `8px` circle, offset `20px` above selection, primary stroke
- Zoom level badge: bottom-right, font family mono, font size `xs`, panel background, padding `4px 8px`, border-radius `4px`
