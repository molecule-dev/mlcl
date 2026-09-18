# DESIGN.md — Music Streaming

## Brand Identity

- **App Name:** Cadenza
- **Tagline:** Your sound, unbound
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Immersive
- Bold
- Rhythmic
- Personal

## Target Persona

Listeners who want a modern streaming service with curated playlists, radio, and social features.

## Screens

| Name           | Route            | Auth | Purpose                                                                   | deriveFrom     |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------- | -------------- |
| Landing        | /                | No   | Marketing home                                                            | —              |
| Login          | /login           | No   | Sign in                                                                   | —              |
| Signup         | /signup          | No   | Create account                                                            | Login          |
| ForgotPassword | /forgot-password | No   | Request reset                                                             | Login          |
| ResetPassword  | /reset-password  | No   | Set new password                                                          | Login          |
| Home           | /home            | Yes  | Made for you, recently played, featured playlists                         | —              |
| Search         | /search          | Yes  | Search songs, artists, albums with category chips                         | —              |
| Library        | /library         | Yes  | Saved songs, playlists, artists, albums tabs                              | —              |
| PlaylistDetail | /playlists/:id   | Yes  | Playlist with track list, artwork header, play controls                   | —              |
| ArtistDetail   | /artists/:id     | Yes  | Artist page with top tracks, albums, about                                | —              |
| Radio          | /radio           | Yes  | Genre and artist radio stations                                           | —              |
| Settings       | /settings        | Yes  | Playback, audio quality, devices                                          | —              |
| AlbumDetail    | /albums/:id      | Yes  | Album page with cover, tracklist, metadata, related albums                | —              |
| NowPlaying     | /now-playing     | Yes  | Full-screen player with large artwork, animated waveform, lyrics, queue   | —              |
| Profile        | /profile/:handle | Yes  | User profile with avatar, top tracks/artists, public playlists, followers | —              |
| Subscription   | /subscription    | Yes  | Plan tiers, current plan, payment method, billing history                 | —              |
| LikedSongs     | /library/liked   | Yes  | The user's liked tracks as a single virtual playlist                      | PlaylistDetail |

## App Constraints

- Persistent player bar at bottom with artwork, progress, controls
- Dark aesthetic with rich album art
- Queue side panel

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

- Now Playing: `#7c3aed`
- Now Playing Glow: `rgba(124, 58, 237, 0.25)`
- Explicit: `#a1a1aa`
- Shuffle Active: `#7c3aed`
- Repeat Active: `#7c3aed`
- Liked: `#f43f5e`
- Offline Available: `#22c55e`

### Backgrounds

- Primary: `#09090b`
- Secondary: `#18181b`
- Tertiary: `#27272a`
- Surface: `#18181b`
- Surface Secondary: `#27272a`
- Surface Elevated: `#303036`
- Input: `#27272a`
- Player Bar: `#18181b`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Gradient Start: `#7c3aed`
- Gradient End: `#09090b`

### Text

- Primary: `#fafafa`
- Secondary: `#a1a1aa`
- Tertiary: `#71717a`
- Inverse: `#09090b`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`
- Now Playing: `#7c3aed`
- Timestamp: `#71717a`

### Borders

- Primary: `#27272a`
- Secondary: `#3f3f46`
- Focus: `#7c3aed`

### Dark Theme Overrides

Note: Cadenza is dark-first. These values ARE the defaults above. Light theme overrides below.

### Light Theme Overrides

- Background Primary: `#fafafa`
- Background Secondary: `#f4f4f5`
- Background Tertiary: `#e4e4e7`
- Surface: `#ffffff`
- Surface Secondary: `#f4f4f5`
- Surface Elevated: `#ffffff`
- Input: `#ffffff`
- Player Bar: `#ffffff`
- Text Primary: `#18181b`
- Text Secondary: `#71717a`
- Text Tertiary: `#a1a1aa`
- Border Primary: `#e4e4e7`
- Border Secondary: `#d4d4d8`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-weight: 800, letter-spacing: -0.02em)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (timestamps, durations)

### Music-Specific Typography

- Track Title: `base` (16px), weight `500`
- Track Artist: `sm` (14px), weight `400`, text-secondary
- Album Title: `lg` (18px), weight `700`, letter-spacing `-0.01em`
- Section Heading: `2xl` (24px), weight `800`, letter-spacing `-0.02em`
- Player Track Title: `sm` (14px), weight `500`
- Player Artist: `xs` (12px), weight `400`, text-secondary
- Duration/Timestamp: `xs` (12px), weight `400`, mono font, text-tertiary

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `280px` (collapsed: `72px`)
- Right Sidebar (Queue): `340px`
- Player Bar Height: `80px`
- Top Bar Height: `64px`
- Grid Columns (Browse): `5` (desktop), `3` (tablet), `2` (mobile)
- Grid Columns (Search Results): `4` (desktop), `2` (tablet), `1` (mobile)
- Grid Gap: `24px`
- Content Padding: `32px` (desktop), `16px` (mobile)
- Hero Section Height: `340px` (with gradient overlay from album/artist dominant color)

## Components

### Track Row

- Height: `56px`
- Padding: `0 16px`
- Border radius: `8px` (md)
- Hover: background `Surface Secondary`
- Active/Playing: text `Now Playing` color, animated bars icon replacing track number
- Columns: `[40px track#] [1fr title+artist] [1fr album] [80px date-added] [60px duration]`
- Mobile Columns: `[1fr title+artist] [60px duration] [32px menu]`
- Explicit badge: `E` in `10px` bold, `#a1a1aa` border, `2px` border-radius, inline after title

### Album/Playlist Card

- Border radius: `8px` (md)
- Background: `Surface Secondary`
- Shadow: none (flat design)
- Hover: background `Surface Elevated`, lift `translateY(-2px)` with `normal` transition
- Image: `1:1` aspect ratio, border-radius `8px` (albums) or `4px` (playlists)
- Artist images: `full` border-radius (circular)
- Padding: `16px`
- Play button overlay: `48px` circle, primary background, appears bottom-right of image on hover, shadow `lg`
- Title: truncate single line, weight `500`
- Subtitle: truncate single line, text-secondary

### Player Bar

- Position: fixed bottom, full width
- Height: `80px`
- Background: `Player Bar`
- Border top: `1px solid` border-primary
- Layout: `[30% now-playing] [40% controls] [30% volume+queue]`
- Progress bar height: `4px`, expands to `6px` on hover
- Progress bar color: primary (played), tertiary (buffered), border-primary (remaining)
- Progress bar border-radius: `full`
- Control button sizes: play/pause `40px`, skip/prev `32px`, shuffle/repeat `28px`
- Volume slider width: `100px`
- Album art thumbnail: `56px × 56px`, border-radius `4px`

### Search Bar

- Border radius: `full` (pill shape)
- Height: `40px`
- Background: `Surface Secondary`
- Border: none (borderless)
- Focus: `2px solid` focus color
- Padding: `8px 16px 8px 40px` (icon offset)
- Search icon: `20px`, text-tertiary
- Placeholder: text-tertiary
- Width: `400px` max, shrinks responsively

### Artist Hero

- Height: `340px`
- Background: gradient from artist dominant color to `Background Primary`
- Artist name: `5xl` (48px), weight `800`, letter-spacing `-0.03em`, text-primary
- Monthly listeners: `sm` (14px), text-secondary
- Verified badge: `24px` blue checkmark circle beside name
- Action buttons row: `16px` below name

### Queue Panel

- Width: `340px`
- Background: `Surface`
- Border-left: `1px solid` border-primary
- Header: `lg` (18px), weight `700`
- Track items: same as Track Row but compact — `48px` height, no album column
- Drag handle: `16px` grip icon, text-tertiary, appears on hover
- Clear queue button: ghost variant, text-secondary

### Playlist Header

- Image: `232px × 232px`, shadow `lg`, border-radius `4px`
- Layout: horizontal — image left, metadata right
- Playlist type label: `xs` (12px), weight `700`, uppercase, text-secondary
- Playlist title: `4xl` (36px) for short names, `2xl` (24px) for long names, weight `800`
- Description: `sm` (14px), text-secondary, max 2 lines with ellipsis
- Stats: `sm` (14px), text-secondary — "42 songs, 2 hr 15 min"
- Play button: `56px` circle, primary background, shadow `md`
- Action icons (like, download, more): `32px`, text-secondary, hover text-primary

### Library Sidebar

- Section labels: `xs` (12px), weight `700`, uppercase, letter-spacing `0.05em`, text-tertiary
- Nav items: `40px` height, `8px` border-radius, `12px 16px` padding
- Active item: primary background at 10% opacity, primary text
- Hover: `Surface Secondary` background
- Playlist items: `32px` thumbnail (square, `4px` radius), title truncated
- Create Playlist button: ghost variant, primary text, `+` icon

### Waveform Visualizer (Now Playing View)

- Bar count: `64`
- Bar width: `3px`
- Bar gap: `2px`
- Bar border-radius: `full`
- Active bar color: primary
- Inactive bar color: border-primary
- Animation: `fast` transition per bar, staggered

### Context Menu

- Border radius: `8px` (md)
- Background: `Surface Elevated`
- Shadow: `lg`
- Padding: `4px`
- Item height: `36px`
- Item padding: `8px 12px`
- Item border-radius: `4px`
- Hover: `Surface Secondary`
- Divider: `1px solid` border-primary, `4px` vertical margin
- Submenu indicator: chevron-right icon, text-tertiary

## Design Principles

1. **Dark-first** — the default experience is dark; light mode is the override, not the other way around
2. **Content is king** — album art, artist imagery, and track lists are the primary visual elements; UI chrome stays minimal
3. **Fluid gradients** — hero sections and backgrounds blend dominant colors from album art into the app background for immersive context
4. **Instant feedback** — hover states, active indicators, and transitions respond within `fast` (150ms) to feel alive
5. **Dense but scannable** — track lists are compact for browsing large libraries, but whitespace between sections provides breathing room
6. **Audio-visual connection** — the Now Playing state (animated bars, progress, glowing accents) threads through every screen as a persistent reminder of what's playing
