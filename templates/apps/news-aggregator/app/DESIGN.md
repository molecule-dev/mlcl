# DESIGN.md — News Aggregator

## Brand Identity

- **App Name:** Vantage
- **Tagline:** Every angle, one view
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Balanced
- Editorial
- Curious
- Trusted

## Target Persona

News readers who want curated multi-source headlines with bias awareness and topical grouping.

## Screens

| Name           | Route            | Auth | Purpose                                                                        | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home                                                                 | —          |
| Login          | /login           | No   | Sign in                                                                        | —          |
| Signup         | /signup          | No   | Create account                                                                 | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                  | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                               | Login      |
| Home           | /home            | Yes  | Top stories by topic with source diversity                                     | —          |
| TopicDetail    | /topics/:slug    | Yes  | Stories in a topic with source comparison                                      | —          |
| StoryDetail    | /stories/:id     | Yes  | Story with multi-source summaries and bias spectrum                            | —          |
| Saved          | /saved           | Yes  | Saved stories for later reading                                                | —          |
| Sources        | /sources         | Yes  | Manage trusted sources and filters                                             | —          |
| Settings       | /settings        | Yes  | Topics, sources, notifications                                                 | —          |
| Topics         | /topics          | Yes  | Browse-and-follow index of all news topics with stats and bias mix             | —          |
| SourceDetail   | /sources/:slug   | Yes  | One source's profile: bias position, factual rating, ownership, latest stories | —          |
| Search         | /search          | Yes  | Global search across articles, sources, topics with filters and bias spectrum  | —          |

## App Constraints

- Editorial typography with serif headlines
- Source attribution and bias indicators
- Story clustering across outlets

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0a7e8c`
- Primary Hover: `#0c9aab`
- Primary Dark: `#086670`
- Accent: `#e07428`
- Accent Hover: `#f08838`
- Accent Dark: `#c0601e`

### Semantic

- Breaking: `#dc2626`
- Breaking Light: `#fee2e2`
- Trending: `#e07428`
- Trending Light: `#fff3e0`
- Bookmarked: `#7c3aed`
- Bookmarked Light: `#ede9fe`
- AI Summary: `#0a7e8c`
- AI Summary Light: `#e0f7fa`
- Unread: `#1d4ed8`
- Unread Dot: `#3b82f6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f7f8fa`
- Feed: `#f1f3f5`
- Reading Pane: `#ffffff`
- Category Bar: `#0f2b3c`

### Text

- Headline: `#111827`
- Byline: `#6b7280`
- Source: `#0a7e8c`
- Timestamp: `#9ca3af`
- Link: `#0a7e8c`
- Link Hover: `#086670`

### Borders

- Card: `#e5e7eb`
- Category Divider: `#d1d5db`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#f08838`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#222e3f`
- Feed: `#111b2a`
- Category Bar: `#0a1420`
- Text Headline: `#f1f5f9`
- Text Byline: `#94a3b8`
- Text Source: `#22d3ee`
- Border Card: `#2d3a4a`

## Typography

### Font Families

- Headline: `"Playfair Display", "Georgia", "Times New Roman", serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Source: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (uppercase, letter-spacing: `0.05em`)
- Mono: `SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Reading Typography

- Article title: `1.75rem` (28px), weight `700`, line-height `1.3`, serif
- Article body: `1.0625rem` (17px), weight `400`, line-height `1.7`, sans-serif
- Article body max width: `680px` (optimal reading measure)

## Layout

- Content Max Width: `1400px`
- Feed Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Feed Grid Gap: `20px`
- Category Sidebar Width: `240px` (collapsed: `64px`)
- Reading Pane Width: `720px` (centered, article view)
- Top Bar Height: `56px`
- Category Pill Bar Height: `48px` (horizontal scrolling, below top bar on mobile)

## Components

### Article Card

- Border radius: `10px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.06)`, hover: `0 6px 16px rgba(0, 0, 0, 0.1)`
- Transition: `200ms ease` (shadow + translateY)
- Hover transform: `translateY(-2px)`
- Image aspect ratio: `16:9`
- Image border radius: `10px 10px 0 0` (flush top)
- Content padding: `16px`
- Source line: `12px` uppercase, `500` weight, source color, with favicon `16x16` inline
- Headline: `1.125rem` (18px), `700` weight, serif, max 3 lines (line-clamp)
- Excerpt: `0.875rem` (14px), `400` weight, byline color, max 2 lines (line-clamp)
- Footer: timestamp left, bookmark icon right, `12px` text
- Unread indicator: `8px` dot, unread-dot color, top-left corner

### Featured Article Card

- Spans full grid width (all columns)
- Image aspect ratio: `21:9`
- Headline: `1.5rem` (24px), serif
- Overlay gradient: `linear-gradient(transparent 40%, rgba(0,0,0,0.85))` over image
- Text on overlay: white, text-shadow `0 1px 3px rgba(0,0,0,0.4)`

### Category Pill

- Border radius: `9999px` (pill)
- Padding: `6px 16px`
- Font size: `0.8125rem` (13px)
- Font weight: `500`
- Default: transparent background, secondary text
- Active: primary background, white text
- Hover: surface-secondary background

### Source Badge

- Border radius: `6px`
- Padding: `4px 10px`
- Font size: `0.75rem` (12px)
- Font weight: `600`
- Favicon: `14x14` with `6px` right margin
- Background: surface-secondary
- Text: source color

### Bookmark Button

- Icon only (outline when unsaved, filled when saved)
- Saved color: bookmarked (`#7c3aed`)
- Size: `20px` icon in `32px` hit target
- Transition: `150ms ease` (color + scale)
- Active scale: `1.15` (brief pop on save)

### AI Summary Panel

- Border radius: `10px`
- Border-left: `3px solid` ai-summary color
- Background: ai-summary-light
- Padding: `16px`
- Font size: `0.9375rem` (15px)
- Line height: `1.65`
- Icon: sparkle/wand, `16px`, ai-summary color
- Label: "AI Summary" in `0.75rem`, `600` weight, ai-summary color, uppercase

### Breaking News Banner

- Background: breaking color
- Text: white, `0.875rem`, `600` weight
- Padding: `8px 16px`
- Full width, sticky below top bar
- Pulse animation: subtle left-border glow, `2s ease-in-out infinite`
- Dismiss: `x` icon, right side

### Search Bar

- Border radius: `9999px` (pill)
- Height: `40px`
- Background: surface-secondary (light), surface (dark)
- Border: `1px solid` transparent, focus: primary
- Padding: `8px 16px 8px 40px` (icon left)
- Search icon: `18px`, secondary text color
- Placeholder: "Search articles, sources, topics..."

### Category Sidebar

- Background: category-bar color (dark)
- Text: `#c8d6e5` (muted light)
- Active item: white text, left `3px solid` primary border, background `rgba(255,255,255,0.08)`
- Hover: background `rgba(255,255,255,0.05)`
- Section headers: `0.6875rem` (11px), uppercase, `600` weight, `#6b8299`
- Icon size: `18px`, `12px` right margin
- Item padding: `10px 16px`
- Collapsed: icons only, centered, tooltip on hover

### Feed Toggle (List/Grid/Magazine)

- Button group with `8px` radius container
- Active: primary background, white icon
- Inactive: transparent, secondary text
- Icon size: `18px`
- Container padding: `3px`
- Container background: surface-secondary

### Reading Progress Bar

- Height: `3px`
- Background: primary color
- Position: fixed top (below top bar)
- Transition: width `100ms linear`
- Border radius: `0` (flush)
