# DESIGN.md — Meditation App

## Brand Identity

- **App Name:** Stillpoint
- **Tagline:** Find your still center
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Serene
- Grounded
- Inviting
- Patient

## Target Persona

Adults seeking daily meditation and sleep/breathing sessions for stress relief and focus.

## Screens

| Name           | Route            | Auth | Purpose                                                      | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home                                               | —          |
| Login          | /login           | No   | Sign in                                                      | —          |
| Signup         | /signup          | No   | Create account                                               | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                             | Login      |
| Home           | /home            | Yes  | Today's featured session, streak, recommended collections    | —          |
| Library        | /library         | Yes  | Browse sessions by category (Sleep, Focus, Stress)           | —          |
| SessionPlayer  | /sessions/:id    | Yes  | Audio session player with chapters and breathing guide       | —          |
| Courses        | /courses         | Yes  | Multi-day courses with progress                              | —          |
| Journal        | /journal         | Yes  | Post-session reflections and mood log                        | —          |
| Stats          | /stats           | Yes  | Total minutes, streaks, session history                      | —          |
| Settings       | /settings        | Yes  | Voice, duration, reminders                                   | —          |
| CourseDetail   | /courses/:id     | Yes  | Multi-day course overview, curriculum, instructor, progress  | —          |
| Profile        | /profile         | Yes  | User identity, lifetime stats, achievements, practice goals  | —          |
| Notifications  | /notifications   | Yes  | Activity feed: reminders, achievements, course updates       | —          |
| Search         | /search          | Yes  | Global search across sessions, courses, instructors, journal | —          |

## App Constraints

- Calm gradients, generous whitespace
- Player UI with play/pause, duration, soundscape selector
- Streak and minutes meditated visible

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b4fc7`
- Primary Hover: `#7066d9`
- Primary Dark: `#4a3fb0`
- Accent: `#e09a5a`
- Accent Hover: `#e8b07a`
- Accent Dark: `#c47f3e`

### Semantic

- Streak Active: `#e09a5a`
- Streak Missed: `#6b7280`
- Session Complete: `#16a34a`
- Session In Progress: `#5b4fc7`
- Session Locked: `#9ca3af`
- Timer Active: `#5b4fc7`
- Timer Paused: `#e09a5a`
- Category Mindfulness: `#7c6dd8`
- Category Sleep: `#3b5bdb`
- Category Focus: `#0ea5e9`
- Category Stress: `#14b8a6`
- Category Body: `#f97316`

### Backgrounds

- Primary: `#f5f3fa`
- Secondary: `#eeebf5`
- Tertiary: `#e5e1f0`
- Surface: `#ffffff`
- Surface Secondary: `#faf9fd`
- Player Bar: `#1e1b35`
- Timer: `#0f0d1e`

### Text

- Primary: `#1e1b35`
- Secondary: `#6b6580`
- Tertiary: `#4a4560`
- Duration: `#5b4fc7`
- Streak Count: `#e09a5a`
- Link: `#5b4fc7`
- Link Hover: `#4a3fb0`

### Borders

- Primary: `#e0dced`
- Secondary: `#d0cce0`
- Focus: `#5b4fc7`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f0b880`
- Background: `#0c0a1a`
- Surface: `#1a1730`
- Surface Secondary: `#221f3a`
- Player Bar: `#0c0a1a`
- Text Primary: `#f0eef8`
- Text Secondary: `#9890b0`
- Border Primary: `#2d2950`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Timer: `"DM Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1120px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Width: `240px` (collapsed: `64px`)
- Player Bar Height: `72px` (fixed bottom)
- Timer Display Size: `320px` diameter (desktop), `260px` (mobile)

## Components

### Session Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:9` (cover artwork)
- Image overlay: `linear-gradient(transparent 40%, rgba(0,0,0,0.6))`
- Padding: `0` (image flush) + `16px` (content area)
- Duration badge: `pill`, semi-transparent primary background, white text, bottom-left of image
- Category pill: `pill`, category color background at 15% opacity, category color text, top-left of image
- Title font: heading family, `600` weight, `lg` size
- Instructor text: body family, `400` weight, `sm` size, secondary text color

### Audio Player Bar

- Position: fixed bottom, full width
- Background: player-bar color
- Height: `72px`
- Border radius: `0` (flush to viewport edges)
- Shadow: `0 -4px 16px rgba(0, 0, 0, 0.15)`
- Progress bar height: `3px`, primary color, top edge of bar
- Play/Pause button: `48px` circle, white fill, centered
- Track info text: inverse text color, `sm` size
- Time display: timer font family, `xs` size, secondary-dark text

### Timer Display

- Container: `320px` circle, centered
- Ring: `4px` stroke, primary color at 20% opacity
- Progress ring: `4px` stroke, primary color, animated `stroke-dashoffset`
- Time font: timer font family, `5xl` size, `300` weight, primary text
- Label font: body family, `sm` size, secondary text, below time
- Start button: `64px` circle, primary background, white play icon
- Pause/Resume: same circle, accent background

### Streak Counter

- Layout: horizontal row of `7` day circles (current week)
- Circle size: `36px`
- Active day: accent background, white checkmark icon
- Missed day: `#e5e1f0` background, no icon
- Current day: primary border `2px`, pulsing subtle glow
- Count display: accent color, `3xl` size, `700` weight, timer font
- Label: "day streak", `sm` size, secondary text

### Category Pill

- Border radius: `9999px` (full)
- Padding: `6px 14px`
- Font size: `sm` (14px)
- Font weight: `500`
- Background: category color at 12% opacity
- Text: category color at full opacity
- Active state: category color background, white text
- Hover: category color at 20% opacity

### Breathing Guide

- Container: `200px` centered circle
- Inhale animation: scale `1.0` → `1.5`, `4s ease-in-out`
- Hold animation: hold at `1.5`, `4s`
- Exhale animation: scale `1.5` → `1.0`, `6s ease-in-out`
- Circle fill: primary at 15% opacity
- Circle border: `2px` primary at 40% opacity
- Phase label: centered, heading font, `lg` size, `500` weight

### Progress Chart

- Chart type: area chart with gradient fill
- Line color: primary
- Fill: primary at 8% opacity → transparent
- Axis labels: body font, `xs` size, tertiary text
- Grid lines: `1px` dashed, border-primary at 50% opacity
- Tooltip: `8px` radius, surface background, `sm` shadow
- Period selector: pill toggle group (Week / Month / Year)

### Stats Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Border: `1px solid` border-primary
- Metric value: heading font, `2xl` size, `700` weight, primary text
- Metric label: body font, `sm` size, secondary text
- Icon: `24px`, primary color at 60% opacity, top-right
- Trend indicator: `sm` size, success color for positive, error for negative

### Search Results

- Result item padding: `12px 16px`
- Border bottom: `1px solid` border-primary
- Session thumbnail: `48px` rounded-md square
- Title: `base` size, `500` weight
- Meta row: `xs` size, secondary text, dot-separated (duration · category · instructor)
- Hover: surface-secondary background

### Notification Item

- Padding: `12px 16px`
- Unread indicator: `8px` circle, accent color, left edge
- Title: `sm` size, `500` weight
- Body: `sm` size, secondary text, max 2 lines
- Timestamp: `xs` size, tertiary text, right-aligned
