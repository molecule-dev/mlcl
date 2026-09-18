# DESIGN.md — Presentation Builder

## Brand Identity

- **App Name:** Overture
- **Tagline:** Command the stage
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Confident, theatrical, polished, command-ready

## Target Persona

Sales leaders, product managers, and speakers crafting pitch decks, keynotes, and investor updates.

## Screens

| Name           | Route              | Auth | Purpose                                                                      | deriveFrom |
| -------------- | ------------------ | ---- | ---------------------------------------------------------------------------- | ---------- |
| Landing        | /                  | No   | Marketing home with deck showcase                                            | —          |
| Login          | /login             | No   | Sign in                                                                      | —          |
| Signup         | /signup            | No   | Create account                                                               | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                                | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                             | Login      |
| Decks          | /decks             | Yes  | Grid of user's deck thumbnails                                               | —          |
| Editor         | /decks/:id/edit    | Yes  | Slide editor with thumbnail rail                                             | —          |
| Present        | /decks/:id/present | Yes  | Full-screen presenter view                                                   | —          |
| Templates      | /templates         | Yes  | Browse templates library                                                     | —          |
| Settings       | /settings          | Yes  | Profile, brand kit, collaboration                                            | —          |
| Analytics      | /analytics         | Yes  | Deck performance dashboard — views, engagement, audience drop-off, top decks | —          |
| Shared         | /shared            | Yes  | Shared-with-me and shared-by-me decks, permissions, pending invites          | —          |
| Notifications  | /notifications     | Yes  | Activity feed: comments, mentions, share invites, deck view alerts           | —          |

## App Constraints

- Slide canvas is deep navy stage (#0f172a) — slide content pops against the dark stage
- Template cards preserve 16:9 aspect ratio faithfully
- Active slide has 2px primary purple border glow

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Stage: `#0f172a` (slide canvas/stage background)

### Semantic

- Active Slide: `#7c3aed`
- Active Slide Light: `#ede9fe`
- Editing: `#f59e0b`
- Editing Light: `#fef3c7`
- Presenting: `#06b6d4`
- Presenting Light: `#cffafe`
- Collaborator 1: `#7c3aed`
- Collaborator 2: `#ec4899`
- Collaborator 3: `#06b6d4`
- Collaborator 4: `#f59e0b`
- Animation Keyframe: `#ec4899`
- Animation Path: `rgba(236, 72, 153, 0.3)`

### Backgrounds

- Canvas: `#1e1e2e` (slide editing area behind slide)
- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Slide Panel: `#f8f7fc`
- Properties Panel: `#ffffff`
- Timeline: `#f1f0f7`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Slide Number: `#9ca3af`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Primary: `#e5e1f0`
- Focus: `#7c3aed`
- Slide Outline: `#d4d0e8`
- Selected: `#7c3aed`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f472b6`
- Background: `#0f0d1a`
- Surface: `#1a1830`
- Surface Secondary: `#231f3e`
- Canvas: `#0a0a14`
- Text Primary: `#f0eeff`
- Text Secondary: `#a5a0c0`
- Border Primary: `#2e2a50`
- Slide Panel: `#1a1830`
- Timeline: `#1a1830`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Plus Jakarta Sans", Inter, -apple-system, sans-serif`
- Slide Default: `Inter, -apple-system, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace`

### Font Sizes

- Slide Title (on canvas): `3rem` (48px)
- Slide Subtitle (on canvas): `1.5rem` (24px)
- Slide Body (on canvas): `1.125rem` (18px)
- Panel Heading: `0.75rem` (12px), uppercase, `600` weight, `0.05em` tracking
- Slide Thumbnail Label: `0.6875rem` (11px)

## Layout

- Content Max Width: `1440px`
- Editor Canvas: fluid, fills available space between panels
- Slide Aspect Ratio: `16:9` (default), `4:3`, `16:10` supported
- Left Panel Width (Slide Thumbnails): `220px` (collapsed: `0px`)
- Right Panel Width (Properties): `300px` (collapsed: `0px`)
- Top Toolbar Height: `52px`
- Bottom Timeline Height: `120px` (collapsed: `40px`)
- Slide Thumbnail Height: `110px`
- Slide Thumbnail Gap: `8px`
- Toolbar Icon Size: `20px`
- Toolbar Group Gap: `2px` (between buttons), `12px` (between groups)

## Components

### Slide Thumbnail

- Border radius: `6px`
- Border: `2px solid transparent`, selected: `2px solid` primary
- Shadow: `sm`, hover: `md`
- Background: `#ffffff`
- Aspect ratio: `16:9`
- Active indicator: `3px` left border in primary color
- Drag handle: visible on hover, `12px` grip dots
- Slide number: bottom-left, `11px`, muted text

### Slide Canvas

- Border radius: `4px`
- Shadow: `lg`
- Background: `#ffffff` (default slide bg)
- Selection handles: `8px` circles, primary fill, white border
- Grid snap: `8px` increments (toggleable)
- Guide lines: `#ec4899` at `0.5px`, dashed

### Toolbar Button

- Border radius: `6px`
- Size: `36px` square
- Icon size: `20px`
- Background: transparent, hover: `rgba(124, 58, 237, 0.08)`
- Active: `rgba(124, 58, 237, 0.12)`, primary icon color
- Tooltip: bottom, `8px` offset, `300ms` delay
- Divider between groups: `1px solid` border-primary, `8px` vertical padding

### Properties Panel

- Section border radius: `8px`
- Section padding: `12px 16px`
- Section header: `12px` uppercase, `600` weight, `0.05em` tracking
- Input height: `32px` (compact)
- Color swatch: `24px` circle, `1px` border, checkered transparency bg
- Slider track: `4px` height, border-primary bg, primary fill
- Slider thumb: `14px` circle, primary fill, white border, `md` shadow
- Collapse chevron: `16px`, `150ms` rotation

### Theme Card

- Border radius: `12px`
- Shadow: `sm`, hover: `md`
- Aspect ratio: `16:9`
- Padding: `0` (preview flush) + `12px` (label)
- Selected: `2px solid` primary, primary-light shadow glow
- Label: `13px`, `500` weight, centered below preview
- Preview: miniature slide rendering with theme colors applied

### Animation Timeline

- Track height: `32px`
- Keyframe diamond: `10px` rotated square, accent fill
- Keyframe selected: `12px`, accent-dark fill, `2px` white border
- Duration bar: `4px` height, accent with `0.3` opacity
- Playhead: `2px` wide, accent color, full timeline height
- Scrubber handle: `12px` circle, accent fill, `md` shadow
- Time ruler: `24px` height, `1px` ticks, `10px` major ticks
- Track label: `11px`, muted, `100px` fixed width

### Shape Toolbar (Floating)

- Border radius: `12px`
- Shadow: `xl`
- Background: surface, `1px` border
- Padding: `8px`
- Button size: `40px` square
- Icon size: `22px`
- Appears on element selection, positioned above selected element

### Presenter View

- Background: `#000000`
- Current slide: fills 60% of width
- Next slide preview: `30%` width, `0.6` opacity border
- Speaker notes: below current slide, `18px` body text, light-on-dark
- Timer: top-right, `2rem` tabular-nums, `#06b6d4`
- Slide counter: `current / total`, `1.25rem`, muted

### Collaboration Cursor

- Cursor size: `20px`
- Name label: `11px`, `500` weight, pill-shaped (`9999px` radius)
- Label padding: `2px 8px`
- Label offset: `16px` right, `16px` below cursor tip
- Color: assigned from Collaborator 1-4 palette
- Fade out: `3000ms` idle, `500ms` transition

### Export Dialog

- Border radius: `12px` (lg)
- Width: `560px`
- Format option: `48px` height, `8px` radius, outline style
- Format option selected: primary border, primary-light background
- Preview thumbnail: `200px` width, `16:9` aspect, `md` shadow
- Quality slider: same as properties panel slider
- Export button: full width, `48px` height, primary solid

## Transitions

- Slide Switch: `200ms ease-out` (thumbnail click to canvas update)
- Panel Collapse: `250ms ease` (sidebar open/close)
- Timeline Scrub: `0ms` (immediate, no easing — must feel direct)
- Canvas Zoom: `200ms ease-out`
- Element Transform: `0ms` during drag, `150ms ease` on snap
- Theme Apply: `400ms ease` (color/font transitions across slide)
- Presenter Slide Advance: `300ms ease-in-out`

## Z-Index Overrides

- Canvas Elements: `1–100` (layered per slide z-order)
- Selection Handles: `200`
- Floating Toolbar: `300`
- Guide Lines: `150`
- Collaboration Cursors: `400`
- Presenter Overlay: `1500`
