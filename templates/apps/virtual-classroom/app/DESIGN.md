# DESIGN.md — Virtual Classroom

## Brand Identity

- **App Name:** Aula
- **Tagline:** Where learning comes alive
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, scholarly, encouraging, collaborative

## Target Persona

Instructors and students in K-12, higher ed, and corporate training who need a live virtual classroom with video, chat, whiteboard, breakouts, and assignments in one product.

## Screens

| Name             | Route            | Auth | Purpose                                                         | deriveFrom |
| ---------------- | ---------------- | ---- | --------------------------------------------------------------- | ---------- |
| Landing          | /                | No   | Marketing home for institutions and educators                   | —          |
| Login            | /login           | No   | Sign in                                                         | —          |
| Signup           | /signup          | No   | Create account                                                  | Login      |
| ForgotPassword   | /forgot-password | No   | Request reset                                                   | Login      |
| ResetPassword    | /reset-password  | No   | Set new password                                                | Login      |
| Dashboard        | /dashboard       | Yes  | Enrolled courses, upcoming classes, and recent activity         | —          |
| Classroom        | /class/:id       | Yes  | Live video grid, chat, whiteboard, and participant list         | —          |
| Assignments      | /assignments     | Yes  | Assignment list with status, due dates, and submissions         | —          |
| Courses          | /courses         | Yes  | Course catalog and enrolled course library                      | —          |
| Whiteboard       | /whiteboard/:id  | Yes  | Standalone collaborative whiteboard view                        | —          |
| Settings         | /settings        | Yes  | Account, devices, notifications, and accessibility              | —          |
| CourseDetail     | /courses/:id     | Yes  | Single course view: syllabus, schedule, roster, materials       | —          |
| AssignmentDetail | /assignments/:id | Yes  | Assignment instructions, rubric, attachments, and submission    | —          |
| Calendar         | /calendar        | Yes  | Schedule view of upcoming classes, due dates, office hours      | —          |
| Profile          | /profile/:id     | Yes  | Public instructor or student profile with bio and credentials   | —          |
| Notifications    | /notifications   | Yes  | Activity feed for hand raises, mentions, grades, announcements  | —          |
| Grades           | /grades          | Yes  | Student-facing gradebook with course grades, feedback, progress | —          |

## App Constraints

- Classroom view is a full-bleed video grid with floating bottom toolbar (`#1e1b3a`) and `340px` side panel for chat/participants/whiteboard
- Video tiles use `8px` radius, `2px solid` primary border on active speaker, name overlay bottom-left
- Primary surface is light (`#ffffff`) with lavender-tinted secondary (`#f4f2fb`); video grid background stays dark `#111827` for contrast

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b4dc7`
- Primary Hover: `#7366d9`
- Primary Dark: `#4a3db0`
- Accent: `#e8853b`
- Accent Hover: `#f0a060`
- Accent Dark: `#cf6e20`

### Semantic

- Live: `#e53535`
- Live Light: `#fee2e2`
- Hand Raised: `#f59e0b`
- Hand Raised Light: `#fef3c7`
- Screen Share: `#16a34a`
- Screen Share Light: `#dcfce7`
- Muted: `#94a3b8`
- Breakout A: `#8b5cf6`
- Breakout B: `#06b6d4`
- Breakout C: `#f97316`
- Breakout D: `#ec4899`
- Whiteboard Stroke: `#1e293b`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f4f2fb`
- Video Grid: `#111827`
- Chat Panel: `#faf9fe`
- Whiteboard Canvas: `#ffffff`
- Toolbar: `#1e1b3a`

### Text

- Primary: `#1e1b3a`
- Secondary: `#6b7280`
- Inverse: `#f8fafc`
- Timestamp: `#94a3b8`
- Link: `#5b4dc7`
- Link Hover: `#4a3db0`
- Instructor Badge: `#5b4dc7`
- Student Badge: `#6b7280`

### Borders

- Primary: `#e5e2f0`
- Secondary: `#d4d0e8`
- Focus: `#5b4dc7`
- Active Speaker: `#5b4dc7`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f0a060`
- Background: `#0c0a1d`
- Surface: `#1a1735`
- Surface Secondary: `#242048`
- Video Grid: `#000000`
- Toolbar: `#0c0a1d`
- Text Primary: `#f1f0f9`
- Text Secondary: `#a5a0c0`
- Border Primary: `#2e2a50`
- Chat Panel: `#1a1735`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Chat: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Code (whiteboard text): `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, monospace`

### Font Sizes

- Participant Name: `0.8125rem` (13px)
- Chat Message: `0.875rem` (14px)
- Chat Timestamp: `0.6875rem` (11px)
- Timer Display: `1.5rem` (24px) — font-variant-numeric: tabular-nums

## Layout

- Content Max Width: `100vw` (full-bleed video layout)
- Video Grid Columns: `auto-fit` — `4` (≤4 participants), `3×3` (5–9), `4×4` (10–16), `5×5` (17–25)
- Video Grid Gap: `4px`
- Video Tile Aspect Ratio: `16:9`
- Spotlight + Gallery: spotlight `75%` width, gallery strip `25%` width
- Sidebar Panel Width: `340px`
- Sidebar Panel Min Width: `280px`
- Top Control Bar Height: `56px`
- Bottom Toolbar Height: `64px`
- Breakout Room Card Min Width: `240px`
- Whiteboard Toolbar Width: `48px`
- Chat Input Min Height: `44px`

## Components

### Video Tile

- Border radius: `8px` (md)
- Background: video-grid color (dark fallback for no-camera)
- Active speaker border: `2px solid` active-speaker
- Name overlay: bottom-left, `6px 10px` padding, `rgba(0, 0, 0, 0.6)` background, `12px` border-radius bottom-left matching tile
- Mute/camera icons: bottom-right, `20px` icon size, `rgba(0, 0, 0, 0.5)` background pill
- Pin icon: top-right, `24px`, appears on hover
- Hand raised indicator: top-left, `28px` amber emoji overlay with subtle pulse animation
- Aspect ratio: `16:9`, object-fit: cover
- Hover: reveal pin + context menu icons with `150ms ease` fade

### Self-View (Picture-in-Picture)

- Border radius: `12px` (lg)
- Shadow: `lg`
- Size: `180px × 101px` (16:9)
- Position: bottom-right, `16px` from edges
- Draggable with `normal` transition on snap-back
- Border: `2px solid rgba(255, 255, 255, 0.15)`
- Mirror: `transform: scaleX(-1)` by default

### Control Toolbar

- Background: toolbar color
- Border radius: `16px` (xl) — floating pill shape
- Padding: `8px 16px`
- Position: bottom center, `16px` from bottom edge
- Shadow: `xl`
- Button size: `44px` circle
- Button border radius: `full` (9999px)
- Button background: `rgba(255, 255, 255, 0.1)`, hover: `rgba(255, 255, 255, 0.2)`
- Destructive button (Leave/End): `#e53535` background, hover: `#dc2626`
- Muted state: button background `#e53535` with white icon
- Icon size: `22px`, color: `#ffffff`
- Divider: `1px solid rgba(255, 255, 255, 0.15)`, `24px` height, `8px` horizontal margin
- Tooltip: above button, `8px` offset, dark background

### Chat Panel

- Background: chat-panel
- Header: `48px` height, `16px` padding, bottom border
- Message padding: `8px 16px`
- Message grouping: consecutive same-author messages collapse, `4px` gap
- Author name: `13px`, `600` weight, primary text
- Instructor author: instructor-badge color
- Message body: `14px`, `400` weight
- Timestamp: `11px`, timestamp color, appears on hover
- Reaction bar: `4px` below message, `20px` pill height, `full` radius, secondary background
- Input: `12px 16px` padding, `md` radius, secondary background, file-attach + emoji buttons inline
- "Unread messages" pill: floating, accent background, `full` radius, `12px` font, `fast` transition

### Participant List

- Item height: `48px`
- Avatar: `32px` circle, initials fallback with primary-light background
- Name: `14px`, `500` weight, truncate with ellipsis
- Role badge (Host/Co-host): `10px` uppercase, `600` weight, primary color, `4px 8px` padding, `full` radius, `rgba(91, 77, 199, 0.1)` background
- Status icons: mic/camera/hand/screen — `16px`, right-aligned, `8px` gap
- Muted icon: muted color
- Active icon: screen-share color
- Hover: surface-secondary background

### Whiteboard Canvas

- Background: whiteboard-canvas color
- Border: `1px solid` border-primary
- Border radius: `0` (full-bleed when expanded)
- Cursor: crosshair (draw), grab/grabbing (pan), pointer (select)
- Floating toolbar: left edge, vertical, `48px` wide, `8px` border-radius right side
- Tool button: `40px` square, `8px` radius, hover surface-secondary
- Active tool: primary background, inverse text
- Color palette: 8 preset swatches (`20px` circles) + custom picker
- Stroke widths: `2px`, `4px`, `8px` — preview circles
- Laser pointer trail: primary color, `3px` stroke, `500ms` fade

### Breakout Room Card

- Border radius: `12px` (lg)
- Border: `2px solid` — color from breakout palette (A/B/C/D cycling)
- Padding: `16px`
- Background: surface
- Shadow: `sm`, hover: `md`
- Room name: `16px`, `600` weight
- Participant count: `13px`, secondary text, with people icon
- Timer: `14px`, tabular-nums, accent color when < 2 minutes remaining
- "Join" button: `sm` size, outline variant, matching breakout room color
- "Close All" button: error color, outline variant

### Hand Raise Notification

- Position: top-center toast
- Background: hand-raised-light
- Border: `1px solid` hand-raised
- Border radius: `lg`
- Padding: `12px 20px`
- Shadow: `md`
- Animation: slide down + fade in, `normal` transition
- Auto-dismiss: `5s`
- Action button: "Lower Hand" — ghost variant

### Recording Indicator

- Position: top-left, `16px` from edges
- Background: `rgba(229, 53, 53, 0.9)`
- Border radius: `full`
- Padding: `6px 14px`
- Font: `12px`, `600` weight, inverse text
- Pulsing red dot: `8px` circle, `1s` infinite pulse animation
- Label: "REC" or elapsed time in `tabular-nums`

### Screen Share View

- Border: `2px solid` screen-share color
- Border radius: `8px` (md)
- Label overlay: top-left, `"Presenting: [Name]"`, screen-share background, `12px` font, inverse text, `full` radius
- Fit mode: `object-fit: contain` on dark background
- Gallery strip: right side or bottom, `160px` tile width, scrollable

### Reaction Burst

- Size: `48px` emoji
- Animation: float upward from participant tile, random horizontal offset (±30px), `1.5s` duration, fade out at top
- Stagger: multiple reactions offset by `100ms`
- Max visible: `5` simultaneous per tile

### Timer / Class Clock

- Font: timer-display size, `700` weight, tabular-nums
- Position: top control bar, center
- Warning state (< 5 min): accent color, subtle pulse
- Critical state (< 1 min): live color, faster pulse
- Format: `HH:MM:SS` or `MM:SS` depending on duration

### File Share Card (in chat)

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `10px 14px`
- Icon: file type icon (`24px`), left-aligned
- File name: `14px`, `500` weight, truncate
- File size: `12px`, secondary text
- Download button: ghost, primary color, right-aligned
- Image preview: inline thumbnail, `200px` max width, `md` radius, click to expand
