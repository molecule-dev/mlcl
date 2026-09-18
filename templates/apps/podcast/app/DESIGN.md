# DESIGN.md — Podcast Platform

## Brand Identity

- **App Name:** Wavelength
- **Tagline:** Tune into every story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Immersive, broadcast-warm, curious, cinematic

## Target Persona

Podcast listeners and creators who want a rich discovery experience, deep episode library management, and smooth playback control.

## Screens

| Name           | Route            | Auth | Purpose                                                                   | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with featured shows                                        | —          |
| Login          | /login           | No   | Sign in                                                                   | —          |
| Signup         | /signup          | No   | Create account                                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                          | Login      |
| Discover       | /discover        | Yes  | Explore shows by category with editorial carousels                        | —          |
| ShowDetail     | /shows/:id       | Yes  | Show page with episode list, subscribe button                             | —          |
| EpisodePlayer  | /episodes/:id    | Yes  | Full episode player with transcript and chapters                          | —          |
| Library        | /library         | Yes  | Subscribed shows and saved episodes                                       | —          |
| Queue          | /queue           | Yes  | Playback queue with reorderable list                                      | —          |
| Settings       | /settings        | Yes  | Playback, downloads, notifications                                        | —          |
| Search         | /search          | Yes  | Global search across shows, episodes, and people with segmented results   | —          |
| Notifications  | /notifications   | Yes  | Activity feed of new episodes, recommendations, and creator announcements | Discover   |
| Profile        | /profile         | Yes  | Listener profile with stats, subscriptions, and listening history         | Settings   |

## App Constraints

- Global mini-player persists across authenticated screens (bottom bar)
- Warm off-white background (#faf9f7) evokes paper and analog warmth
- Playback progress displayed in mono (e.g., 12:34 / 45:08) for precision

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e8540a`
- Primary Hover: `#f97316`
- Primary Dark: `#c2410c`
- Accent: `#7c3aed`
- Accent Hover: `#8b5cf6`
- Accent Dark: `#6d28d9`

### Semantic

- Now Playing: `#e8540a`
- Now Playing Glow: `rgba(232, 84, 10, 0.2)`
- Live: `#ef4444`
- Live Pulse: `rgba(239, 68, 68, 0.4)`
- New Episode: `#22c55e`
- Transcription: `#7c3aed`
- Subscribed: `#e8540a`
- Unplayed: `#3b82f6`
- Played: `#a1a1aa`

### Backgrounds

- Primary: `#faf9f7`
- Secondary: `#f3f1ed`
- Tertiary: `#e8e5df`
- Surface: `#ffffff`
- Surface Secondary: `#faf9f7`
- Surface Elevated: `#ffffff`
- Input: `#ffffff`
- Player Bar: `#1c1917`
- Overlay: `rgba(0, 0, 0, 0.5)`

### Text

- Primary: `#1c1917`
- Secondary: `#78716c`
- Tertiary: `#a8a29e`
- Inverse: `#fafaf9`
- Link: `#e8540a`
- Link Hover: `#c2410c`
- Timestamp: `#a8a29e`
- Episode Date: `#78716c`

### Borders

- Primary: `#e7e5e4`
- Secondary: `#d6d3d1`
- Focus: `#e8540a`

### Dark Theme Overrides

- Primary: `#f97316`
- Accent: `#a78bfa`
- Background Primary: `#0c0a09`
- Background Secondary: `#1c1917`
- Background Tertiary: `#292524`
- Surface: `#1c1917`
- Surface Secondary: `#292524`
- Surface Elevated: `#33302e`
- Input: `#292524`
- Player Bar: `#0c0a09`
- Text Primary: `#fafaf9`
- Text Secondary: `#a8a29e`
- Text Tertiary: `#78716c`
- Border Primary: `#292524`
- Border Secondary: `#3d3935`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"Fraunces", Georgia, "Times New Roman", serif` (headings, show titles — optical size, weight 800)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (timestamps, durations, RSS URLs)

### Podcast-Specific Typography

- Show Title: `xl` (20px), display font, weight `700`
- Episode Title: `base` (16px), weight `600`
- Episode Description: `sm` (14px), weight `400`, text-secondary, max 3 lines
- Host Name: `sm` (14px), weight `500`
- Section Heading: `2xl` (24px), display font, weight `800`, letter-spacing `-0.01em`
- Player Show Title: `sm` (14px), weight `600`
- Player Episode Title: `xs` (12px), weight `400`, text-secondary
- Timestamp/Duration: `xs` (12px), weight `400`, mono font, text-tertiary
- Transcript Speaker: `sm` (14px), weight `600`, primary color
- Transcript Body: `base` (16px), weight `400`, line-height `relaxed`

## Layout

- Content Max Width: `1200px`
- Sidebar Width: `260px` (collapsed: `68px`)
- Right Panel (Show Notes / Transcript): `380px`
- Player Bar Height: `88px`
- Top Bar Height: `56px`
- Grid Columns (Discover): `4` (desktop), `2` (tablet), `1` (mobile)
- Grid Columns (Episodes): `1` (list layout, always)
- Grid Gap: `20px`
- Content Padding: `32px` (desktop), `16px` (mobile)
- Episode List Max Width: `800px` (centered within content area)

## Components

### Show Card

- Border radius: `12px` (lg)
- Background: `Surface`
- Shadow: `sm`, hover: `md`
- Hover: lift `translateY(-2px)` with `normal` transition
- Image: `1:1` aspect ratio, border-radius `12px`
- Padding: `0` (image flush) + `16px` (content)
- Show title: display font, truncate single line, weight `700`
- Host/network: truncate single line, text-secondary
- Category badge: `xs` pill, `Surface Secondary` background, text-secondary
- Subscribe button overlay: appears bottom-right of image on hover, `36px` circle, primary background, `+` icon

### Episode Row

- Height: `88px`
- Padding: `16px`
- Border radius: `12px` (lg)
- Background: `Surface`
- Border: `1px solid` border-primary
- Hover: `Surface Secondary` background
- Layout: `[64px art] [1fr title+meta] [120px duration+controls]`
- Episode art: `64px × 64px`, border-radius `8px`
- Unplayed indicator: `8px` circle, `Unplayed` color, left of title
- Date: `xs` (12px), text-secondary, format "Mar 15, 2026"
- Duration: `xs` (12px), mono font, text-tertiary, format "1h 24m"
- Play button: `40px` circle, primary background, centered play icon
- Download icon: `28px`, text-tertiary, hover text-primary
- More menu: `28px`, text-tertiary, hover text-primary

### Player Bar

- Position: fixed bottom, full width
- Height: `88px`
- Background: `Player Bar` (dark always — both themes)
- Border top: none (seamless dark bar)
- Layout: `[30% now-playing] [40% controls+progress] [30% speed+volume+extras]`
- Progress bar height: `4px`, expands to `6px` on hover
- Progress bar color: primary (played), `#44403c` (remaining)
- Progress bar border-radius: `full`
- Control button sizes: play/pause `44px`, skip-30s/back-15s `32px`, next/prev `28px`
- Skip labels: `15` and `30` overlaid in `9px` bold mono on back/skip icons
- Volume slider width: `100px`
- Speed button: `36px × 24px`, mono font, `xs`, border `1px solid #44403c`, border-radius `4px`
- Speed options: `0.5×`, `0.75×`, `1×`, `1.25×`, `1.5×`, `1.75×`, `2×`
- Episode art thumbnail: `56px × 56px`, border-radius `8px`
- Text on player bar: always light (`Inverse` color)

### Subscription Card

- Border radius: `12px` (lg)
- Background: `Surface`
- Border: `1px solid` border-primary
- Padding: `16px`
- Layout: horizontal — `80px` show art left, metadata right
- Show art: `80px × 80px`, border-radius `8px`
- Unplayed count badge: `20px` circle, primary background, white text, `xs` bold, top-right of art
- Last updated: `xs`, text-tertiary, "New episode 2h ago"
- Notification bell icon: `20px`, text-tertiary, hover primary

### Search Results

- Segmented tabs: `Shows`, `Episodes`, `People` — pill-style toggle group
- Tab active: primary background, inverse text, border-radius `full`
- Tab inactive: transparent, text-secondary, hover `Surface Secondary`
- Show results: horizontal card — `80px` art + title/host/description + subscribe button
- Episode results: compact Episode Row — `48px` height, no art

### Transcript Panel

- Width: `380px` (right panel, slides in)
- Background: `Surface`
- Border-left: `1px solid` border-primary
- Header: `lg` (18px), display font, weight `700`, sticky top
- Search within transcript: input at top, border-radius `full`
- Speaker label: `sm`, weight `600`, primary color, margin-top `16px`
- Timestamp marker: `xs`, mono font, text-tertiary, clickable (seeks audio)
- Active segment: `Surface Secondary` background, `2px` left border primary, smooth scroll
- Body text: `base`, line-height `relaxed`

### RSS Feed Card

- Border radius: `8px` (md)
- Background: `Surface Secondary`
- Padding: `16px`
- RSS URL: mono font, `sm`, truncated with copy button
- Copy button: ghost variant, `28px`, icon-only
- Feed status indicator: `8px` circle — `#22c55e` valid, `#ef4444` error, `#f59e0b` pending

### Category Pill

- Border radius: `full`
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `Surface Secondary`
- Text: text-secondary
- Hover: border `1px solid` border-secondary
- Active/Selected: primary background, inverse text

### Waveform Mini (Episode Row)

- Width: `120px`
- Height: `32px`
- Bar count: `40`
- Bar width: `2px`
- Bar gap: `1px`
- Bar border-radius: `full`
- Played bar color: primary
- Unplayed bar color: border-primary

### Audio Controls Tooltip

- Border radius: `8px` (md)
- Background: `Surface Elevated`
- Shadow: `lg`
- Padding: `8px 12px`
- Content: sleep timer, cast/AirPlay, share, mark as played
- Item height: `36px`
- Item padding: `8px 12px`
- Item border-radius: `4px`

### Library Sidebar

- Section labels: `xs` (12px), weight `600`, uppercase, letter-spacing `0.04em`, text-tertiary
- Nav items: `40px` height, `8px` border-radius, `12px 16px` padding
- Active item: primary color at 10% opacity background, primary text
- Hover: `Surface Secondary` background
- Subscription items: `32px` show art (square, `6px` radius), title truncated
- Unplayed dot: `6px` circle, primary color, right-aligned

## Design Principles

1. **Warm and editorial** — the serif display font and warm stone palette set Wavelength apart from cold, tech-heavy podcast apps; it should feel like picking up a well-made magazine
2. **Always-on player** — the dark player bar anchors every screen as a persistent, high-contrast control surface; it never blends into the page
3. **Episode-first hierarchy** — show pages lead with the episode list, not hero art; users come to listen, not to browse cover images
4. **Readable transcripts** — the transcript panel uses generous line-height, clear speaker labels, and synced highlighting to make reading along effortless
5. **Progressive disclosure** — show notes, chapters, and transcript slide in as panels rather than navigating away, keeping the listening context intact
6. **Scannable metadata** — dates, durations, and unplayed counts use mono font and muted colors so they inform without competing with episode titles
