# DESIGN.md — Video Editor

## Brand Identity

- **App Name:** Rushes
- **Tagline:** Cut. Create. Captivate.
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Cinematic, precise, empowering, dark-ambient

## Target Persona

Independent creators, filmmakers, and social media producers who need a professional-grade timeline editor in the browser without the complexity of desktop software.

## Screens

| Name           | Route            | Auth | Purpose                                                                | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with feature highlights and editor preview              | —          |
| Login          | /login           | No   | Sign in                                                                | —          |
| Signup         | /signup          | No   | Create account                                                         | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                          | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                       | Login      |
| Dashboard      | /dashboard       | Yes  | Project library with recent projects and usage stats                   | —          |
| Editor         | /editor/:id      | Yes  | Full timeline editor with asset panel, preview, and inspector          | —          |
| AssetLibrary   | /assets          | Yes  | Media asset browser with upload and organization                       | —          |
| ExportQueue    | /export          | Yes  | Render queue with progress tracking and download management            | —          |
| Templates      | /templates       | Yes  | Browse and apply pre-built project templates                           | —          |
| Settings       | /settings        | Yes  | Account, preferences, storage, and billing                             | —          |
| NewProject     | /projects/new    | Yes  | Create new project — name, aspect ratio, resolution, optional template | —          |
| ProjectDetail  | /projects/:id    | Yes  | Single project hub — metadata, version history, render history, share  | —          |
| AssetDetail    | /assets/:id      | Yes  | Single asset preview with metadata, used-in info, replace/delete       | —          |
| TemplateDetail | /templates/:id   | Yes  | Full template preview with cinematic playback and apply action         | —          |
| ExportDetail   | /export/:id      | Yes  | Single render job with progress, logs, download, and share             | —          |

## App Constraints

- Editor screen is a 4-zone layout: left asset panel (280px), center preview + playback controls, right inspector panel (300px), bottom timeline (240px resizable)
- Dark-first UI — all authenticated screens use the dark background palette (`#0f0f14` primary background)
- Timeline tracks are color-coded by clip type: video (purple), audio (cyan), image (amber), text (pink)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Creative Gradient: `linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)`

### Semantic

- Playing: `#22c55e`
- Playing Light: `#dcfce7`
- Paused: `#f59e0b`
- Rendering: `#3b82f6`
- Rendering Light: `#dbeafe`
- Render Complete: `#22c55e`
- Render Failed: `#ef4444`
- Clip Audio: `#06b6d4`
- Clip Video: `#7c3aed`
- Clip Image: `#f59e0b`
- Clip Text: `#ec4899`
- Transition: `#8b5cf6`

### Backgrounds

- Primary: `#0f0f14`
- Secondary: `#16161d`
- Tertiary: `#1e1e28`
- Surface: `#1a1a24`
- Surface Secondary: `#22222e`
- Input: `#1e1e28`
- Timeline: `#0c0c10`
- Timeline Track: `#18181f`
- Preview: `#000000`
- Overlay: `rgba(0, 0, 0, 0.7)`

### Text

- Primary: `#f1f0f5`
- Secondary: `#9896a6`
- Tertiary: `#6b6880`
- Inverse: `#0f0f14`
- Link: `#8b5cf6`
- Link Hover: `#a78bfa`
- Timecode: `#e0def0`

### Borders

- Primary: `#2a2a38`
- Secondary: `#363645`
- Focus: `#7c3aed`
- Track Separator: `#2a2a38`

### Dark Theme Overrides

Not applicable — Rushes uses a dark-first design. The values above ARE the default theme.

### Light Theme Overrides

- Primary: `#7c3aed`
- Background: `#f4f3f8`
- Surface: `#ffffff`
- Surface Secondary: `#f0eff5`
- Text Primary: `#1a1a24`
- Text Secondary: `#6b6880`
- Border Primary: `#e0dfe8`
- Timeline: `#eae9f0`
- Timeline Track: `#f0eff5`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Timecode: `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Overrides

- Timecode font size: `0.75rem` (12px), weight `500`, letter-spacing `0.05em`
- Panel headings: `0.6875rem` (11px), weight `600`, uppercase, letter-spacing `0.08em`

## Layout

- Content Max Width: `100vw` (full bleed — video editors use every pixel)
- Preview Panel: `flex: 1` of center column, minimum `480px` width
- Asset Panel Width: `280px` (left sidebar, collapsible)
- Inspector Panel Width: `300px` (right sidebar, collapsible)
- Timeline Height: `240px` (default), resizable `120px–480px`
- Timeline Track Height: `48px`
- Timeline Ruler Height: `28px`
- Top Toolbar Height: `48px`
- Playback Controls Height: `56px`
- Minimum App Width: `1024px`

### Panel Grid (3-column + bottom)

```
┌──────────┬────────────────────────┬──────────┐
│  Assets  │       Preview          │Inspector │
│  280px   │       flex: 1          │  300px   │
│          │                        │          │
│          ├────────────────────────┤          │
│          │   Playback Controls    │          │
├──────────┴────────────────────────┴──────────┤
│                  Timeline                     │
│                  240px                        │
└───────────────────────────────────────────────┘
```

## Components

### Timeline Track

- Height: `48px`
- Background: timeline-track color
- Border bottom: `1px solid` track-separator
- Clip border radius: `4px`
- Clip padding: `4px 8px`
- Clip label font: `11px`, weight `500`, truncated with ellipsis
- Video clip: primary color at `20%` opacity, left border `3px solid` primary
- Audio clip: clip-audio color at `20%` opacity, left border `3px solid` clip-audio
- Image clip: clip-image color at `20%` opacity, left border `3px solid` clip-image
- Text clip: clip-text color at `20%` opacity, left border `3px solid` clip-text
- Selected clip: `1px solid` primary, shadow `0 0 0 1px` primary at `40%` opacity
- Drag ghost: `60%` opacity

### Timeline Ruler

- Height: `28px`
- Background: timeline color
- Tick marks: text-tertiary, major ticks `12px` tall, minor `6px`
- Timecode labels: timecode font, text-secondary
- Playhead: `2px` wide, accent color, full timeline height, `12px` triangle top cap

### Playback Controls

- Height: `56px`
- Background: surface color
- Button size: `36px` (play/pause `40px`)
- Icon size: `18px` (play/pause `22px`)
- Play button: accent background, inverse text, `50%` border-radius (circle)
- Other controls: ghost variant, text-secondary, hover text-primary
- Timecode display: timecode font, `14px`, text-primary, centered

### Preview Panel

- Background: preview (pure black)
- Border radius: `0` (flush edges)
- Video centered with letterbox/pillarbox as needed
- Overlay controls: `opacity: 0` default, `opacity: 1` on hover, transition `150ms`
- Safe zone guides: `1px dashed` text-tertiary at `20%` opacity

### Asset Panel

- Width: `280px`
- Section header: panel heading font style
- Thumbnail grid: `2` columns, `4px` gap
- Thumbnail aspect ratio: `16:9`
- Thumbnail border radius: `4px`
- Thumbnail hover: `1px solid` primary, shadow `sm`
- Drag handle: `cursor: grab`
- Asset type icon: `12px`, bottom-left overlay badge with corresponding clip type color

### Inspector Panel

- Width: `300px`
- Section header: panel heading font style, collapsible with `chevron` icon
- Input fields: compact variant — `32px` height, `12px` font, `6px` border-radius
- Label font: `11px`, text-secondary, `4px` bottom margin
- Slider track: `4px` height, border-primary, `4px` border-radius
- Slider thumb: `14px` circle, primary color, shadow `sm`
- Color picker swatch: `24px` circle, `1px solid` border-secondary
- Section spacing: `16px`

### Transition Picker

- Grid: `3` columns, `8px` gap
- Transition tile: `80px` square, border-radius `8px`
- Tile background: surface-secondary
- Tile hover: `1px solid` primary, shadow `sm`
- Preview animation: plays on hover, `1s` loop
- Selected: `2px solid` primary, primary at `10%` background tint
- Label: `10px`, text-secondary, centered below tile, `4px` top margin

### Export Dialog

- Modal size: `lg` (640px)
- Preset cards: border-radius `8px`, padding `12px 16px`, surface-secondary background
- Preset card selected: `2px solid` primary, primary at `8%` background tint
- Progress bar: `6px` height, `9999px` border-radius, creative-gradient fill
- Progress percentage: timecode font, `14px`, text-primary
- Quality selector: segmented control with `sm` border-radius, `32px` height
- Estimated file size: `13px`, text-secondary, mono font

### Clip Toolbar (contextual, above preview)

- Height: `40px`
- Background: surface color
- Button size: `32px`
- Icon size: `16px`
- Divider: `1px solid` border-primary, `16px` tall, vertical
- Tools: split, trim, crop, speed, volume, filters — icon + tooltip

### Keyboard Shortcut Hints

- Badge style: `20px` height, `4px` border-radius, surface-secondary background
- Font: timecode font, `10px`, text-tertiary
- Position: below or beside relevant controls
- Common: `Space` play/pause, `S` split, `Del` delete, `Cmd+Z` undo, `Cmd+E` export
