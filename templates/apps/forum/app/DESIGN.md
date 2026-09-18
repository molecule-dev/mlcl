# DESIGN.md — Forum / Community

## Brand Identity

- **App Name:** Quorum
- **Tagline:** Every voice counts
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Thoughtful, civil, community-driven, candid

## Target Persona

Hobbyists, experts, and enthusiasts who build reputation across topic-based communities, sharing insights, debating ideas, and helping each other.

## Screens

| Name           | Route            | Auth | Purpose                                                                                 | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with trending topics + signup CTA                                        | —          |
| Login          | /login           | No   | Sign in                                                                                 | —          |
| Signup         | /signup          | No   | Create account                                                                          | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                           | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                        | Login      |
| Feed           | /feed            | Yes  | Personalized thread feed with vote column                                               | —          |
| Categories     | /categories      | Yes  | Browse all categories grid                                                              | —          |
| ThreadView     | /thread/:id      | Yes  | Single thread with nested comments                                                      | —          |
| Compose        | /compose         | Yes  | New post editor with category + flair                                                   | —          |
| Profile        | /u/:username     | Yes  | User profile with karma, posts, comments                                                | —          |
| Settings       | /settings        | Yes  | Account, notifications, blocked users, display density                                  | —          |
| CategoryDetail | /c/:slug         | Yes  | Per-category thread feed scoped to a single community with about/rules/mods sidebar     | —          |
| Search         | /search          | Yes  | Global search results across threads, comments, communities, and users                  | —          |
| Notifications  | /notifications   | Yes  | Activity feed for replies, mentions, upvote milestones, awards, mod actions             | —          |
| ModQueue       | /mod             | Yes  | Moderator queue — reported posts/comments awaiting review with mod log + auto-mod stats | —          |

## App Constraints

- Thread cards include a left vote column (40px) with up/down arrows and score for every feed item
- Right sidebar (300px) on Feed/Categories shows About Community, Rules, Moderators, Trending
- Comments use nested indent (20px/level) with color-cycling left border to visually track depth

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7c6b`
- Primary Hover: `#10a48d`
- Primary Dark: `#0c6558`
- Accent: `#e8762c`
- Accent Hover: `#f09040`
- Accent Dark: `#c46020`

### Semantic

- Upvote: `#e8762c`
- Upvote Active: `#f09040`
- Downvote: `#7b8ab0`
- Downvote Active: `#5c6b94`
- Karma: `#d4a020`
- Karma Light: `#fdf8e8`
- Pinned: `#0e7c6b`
- Pinned Light: `#e6f5f2`
- Locked: `#6b7280`
- Locked Light: `#f3f4f6`
- Resolved: `#16a34a`
- Resolved Light: `#dcfce7`
- Moderator: `#b44c18`
- Moderator Light: `#fdf0e8`
- Hot: `#dc2626`
- Hot Light: `#fee2e2`
- Flagged: `#d97706`
- Flagged Light: `#fef9ee`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f5f8f7`
- Category Header: `#eaf2f0`
- Thread Highlight: `#f8fbfa`
- Nested Reply: `#f9fbfa`
- Vote Column: `#f5f8f7`

### Text

- Author: `#0e7c6b`
- Moderator Badge: `#b44c18`
- Timestamp: `#9ca3af`
- Score: `#333333`
- Score Positive: `#0e7c6b`
- Score Negative: `#5c6b94`
- Karma Score: `#c48a18`
- Flair: `#6b7280`
- Link: `#0e7c6b`
- Link Hover: `#0c6558`
- Quote Border: `#b8d4ce`

### Borders

- Vote Divider: `#e8eeec`

### Dark Theme Overrides

- Primary: `#34d9b8`
- Primary Dark: `#28b89a`
- Accent: `#f09040`
- Background: `#0c1210`
- Surface: `#162220`
- Surface Secondary: `#1c2e2a`
- Category Header: `#1a2826`
- Thread Highlight: `#182824`
- Vote Column: `#1c2e2a`
- Text Primary: `#e8f2ef`
- Text Secondary: `#92aca6`
- Border Primary: `#2a4440`
- Quote Border: `#2e524a`
- Score Positive: `#34d9b8`
- Karma Score: `#e8b840`
- Moderator Badge: `#f09040`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600-700)
- Post Body: `"Charter", "Bitstream Charter", Georgia, "Noto Serif", serif`
- Code: `"JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace`
- Score: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1120px`
- Feed Column Max Width: `780px`
- Sidebar Width: `300px` (right sidebar — trending, rules, moderators)
- Sidebar Gap: `24px`
- Category List Max Width: `100%` (within content max)
- Thread Nesting Indent: `20px` per level (max 8 levels, then "continue thread" link)
- Vote Column Width: `40px` (left of each post)
- Compose Editor Min Height: `180px` (new thread), `100px` (reply)
- Compact Density Row Height: `48px` (compact view)

## Components

### Thread Card (Feed View)

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `0` (vote column flush left, content `14px 16px`)
- Layout: vote column left (40px, centered arrows + score), content right
- Vote column background: vote-column
- Title font size: `base` (16px), weight `600`
- Title hover: transitions to primary color
- Meta row: author (primary color, weight `500`) · category flair (pill badge) · timestamp · comment count
- Thumbnail: `70px` square, border-radius `4px`, right side (if link/image post)
- Compact variant: single row, no thumbnail, `48px` height, smaller title (`sm`)
- Hover: shadow `sm`, border-color transitions to primary at 30% opacity
- Spacing between cards: `8px`

### Vote Column

- Width: `40px`
- Arrow size: `20px` (up) + `20px` (down)
- Arrow default color: `#c0c8c6`
- Arrow hover: primary (up) / downvote (down)
- Arrow active upvote: upvote color, filled
- Arrow active downvote: downvote-active color, filled
- Score font: score font-family, font-size `sm`, weight `700`, centered
- Score positive: score-positive color
- Score negative: score-negative color
- Score zero: text-secondary
- Vertical layout: up arrow → score → down arrow, `2px` gaps
- Border-right: `1px solid` vote-divider

### Comment / Reply

- Border radius: `0` (flat within thread)
- Border-left: `2px solid` border-primary (nesting indicator, color cycles through 5 muted tones per depth)
- Nesting border colors (by depth): `#0e7c6b` → `#e8762c` → `#7b8ab0` → `#d4a020` → `#dc2626` (then repeats)
- Padding: `8px 0 8px 12px`
- Layout: inline header (author + score + time), then content block
- Author link: primary color, weight `600`, font-size `sm`
- Content: post-body font, line-height relaxed (1.75), font-size `sm` (14px)
- Quote blocks: left border `3px solid` quote-border, padding-left `12px`, background surface-secondary, border-radius `0 4px 4px 0`
- Code blocks: background `#1a2826`, text `#e2e8f0`, border-radius `6px`, padding `14px`, font-family code
- Inline code: background `#eaf2f0`, padding `2px 5px`, border-radius `3px`, font-family code, font-size `0.9em`
- Action bar: below content, icon buttons (reply, share, save, report, mod actions), font-size `xs`, text-secondary, hover: text-primary
- Collapse toggle: `[–]` button next to author name, font-size `sm`, text-secondary
- Collapsed state: single line showing author + score + child count, muted

### Category Card

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `16px 20px`
- Layout: icon/emoji left (40px circle, category-header background), name + description center, stats right
- Name: font-size `base`, weight `600`
- Description: font-size `sm`, text-secondary, line-clamp 2
- Stats: subscriber count + active count (green dot indicator), font-size `xs`, text-secondary
- Color bar: `4px` top border in per-category accent color
- Hover: background surface-secondary, shadow `sm`

### Category Flair Pill

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: per-category color at 12% opacity
- Text: per-category color
- Hover: background at 20% opacity
- Max width: `140px`, text-overflow ellipsis

### Reputation Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Display: inline-flex with small trophy/star icon left of score
- Tiers (by karma thresholds):
  - Newcomer (0–99): `#f3f4f6` bg, `#6b7280` text
  - Member (100–499): `#eaf2f0` bg, `#0e7c6b` text
  - Contributor (500–1999): `#e0f0ec` bg, `#0c6558` text, `1px solid #0e7c6b` border at 25%
  - Veteran (2000–9999): `#fdf8e8` bg, `#c48a18` text, `1px solid #d4a020` border at 30%
  - Legend (10000+): `#fef3c7` bg, `#92400e` text, `1px solid #d4a020` border, subtle gold shimmer on hover

### Moderator Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Background: moderator-light
- Text color: moderator
- Variants: `mod` (shield icon), `admin` (star icon), `op` (primary bg, white text — marks original poster)

### Thread Status Indicators

- Pinned: pinned-light background, primary text, pin icon, "Pinned"
- Locked: locked-light background, locked text, lock icon, "Locked"
- Resolved: resolved-light background, resolved text, check icon, "Resolved"
- Hot: hot-light background, hot text, flame icon, "Hot"
- Flagged: flagged-light background, flagged text, flag icon, "Under Review"
- All: border-radius `9999px`, padding `3px 10px`, font-size `xs`, weight `600`

### Sidebar Panel (Right)

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `16px`
- Background: surface
- Sections separated by `1px solid` border-primary with `16px` vertical padding
- Section title: font-size `xs`, text-secondary, uppercase, letter-spacing `0.05em`, weight `600`
- Variants:
  - **About Community:** subscriber count (large, weight `700`), active now (green dot), description, create-post button (full width, primary)
  - **Rules:** numbered list, font-size `sm`, expandable items
  - **Moderators:** avatar (24px) + username list, font-size `sm`
  - **Trending:** numbered thread titles, font-size `sm`, vote count badge

### Compose / Submit Editor

- Border radius: `8px` (md)
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Background: surface
- Tab bar: top tabs for "Post" / "Image" / "Link" / "Poll", font-size `sm`, weight `500`, active: primary underline `2px`
- Title input: font-size `lg`, weight `600`, border-bottom only, no border-radius, padding `12px 16px`
- Body editor min height: `180px`
- Toolbar: below title, background surface-secondary, border `1px solid` border-primary, padding `6px 12px`
- Toolbar buttons: `32px` square, border-radius `4px`, icon `18px`, hover: surface tertiary
- Category selector: dropdown, border-radius `8px`, font-size `sm`, required before submit
- Flair selector: optional, pill-style dropdown
- Submit button: primary solid, bottom-right, height `40px`, weight `600`
- Draft indicator: font-size `xs`, text-secondary, "Draft saved" with timestamp

### Search Results

- Thread result: title (weight `600`, font-size `base`), snippet (font-size `sm`, line-clamp 2, post-body font), category flair + author + score + comment count meta
- Comment result: parent thread title (font-size `xs`, text-secondary), comment text (font-size `sm`, line-clamp 3)
- Highlight matched terms: karma-light background, karma-score text, padding `1px 3px`, border-radius `2px`
- Result spacing: `12px` between items
- Filter bar: top row — sort pills (Relevance, Top, New, Comments), time range dropdown, category filter
- Filter pill: border-radius `9999px`, font-size `sm`, border `1px solid` border-primary, active: primary bg, white text

### User Profile Card (Hover Popup)

- Border radius: `12px`
- Shadow: `lg`
- Padding: `20px`
- Width: `320px`
- Layout: banner strip (48px, category-header bg), avatar (56px circle, border `3px solid` surface, overlapping banner), username, reputation badge
- Stats row: karma (upvote icon + count), posts, comments, member since — font-size `sm`, evenly spaced
- Bio: font-size `sm`, line-clamp 2, text-secondary
- Recent activity: last 2 posts, font-size `xs`, truncated titles

### Moderation Panel

- Background: surface
- Border: `1px solid` moderator at 20% opacity
- Border-left: `4px solid` moderator
- Border-radius: `0 8px 8px 0`
- Padding: `12px 16px`
- Actions: icon buttons — remove, lock, pin, flair, ban — with labels, font-size `sm`
- Reason input: text area, font-size `sm`, min-height `60px`
- Mod log entries: timestamp + moderator + action + target, font-size `xs`, striped rows
