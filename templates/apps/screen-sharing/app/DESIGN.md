# DESIGN.md — Screen Sharing

## Brand Identity

- **App Name:** Glint
- **Tagline:** Your screen, amplified
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Clear, responsive, broadcast-ready, polished

## Target Persona

Remote teams recording and sharing async screen-captures with teammates for design review and bug reports.

## Screens

| Name            | Route            | Auth | Purpose                                                        | deriveFrom |
| --------------- | ---------------- | ---- | -------------------------------------------------------------- | ---------- |
| Landing         | /                | No   | Marketing home with recording demo                             | —          |
| Login           | /login           | No   | Sign in                                                        | —          |
| Signup          | /signup          | No   | Create account                                                 | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                  | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                               | Login      |
| Library         | /library         | Yes  | Recording library with thumbnails                              | —          |
| RecordingDetail | /recordings/:id  | Yes  | Playback view with comments and transcript                     | —          |
| Record          | /record          | Yes  | Recording controls and setup                                   | —          |
| Shared          | /shared          | Yes  | Recordings shared with the user                                | —          |
| Settings        | /settings        | Yes  | Account, camera, mic, hotkeys                                  | —          |
| Analytics       | /analytics       | Yes  | Engagement metrics, view graph, viewer heatmap, recent viewers | —          |
| PublicShare     | /share/:token    | No   | Public viewer for shared recording links                       | —          |
| Notifications   | /notifications   | Yes  | Activity feed for comments, mentions, views, shares            | —          |
| Team            | /team            | Yes  | Workspace member management, roles, invites, defaults          | —          |
| Billing         | /billing         | Yes  | Plan, usage meters, payment method, invoice history            | —          |
| Profile         | /profile         | Yes  | Public-facing user profile with bio and recording showcase     | —          |

## App Constraints

- Recording indicator pulses red (#ef4444) with rgba(239,68,68,0.25) glow
- Playback progress displayed with mono timecodes
- Comment pins appear at exact time markers on video timeline

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Recording: `#ef4444`
- Recording Pulse: `rgba(239, 68, 68, 0.25)`
- Live: `#ef4444`
- Processing: `#f59e0b`
- Ready: `#10b981`
- Viewed: `#7c3aed`
- Unviewed: `#94a3b8`
- Comment Highlight: `rgba(6, 182, 212, 0.15)`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Video Player: `#000000`
- Thumbnail: `#1e1b4b`
- Recording Overlay: `rgba(0, 0, 0, 0.6)`

### Text

- Timestamp: `#06b6d4`
- View Count: `#64748b`
- Duration: `#ffffff`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Focus: `#7c3aed`
- Recording: `#ef4444`
- Drop Zone: `#06b6d4`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#22d3ee`
- Background: `#0c0a1d`
- Surface: `#1a1635`
- Surface Secondary: `#231e42`
- Text Primary: `#f1f0ff`
- Text Secondary: `#a5a0c8`
- Border Primary: `#2e2854`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter Tight", Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Timestamp: `"Tabular Nums", Inter, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1400px`
- Video Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Video Grid Gap: `24px`
- Sidebar Width: `280px` (library/navigation)
- Player Max Width: `960px`
- Comment Panel Width: `360px`
- Recording Controls Height: `64px`
- Thumbnail Aspect Ratio: `16:9`

## Components

### Video Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:9`
- Padding: `0` (thumbnail flush) + `12px 16px` (content)
- Duration badge: `rgba(0, 0, 0, 0.75)` background, white text, `4px 8px` padding, `6px` radius, bottom-right absolute
- Thumbnail overlay on hover: semi-transparent play icon, scale `1.03` transition
- Title font size: `sm` (14px), weight `600`, max 2 lines with ellipsis
- Meta row: view count + timestamp, font size `xs` (12px), text-secondary

### Recording Indicator

- Dot size: `12px`
- Dot color: recording red (`#ef4444`)
- Pulse animation: `2s ease-in-out infinite`, expanding ring using recording-pulse color
- Label font weight: `600`
- Label color: recording red
- Background: `rgba(239, 68, 68, 0.08)`, border-radius `9999px`, padding `6px 14px`

### Video Player

- Border radius: `12px` (lg) outer container
- Background: video-player black
- Controls bar: `48px` height, gradient overlay from transparent to `rgba(0, 0, 0, 0.7)`
- Progress bar height: `4px`, hover: `6px`
- Progress bar filled: primary gradient (`#7c3aed` to `#06b6d4`)
- Scrubber dot: `14px`, white, shadow `md`, appears on hover
- Playback speed badge: `6px` radius, `rgba(255, 255, 255, 0.15)` background

### Share Link Card

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `16px`
- URL field: mono font, `sm` size, truncated with ellipsis
- Copy button: accent background, `8px` radius, icon-only `36px` square
- Expiry selector: ghost button style, font size `sm`

### Comment Thread

- Thread container padding: `16px`
- Comment bubble radius: `12px` (lg)
- Comment bubble background: surface-secondary
- Comment bubble padding: `12px 16px`
- Author name font weight: `600`, font size `sm`
- Timestamp font size: `xs`, text-secondary
- Timestamp link color: timestamp cyan, clickable (seeks to time)
- Reply indent: `32px` left margin
- Input border radius: `20px` (pill-ish), height `44px`

### Analytics Panel

- Stat card radius: `12px` (lg)
- Stat card padding: `20px`
- Stat value font size: `2xl` (24px), weight `700`
- Stat label font size: `sm` (14px), text-secondary
- View graph line color: primary (`#7c3aed`)
- View graph area fill: `rgba(124, 58, 237, 0.08)`
- Engagement heatmap warm: accent (`#06b6d4`)
- Engagement heatmap hot: primary (`#7c3aed`)
- Engagement heatmap cold: `#e2e8f0`
- Viewer list avatar: `32px`, border-radius `full`

### Recording Controls Bar

- Position: fixed bottom
- Height: `64px`
- Background: `rgba(15, 12, 29, 0.95)` with `blur(12px)` backdrop
- Border radius: `16px` (xl) top corners only
- Button spacing: `12px` gap
- Record button: `48px` circle, recording red, white icon
- Stop button: `48px` circle, `#1e1b4b` background, recording red rounded-square icon
- Pause button: ghost on dark, white icon
- Tool buttons (mic, cam, draw): `40px` circle, `rgba(255, 255, 255, 0.1)` background, white icons
- Active tool indicator: accent ring `2px`

### Library Sidebar

- Width: `280px`
- Section header: font size `xs`, weight `600`, uppercase, letter-spacing `0.05em`, text-secondary
- Nav item padding: `8px 12px`
- Nav item radius: `8px`
- Active item: `rgba(124, 58, 237, 0.1)` background, primary text
- Folder icon size: `18px`
- Recording count badge: `xs` font, pill shape, surface-secondary background

### Empty State

- Icon size: `64px`, text-tertiary color
- Heading: `xl` (20px), weight `600`
- Description: `sm` (14px), text-secondary, max-width `360px`
- CTA button: primary, `lg` size
