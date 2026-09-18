# DESIGN.md — Messaging App

## Brand Identity

- **App Name:** Hush
- **Tagline:** Private by nature
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Quiet
- Secure
- Intimate
- Trustworthy

## Target Persona

People wanting end-to-end encrypted messaging with groups, read receipts, and disappearing messages.

## Screens

| Name            | Route              | Auth | Purpose                                                                           | deriveFrom      |
| --------------- | ------------------ | ---- | --------------------------------------------------------------------------------- | --------------- |
| Landing         | /                  | No   | Marketing home                                                                    | —               |
| Login           | /login             | No   | Sign in                                                                           | —               |
| Signup          | /signup            | No   | Create account                                                                    | Login           |
| ForgotPassword  | /forgot-password   | No   | Request reset                                                                     | Login           |
| ResetPassword   | /reset-password    | No   | Set new password                                                                  | Login           |
| Inbox           | /inbox             | Yes  | Conversation list with previews, unread counts, timestamps                        | —               |
| Conversation    | /conversations/:id | Yes  | Message thread with composer, attachments, reactions                              | Inbox           |
| NewConversation | /conversations/new | Yes  | Start new conversation, pick contacts                                             | Inbox           |
| Contacts        | /contacts          | Yes  | Contact list with presence, verify keys                                           | Inbox           |
| Groups          | /groups            | Yes  | Group chats list and settings                                                     | Inbox           |
| Settings        | /settings          | Yes  | Privacy, notifications, appearance, devices                                       | Inbox           |
| ContactDetail   | /contacts/:id      | Yes  | View a contact, verify safety number, shared media, disappearing-message controls | —               |
| GroupDetail     | /groups/:id        | Yes  | Manage a group — members, admins, permissions, group safety number, shared media  | —               |
| NewGroup        | /groups/new        | Yes  | Create a new group — pick members, set name, description, encryption              | NewConversation |
| Profile         | /profile           | Yes  | Own profile — display name, status, safety number, linked devices, privacy        | —               |
| Archive         | /archive           | Yes  | Archived conversations — restore, delete, browse quietly                          | —               |
| Search          | /search            | Yes  | Global search across people, groups, messages, media (encrypted, on-device)       | —               |
| Notifications   | /notifications     | Yes  | Activity feed — mentions, group invites, calls, security events                   | —               |

## App Constraints

- Three-pane layout: convo list / thread / details
- Encryption lock icon on every message
- Read receipts and typing indicators

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6366f1`
- Primary Hover: `#818cf8`
- Primary Dark: `#4f46e5`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Sent: `#6366f1`
- Received: `#e5e7eb`
- Delivered: `#94a3b8`
- Read: `#6366f1`
- Encrypted: `#10b981`
- Online: `#22c55e`
- Away: `#f59e0b`
- Offline: `#9ca3af`
- Typing: `#a5b4fc`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Chat: `#f1f5f9`
- Sent Bubble: `#6366f1`
- Received Bubble: `#ffffff`
- Sidebar: `#f8fafc`
- Compose Bar: `#ffffff`

### Text

- Sent Bubble: `#ffffff`
- Received Bubble: `#1e293b`
- Timestamp: `#94a3b8`
- Unread Count: `#ffffff`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#6366f1`
- Compose: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Chat: `#0f1a2e`
- Sent Bubble: `#4f46e5`
- Received Bubble: `#1e293b`
- Received Bubble Text: `#f1f5f9`
- Timestamp: `#64748b`
- Sidebar: `#131d2e`
- Compose Bar: `#1a2332`
- Border Primary: `#293548`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Message: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (code blocks in messages): `"JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace`

### Message-Specific Sizes

- Message body: `0.9375rem` (15px)
- Message timestamp: `0.6875rem` (11px)
- Message sender name (group): `0.8125rem` (13px)
- Conversation preview: `0.875rem` (14px)
- Unread badge: `0.6875rem` (11px)

## Layout

- Content Max Width: `100vw` (full viewport, no max)
- Sidebar Width: `360px` (collapsed: `72px`)
- Chat Area: fills remaining width
- Compose Bar Height: `64px` (expands with multiline input, max `200px`)
- Message Max Width: `65%` of chat area (prevents wall-of-text)
- Top Bar Height: `60px`
- Message Group Spacing: `16px` (between different senders)
- Message Spacing: `2px` (consecutive from same sender)
- Media Grid Columns: `3` (multi-image), `1` (single image full-width)
- Info Panel Width: `320px` (slides over chat area on mobile, side panel on desktop)

## Components

### Chat Bubble (Sent)

- Border radius: `18px 18px 4px 18px`
- Background: sent-bubble
- Text color: sent-bubble-text
- Padding: `8px 14px`
- Max width: `65%`
- Shadow: none
- Timestamp: bottom-right, `11px`, `rgba(255,255,255,0.7)`
- Read receipt: double-check icon, `14px`, inline with timestamp
- Consecutive: top radius collapses to `4px` (grouped tail)

### Chat Bubble (Received)

- Border radius: `18px 18px 18px 4px`
- Background: received-bubble
- Text color: received-bubble-text
- Padding: `8px 14px`
- Max width: `65%`
- Shadow: `0 1px 2px rgba(0,0,0,0.06)`
- Sender name (group chats): above bubble, `13px`, `600` weight, primary color
- Timestamp: bottom-right, `11px`, timestamp color
- Consecutive: top radius collapses to `4px` (grouped tail)

### Conversation List Item

- Height: `72px`
- Padding: `12px 16px`
- Avatar size: `48px`, border-radius: `9999px`
- Name font: `15px`, weight `600`
- Preview text: `14px`, weight `400`, secondary color, single-line ellipsis
- Timestamp: `12px`, top-right, secondary color
- Unread badge: `20px` circle, primary background, white text, `11px` bold
- Active/selected: primary at `8%` opacity background
- Hover: primary at `4%` opacity background
- Typing indicator: italic preview text "typing..." in primary color
- Pinned indicator: pin icon, `12px`, top-right below timestamp

### Avatar

- Sizes: `xs` (24px), `sm` (32px), `md` (48px), `lg` (64px), `xl` (96px)
- Border radius: `9999px`
- Online indicator: `10px` green circle, bottom-right, `2px` white border
- Group avatar: 2 overlapping circles at 60% size, offset `30%`
- Fallback: first letter of name, `600` weight, colored background derived from name hash

### Compose Bar

- Border-top: `1px solid` compose-border
- Background: compose-bar
- Input border radius: `22px`
- Input background: chat background
- Input padding: `10px 16px`
- Attachment button: `40px` circle, ghost style, left of input
- Send button: `40px` circle, primary background, right of input
- Send button disabled: secondary color at `40%` opacity
- Emoji picker trigger: `40px` circle, ghost, right of input (before send)
- Voice record button: replaces send when input is empty, `40px` circle, ghost

### Message Reactions

- Container: below bubble, offset `4px`
- Pill shape: `9999px` border-radius
- Background: surface, `1px solid` border-primary
- Padding: `2px 8px`
- Emoji size: `16px`
- Count: `12px`, `500` weight
- Active (user reacted): primary at `12%` background, primary border

### Read Receipts

- Single check: message sent, `delivered` color
- Double check: message delivered, `delivered` color
- Double check filled: message read, `read` color (primary)
- Icon size: `16px`
- Position: inline with timestamp in sent bubbles

### Encryption Badge

- Icon: lock, `12px`
- Color: `encrypted` green
- Text: `12px`, `500` weight
- Position: top of chat area, centered, pill-shaped
- Background: encrypted at `10%` opacity
- Padding: `4px 12px`
- Border radius: `9999px`

### Media Message

- Single image: rounded `12px`, max-width `320px`, aspect ratio preserved
- Image grid (2-4): `4px` gap, rounded `12px` outer corners
- Video: thumbnail with play button overlay, `48px` circle, `rgba(0,0,0,0.5)` background
- Audio: waveform visualization, `40px` height, primary color, play/pause button
- File: icon + filename + size, border `1px solid` border-primary, radius `12px`, padding `12px`
- Download indicator: circular progress ring, primary color, `2px` stroke

### Typing Indicator

- Three animated dots in a received-style bubble
- Dot size: `8px`
- Dot color: `#94a3b8`
- Animation: sequential bounce, `1.2s` loop
- Bubble padding: `12px 16px`

### Contact/Group Info Panel

- Width: `320px`
- Avatar: `xl` (96px), centered
- Name: `20px`, `700` weight, centered
- Status/bio: `14px`, `400` weight, secondary color, centered
- Section divider: `8px` background-secondary gap
- Media gallery: `3` column grid, `2px` gap, square thumbnails
- Shared links: list with favicon + title + domain
- Members list (group): avatar `sm` + name + role badge

### Group Chat Extras

- Member avatars: stacked, max `3` visible + "+N" overflow pill
- Admin badge: `xs` pill, accent background, white text
- Join/leave system message: centered, `13px`, secondary color, no bubble

### Notification Badge

- Size: `20px` min-width circle (expands for 2+ digits)
- Background: primary
- Text: `11px`, `700` weight, white
- Position: top-right of avatar or icon
- Border: `2px solid` surface (creates separation from background)

### Search

- Input: full-width in sidebar header, `36px` height, radius `18px`
- Background: background-secondary
- Icon: `16px`, left padding
- Results: highlighted match text in `600` weight primary color
- Filter tabs: "All", "People", "Groups", "Media" — pill style

### Date Separator

- Centered pill between message groups
- Background: `rgba(0,0,0,0.06)` (light) / `rgba(255,255,255,0.08)` (dark)
- Text: `12px`, `500` weight
- Padding: `4px 12px`
- Border radius: `9999px`
- Format: "Today", "Yesterday", or "MMM D, YYYY"

### Empty State

- Centered in chat area when no conversation is selected
- Icon: `64px`, secondary color at `30%` opacity
- Heading: `20px`, `600` weight
- Subtext: `14px`, secondary color
- Illustration style: minimal line art, primary + accent colors

## Animations

- Message appear: slide-up `8px` + fade-in, `200ms ease-out`
- Bubble send: scale from `0.95` to `1`, `150ms ease-out`
- Typing dots: sequential scale `1` to `1.4`, `100ms` stagger
- Sidebar slide: `250ms ease` translate-x
- Reaction pop: scale from `0` to `1.2` to `1`, `300ms` spring
- Unread badge: scale from `0` to `1`, `200ms` spring
- Online indicator pulse: `2s` infinite subtle opacity pulse
