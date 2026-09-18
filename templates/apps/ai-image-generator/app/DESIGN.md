# DESIGN.md — AI Image Generator

## Brand Identity

- **App Name:** Reverie
- **Tagline:** Dream it into existence
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Imaginative, playful, creative, expressive

## Target Persona

Designers, marketers, and creators generating custom images from text prompts with generation controls.

## Screens

| Name             | Route            | Auth | Purpose                                                                                                                                               | deriveFrom |
| ---------------- | ---------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing          | /                | No   | Marketing home with gallery of AI-generated images, purple-pink gradient hero, features, pricing                                                      | —          |
| Login            | /login           | No   | Centered card with purple primary on dreamy gradient background                                                                                       | —          |
| Signup           | /signup          | No   | Create account                                                                                                                                        | Login      |
| ForgotPassword   | /forgot-password | No   | Request reset                                                                                                                                         | Login      |
| ResetPassword    | /reset-password  | No   | Set new password                                                                                                                                      | Login      |
| Dashboard        | /dashboard       | Yes  | Sidebar, credits balance card, generation queue, recent creations grid with image thumbnails                                                          | —          |
| Generate         | /generate        | Yes  | Large prompt bar top with textarea and submit, controls sidebar left (style, aspect ratio, seed, steps, model), canva...                              | —          |
| Gallery          | /gallery         | Yes  | Sidebar, masonry grid 4-col of all generated images, hover reveals prompt preview, click opens lightbox                                               | —          |
| ImageDetail      | /images/:id      | Yes  | Large image center, prompt + metadata (seed, dimensions, model) panel right in mono font, variations row below                                        | —          |
| Styles           | /styles          | Yes  | Sidebar, grid of curated style preset cards with hero thumbnails (photorealistic, anime, watercolor, etc.)                                            | —          |
| Settings         | /settings        | Yes  | Sidebar, billing with credit packages, API keys, account                                                                                              | —          |
| Editor           | /editor/:id      | Yes  | Full-screen image editor with canvas center, fixed bottom toolbar (Inpaint, Outpaint, Erase, Enhance, Color Adjust, Crop), layers/history right panel | —          |
| Collections      | /collections     | Yes  | Sidebar, grid of collection cover cards (mosaic of 4 thumbnails per cover), title + image count, New Collection action                                | —          |
| CollectionDetail | /collections/:id | Yes  | Same masonry grid as Gallery scoped to one collection with header showing collection name, description, and edit/share actions                        | Gallery    |
| Prompts          | /prompts         | Yes  | Sidebar, saved prompt library — list of prompt cards with prompt text in mono font, tags, last-used, run-again button                                 | —          |
| Models           | /models          | Yes  | Sidebar, grid of model cards with preview thumbnail strips, name, description, capabilities badges, select/favorite                                   | —          |
| Notifications    | /notifications   | Yes  | Sidebar, activity feed of generation events (completed, failed, upscaled, queued) grouped by date with thumbnail previews                             | —          |
| Profile          | /profile/:id     | Yes  | Public creator profile with avatar/banner header, bio, stats (creations, followers), and masonry grid of public creations                             | —          |

## App Constraints

- Gallery uses 4-column grid with 16px gap on desktop
- Large prompt bar is prominent (120px min height, expandable to 240px)
- Lightbox viewer shows metadata (seed, dimensions, model) in mono font

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

- Generating: `#7c3aed`
- Generating Light: `#ede9fe`
- Complete: `#10b981`
- Complete Light: `#d1fae5`
- Failed: `#ef4444`
- Failed Light: `#fee2e2`
- Queued: `#6b7280`
- Queued Light: `#f3f4f6`
- Upscaled: `#0ea5e9`
- Upscaled Light: `#e0f2fe`
- NSFW Blocked: `#f59e0b`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Canvas: `#1a1a2e`
- Canvas Light: `#16162a`
- Prompt Bar: `#f5f3ff`

### Text

- Prompt: `#1e1b4b`
- Prompt Placeholder: `#a78bfa`
- Metadata: `#6b7280`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Primary: `#e5e7eb`
- Image Frame: `#e9d5ff`
- Focus: `#7c3aed`
- Drop Zone: `#7c3aed` (dashed, 2px)

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f472b6`
- Background: `#0c0c1d`
- Surface: `#1a1a2e`
- Surface Secondary: `#252547`
- Text Primary: `#f0eeff`
- Text Secondary: `#a5a3c9`
- Border Primary: `#2e2e52`
- Prompt Bar: `#252547`
- Canvas: `#0c0c1d`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Prompt: `"Inter", -apple-system, sans-serif` (font-weight: 400, line-height: 1.6)
- Metadata: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (for seed, dimensions, model info)

## Layout

- Content Max Width: `1440px`
- Gallery Grid Columns: `4` (desktop), `3` (laptop), `2` (tablet), `1` (mobile)
- Gallery Grid Gap: `16px`
- Sidebar Width: `320px` (generation controls)
- Sidebar Collapsed: `0px` (hidden on mobile)
- Prompt Bar Height: `120px` (expandable to `240px`)
- Image Lightbox Max Width: `90vw`
- Image Lightbox Max Height: `85vh`
- Canvas Area Min Height: `500px`

## Components

### Prompt Bar

- Border radius: `16px` (xl)
- Background: prompt-bar
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Padding: `16px 20px`
- Font size: `lg` (18px)
- Min height: `120px`, max height: `240px`
- Resize: vertical
- Submit button: primary, `48px` height, icon-only (sparkle/wand), positioned bottom-right inside bar
- Negative prompt toggle: ghost button, muted text, collapsible section below main prompt

### Image Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `lg`
- Image aspect ratio: preserve original (no cropping in grid)
- Padding: `0` (image flush)
- Overlay on hover: gradient from bottom `rgba(0, 0, 0, 0.6)`, showing prompt snippet + actions
- Hover actions: Download, Variations, Upscale, Edit, Delete (icon buttons, `32px`, ghost white)
- Transition: shadow `300ms ease`, overlay `200ms ease`
- Selection mode: `3px solid` primary border, checkmark badge top-left
- Generation status: badge overlay top-right (generating spinner, complete check, failed x)

### Generation Controls Panel

- Border radius: `12px` (lg) for the panel
- Background: surface
- Padding: `24px`
- Section spacing: `24px`
- Section headers: font-weight `600`, font-size `sm`, text-transform `uppercase`, letter-spacing `0.05em`, color text-secondary

### Style Selector

- Grid: `3` columns, gap `8px`
- Style chip: `border-radius: 8px`, `padding: 8px 12px`, border `1px solid` border-primary
- Active chip: primary background, white text, `font-weight: 600`
- Preview thumbnail on chip: `40px` x `40px`, border-radius `4px`

### Aspect Ratio Picker

- Horizontal button group
- Border radius: `8px` (md) for group, `0` internal
- Options: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`
- Active: primary background, white text
- Inactive: ghost, text-secondary
- Icon: proportional rectangle outline per ratio

### Slider Controls (CFG Scale, Steps, Strength)

- Track height: `4px`
- Track color: border-primary, filled: primary
- Thumb: `20px` circle, primary, shadow `sm`
- Value display: `font-family: metadata`, right-aligned, `font-size: sm`
- Range labels: `font-size: xs`, text-secondary

### Seed Input

- Font family: metadata (monospace)
- Width: `140px`
- Dice icon button (randomize): ghost, `32px`, right of input
- Lock icon toggle: ghost, `32px`, right of dice

### Image Lightbox

- Overlay: `rgba(0, 0, 0, 0.85)`
- Border radius: `12px` (lg) on image container
- Close button: `40px`, ghost white, top-right, `position: fixed`
- Navigation arrows: `48px`, ghost white, vertically centered
- Info panel: bottom bar, `padding: 16px 24px`, dark surface, showing prompt, model, seed, dimensions, generation time
- Actions bar: Download Full, Download Variations, Upscale, Edit, Share — icon + label buttons

### Generation Progress

- Container: inline with image card placeholder
- Background: canvas with subtle animated gradient shimmer
- Progress ring: `64px` diameter, `4px` stroke, primary color
- Step counter: metadata font, centered below ring, e.g. "Step 28/50"
- ETA: text-secondary, font-size `xs`

### Batch Gallery (multi-image generation)

- Grid within a card: `2x2` for 4 images, `1x4` strip for 4 horizontal
- Border radius: `12px` outer card, `4px` inner images
- Selected image: `2px solid` primary
- "Select best" label on hover

### Upload / Img2Img Drop Zone

- Border: `2px dashed` drop-zone color
- Border radius: `12px` (lg)
- Background: primary at `0.04` opacity
- Icon: upload cloud, `48px`, primary at `0.5` opacity
- Hover: primary at `0.08` opacity, border solid
- Active drop: primary at `0.12` opacity, scale `1.02`
- Accepted formats badge: `font-size: xs`, text-secondary

### History / Gallery Sidebar

- Thumbnail size: `80px` x `80px`
- Border radius: `8px` (md)
- Active: `2px solid` primary
- Date group headers: `font-size: xs`, `font-weight: 600`, text-secondary, `text-transform: uppercase`
- Infinite scroll with skeleton loading placeholders

### Model Selector

- Dropdown with preview thumbnails: `48px` x `48px` left of model name
- Model name: `font-weight: 500`
- Model description: `font-size: xs`, text-secondary, single line truncated
- Active model: primary text, checkmark right
- Border radius: `8px` (md) for dropdown items

### Action Toolbar (Image Editing)

- Position: fixed bottom center
- Background: surface, shadow `lg`
- Border radius: `16px` (xl)
- Padding: `8px 16px`
- Tool buttons: `40px` x `40px`, ghost, `border-radius: 8px`
- Active tool: primary background at `0.1` opacity, primary text
- Dividers: `1px solid` border-primary, `24px` height, vertical
- Tools: Inpaint, Outpaint, Erase, Enhance, Color Adjust, Crop
