# DESIGN.md — Photo Sharing

## Brand Identity

- **App Name:** Obscura
- **Tagline:** Light captured, stories shared
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Editorial, warm, contemplative, photographic

## Target Persona

Photographers and enthusiasts who want a gallery-grade experience for sharing and discovering photography with rich metadata and curated galleries.

## Screens

| Name           | Route            | Auth | Purpose                                                            | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Editorial home showcasing featured galleries                       | —          |
| Login          | /login           | No   | Sign in                                                            | —          |
| Signup         | /signup          | No   | Create account                                                     | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                      | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                   | Login      |
| Explore        | /explore         | Yes  | Masonry grid of photos with filter chips                           | —          |
| PhotoDetail    | /photos/:id      | Yes  | Single photo with EXIF sidebar and comments                        | —          |
| Albums         | /albums          | Yes  | Grid of album cards with stacked covers                            | —          |
| MyPhotos       | /my-photos       | Yes  | User's own photo grid                                              | —          |
| Upload         | /upload          | Yes  | Upload dropzone with batch progress                                | —          |
| Favorites      | /favorites       | Yes  | Hearted/favorited photos grid                                      | —          |
| Settings       | /settings        | Yes  | Profile and preferences                                            | —          |
| AlbumDetail    | /albums/:id      | Yes  | Single album hero, curator info, masonry grid of album photos      | —          |
| Profile        | /u/:handle       | Yes  | Public photographer profile with bio, stats, and portfolio masonry | —          |
| Galleries      | /galleries       | Yes  | Editorial-curated gallery collections index with featured hero     | —          |

## App Constraints

- Photo tiles use minimal chrome — no hard borders, rely on hover shadow and gradient overlay
- EXIF metadata uses monospace font (SF Mono) for technical precision
- Editorial serif (Playfair Display) for photo titles and album headings only; rest is Inter

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#c8872e`
- Primary Hover: `#daa04a`
- Primary Dark: `#a66e1f`
- Accent: `#3a7ca5`
- Accent Hover: `#4e94be`
- Accent Dark: `#2d6384`

### Semantic

- EXIF: `#6b7280`
- EXIF Label: `#9ca3af`
- Favorite: `#e04058`
- Favorite Light: `#fce4ec`
- Album Cover: `#1e293b`
- Gallery Highlight: `#c8872e`
- Tag: `#e2e8f0`
- Tag Text: `#475569`
- Tag Active: `#c8872e`
- Tag Active Text: `#ffffff`
- Comment Author: `#c8872e`

### Backgrounds

- Primary: `#f5f3f0`
- Secondary: `#eae6e1`
- Tertiary: `#ddd8d2`
- Surface: `#ffffff`
- Surface Secondary: `#faf9f7`
- Lightbox: `rgba(0, 0, 0, 0.92)`
- Photo Stage: `#1a1a1a`

### Text

- Primary: `#1c1917`
- Secondary: `#78716c`
- Tertiary: `#57534e`
- Inverse: `#fafaf9`
- Link: `#c8872e`
- Link Hover: `#a66e1f`
- Photo Title: `#1c1917`
- Photo Caption: `#57534e`

### Borders

- Primary: `#e7e5e4`
- Secondary: `#d6d3d1`
- Focus: `#c8872e`

### Dark Theme Overrides

- Primary: `#daa04a`
- Accent: `#5eb3e4`
- Background: `#0c0a09`
- Surface: `#1c1917`
- Surface Secondary: `#292524`
- Text Primary: `#fafaf9`
- Text Secondary: `#a8a29e`
- Border Primary: `#44403c`
- Photo Stage: `#0c0a09`
- Tag: `#292524`
- Tag Text: `#d6d3d1`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"Playfair Display", Georgia, "Times New Roman", serif`
- EXIF: `"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Usage

- Display font for photo titles, album names, and gallery headings
- Body font for all UI text, descriptions, comments, and navigation
- EXIF font for metadata display (camera model, aperture, ISO, shutter speed)

## Layout

- Content Max Width: `1400px`
- Photo Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Photo Grid Gap: `8px`
- Masonry Layout: enabled for Explore/Gallery views (variable-height tiles)
- Sidebar Width: `280px` (photo detail page — EXIF + actions)
- Lightbox Max Image: `90vw × 85vh`
- Album Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Album Grid Gap: `16px`
- Comment Thread Indent: `32px`
- Photo Detail Max Width: `1200px`

## Components

### Photo Card (Grid Tile)

- Border radius: `4px` (sm)
- Shadow: none (flush grid aesthetic)
- Hover: `md` shadow + slight scale `1.01`
- Image: fill container, `object-fit: cover`
- Overlay on hover: gradient from transparent to `rgba(0,0,0,0.5)` at bottom
- Overlay shows: title, author avatar (24px circle), favorite count
- Transition: `300ms ease` for overlay and shadow

### Photo Detail View

- Image: centered, max-width `100%`, dark stage background
- Title: Display font, `2xl` (24px), weight `700`
- Description: Body font, `base` (16px), secondary text color
- Author row: 40px avatar, name in `semibold`, date in secondary text
- Action bar: Favorite, Comment, Share, Add to Album — icon buttons, `40px` height
- EXIF panel: right sidebar on desktop, collapsible accordion on mobile

### EXIF Metadata Panel

- Background: surface-secondary
- Border radius: `8px` (md)
- Padding: `16px`
- Label: EXIF font, `xs` (12px), EXIF Label color, uppercase, `letter-spacing: 0.05em`
- Value: EXIF font, `sm` (14px), primary text color
- Row spacing: `12px`
- Fields: Camera, Lens, Focal Length, Aperture, Shutter Speed, ISO, Date Taken, Location
- Dividers: `1px solid` border-primary between groups

### Album Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Cover image: `16:10` aspect ratio, top-flush
- Cover stack: 3-image fanned stack effect (top image full, 2 behind offset `4px` each)
- Content padding: `16px`
- Title: Display font, `lg` (18px), weight `600`
- Photo count: `sm` (14px), secondary text
- Transition: `300ms ease`

### Gallery Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Cover: `2×2` mini-grid of thumbnails, `4px` gap, `1:1` aspect ratio per thumb
- Content padding: `16px`
- Title: Display font, `lg` (18px), weight `600`
- Curator: `sm` (14px), secondary text, with 20px avatar

### Favorite Button

- Default: outline heart icon, secondary text color
- Active: filled heart icon, Favorite color (`#e04058`)
- Transition: `150ms ease` with slight scale bounce (`1.2` → `1.0`)
- Count: `sm` (14px), next to icon

### Tag Chip

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Background: Tag color
- Text: Tag Text color, `sm` (14px), weight `500`
- Active/Selected: Tag Active background, Tag Active Text
- Hover: darken background `5%`
- Spacing between tags: `8px`

### Comment Thread

- Author avatar: `32px` circle
- Author name: `sm` (14px), weight `600`, Comment Author color
- Timestamp: `xs` (12px), secondary text
- Body: `sm` (14px), primary text, line-height `1.5`
- Reply indent: `32px` left with `2px solid` border-primary left border
- Spacing between comments: `16px`

### Upload Dropzone

- Border: `2px dashed` border-secondary
- Border radius: `12px` (lg)
- Background: surface-secondary
- Min height: `240px`
- Hover/Dragover: border color → Primary, background → `rgba(200, 135, 46, 0.05)`
- Icon: `48px` upload cloud icon, secondary text
- Text: `lg` (18px), secondary text — "Drop photos here or click to browse"
- Accepts: JPEG, PNG, WebP, HEIC, TIFF, RAW (CR2, NEF, ARW)
- Progress bar: Primary color, `4px` height, `9999px` radius

### Lightbox

- Overlay: Lightbox background (`rgba(0, 0, 0, 0.92)`)
- Image: max `90vw × 85vh`, `object-fit: contain`
- Navigation arrows: `48px` circle, `rgba(255,255,255,0.15)` background, hover `rgba(255,255,255,0.3)`
- Close button: top-right, `36px`, white icon
- Bottom bar: photo title, EXIF summary (camera + settings), favorite/share actions
- Keyboard: Left/Right arrows navigate, Escape closes, F toggles fullscreen
- Transition: fade `300ms ease`

### Sidebar Navigation

- Width: `240px` (collapsed: `64px`)
- Sections: Explore, My Photos, Albums, Galleries, Favorites, Tags
- Active item: `rgba(200, 135, 46, 0.1)` background, Primary text
- Icon size: `20px`
- Item padding: `10px 16px`
- Section divider: `1px solid` border-primary with `16px` vertical margin
