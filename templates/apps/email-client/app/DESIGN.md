# DESIGN.md — Email Client

## Brand Identity

- **App Name:** Courier
- **Tagline:** Where every message finds its line
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Focused, efficient, calm, precise

## Target Persona

Knowledge workers and professionals who manage high-volume inboxes and need a fast, distraction-free interface.

## Screens

| Name           | Route            | Auth | Purpose                                            | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA     | —          |
| Login          | /login           | No   | Sign in                                            | —          |
| Signup         | /signup          | No   | Create account                                     | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                      | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                   | Login      |
| Inbox          | /inbox           | Yes  | Three-pane mail view (folders/threads/message)     | —          |
| Compose        | /compose         | Yes  | Full-screen composer with recipients and rich text | —          |
| ThreadView     | /thread/:id      | Yes  | Focused single-thread reading view                 | —          |
| Drafts         | /drafts          | Yes  | Saved drafts list                                  | —          |
| Starred        | /starred         | Yes  | Pinned/starred messages                            | —          |
| Settings       | /settings        | Yes  | Account, signatures, filters, notifications        | —          |

## App Constraints

- Desktop shell is a three-pane layout (label sidebar + thread list + message pane); thread list is resizable
- Unread threads render sender/subject bold and use `#eff6ff` highlight; read threads use muted secondary text
- Label chips inline after snippet, never stacked below — preserves dense scannable rows

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#3b82f6`
- Primary Dark: `#1d4ed8`
- Accent: `#7c3aed`
- Accent Hover: `#8b5cf6`
- Accent Dark: `#6d28d9`

### Semantic

- Unread: `#2563eb`
- Unread Light: `#dbeafe`
- Starred: `#eab308`
- Starred Light: `#fef9c3`
- Draft: `#f97316`
- Draft Light: `#fff7ed`
- Sent: `#16a34a`
- Sent Light: `#dcfce7`
- Spam: `#dc2626`
- Spam Light: `#fee2e2`
- Attachment: `#7c3aed`
- Attachment Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Thread Active: `#eff6ff`
- Compose: `#ffffff`
- Label Chip: `#f1f5f9`

### Text

- Sender Unread: `#0f172a`
- Sender Read: `#64748b`
- Subject Unread: `#1e293b`
- Subject Read: `#64748b`
- Snippet: `#94a3b8`
- Timestamp: `#94a3b8`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Borders

- Thread Divider: `#f1f5f9`
- Compose: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#a78bfa`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Thread Active: `#172554`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Snippet: `#64748b`
- Border Primary: `#293548`
- Thread Divider: `#1e293b`

## Typography

### Font Families

- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Subject: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (code blocks in emails): `"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Sizes

- Thread Snippet: `0.8125rem` (13px)
- Message Meta: `0.75rem` (12px)
- Compose Body: `0.9375rem` (15px)

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `220px` (collapsed: `56px`)
- Thread List Width: `380px` (min: `300px`, max: `480px`, resizable)
- Message Pane: fills remaining width
- Top Bar Height: `52px`
- Thread Row Height: `72px` (compact: `48px`, comfortable: `84px`)
- Compose Window Width: `560px`
- Compose Window Min Height: `420px`
- Search Bar Width: `520px` (max)

## Components

### Thread Row

- Padding: `8px 16px`
- Border bottom: `1px solid` thread-divider
- Unread: sender bold `700`, subject bold `600`, surface-secondary background
- Read: sender weight `400`, subject weight `400`, surface background
- Hover: surface-secondary background
- Selected/Active: thread-active background, `3px` left border primary
- Checkbox: `18px` rounded `4px`, left of avatar
- Avatar: `36px` circle, sender initials, muted background
- Star icon: `16px`, filled starred color when active, `#d1d5db` when inactive
- Attachment icon: `14px` paperclip, attachment color, inline after subject
- Timestamp: right-aligned, message-meta size, timestamp color
- Label chips: inline after snippet, `4px` radius, `2px 6px` padding, xs font

### Thread View / Message Bubble

- Message card border radius: `8px`
- Message card padding: `20px 24px`
- Message card margin bottom: `8px`
- Sender line: font weight `600`, base size
- Timestamp: message-meta size, secondary text
- Expand/collapse chevron: `20px`, secondary text
- Quoted text: `3px` left border secondary, `12px` left padding, secondary text color
- Attachment chips: `8px` radius, `8px 12px` padding, label-chip background, sm font

### Compose Window

- Border radius: `12px` (lg) top corners
- Shadow: `lg`
- Title bar: `40px` height, surface-secondary background, bold subject
- To/Cc/Bcc fields: tag-style chips for recipients, `6px` radius, primary-light background
- Body: min height `200px`, compose-body font size, line height `1.6`
- Toolbar: bottom-fixed, `44px` height, icon buttons `32px`, `8px` radius
- Send button: `40px` height, primary background, white text, `600` weight, `8px` radius
- Discard: ghost button, error color on hover
- Minimize/expand icons: `18px`, top-right of title bar

### Label / Folder Sidebar

- Section headers: xs font, uppercase, `600` weight, `24px` top margin
- Item height: `36px`
- Item padding: `6px 12px`
- Active item: primary-light background (`#eff6ff`), primary text, `600` weight
- Unread count badge: `9999px` radius pill, `2px 8px` padding, xs font, `500` weight
- Color dot: `10px` circle before custom label names
- Compose button: full sidebar width, `44px` height, primary solid, `12px` radius, `600` weight
- Hover: surface-secondary background

### Search Bar

- Border radius: `9999px` (pill)
- Height: `40px`
- Background: surface-secondary (light), `#1e293b` (dark)
- Padding: `8px 16px`
- Search icon: `18px`, secondary text color, left inset
- Focus: `2px` solid primary border, surface background
- Suggestion dropdown: `8px` radius, `lg` shadow, full search-bar width
- Filter chips: inside bar, `4px` radius, primary-light background, sm font

### Attachment Preview

- Thumbnail: `48px` square, `8px` radius, object-fit cover
- File icon fallback: `32px`, muted color, centered in `48px` square
- File name: sm font, truncate with ellipsis at `180px`
- File size: xs font, tertiary text
- Download icon: `16px`, secondary text, hover primary
- Inline images in thread: max-width `100%`, `8px` radius, `md` shadow on hover

### Empty States

- Icon: `64px`, tertiary text color
- Heading: lg font, `600` weight, primary text
- Subtext: sm font, secondary text, max-width `320px`, centered
- Inbox zero: checkmark circle icon, accent color

### Notification Badge (Sidebar)

- Size: `18px` min-width, `18px` height
- Border radius: `9999px`
- Font size: `11px`
- Font weight: `700`
- Background: primary
- Text: inverse (white)
- Position: right-aligned within sidebar item
