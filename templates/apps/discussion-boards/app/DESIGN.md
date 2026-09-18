# DESIGN.md — Discussion Boards

## Brand Identity

- **App Name:** Stoa
- **Tagline:** Where ideas converge
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Thoughtful, communal, classic-forum-modernized, considered

## Target Persona

Communities, hobbyist groups, and product teams who want a focused threaded discussion space with reputation, moderation, and markdown — Reddit/Discourse spirit, modernized.

## Screens

| Name            | Route            | Auth | Purpose                                                                                                                 | deriveFrom |
| --------------- | ---------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing         | /                | No   | Marketing home with value props and signup CTA                                                                          | —          |
| Login           | /login           | No   | Sign in                                                                                                                 | —          |
| Signup          | /signup          | No   | Create account                                                                                                          | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                                                                           | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                                                                                        | Login      |
| CategoriesList  | /c               | Yes  | Browse all categories with stats and recent activity                                                                    | —          |
| CategoryDetail  | /c/:slug         | Yes  | Threads list within one category, sortable                                                                              | —          |
| ThreadView      | /t/:id           | Yes  | A single thread with the OP and nested replies                                                                          | —          |
| Compose         | /compose         | Yes  | New thread editor with markdown + preview                                                                               | —          |
| UserProfile     | /u/:username     | Yes  | User stats, recent posts, badges, reputation                                                                            | —          |
| Settings        | /settings        | Yes  | Notifications, profile, security                                                                                        | —          |
| Search          | /search          | Yes  | Global search across threads, posts, users with filters and highlighted matches                                         | —          |
| Notifications   | /notifications   | Yes  | Activity inbox: replies, @mentions, follows, badges, moderator actions                                                  | —          |
| Bookmarks       | /bookmarks       | Yes  | Saved threads grouped by folder/tag with quick unsave and jump-to actions                                               | —          |
| ModerationQueue | /moderation      | Yes  | Moderator-only inbox of flagged posts, pending threads, reported users, ban appeals with approve/hide/lock/ban controls | —          |

## App Constraints

- Threads always render in a single-column readable list — never grid
- Markdown post bodies use the Georgia serif body font; everything else uses Inter
- Reputation tier badges, moderator badges, and status pills (Pinned, Locked, Resolved, Hot) must be visible inline in thread rows, not stacked

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b4fc7`
- Primary Hover: `#7c6fdb`
- Primary Dark: `#4a3fa6`
- Accent: `#e09a2e`
- Accent Hover: `#eab046`
- Accent Dark: `#c48420`

### Semantic

- Pinned: `#e09a2e`
- Pinned Light: `#fdf6e3`
- Locked: `#6b7280`
- Locked Light: `#f3f4f6`
- Resolved: `#16a34a`
- Resolved Light: `#dcfce7`
- Moderator: `#9333ea`
- Moderator Light: `#f3e8ff`
- Hot: `#e04545`
- Hot Light: `#fee2e2`
- Reputation: `#e09a2e`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Category Banner: `#f0eef8`
- Thread Highlight: `#faf9ff`

### Text

- Author: `#5b4fc7`
- Moderator Badge: `#9333ea`
- Timestamp: `#9ca3af`
- Markdown Code: `#1e293b`
- Reputation Score: `#c48420`
- Link: `#5b4fc7`
- Link Hover: `#4a3fa6`
- Quote Border: `#d0cce6`

### Dark Theme Overrides

- Primary: `#8b83e0`
- Accent: `#eab046`
- Background: `#0c0a1a`
- Surface: `#1a1730`
- Surface Secondary: `#231f40`
- Category Banner: `#1f1b38`
- Text Primary: `#f0eef8`
- Text Secondary: `#a8a3c4`
- Border Primary: `#2e2952`
- Quote Border: `#3d3768`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600-700)
- Markdown Body: `Georgia, "Noto Serif", "Times New Roman", serif`
- Code: `"JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace`

## Layout

- Content Max Width: `960px`
- Category List Width: `100%` (within content max)
- Thread View Max Width: `760px` (narrower for readability)
- Sidebar Width: `280px` (category nav + stats)
- Sidebar Collapsed: `0px` (hidden on mobile)
- Grid Columns: `1` (threads are always single-column list)
- Compose Editor Min Height: `200px`
- Thread Nesting Indent: `24px` per level (max 5 levels, then flat)

## Components

### Category Card

- Border radius: `12px` (lg)
- Shadow: none, border `1px solid` border-primary
- Padding: `16px 20px`
- Layout: icon left (32px circle), name + description center, stats right
- Icon background: primary at 10% opacity, `48px` circle
- Hover: border-color transitions to primary at 40% opacity, background surface-secondary
- Stats: thread count + post count, font size `sm`, text-secondary

### Thread Row

- Border radius: `8px` (md)
- Border bottom: `1px solid` border-primary (list separator)
- Padding: `14px 20px`
- Layout: avatar left (36px circle), title + meta center, reply count + last activity right
- Title font size: `base` (16px), weight `600`
- Title hover: text-primary transitions to brand primary
- Pinned indicator: small accent-colored pin icon before title, accent background badge
- Locked indicator: muted lock icon, text-secondary
- Hot badge: hot color background, white text, pill shape, font size `xs`
- Unread indicator: `8px` circle, primary color, left of title
- Author link: text-author color, weight `500`

### Post / Reply

- Border radius: `0` (flush within thread)
- Border bottom: `1px solid` border-primary
- Padding: `20px 24px`
- Layout: author sidebar left (160px), content right
- Author sidebar: avatar (48px circle), username, reputation badge, role badge, join date
- Content: markdown-rendered, font-family markdown-body, line-height relaxed (1.75)
- Quote blocks: left border `3px solid` quote-border, padding-left `16px`, background surface-secondary, border-radius `0 4px 4px 0`
- Code blocks: background `#1e293b`, text `#e2e8f0`, border-radius `8px`, padding `16px`, font-family code
- Inline code: background `#f1f0f8`, padding `2px 6px`, border-radius `4px`, font-family code, font-size `0.9em`
- Action bar: bottom of post, flex row, icon buttons (reply, quote, upvote, bookmark, flag, share)
- Action icon size: `18px`, color text-secondary, hover: primary
- Edited indicator: "(edited)" text, font-size `xs`, text-secondary, italic

### Reputation Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Tiers (by score thresholds):
  - Newcomer: `#e5e7eb` bg, `#6b7280` text
  - Contributor: `#dbeafe` bg, `#2563eb` text
  - Regular: `#d0cce6` bg, `#5b4fc7` text
  - Trusted: `#fdf6e3` bg, `#c48420` text
  - Elder: `#fef3c7` bg, `#92400e` text, subtle `1px solid #e09a2e` border

### Moderator Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Background: moderator-light
- Text color: moderator
- Border: `1px solid` moderator at 30% opacity

### Category Sidebar Nav

- Width: `280px`
- Item padding: `10px 16px`
- Item border-radius: `8px`
- Active: primary at 10% opacity background, primary text, weight `600`
- Hover: surface-secondary background
- Category color indicator: `4px` wide left border, using per-category color
- Unread count: pill badge, primary bg, white text, `18px` height
- Section headers: font-size `xs`, text-secondary, uppercase, letter-spacing `0.05em`, padding-top `16px`

### Compose / Reply Editor

- Border radius: `8px` (md)
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Min height: `200px` (new thread), `120px` (reply)
- Toolbar: top, background surface-secondary, border-bottom `1px solid` border-primary, padding `6px 12px`
- Toolbar buttons: `32px` square, border-radius `4px`, icon `18px`, hover: surface-tertiary
- Preview toggle: right side of toolbar, font-size `sm`, weight `500`
- Markdown preview: same styling as post content (markdown-body font, code blocks, quotes)
- Submit button: primary solid, bottom-right, height `40px`

### Search Results

- Thread result: title (weight `600`, font-size `base`), snippet (font-size `sm`, line-clamp 2), category + author + date meta
- Highlight matched terms: `#fdf6e3` background, `#c48420` text, padding `1px 2px`, border-radius `2px`
- Result spacing: `16px` between items
- Filter bar: top, pills for category/date/author, border-radius `9999px`, font-size `sm`

### Upvote / Reaction Button

- Size: `32px` height
- Border radius: `8px`
- Border: `1px solid` border-primary
- Default: text-secondary icon + count
- Active (voted): primary background at 10%, primary text, primary border
- Hover: surface-secondary background
- Count font: tabular-nums, font-size `sm`, weight `500`

### Thread Status Indicators

- Pinned: accent pill badge, pin icon, "Pinned"
- Locked: locked-light background, locked text, lock icon, "Locked"
- Resolved: resolved-light background, resolved text, check icon, "Resolved"
- Hot: hot-light background, hot text, flame icon, "Hot"
- All: border-radius `9999px`, padding `3px 10px`, font-size `xs`, weight `600`

### User Profile Card (hover/popup)

- Border radius: `12px`
- Shadow: `lg`
- Padding: `20px`
- Width: `300px`
- Layout: avatar (64px circle) top-center, username, reputation badge, stats row (posts, threads, joined date)
- Stats: font-size `sm`, text-secondary labels, text-primary values, weight `600`
- Bio: font-size `sm`, line-clamp 3, text-secondary
