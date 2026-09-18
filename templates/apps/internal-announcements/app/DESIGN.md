# DESIGN.md — Internal Announcements

## Brand Identity

- **App Name:** Herald
- **Tagline:** Signal above the noise
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Clear, signal-forward, measured, trustworthy

## Target Persona

Internal communications leads, people ops, and employees at mid-to-large companies who need important messages to land without drowning in chat noise — with acknowledgments, threaded discussion, and priority levels.

## Screens

| Name               | Route               | Auth | Purpose                                                                                                      | deriveFrom |
| ------------------ | ------------------- | ---- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Login              | /login              | No   | Sign in                                                                                                      | —          |
| Signup             | /signup             | No   | Create account                                                                                               | Login      |
| ForgotPassword     | /forgot-password    | No   | Request reset                                                                                                | Login      |
| ResetPassword      | /reset-password     | No   | Set new password                                                                                             | Login      |
| Feed               | /feed               | Yes  | Main announcement feed with channels sidebar and detail rail                                                 | —          |
| AnnouncementDetail | /announcement/:id   | Yes  | Single announcement with full body, acknowledgments, threaded comments                                       | —          |
| Composer           | /compose            | Yes  | Create new announcement with priority, channels, audience                                                    | —          |
| MyAcknowledgments  | /my-acknowledgments | Yes  | Actions needing my acknowledgment + already acknowledged                                                     | —          |
| Analytics          | /analytics          | Yes  | Reach, acknowledgment rates, engagement over time (admin)                                                    | —          |
| Settings           | /settings           | Yes  | Notifications, channels, permissions                                                                         | —          |
| Profile            | /profile            | Yes  | Personal profile — name, title, bio, contact, recent activity, stats, notification prefs summary             | —          |
| Notifications      | /notifications      | Yes  | Full notification center — mentions, replies, acknowledgment requests, channel posts; mark read & filter     | —          |
| Search             | /search             | Yes  | Global search results across announcements, channels, people; matched-text highlighted; grouped by date      | —          |
| TeamDirectory      | /people             | Yes  | Company-wide people directory — searchable list of team members, roles, departments, locations, admin badges | —          |

## App Constraints

- Feed is strictly single-column (640px) — never multi-column grid; preserves scannable reading rhythm
- Priority is a colored left-border on the card PLUS a pill badge — never priority by color alone
- Acknowledgments are explicit and first-class — visible progress bar + count, not buried in a menu

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#3730a3`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0e7490`

### Semantic

- Urgent: `#dc2626`
- Urgent Light: `#fee2e2`
- Pinned: `#d97706`
- Pinned Light: `#fef3c7`
- Acknowledged: `#059669`
- Acknowledged Light: `#d1fae5`
- Unread: `#4f46e5`
- Unread Light: `#eef2ff`
- Mention: `#7c3aed`
- Mention Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Feed: `#f1f5f9`
- Thread: `#f8fafc`
- Composer: `#ffffff`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Author: `#1e293b`
- Timestamp: `#94a3b8`
- Link: `#4f46e5`
- Link Hover: `#3730a3`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Thread: `#e2e8f0`
- Focus: `#4f46e5`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Urgent: `#f87171`
- Acknowledged: `#34d399`
- Background: `#0f172a`
- Surface: `#1e293b`
- Surface Secondary: `#1a2332`
- Feed: `#0f172a`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Text Timestamp: `#64748b`
- Border Primary: `#334155`
- Thread: `#334155`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (code blocks in announcements): `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Weights

- Author name: `600`
- Announcement title: `700`
- Section heading: `600`
- Body: `400`
- Timestamp: `400`
- Badge label: `500`

## Layout

- Content Max Width: `920px`
- Feed Column Width: `640px` (centered, main content)
- Sidebar Width: `280px` (left — channels/categories)
- Detail Panel Width: `360px` (right — thread/comments, slides open)
- Top Bar Height: `56px`
- Composer Min Height: `120px`
- Thread Indent: `40px` per level (max 3 levels)
- Grid: single-column feed (not multi-column grid)

## Components

### Announcement Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `24px`
- Border: `1px solid` border-primary
- Border-left: `4px solid` category color (urgent: urgent, general: primary, pinned: pinned)
- Background: surface
- Author row: avatar (36px, full radius) + name (semibold) + role badge + timestamp
- Title: `xl` (20px), weight `700`, margin-bottom `8px`
- Body: `base` (16px), weight `400`, line-height `1.625`, text-secondary for truncated preview
- Footer: acknowledgment count + comment count + reaction summary, font-size `sm`, text-tertiary
- Unread indicator: `8px` dot, unread color, top-left of card
- Pinned variant: pinned-light background, pinned left-border, small pin icon top-right

### Acknowledgment Button

- Border radius: `8px` (md)
- Height: `36px`
- Padding: `6px 16px`
- Font size: `sm` (14px)
- Font weight: `500`
- Default state: outline variant, primary border, primary text
- Acknowledged state: solid acknowledged background, white text, checkmark icon prefix
- Hover (unacknowledged): primary-hover background, white text
- Transition: normal (300ms ease)
- Counter: `sm` text, text-secondary, inline after button

### Acknowledgment Progress Bar

- Height: `6px`
- Border radius: `full` (9999px)
- Track: background-tertiary
- Fill: acknowledged color
- Label: `sm` text, `"42 of 60 acknowledged"` format
- Position: below announcement body, above footer

### Comment / Thread

- Thread container padding: `16px 24px`
- Thread background: thread background color
- Border-top: `1px solid` thread border
- Reply indent: `40px` left margin per nesting level
- Connector line: `2px solid` border-primary, runs vertically along left of replies
- Comment bubble: `12px` radius, `12px 16px` padding, surface background
- Author: `sm` (14px), weight `600`
- Body: `sm` (14px), weight `400`, line-height `1.5`
- Timestamp: `xs` (12px), text-timestamp color
- Reply button: ghost variant, `xs` font, text-secondary, hover: text-primary

### Composer (New Announcement / Reply)

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary, focus: `2px solid` focus color
- Min height: `120px` (new announcement), `80px` (reply)
- Padding: `16px`
- Background: composer background
- Toolbar: bottom-aligned, `8px` top border (border-secondary), `8px` padding
- Toolbar icons: `20px`, text-secondary, hover: text-primary
- Supports: bold, italic, links, bullet lists, code blocks, file attachments
- Category selector: dropdown in toolbar, `sm` font, badge-style chips
- Priority selector: radio group — Normal (default), Pinned, Urgent

### Priority Badge

- Border radius: `full` (9999px)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Urgent: urgent background, white text, pulse animation (subtle)
- Pinned: pinned background, white text
- General: primary background, white text
- FYI: background-tertiary, text-secondary

### Category / Channel Chip

- Border radius: `full` (9999px)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `500`
- Border: `1px solid` border-secondary
- Background: surface-secondary
- Active/selected: primary background, white text

### Sidebar Channel List

- Width: `280px`
- Section heading: `xs` (12px), weight `600`, text-tertiary, uppercase, letter-spacing `0.05em`
- Channel item height: `40px`
- Channel item padding: `8px 16px`
- Channel item radius: `8px` (md)
- Active: unread-light background, primary text, weight `600`
- Inactive: transparent, text-secondary, weight `400`
- Hover: surface-secondary background
- Unread count badge: `full` radius, `18px` min-width, primary background, white text, `xs` font
- Channel icon: `18px`, inline before label

### Author Avatar

- Size: `36px` (feed), `28px` (comments), `24px` (reactions)
- Border radius: `full` (9999px)
- Border: `2px solid` surface (creates white ring when stacked)
- Fallback: initials on primary-light background, primary text, weight `600`
- Admin crown: `12px` icon overlay, bottom-right, pinned color

### Search Results

- Highlight matched text: `acknowledged-light` background, weight `600`
- Result card: same as announcement card but compact — `16px` padding, no left-border accent
- Show: title, author, date, snippet with highlight
- Group by: date (Today, This Week, This Month, Older)

### Notification Badge (Bell)

- Dot: `10px` circle, urgent color, top-right of bell icon
- Count: `full` radius pill, `16px` min-width, urgent background, white text, `xs` font
- Dropdown panel width: `380px`
- Notification row height: `64px`
- Unread row background: unread-light
- Read row background: surface

### Empty States

- Icon: `48px`, text-tertiary
- Heading: `lg` (18px), weight `600`, text-primary
- Body: `sm` (14px), text-secondary, max-width `320px`, centered
- CTA button: primary solid, `md` size
