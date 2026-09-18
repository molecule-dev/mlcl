# DESIGN.md — Link Aggregator

## Brand Identity

- **App Name:** Digest
- **Tagline:** Mark the path
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Curious
- Communal
- Grounded
- Witty

## Target Persona

Reading enthusiasts and communities sharing links, comments, and upvotes across topical subs.

## Screens

| Name           | Route            | Auth | Purpose                                                         | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                  | —          |
| Login          | /login           | No   | Sign in                                                         | —          |
| Signup         | /signup          | No   | Create account                                                  | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                   | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                | Login      |
| Feed           | /feed            | Yes  | Home feed with voted/sorted link posts                          | —          |
| LinkDetail     | /links/:id       | Yes  | Single post with nested comment thread                          | —          |
| Subs           | /subs            | Yes  | Browse and join sub-communities                                 | —          |
| SubDetail      | /subs/:slug      | Yes  | Sub-community feed with rules and moderators                    | —          |
| SubmitLink     | /submit          | Yes  | Submit a new link or text post                                  | —          |
| Profile        | /users/:id       | Yes  | User profile with karma, posts, comments                        | —          |
| Settings       | /settings        | Yes  | Account, notifications, content preferences                     | —          |
| Notifications  | /notifications   | Yes  | Inbox of replies, mentions, modmail, and karma milestones       | —          |
| Search         | /search          | Yes  | Global search across links, comments, subs, users               | —          |
| Saved          | /saved           | Yes  | Personal library of bookmarked links and comments by collection | —          |

## App Constraints

- Upvote/downvote chevrons on every item
- Two-column layout with feed left, sidebar right
- Nested comment threads

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6d28d9`
- Primary Hover: `#7c3aed`
- Primary Dark: `#5b21b6`
- Accent: `#ea580c`
- Accent Hover: `#f97316`
- Accent Dark: `#c2410c`

### Semantic

- Upvote: `#ea580c`
- Upvote Active: `#f97316`
- Downvote: `#6366f1`
- Downvote Active: `#818cf8`
- Karma: `#d97706`
- Karma Light: `#fef3c7`
- Hot: `#dc2626`
- Hot Light: `#fee2e2`
- Saved: `#6d28d9`
- Saved Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#fafaf9`
- Comment Indent: `#f5f3ff`
- Submission Highlight: `#fffbeb`

### Text

- Score: `#111827`
- Score Positive: `#ea580c`
- Score Negative: `#6366f1`
- Domain: `#9ca3af`
- Timestamp: `#9ca3af`
- Link: `#6d28d9`
- Link Hover: `#5b21b6`
- Link Visited: `#9333ea`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fb923c`
- Background: `#0c0a09`
- Surface: `#1c1917`
- Surface Secondary: `#292524`
- Comment Indent: `#1e1b4b`
- Text Primary: `#fafaf9`
- Text Secondary: `#a8a29e`
- Border Primary: `#44403c`
- Link: `#a78bfa`
- Link Visited: `#c084fc`
- Score Positive: `#fb923c`
- Score Negative: `#a5b4fc`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Title: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-weight: 600)
- Meta: `"IBM Plex Mono", SFMono-Regular, Menlo, monospace`
- Score: `"Tabular Nums", Inter, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `860px`
- Content + Sidebar Max Width: `1180px`
- Sidebar Width: `280px`
- Sidebar Gap: `40px`
- Link List Item Spacing: `0` (divided by 1px border, no gap)
- Comment Thread Indent: `24px`
- Comment Thread Indent Border: `2px solid #e5e7eb` (dark: `2px solid #44403c`)
- Top Bar Height: `48px`

## Components

### Link Card

- Border radius: `0` (flush list items, no rounding)
- Border bottom: `1px solid` border-primary
- Padding: `14px 16px`
- Vote column width: `40px`
- Layout: vote column (left) + content (right), inline
- Title font size: `base` (16px)
- Title font weight: `500`
- Title visited color: text-link-visited
- Domain tag: `sm` (14px), mono font, muted color, displayed inline after title
- Meta row: `xs` (12px), muted — "submitted by {user} {time ago} | {comment count} comments"
- Tag pills: inline after meta row
- Hover: `surface-secondary` background

### Vote Button

- Size: `28px × 28px`
- Icon size: `14px` (triangle/chevron)
- Border radius: `4px` (sm)
- Default color: `#9ca3af`
- Upvote active: upvote color, filled
- Downvote active: downvote color, filled
- Hover: subtle background tint matching vote direction
- Score between arrows: `sm` (14px), `700` weight, tabular-nums
- Layout: vertical stack — up arrow, score, down arrow

### Karma Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Background: karma-light
- Text color: karma
- Font size: `xs` (12px)
- Font weight: `600`
- Icon: small flame or star before number

### Comment Thread

- Indent per level: `24px`
- Indent border: `2px solid` cycling through colors per depth: `#6d28d9`, `#ea580c`, `#0d9488`, `#d97706`, `#6366f1` (then repeat)
- Comment padding: `12px 16px`
- Author font weight: `600`
- Author font size: `sm` (14px)
- Author karma shown inline: `xs` (12px), muted
- Timestamp: `xs` (12px), muted
- Body font size: `base` (16px)
- Body line height: `1.6`
- Collapse toggle: `[–]` / `[+]` monospace, clickable, left of author name
- Collapsed state: author + "N children" shown, body hidden

### Tag Pill

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `#f3f4f6` (dark: `#374151`)
- Text color: `#4b5563` (dark: `#d1d5db`)
- Hover: primary-light background, primary text
- Active/selected: primary background, white text

### User Reputation Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Avatar: `48px` circle
- Username: `lg` (18px), `600` weight
- Karma display: large `2xl` (24px) number with flame icon, karma color
- Stats row: submissions / comments / saved — three columns, centered numbers with `sm` labels beneath
- Member since: `xs` muted, bottom of card

### Submission Form

- Border radius: `8px` (md) on form container
- Padding: `24px`
- URL input: full width, `md` height (40px)
- Title input: full width, `md` height, auto-populated from URL metadata
- Tag selector: inline pill-style multi-select
- Submit button: primary color, `lg` height (48px), full width
- "Text post" toggle: switches URL input to textarea (min-height `120px`)

### Search Bar

- Border radius: `9999px` (pill)
- Height: `40px`
- Padding: `8px 20px`
- Background: surface-secondary
- Focus: white background, primary border, `md` shadow
- Icon: magnifying glass, left-aligned, muted color
- Placeholder: "Search links, tags, users…"

### Sort/Filter Tabs

- Style: underline tabs, no background
- Active: primary color text + `2px` bottom border
- Inactive: muted text, no border
- Font size: `sm` (14px)
- Font weight: `500`
- Options: Hot / New / Top / Saved
- Spacing: `24px` gap between tabs

### Bookmark Button

- Size: `20px` icon
- Default: outline stroke, muted color
- Saved state: filled, saved color (primary)
- Hover: slight scale `1.1`
- Transition: fast (150ms)
- Position: right side of link card meta row
