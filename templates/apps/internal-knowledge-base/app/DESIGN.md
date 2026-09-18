# DESIGN.md — Internal Knowledge Base

## Brand Identity

- **App Name:** Compendium
- **Tagline:** Stack knowledge, find your way
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Studious, grounded, clear, enduring

## Target Persona

Operations leads, engineers, and team managers who need to write, find, and maintain durable documentation — runbooks, policies, how-tos, and decision records — across a growing organization.

## Screens

| Name           | Route             | Auth | Purpose                                                 | deriveFrom |
| -------------- | ----------------- | ---- | ------------------------------------------------------- | ---------- |
| Login          | /login            | No   | Sign in                                                 | —          |
| Signup         | /signup           | No   | Create account                                          | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                           | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                        | Login      |
| Home           | /home             | Yes  | Personalized dashboard with bookmarks, recent, activity | —          |
| SpacesIndex    | /spaces           | Yes  | Browse all knowledge spaces (3-column grid)             | —          |
| SpaceHome      | /spaces/:key      | Yes  | Single space landing with nav tree and featured content | —          |
| ArticleView    | /article/:id      | Yes  | Article reading view with TOC, breadcrumb, comments     | —          |
| ArticleEditor  | /article/:id/edit | Yes  | WYSIWYG block editor with toolbar and slash commands    | —          |
| SearchResults  | /search           | Yes  | Command-K style results page with filters               | —          |
| Settings       | /settings         | Yes  | Personal preferences, space permissions, integrations   | —          |
| Landing        | /                 | No   | Public marketing landing page                           | —          |
| Drafts         | /drafts           | Yes  | Author's in-progress and unpublished articles           | —          |
| Bookmarks      | /bookmarks        | Yes  | User's saved/starred articles across all spaces         | —          |
| Notifications  | /notifications    | Yes  | Mentions, comments, page changes, review requests       | —          |
| Profile        | /profile          | Yes  | User's public identity and authoring profile            | Settings   |

## App Constraints

- Article reading width is always clamped to 720px for legibility — never full-bleed prose
- Serif body (Georgia) is reserved for article content only; UI chrome stays in Inter
- Code blocks use dark surface #1e293b with JetBrains Mono; never use UI surface colors for code

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0f766e`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0d5f59`
- Accent: `#d97706`
- Accent Hover: `#f59e0b`
- Accent Dark: `#b45309`

### Semantic

- Published: `#0f766e`
- Published Light: `#ccfbf1`
- Draft: `#6b7280`
- Draft Light: `#f3f4f6`
- Archived: `#9ca3af`
- Archived Light: `#f9fafb`
- Restricted: `#b91c1c`
- Restricted Light: `#fee2e2`
- Bookmarked: `#d97706`
- Bookmarked Light: `#fef3c7`
- Updated Recently: `#7c3aed`
- Updated Recently Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafa`
- Reading: `#fcfcfc`
- Sidebar: `#f1f5f5`
- Search Overlay: `rgba(15, 118, 110, 0.04)`
- Code Block: `#1e293b`

### Text

- Primary: `#1a2e2b`
- Secondary: `#5f7370`
- Tertiary: `#7c9390`
- Article Body: `#2d3b39`
- Link: `#0f766e`
- Link Hover: `#0d5f59`
- Code Inline: `#0f766e`

### Borders

- Primary: `#d6e0df`
- Secondary: `#e8edec`
- Focus: `#0f766e`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#fbbf24`
- Background: `#0c1917`
- Surface: `#162624`
- Surface Secondary: `#1e3331`
- Sidebar: `#132220`
- Text Primary: `#e2eded`
- Text Secondary: `#94b5b0`
- Article Body: `#d1e0dd`
- Code Block: `#0f1d1b`
- Border Primary: `#2a4a46`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Article: `"Georgia", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Article Typography

- Article body size: `1.0625rem` (17px)
- Article body line height: `1.75`
- Article heading line height: `1.3`
- Article paragraph spacing: `24px`
- Article max read width: `720px`
- Article code size: `0.875em` relative to surrounding text

## Layout

- Content Max Width: `1200px`
- Article Read Width: `720px`
- Sidebar Width: `260px` (collapsed: `56px`)
- Sidebar Nested Indent: `16px` per level
- Top Bar Height: `56px`
- Search Bar Width: `560px` (centered, desktop), `100%` (mobile)
- Space Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Space Grid Gap: `20px`
- Table of Contents Width: `220px` (right rail, desktop only)
- Breadcrumb Separator: `›` with `8px` horizontal padding

## Components

### Article Card

- Border radius: `10px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.06)`, hover: `md`
- Padding: `20px`
- Border: `1px solid` border-primary
- Title font size: `lg` (18px)
- Title font weight: `600`
- Excerpt: max 2 lines, text-secondary, `sm` (14px)
- Bottom row: author avatar (24px circle), name, `·`, time ago — all `xs` (12px), text-tertiary
- Space badge: top-right, pill shape, `xs` font, primary-light background
- Hover: translate-y `-2px`, transition `normal`

### Space Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `24px`
- Border: `1px solid` border-primary
- Icon: `40px` emoji or SVG in a `56px` rounded-`md` tinted background
- Title font size: `lg` (18px), font weight: `600`
- Description: max 2 lines, text-secondary, `sm` (14px)
- Article count badge: bottom-left, text-tertiary, `xs`
- Hover: border-color transitions to primary

### Article Editor

- Toolbar: sticky top, `48px` height, surface background, bottom border
- Toolbar buttons: `32px` square, `6px` radius, ghost style, grouped with `1px` dividers
- Editor area: article-font, article read width centered, `48px` top padding
- Block menu: floating, `md` shadow, `8px` radius, triggered by `/` command
- Inline formatting bar: floating above selection, `6px` radius, `sm` shadow, dark surface

### Search

- Trigger: `⌘K` / `Ctrl+K` keyboard shortcut
- Overlay: centered modal, `640px` max width, `lg` radius, `xl` shadow
- Input height: `52px`, `lg` font, no border, bottom divider only
- Search icon: `20px`, text-tertiary, left of input
- Results list: max `6` visible, `48px` per row, `sm` font
- Result item: title bold + excerpt muted + space badge right-aligned
- Active result: search-overlay background, primary left border `3px`
- Keyboard hints: `↑↓` navigate, `↵` open — shown bottom-right, `xs` text

### Breadcrumb Trail

- Font size: `sm` (14px)
- Font weight: `400`
- Color: text-secondary, last item: text-primary + `500` weight
- Separator: `›` character
- Spacing: `8px` around separator
- Truncation: collapse middle items to `...` when > 4 levels

### Table of Contents (Right Rail)

- Font size: `sm` (14px)
- Line height: `1.4`
- Item padding: `6px 0 6px 12px`
- Left border: `2px solid` border-secondary
- Active item: left border primary, text-primary, font weight `500`
- Nested indent: `12px` per heading level
- Scroll spy: highlights current section, smooth transition

### Comment Thread

- Author row: avatar `28px`, name `sm` bold, time ago `xs` tertiary
- Body: `sm` (14px), text-primary, `1.6` line height
- Reply indent: `32px` left margin with `2px` left border, border-secondary
- Actions: like, reply — ghost buttons, `xs`, text-tertiary, hover: text-primary
- New comment: textarea, `md` radius, primary submit button right-aligned

### Permission Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px), font weight: `500`
- Variants:
  - Admin: primary background, inverse text
  - Editor: accent-light background, accent-dark text
  - Viewer: surface-secondary background, text-secondary
  - Restricted: restricted-light background, restricted text

### Bookmark Button

- Icon: outline bookmark `18px`, fill on bookmarked state
- Color: text-tertiary default, bookmarked color when active
- Transition: `fast` with scale `1.15` on click (spring effect)
- Appears on article cards (top-right) and article header (beside title)

### Space Navigation Tree (Sidebar)

- Root items: `sm` font, `500` weight, `36px` row height
- Child items: `sm` font, `400` weight, `32px` row height
- Expand/collapse: chevron `14px`, rotates `90deg`, transition `fast`
- Active page: primary-light background, primary text, `500` weight
- Drag handle: `6` dots icon, visible on hover, text-tertiary
- Nesting: max `4` levels, indent `16px` per level

### Article Status Indicator

- Inline dot: `8px` circle + status label
- Published: published color
- Draft: draft color
- Archived: archived color
- Colors match semantic tokens above

### Empty State

- Centered, `320px` max width
- Illustration: simple line art, `120px`, text-tertiary stroke
- Heading: `xl` (20px), `600` weight
- Body: `sm`, text-secondary, `1.6` line height
- CTA: primary button, `md` size
