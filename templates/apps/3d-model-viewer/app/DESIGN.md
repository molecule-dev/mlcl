# DESIGN.md — 3D Model Viewer

## Brand Identity

- **App Name:** Tessera
- **Tagline:** Every surface tells a story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Immersive, precise, crafted, technical

## Target Persona

3D artists, product designers, and game developers who need to share, review, and present 3D models with clients and collaborators.

## Screens

| Name           | Route                   | Auth | Purpose                                                                | deriveFrom  |
| -------------- | ----------------------- | ---- | ---------------------------------------------------------------------- | ----------- |
| Landing        | /                       | No   | Marketing home page                                                    | —           |
| Login          | /login                  | No   | Sign in                                                                | —           |
| Signup         | /signup                 | No   | Create account                                                         | Login       |
| ForgotPassword | /forgot-password        | No   | Request reset                                                          | Login       |
| ResetPassword  | /reset-password         | No   | Set new password                                                       | Login       |
| Dashboard      | /dashboard              | Yes  | Model library overview with stats and recent activity                  | —           |
| ModelLibrary   | /models                 | Yes  | Browsable grid of all 3D models with filters                           | —           |
| ModelViewer    | /models/:id             | Yes  | Full-screen 3D viewport with annotations and inspector                 | —           |
| Upload         | /upload                 | Yes  | Drag-drop 3D file uploader with format validation                      | —           |
| Annotations    | /models/:id/annotations | Yes  | Threaded annotation review panel                                       | ModelViewer |
| Embed          | /models/:id/embed       | Yes  | Generate embeddable viewer snippets                                    | —           |
| Settings       | /settings               | Yes  | Account, renderer, and team settings                                   | —           |
| ModelEdit      | /models/:id/edit        | Yes  | Edit model metadata, tags, format, polycount target, public/private    | —           |
| Notifications  | /notifications          | Yes  | Activity feed of comments, mentions, render completions, share invites | —           |

## App Constraints

- ModelViewer must feature a large dark viewport surface (`#1a1a2e`) with floating toolbar and inspector sidebar
- All renderer/polycount HUD values use mono font with tabular-nums
- Annotation pins use warm amber (`#f59e0b`) — never primary color

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#ec4899`
- Accent Hover: `#f472b6`
- Accent Dark: `#db2777`
- Canvas: `#1a1a2e`

### Semantic

- Annotation Active: `#f59e0b`
- Annotation Resolved: `#6b7280`
- Wireframe: `#06b6d4`
- Texture Loaded: `#10b981`
- Render Error: `#ef4444`
- Embed Active: `#8b5cf6`
- Polycount Warning: `#f59e0b`
- Polycount Danger: `#ef4444`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Viewport: `#1a1a2e`
- Viewport Grid: `rgba(124, 58, 237, 0.08)`
- Toolbar: `#0f0f23`
- Inspector Panel: `#f5f3ff`

### Text

- Price: `#111827`
- Viewport Overlay: `#e2e8f0`
- Annotation Label: `#fbbf24`
- Metadata: `#8b8b9e`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Viewport: `#2d2d4a`
- Annotation Pin: `#f59e0b`
- Focus: `#7c3aed`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f472b6`
- Background: `#0c0c1d`
- Surface: `#1a1a2e`
- Surface Secondary: `#242445`
- Text Primary: `#f1f5f9`
- Text Secondary: `#a5a5c0`
- Border Primary: `#2d2d4a`
- Inspector Panel: `#1e1e38`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-weight: 700)
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Viewport HUD: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Viewport Min Height: `500px`
- Viewport Preferred Height: `65vh`
- Inspector Sidebar Width: `320px`
- Inspector Sidebar Collapsed: `48px`
- Toolbar Height: `48px`
- Annotation Panel Width: `360px`
- Model Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Model Grid Gap: `24px`
- Embed Min Width: `400px`
- Embed Min Height: `300px`

## Components

### 3D Viewport

- Border radius: `12px` (lg)
- Background: canvas (`#1a1a2e`)
- Border: `1px solid` viewport border
- Shadow: `lg`
- Loading state: pulsing gradient overlay with brand primary → accent
- Grid floor: 1px lines at viewport-grid color, fading with distance
- Corner controls: semi-transparent `rgba(15, 15, 35, 0.75)` pill buttons, `8px` radius

### Viewport Toolbar

- Background: toolbar (`#0f0f23`)
- Border radius: `8px` (md), floating `12px` from viewport bottom
- Height: `44px`
- Padding: `4px 8px`
- Icon size: `20px`, color: viewport-overlay
- Active tool: primary background, `4px` radius
- Separator: `1px solid rgba(255, 255, 255, 0.1)`, `16px` margin
- Shadow: `xl`

### Model Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Thumbnail aspect ratio: `16:10`
- Thumbnail background: canvas with subtle gradient
- Padding: `0` (thumbnail flush) + `16px` (content area)
- Hover: thumbnail zooms to `1.03` scale, `300ms ease`
- Polycount badge: bottom-left of thumbnail, `rgba(15, 15, 35, 0.8)` background, mono font, `xs` size
- Format badge: top-right of thumbnail, primary background, white text, pill shape

### Annotation Pin

- Size: `28px` circle
- Background: annotation-active (`#f59e0b`)
- Border: `2px solid #ffffff`
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`
- Number label: `11px`, bold, centered, white text
- Hover: scale `1.15`, `150ms ease`
- Resolved state: annotation-resolved background, `60%` opacity
- Connector line: `1px dashed` annotation-active from pin to surface point

### Annotation Panel

- Width: annotation panel width (`360px`)
- Background: surface
- Border-left: `1px solid` border-primary
- Thread item padding: `16px`
- Thread divider: `1px solid` border-primary
- Author avatar: `28px` circle
- Timestamp: `xs` font, secondary text color
- Reply indent: `24px` left margin

### Inspector Sidebar

- Width: inspector sidebar width (`320px`)
- Background: inspector-panel
- Section heading: `sm` font, `600` weight, uppercase, secondary text, `8px` bottom margin
- Property row: flex between label (secondary text, `sm`) and value (primary text, `sm`, mono font)
- Property row height: `32px`
- Section divider: `1px solid` border-primary, `16px` vertical margin
- Collapsible chevron: `12px`, secondary text color

### Embed Configurator

- Border radius: `12px` (lg)
- Preview frame: canvas background, `8px` border-radius
- Code block: mono font, `sm` size, `#1a1a2e` background, `8px` padding, `8px` radius
- Copy button: ghost variant, positioned top-right of code block
- Size presets: pill toggle group, `sm` size, primary active state
- Responsive toggle: switch component with viewport width preview

### View Mode Toggle

- Border radius: `9999px` (pill)
- Background: surface-secondary
- Segment padding: `6px 16px`
- Active segment: primary background, white text, `sm` shadow
- Options: Solid / Wireframe / Textured / Matcap
- Transition: `150ms ease` slide

### Upload Dropzone

- Border: `2px dashed` border-secondary
- Border radius: `16px` (xl)
- Background: surface-secondary
- Padding: `48px`
- Hover/drag-active: border-primary color, primary-light background tint
- Icon: `48px`, secondary text color
- Accepted formats label: mono font, `xs` size, tertiary text

### Search Bar

- Border radius: `9999px` (pill)
- Height: `44px`
- Background: surface
- Border: `1px solid` border-primary
- Focus: `2px solid` primary, surface background
- Icon: `18px`, secondary text, `12px` left padding
- Filters dropdown: tags-style pills for format (.glb, .obj, .fbx), category, polycount range

### Comment Thread

- Border radius: `8px` (md)
- Background: surface
- Padding: `12px 16px`
- Author name: `sm` font, `600` weight
- Body: `sm` font, normal weight
- Timestamp: `xs` font, secondary text
- Reply button: ghost variant, `xs` size
- Linked annotation: accent left border `3px solid`, annotation number badge inline
