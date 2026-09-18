# DESIGN.md — Video Streaming

## Brand Identity

- **App Name:** Spool
- **Tagline:** Unwind. Watch. Create.
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Playful, immersive, contemporary, social

## Target Persona

Viewers and creators who want an entertainment-first streaming experience — easy discovery, rich player, fluid community interactions around videos and channels.

## Screens

| Name           | Route            | Auth | Purpose                                                                    | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with featured content and creator CTA                       | —          |
| Login          | /login           | No   | Sign in                                                                    | —          |
| Signup         | /signup          | No   | Create account                                                             | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                              | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                           | Login      |
| Home           | /home            | Yes  | Personalized feed of recommended videos and channels                       | —          |
| Watch          | /watch/:id       | Yes  | Video player with chapters, comments, and recommendations                  | —          |
| Channel        | /channel/:id     | Yes  | Channel profile with banner, tabs, and video grid                          | —          |
| Subscriptions  | /subscriptions   | Yes  | Feed of videos from subscribed channels                                    | —          |
| Library        | /library         | Yes  | History, watch later, liked videos and playlists                           | —          |
| Upload         | /upload          | Yes  | Upload and publish new videos with details editor                          | —          |
| Settings       | /settings        | Yes  | Account, playback, privacy, and notifications                              | —          |
| Search         | /search          | Yes  | Global search results across videos, channels, and playlists               | —          |
| Trending       | /trending        | Yes  | Platform-wide trending videos by category, distinct from personalized Home | —          |
| Notifications  | /notifications   | Yes  | Activity feed for subscriptions, comments, mentions, milestones            | —          |
| Studio         | /studio          | Yes  | Creator dashboard with channel analytics and video management              | —          |
| PlaylistDetail | /playlist/:id    | Yes  | Single playlist view with cover, metadata, and ordered video list          | —          |

## App Constraints

- Dark-first UI — authenticated surfaces use `#0f0f14` background, players use pure `#000000`
- Video grid uses 4-column desktop / 3-laptop / 2-tablet / 1-mobile with `16px` horizontal and `40px` vertical gap
- Live badges use red `#ef4444` background with pulsing dot; duration chips use semi-opaque black in bottom-right of thumbnails

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#f43f5e`
- Accent Hover: `#fb7185`
- Accent Dark: `#e11d48`

### Semantic

- Live: `#ef4444`
- Live Light: `#fee2e2`
- Premiere: `#f59e0b`
- Premiere Light: `#fef3c7`
- Subscriber: `#7c3aed`
- Subscriber Light: `#ede9fe`
- Views: `#6b7280`
- Chapter Active: `#7c3aed`
- Chapter Track: `#334155`

### Backgrounds

- Primary: `#0f0f14`
- Secondary: `#16161d`
- Tertiary: `#1e1e28`
- Surface: `#1c1c26`
- Surface Secondary: `#242430`
- Input: `#242430`
- Overlay: `rgba(0, 0, 0, 0.75)`
- Player: `#000000`
- Theater: `#0a0a0e`

### Text

- Primary: `#f0f0f5`
- Secondary: `#9595a8`
- Tertiary: `#6b6b80`
- Inverse: `#0f0f14`
- Link: `#8b5cf6`
- Link Hover: `#a78bfa`
- Channel Name: `#f0f0f5`
- View Count: `#9595a8`
- Timestamp: `#9595a8`

### Borders

- Primary: `#2a2a38`
- Secondary: `#3a3a4a`
- Focus: `#7c3aed`

### Dark Theme Overrides

Dark IS the default for Spool. Light theme overrides below:

#### Light Theme Overrides

- Primary: `#7c3aed`
- Background: `#f4f4f8`
- Surface: `#ffffff`
- Surface Secondary: `#f8f8fc`
- Text Primary: `#1a1a2e`
- Text Secondary: `#64648a`
- Border Primary: `#e0e0ea`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Timestamp: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Weights

- Channel Name: `600`
- Video Title (card): `500`
- Video Title (watch page): `700`
- Section Heading: `700`
- Subscriber Count: `500`
- Metadata: `400`

## Layout

- Content Max Width: `1400px`
- Video Grid Columns: `4` (desktop), `3` (laptop), `2` (tablet), `1` (mobile)
- Video Grid Gap: `16px` horizontal, `40px` vertical
- Sidebar Width: `240px` (collapsed: `72px`)
- Sidebar Mini (icons only): `72px`
- Right Panel Width: `400px` (comments/recommendations on watch page)
- Player Max Width: `100%` (theater mode), `960px` (default)
- Player Aspect Ratio: `16:9`
- Top Bar Height: `56px`
- Chapter Bar Height: `4px` (idle), `8px` (hover)

## Components

### Video Card

- Border radius: `12px` (lg)
- Shadow: none (dark backgrounds make shadows unnecessary)
- Thumbnail aspect ratio: `16:9`
- Thumbnail border radius: `12px` (lg)
- Thumbnail padding: `0`
- Content padding: `12px 0`
- Channel avatar: `36px` circle, left of title
- Duration badge: `#000000cc` background, white text, `4px` radius, bottom-right of thumbnail, font size `xs`, font weight `500`
- Live badge: Live semantic color background, white text, `4px` radius, `LIVE` label
- Hover: thumbnail scales `1.02`, duration badge visible only on hover
- Progress bar: `3px` height at thumbnail bottom, primary color, shows watch progress

### Video Player

- Background: player background
- Controls bar height: `48px`
- Controls bar background: `linear-gradient(transparent, rgba(0,0,0,0.8))`
- Play button: `48px` centered overlay on pause
- Progress bar: `4px` default, `8px` on hover, primary color fill, chapter dividers as `2px` gaps
- Buffer bar: `rgba(255,255,255,0.3)`
- Chapter tooltip: `#1c1c26` background, `8px` radius, `8px 12px` padding, appears above progress bar on hover
- Volume slider: `80px` width, `4px` track, primary fill
- Settings menu: `#1c1c26` background, `12px` radius, `240px` width
- Subtitle overlay: `#000000aa` background behind text, `16px` font, `2px` text shadow, bottom-center
- Theater mode: player fills viewport width, `#0a0a0e` background behind

### Chapter List

- Container padding: `16px`
- Chapter item padding: `12px 16px`
- Chapter item border radius: `8px`
- Active chapter: primary background at `10%` opacity, primary left border `3px`
- Chapter timestamp: mono font, `sm` size, primary color
- Chapter title: `sm` size, font weight `500`
- Divider: `1px solid` border-primary

### Comment

- Avatar: `40px` circle (top-level), `24px` (reply)
- Content padding: `0 0 0 52px` (top-level), `0 0 0 36px` (reply)
- Spacing between comments: `16px`
- Username font weight: `600`, font size `sm`
- Timestamp: `sm` size, text-tertiary color
- Like/dislike buttons: `24px` icons, text-secondary, primary on active
- Reply indent: `52px` left margin
- "Show replies" toggle: primary color text, font weight `500`

### Subscribe Button

- Border radius: `9999px` (pill)
- Height: `36px`
- Padding: `0 20px`
- Font weight: `600`
- Font size: `sm`
- Unsubscribed: accent background, white text
- Subscribed: surface-secondary background, text-primary, `1px` border
- Hover (subscribed): error-light background, error text, label changes to "Unsubscribe"

### Channel Header

- Banner height: `200px` (desktop), `120px` (mobile)
- Avatar: `80px` circle, positioned overlapping banner bottom
- Channel name: `2xl` size, font weight `700`
- Subscriber count: `sm` size, text-secondary
- Tab navigation: `48px` height, border-bottom `2px` primary on active, text-secondary default

### Search Bar

- Height: `40px`
- Border radius: `9999px` (pill)
- Background: surface-secondary
- Border: `1px solid` border-primary
- Focus: border-focus, `2px` outline
- Search icon: `20px`, text-tertiary, inside left
- Clear button: `20px`, text-tertiary, inside right
- Voice search button: `40px` circle, surface-secondary, right of search bar

### Sidebar Navigation

- Item height: `40px`
- Item padding: `0 24px` (expanded), `0` centered (collapsed)
- Item border radius: `10px`
- Item icon: `20px`
- Active item: surface-secondary background, text-primary
- Section divider: `1px solid` border-primary, `16px` vertical margin
- Subscriptions section: channel avatar `24px` circle + channel name, live indicator dot `8px` circle

### Upload Modal

- Size: `lg` (640px)
- Border radius: `12px`
- Drop zone: dashed `2px` border-secondary, `160px` height, `12px` radius
- Drop zone active: dashed `2px` primary, primary-light background
- Progress bar: `4px` height, primary fill, `9999px` radius
- Thumbnail preview: `16:9` aspect, `8px` radius
- Stage indicator: numbered circles connected by lines, primary when complete, border-secondary when pending

### Subtitle Track

- Display area: bottom `10%` of player
- Background: `#000000cc`
- Text color: `#ffffff`
- Font size: `lg` (default), configurable `sm` to `2xl`
- Padding: `4px 12px`
- Border radius: `4px`
- Max width: `80%` of player width, centered
- Language selector: settings submenu, checkmark on active

### Like/Dislike Bar

- Button height: `36px`
- Border radius: `9999px` (pill, combined bar)
- Divider: `1px solid` border-primary between like/dislike
- Like active: primary color fill
- Dislike active: text-primary
- Count: `sm` size, font weight `500`, tabular nums
- Background: surface-secondary

## Animations

- Card hover scale: `transform: scale(1.02)`, `200ms ease`
- Player controls fade: `opacity`, `200ms ease`
- Progress bar expand: `height 150ms ease`
- Subscribe state change: `background-color 200ms ease, color 200ms ease`
- Sidebar expand/collapse: `width 200ms ease`
- Chapter highlight: `background-color 150ms ease`
- Like button press: `scale(1.2)` then `scale(1)`, `300ms ease`
