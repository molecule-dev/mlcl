# DESIGN.md — Social Media Feed

## Brand Identity

- **App Name:** Vivid
- **Tagline:** Share life in full color
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Expressive, vibrant, social, creator-centric

## Target Persona

Creators and friends sharing short posts, stories, and photos with their network in a vivid social feed.

## Screens

| Name           | Route            | Auth | Purpose                                                               | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with vibrant imagery                                   | —          |
| Login          | /login           | No   | Sign in                                                               | —          |
| Signup         | /signup          | No   | Create account                                                        | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                         | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                      | Login      |
| Feed           | /feed            | Yes  | Main feed of posts and stories                                        | —          |
| Profile        | /profile/:handle | Yes  | User profile with posts grid                                          | —          |
| PostDetail     | /posts/:id       | Yes  | Single post with comments thread                                      | —          |
| Explore        | /explore         | Yes  | Discovery grid of trending posts                                      | —          |
| Messages       | /messages        | Yes  | Direct messages inbox                                                 | —          |
| Notifications  | /notifications   | Yes  | Likes, comments, mentions feed                                        | —          |
| Settings       | /settings        | Yes  | Profile, privacy, notifications                                       | —          |
| Search         | /search          | Yes  | Global query-driven discovery for people, posts, and hashtags         | —          |
| Pricing        | /pricing         | No   | Public marketing page presenting Free / Pro / Team subscription tiers | —          |

## App Constraints

- Stories ring uses conic gradient (amber → pink → purple) for unread content
- Live badges pulse red, verified checkmarks blue
- Profile avatars always circular with optional story ring frame

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#d63384`
- Primary Hover: `#e85daa`
- Primary Dark: `#b02a6e`
- Accent: `#7c3aed`
- Accent Hover: `#8b5cf6`
- Accent Dark: `#6d28d9`

### Semantic

- Liked: `#ef4444`
- Liked Light: `#fee2e2`
- Live: `#dc2626`
- Live Pulse: `#fca5a5`
- Verified: `#3b82f6`
- Online: `#22c55e`
- Story Ring Start: `#f59e0b`
- Story Ring Mid: `#d63384`
- Story Ring End: `#7c3aed`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#fafafa`
- Feed: `#f4f4f5`
- Story Tray: `#ffffff`
- Composer: `#ffffff`

### Text

- Primary: `#18181b`
- Secondary: `#71717a`
- Username: `#18181b` (font-weight: 600)
- Handle: `#71717a`
- Timestamp: `#a1a1aa`
- Link: `#d63384`
- Link Hover: `#b02a6e`
- Hashtag: `#7c3aed`
- Mention: `#d63384`

### Borders

- Primary: `#e4e4e7`
- Secondary: `#d4d4d8`
- Separator: `#f4f4f5`

### Dark Theme Overrides

- Primary: `#f472b6`
- Accent: `#a78bfa`
- Background: `#09090b`
- Feed: `#18181b`
- Surface: `#1c1c1e`
- Surface Secondary: `#27272a`
- Text Primary: `#fafafa`
- Text Secondary: `#a1a1aa`
- Text Timestamp: `#52525b`
- Border Primary: `#27272a`
- Border Separator: `#1c1c1e`
- Liked: `#f87171`
- Hashtag: `#c4b5fd`
- Mention: `#f9a8d4`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-weight: 700, letter-spacing: -0.02em)
- Username: `"Inter", -apple-system, sans-serif` (font-weight: 600)
- Caption: `"Inter", -apple-system, sans-serif` (font-weight: 400, line-height: 1.5)

### Font Sizes

- Username: `0.875rem` (14px)
- Caption: `0.875rem` (14px)
- Comment: `0.8125rem` (13px)
- Timestamp: `0.75rem` (12px)
- Story Label: `0.6875rem` (11px)
- Follower Count: `1.25rem` (20px, font-weight: 700)
- Profile Name: `1.125rem` (18px, font-weight: 700)

## Layout

- Content Max Width: `640px` (feed column)
- Feed Column: centered single column
- Sidebar Width: `320px` (desktop right rail — suggestions, trending)
- Sidebar Breakpoint: visible at `1024px`+, hidden below
- Story Tray Height: `100px`
- Nav Bar Height: `54px` (mobile bottom), `60px` (desktop top)
- Bottom Nav Height: `50px` (mobile only)
- Profile Grid Columns: `3` (all breakpoints)
- Profile Grid Gap: `2px` (mobile), `4px` (desktop)
- Compose Modal Width: `500px`

## Components

### Post Card

- Border radius: `0` (mobile, edge-to-edge), `12px` (desktop)
- Shadow: none (mobile), `sm` (desktop)
- Border: `1px solid` border-primary (mobile top/bottom only), full border on desktop
- Background: surface
- Image aspect ratio: flexible (original), max height `600px`
- Header padding: `12px 16px`
- Content padding: `0 16px 12px`
- Author avatar: `32px` circle
- Author name font: username weight (600), `14px`
- Timestamp: `12px`, text-timestamp color
- Action bar height: `44px`, icon size `24px`, padding `4px 16px`
- Like animation: scale `1 → 1.3 → 1` over `300ms ease`

### Story Bubble

- Avatar size: `64px`
- Ring width: `3px`
- Ring gap: `3px` (transparent space between ring and avatar)
- Ring gradient: story-ring-start → story-ring-mid → story-ring-end (conic-gradient)
- Ring unseen: gradient, Ring seen: `#d4d4d8`
- Label: `11px`, single line, text-overflow ellipsis, max-width `72px`
- Spacing between bubbles: `16px`
- Container: horizontal scroll, no scrollbar, scroll-snap-type: x mandatory
- "Your Story" bubble: `+` icon overlay, `20px` circle, primary background, bottom-right of avatar

### Story Viewer

- Fullscreen overlay, z-index: modal
- Progress bars: `2px` height, `4px` gap between segments
- Progress active: `#ffffff`, Progress inactive: `rgba(255,255,255,0.35)`
- Tap zones: left 30% = previous, right 70% = next
- Auto-advance: `5s` per image, `15s` per video
- Transition: `300ms` cubic-bezier slide between users
- Close button: top-right, `32px`, white with shadow
- Reply input: bottom, `40px` height, `20px` radius, semi-transparent white background

### Comment Thread

- Indent per level: `40px` (max 2 levels visible)
- Avatar size: `28px` (top-level), `24px` (replies)
- Username font: `13px`, weight 600
- Comment text: `13px`, weight 400
- Like count: `12px`, text-secondary
- Timestamp: `12px`, text-timestamp
- "View replies" link: `13px`, text-secondary, weight 600
- Spacing between comments: `12px`

### Like Button

- Default: outline heart, `24px`
- Liked: filled heart, liked color (`#ef4444`)
- Transition: `150ms ease` color, `300ms ease` transform
- Double-tap on image: heart overlay `80px`, white, scale-in `200ms`, fade-out after `800ms`

### Follow Button

- Border radius: `8px`
- Height: `32px`
- Font size: `13px`, weight `600`
- Following state: outline style, text "Following"
- Not following state: solid primary, text "Follow"
- Hover on Following: background error-light, text "Unfollow" in error color

### Profile Header

- Cover photo height: `200px` (desktop), `150px` (mobile)
- Avatar size: `128px` (desktop), `80px` (mobile)
- Avatar border: `4px solid` surface color
- Avatar position: overlapping cover by 50% of avatar height
- Stats row: follower/following/post counts, `20px` bold number + `13px` muted label, spaced `32px` apart
- Bio: `14px`, max 3 lines, text-primary
- Edit Profile button: outline variant, full width on mobile

### Notification Item

- Avatar: `40px`
- Unread background: `#fdf2f8` (light), `#27272a` (dark)
- Thumbnail: `44px` square, border-radius `4px`, right-aligned
- Text: `13px`, bold username + normal action text
- Timestamp: `12px`, text-timestamp
- Group: "and N others" collapsed, expandable
- Height: `72px`
- Separator: `1px` border-separator, inset `68px` from left

### Image Upload

- Drop zone: dashed `2px` border, border-primary, `12px` radius
- Drop zone active: border-primary solid, primary-light background
- Preview grid: masonry-like, max 4 images visible, "+N" overlay for more
- Crop overlay: semi-transparent black, white crop handles
- Filter strip: horizontal scroll, `80px` square previews, `8px` gap
- Upload progress: thin `3px` bar, primary color, top of image

### Compose Modal

- Border radius: `16px`
- Header: `54px`, centered title "New Post", close left, share right
- Avatar: `32px`, left of text area
- Text area: borderless, auto-grow, `16px` font, placeholder "What's on your mind?"
- Media preview: below text, rounded `8px`, remove button top-right
- Character count: `12px`, text-secondary, bottom-right, turns error at limit
- Share button: primary solid, `32px` height, `13px` font, weight 600

### Feed Skeleton

- Avatar: `32px` circle, pulsing `#e4e4e7`
- Name line: `120px × 12px` rectangle
- Timestamp line: `60px × 10px` rectangle
- Image: full-width, `400px` height rectangle
- Caption lines: `100%` + `70%` width, `10px` height
- Pulse animation: `1.5s ease` infinite, `#e4e4e7` → `#f4f4f5` → `#e4e4e7`

### Realtime Indicators

- New posts banner: fixed top of feed, primary background, white text, `40px` height, `8px` radius, slide-down `200ms`
- Typing indicator: three dots, `6px` each, sequential bounce `400ms` offset
- Online dot: `10px` circle, online color, `2px` white border, bottom-right of avatar
- Unread badge: `18px` min-width circle, primary background, white `11px` bold text, top-right of icon
