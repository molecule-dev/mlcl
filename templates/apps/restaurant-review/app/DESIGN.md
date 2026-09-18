# DESIGN.md — Restaurant Review

## Brand Identity

- **App Name:** Morsel
- **Tagline:** Every bite tells a story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Sensory, appetizing, candid, curious

## Target Persona

Food enthusiasts browsing restaurant reviews, writing their own, and tracking favorite spots.

## Screens

| Name             | Route                   | Auth | Purpose                                                                         | deriveFrom  |
| ---------------- | ----------------------- | ---- | ------------------------------------------------------------------------------- | ----------- |
| Landing          | /                       | No   | Marketing home with featured eateries                                           | —           |
| Login            | /login                  | No   | Sign in                                                                         | —           |
| Signup           | /signup                 | No   | Create account                                                                  | Login       |
| ForgotPassword   | /forgot-password        | No   | Request reset                                                                   | Login       |
| ResetPassword    | /reset-password         | No   | Set new password                                                                | Login       |
| Discover         | /discover               | Yes  | Browse restaurants with map + filters                                           | —           |
| RestaurantDetail | /restaurants/:id        | Yes  | Restaurant detail with menu, reviews, gallery                                   | —           |
| WriteReview      | /restaurants/:id/review | Yes  | Review form with ratings and photos                                             | —           |
| MyReviews        | /my-reviews             | Yes  | User's reviews history                                                          | —           |
| Favorites        | /favorites              | Yes  | Saved restaurants                                                               | —           |
| Settings         | /settings               | Yes  | Profile, dietary preferences, notifications                                     | —           |
| Profile          | /users/:id              | Yes  | Public reviewer profile with reviews, photos, badges, stats                     | —           |
| Notifications    | /notifications          | Yes  | Activity feed for helpful votes, follows, replies, mentions, restaurant updates | —           |
| Lists            | /lists                  | Yes  | Curated restaurant lists hub — yours plus trending community lists              | —           |
| EditReview       | /reviews/:id/edit       | Yes  | Edit existing review                                                            | WriteReview |

## App Constraints

- Five-level semantic rating colors (Excellent → Bad) shown as star fills
- Price level ($, $$, $$$, $$$$) always shown as 4 dots/dollar signs with active count
- Photo galleries use tight grid, review photos chip attached below heading

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#c0392b`
- Primary Hover: `#d44637`
- Primary Dark: `#a93226`
- Accent: `#d4a017`
- Accent Hover: `#e0b530`
- Accent Dark: `#b8860b`

### Semantic

- Rating Excellent: `#2d8a4e`
- Rating Good: `#5ba84c`
- Rating Average: `#d4a017`
- Rating Poor: `#d96c2c`
- Rating Bad: `#c0392b`
- Open Now: `#2d8a4e`
- Closed: `#9ca3af`
- Price Active: `#1e293b`
- Price Inactive: `#d1d5db`
- Verified: `#2563eb`
- Verified Light: `#dbeafe`
- Photo Overlay: `rgba(0, 0, 0, 0.35)`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf8f6`
- Surface Warm: `#fdf6f0`
- Map Infobox: `#ffffff`

### Text

- Rating Score: `#1e293b`
- Review Body: `#374151`
- Restaurant Name: `#111827`
- Cuisine Tag: `#6b7280`
- Link: `#c0392b`
- Link Hover: `#a93226`

### Borders

- Card: `#f0ebe6`
- Divider: `#f0ebe6`
- Focus: `#c0392b`

### Dark Theme Overrides

- Primary: `#ef5350`
- Accent: `#fbbf24`
- Background: `#1a1412`
- Surface: `#2a2220`
- Surface Secondary: `#332a28`
- Text Primary: `#faf5f2`
- Text Secondary: `#c4b8b0`
- Border Primary: `#3d3533`

## Typography

### Font Families

- Heading: `"DM Serif Display", Georgia, "Times New Roman", serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Review: `"Lora", Georgia, serif`
- Score: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1200px`
- Restaurant Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Restaurant Grid Gap: `24px`
- Sidebar Filter Width: `280px`
- Map Panel Width: `50%` (split view), `100%` (full map)
- Photo Gallery Grid: `3` columns, `8px` gap
- Review Column Max Width: `720px`

## Components

### Restaurant Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:10`
- Padding: `0` (image flush) + `16px` (content area)
- Cuisine tags: pill badges, `#f0ebe6` background, `12px` font
- Price level: `$$$$` format, active vs inactive color
- Distance badge: bottom-left overlay on image, `rgba(0,0,0,0.6)` background, white text

### Star Rating

- Star size: `18px` (card), `24px` (detail page), `32px` (write review)
- Filled color: `#d4a017` (accent)
- Half-filled: linear gradient split
- Empty color: `#e5e0da`
- Score display: bold `1.5rem` next to stars with `0.875rem` review count

### Rating Distribution Bar

- Height: `8px`
- Border radius: `4px` (full)
- Fill color: `#d4a017` (accent)
- Track color: `#f0ebe6`
- Label: `5 ★` left-aligned, count right-aligned

### Review Card

- Border radius: `8px` (md)
- Border-bottom: `1px solid` divider
- No shadow (flat, content-focused)
- Author avatar: `40px` circle
- Review text font: review family (Lora), `1rem`, line-height `1.7`
- Photo thumbnails: `80px` squares, `8px` radius, `8px` gap, max 5 visible + "+N" overflow
- Helpful button: ghost variant, `14px` font, thumbs-up icon

### Map Pin

- Default: primary color, `28px` tall
- Selected/Active: primary-dark, `36px` tall, `md` shadow
- Cluster: `40px` circle, primary background, white bold count text
- Infobox: `280px` width, `8px` radius, `sm` shadow, restaurant thumbnail + name + rating

### Search Bar

- Border radius: `9999px` (pill)
- Height: `48px`
- Shadow: `md`
- Padding: `8px 20px`
- Search icon: `20px`, secondary text color
- Location divider: `1px solid` border-primary, `24px` tall vertical line
- Clear button: `20px` circle, `#e5e0da` background

### Cuisine Filter Chips

- Border radius: `9999px` (pill)
- Padding: `6px 16px`
- Font size: `sm` (14px)
- Default: `#f0ebe6` background, primary text
- Active: primary background, white text
- Icon: `16px` emoji or icon left of label

### Photo Gallery

- Thumbnail radius: `8px` (md)
- Main image radius: `12px` (lg)
- Lightbox overlay: `rgba(0, 0, 0, 0.85)`
- Counter badge: `rgba(0, 0, 0, 0.6)` background, white text, bottom-right of hero image
- Upload dropzone: dashed `2px` border, `#f0ebe6` color, `12px` radius

### Menu Section

- Section header: heading font, `1.25rem`, `600` weight
- Item name: body font, `1rem`, `500` weight
- Item price: score font (tabular-nums), `1rem`, right-aligned
- Item description: `0.875rem`, secondary text color, `1.6` line-height
- Dietary icons: `16px`, inline with description (V, VG, GF, DF, etc.)
- Section divider: `1px solid` divider color, `24px` vertical spacing

### Bookmark Button

- Default: outline heart icon, `24px`
- Active: filled heart, primary color
- Transition: `150ms ease` scale `1.0 → 1.2 → 1.0`
- Position: top-right of card image, `8px` inset, white circle background with `sm` shadow

### Hours & Status Badge

- Open: `#2d8a4e` text, `#dcfce7` background
- Closing Soon: `#d4a017` text, `#fef3c7` background
- Closed: `#9ca3af` text, `#f3f4f6` background
- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px), `600` weight
