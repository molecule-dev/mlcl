# DESIGN.md — Video Conferencing

## Brand Identity

- **App Name:** Convoke
- **Tagline:** Where teams come alive
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Energetic, present, collaborative, technically confident

## Target Persona

Distributed teams and knowledge workers who run daily standups, client calls, and workshops — they want crisp media quality, frictionless join, and collaboration surfaces (chat, screen share, recordings).

## Screens

| Name            | Route                | Auth | Purpose                                                                                      | deriveFrom |
| --------------- | -------------------- | ---- | -------------------------------------------------------------------------------------------- | ---------- |
| Landing         | /                    | No   | Marketing home with hero CTA, feature highlights, trust logos                                | —          |
| Login           | /login               | No   | Sign in                                                                                      | —          |
| Signup          | /signup              | No   | Create account                                                                               | Login      |
| ForgotPassword  | /forgot-password     | No   | Request reset                                                                                | Login      |
| ResetPassword   | /reset-password      | No   | Set new password                                                                             | Login      |
| Dashboard       | /dashboard           | Yes  | Upcoming meetings, start/join actions, recent activity                                       | —          |
| Schedule        | /schedule            | Yes  | Calendar view with meeting cards, new meeting wizard                                         | —          |
| Lobby           | /meeting/:id/lobby   | Yes  | Pre-join self-preview card with device selectors                                             | —          |
| Meeting         | /meeting/:id         | Yes  | Video grid, controls bar, side panels (chat, participants)                                   | —          |
| Recordings      | /recordings          | Yes  | Past meeting recordings with thumbnails, duration, share                                     | —          |
| Settings        | /settings            | Yes  | Profile, devices, video/audio preferences, integrations                                      | —          |
| MeetingDetail   | /meeting/:id/details | Yes  | Scheduled meeting detail — info, attendees, agenda, recording settings, edit/cancel/start    | —          |
| RecordingDetail | /recordings/:id      | Yes  | Full recording player with chapters, transcript, engagement, comment-clip footer             | —          |
| Notifications   | /notifications       | Yes  | Activity feed grouped by day — invites, mentions, recordings ready, hand raised, transcripts | —          |
| Billing         | /settings/billing    | Yes  | Workspace plan, seats, payment method, plan comparison, invoice history                      | —          |
| TeamMembers     | /team                | Yes  | Workspace member directory with presence, roles, last active, slide-over detail              | —          |

## App Constraints

- In-meeting chrome uses dark video-grid surfaces (`#0f172a`); app chrome outside meetings uses light surface
- Controls bar is flush-bottom with backdrop blur; destructive end-call is pill-shaped red
- Speaking and pinned tiles use thick 3px colored borders — never drop shadow alone

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

- Live: `#22c55e`
- Live Light: `#dcfce7`
- Muted: `#f59e0b`
- Muted Light: `#fef3c7`
- Recording: `#ef4444`
- Recording Light: `#fee2e2`
- Screen Sharing: `#06b6d4`
- Screen Sharing Light: `#cffafe`
- Offline: `#6b7280`
- Offline Light: `#f3f4f6`
- Hand Raised: `#f59e0b`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Video Grid: `#0f172a`
- Participant Tile: `#1e293b`
- Controls Bar: `#0f172a`
- Chat Panel: `#ffffff`
- Sidebar: `#f8fafc`

### Text

- On Video: `#ffffff`
- On Video Secondary: `#cbd5e1`
- Participant Name: `#f8fafc`
- Timestamp: `#94a3b8`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Borders

- Panel: `#e2e8f0`
- Video Tile: `transparent`
- Video Tile Speaking: `#22c55e`
- Video Tile Pinned: `#6366f1`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Text Primary: `#f8fafc`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e293b`
- Chat Panel: `#0f172a`
- Sidebar: `#0f172a`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Timer: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Video Grid Max Width: `100%` (fills available space)
- Video Grid Columns: `auto-fit` based on participant count (1–2: single/side-by-side, 3–4: 2×2, 5–9: 3×3, 10+: 4×4 with overflow scroll)
- Video Grid Gap: `8px`
- Sidebar Panel Width: `320px` (chat, participants, settings)
- Controls Bar Height: `72px`
- Top Bar Height: `48px`
- Lobby Card Width: `480px`
- Calendar View Columns: `7` (week view)

## Components

### Video Tile

- Border radius: `12px` (lg)
- Background: participant-tile
- Aspect ratio: `16:9`
- Overflow: `hidden`
- Name overlay: bottom-left, `12px 16px` padding, semi-transparent black gradient (`rgba(0,0,0,0.6)` → `transparent`)
- Name font size: `sm` (14px), weight `500`, color on-video
- Muted icon: bottom-right, `8px` from edges, `28px` circle, `rgba(0,0,0,0.5)` background
- Speaking indicator: `3px solid` live color border, animated pulse glow (`0 0 0 4px rgba(34, 197, 94, 0.3)`)
- Pinned indicator: `3px solid` primary color border
- Hover: overlay with action buttons (pin, spotlight, mute), `rgba(0,0,0,0.4)` background
- Self-view: mirrored horizontally (`transform: scaleX(-1)`)
- Camera-off state: centered initials avatar (`48px` circle, primary background, `2xl` white text)

### Controls Bar

- Background: controls-bar
- Border radius: `0` (flush to bottom)
- Padding: `12px 24px`
- Backdrop blur: `16px`
- Layout: three sections — left (meeting info), center (media controls), right (secondary actions)
- Center group gap: `8px`

### Control Button

- Size: `48px` circle (border-radius: `full`)
- Background: `rgba(255, 255, 255, 0.1)`
- Hover: `rgba(255, 255, 255, 0.2)`
- Icon size: `20px`, color on-video
- Active/toggled-off state (muted, camera off): `rgba(255, 255, 255, 0.15)` background, icon has diagonal strike-through
- Destructive (end call): recording color background (`#ef4444`), hover `#dc2626`, `56px` width pill shape

### Participant List Item

- Height: `48px`
- Padding: `8px 16px`
- Avatar: `32px` circle
- Name font size: `sm` (14px), weight `500`
- Status icons: right-aligned, `16px`, muted/camera-off/screen-sharing/hand-raised indicators
- Hover: surface-secondary background
- Host badge: `xs` (12px) text, primary color, `500` weight

### Chat Message

- Padding: `8px 16px`
- Sender name: `sm` (14px), weight `600`, primary text
- Message body: `sm` (14px), weight `400`
- Timestamp: `xs` (12px), timestamp color, right-aligned
- Own messages: right-aligned, primary background, on-video text
- Others' messages: left-aligned, surface-secondary background
- System messages: center-aligned, `xs` (12px), italic, secondary text
- File attachment: `12px` radius card, `8px 12px` padding, border-panel border

### Meeting Card (Schedule/Calendar)

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Time: `sm` (14px), weight `600`, primary color
- Title: `base` (16px), weight `600`
- Participant avatars: overlapping stack, `28px` circles, `-8px` margin-left, max 4 shown + "+N" counter
- Join button: accent background, `8px` radius, `500` weight
- Status dot: `8px` circle — upcoming: accent, live: live (animated pulse), ended: offline

### Recording Indicator

- Position: top-left of video grid, `16px` from edges
- Background: `rgba(239, 68, 68, 0.9)`
- Border radius: `full` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px), weight `600`, on-video text
- Red dot: `8px` circle, animated pulse (`opacity 0.5 → 1`, `1s` infinite)
- Label: "REC" + elapsed time (tabular-nums font)

### Screen Share Viewer

- Background: video-grid
- Border radius: `0` (fills main area)
- Presenter video: picture-in-picture, bottom-right, `240px` wide, `12px` radius, `16px` from edges, draggable
- Toolbar overlay: top-center, auto-hide after `3s`, hover to reveal
- Annotation tools: floating bar, `8px` radius, `rgba(0,0,0,0.7)` background

### Lobby/Pre-join Screen

- Layout: centered card, `480px` width
- Background: video-grid (full page dark)
- Card: surface background, `16px` radius, `32px` padding, `lg` shadow
- Self-preview: `16:9` aspect, `12px` radius, video-grid background
- Device selectors: standard input style, `md` height
- Join button: full width, `lg` height (`48px`), primary background, `600` weight
- Audio/video toggles: below preview, `40px` circle buttons

### Reactions Overlay

- Position: above controls bar
- Animation: float up + fade out, `2s` duration
- Emoji size: `32px`
- Stagger: random horizontal offset within participant tile

### Notification Toast (In-Meeting)

- Position: top-right, `16px` from edges
- Background: surface with `lg` shadow
- Border radius: `12px`
- Padding: `12px 16px`
- Max width: `320px`
- Auto-dismiss: `4s`
- Types: join/leave (info), hand raised (warning), recording started (error)

### Breakout Room Card

- Border radius: `12px`
- Background: surface
- Border: `1px solid` panel border
- Padding: `16px`
- Room name: `base` (16px), weight `600`
- Participant count: `sm` (14px), secondary text
- Participant avatars: `24px` circles, horizontal stack
- Action buttons: `sm` size, outline variant

## Z-Index Overrides

- Video Grid: `0`
- Participant Overlay: `100`
- Screen Share PiP: `200`
- Controls Bar: `300`
- Sidebar Panel: `400`
- Reactions: `500`
- Notification Toast: `1600` (inherits base toast)
- Modal: `1300` (inherits base)
