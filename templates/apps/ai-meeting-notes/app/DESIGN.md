# DESIGN.md — AI Meeting Notes

## Brand Identity

- **App Name:** Murmur
- **Tagline:** Every word, distilled
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Attentive, clarifying, calm, organized

## Target Persona

Product managers, team leads, and executives capturing meeting transcripts with AI summarization and action items.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                           | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with meeting transcription demo, calm indigo palette, features, pricing                                            | —          |
| Login          | /login           | No   | Centered card with indigo primary                                                                                                 | —          |
| Signup         | /signup          | No   | Create account                                                                                                                    | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                                     | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                                  | Login      |
| Dashboard      | /dashboard       | Yes  | Sidebar, meeting list grid with speaker color-coded left borders, duration badges, AI summary snippets, action item c...          | —          |
| MeetingDetail  | /meetings/:id    | Yes  | Sidebar, transcript center with speaker labels (5 distinct colors) and IBM Plex timestamps, action items panel right,...          | —          |
| Record         | /record          | Yes  | Sidebar, centered recording button with pulsing red ring when active, live waveform, running transcription below                  | —          |
| ActionItems    | /actions         | Yes  | Sidebar, aggregated action items list with owner avatars, due date chips, status badges, filter tabs                              | —          |
| Integrations   | /integrations    | Yes  | Sidebar, calendar integration cards (Google, Microsoft), video platform cards (Zoom, Meet, Teams) with connection status          | —          |
| Settings       | /settings        | Yes  | Sidebar, transcription language, retention, sharing defaults                                                                      | —          |
| Calendar       | /calendar        | Yes  | Sidebar, monthly calendar grid showing meetings as colored blocks per day, mini list of upcoming, click day to filter             | —          |
| Team           | /team            | Yes  | Sidebar, team member roster with avatars, roles, last-active, invite button, pending invitations section                          | —          |
| Search         | /search          | Yes  | Sidebar, global search bar, filter chips (speaker, date range, meeting), results list with transcript snippet matches highlighted | —          |
| Notifications  | /notifications   | Yes  | Sidebar, vertically grouped activity feed (Today/Yesterday/Earlier) of mentions, action item assignments, share events            | —          |
| Profile        | /profile         | Yes  | Personal profile editing — name, avatar, bio, default speaker color                                                               | Settings   |

## App Constraints

- Speakers color-coded with 5 distinct colors (indigo, pink, orange, teal, violet)
- Transcript uses IBM Plex Sans at readable size; timestamps use IBM Plex Mono with tabular-nums
- AI summary card has cyan left-border accent

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

- Recording: `#ef4444`
- Recording Light: `#fef2f2`
- Action Item: `#f59e0b`
- Action Item Light: `#fffbeb`
- Completed: `#10b981`
- Completed Light: `#d1fae5`
- AI Generated: `#06b6d4`
- AI Generated Light: `#ecfeff`
- Speaker 1: `#6366f1`
- Speaker 2: `#ec4899`
- Speaker 3: `#f97316`
- Speaker 4: `#14b8a6`
- Speaker 5: `#8b5cf6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Transcript: `#fafafa`
- AI Summary: `#eef2ff`

### Text

- Timestamp: `#94a3b8`
- Speaker Label: `#334155`
- Transcript: `#1e293b`
- AI Insight: `#0e7490`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Background: `#0c0f1a`
- Surface: `#1a1e2e`
- Surface Secondary: `#232838`
- Transcript Background: `#1a1e2e`
- AI Summary Background: `#1e1b4b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Timestamp: `#64748b`
- Border Primary: `#2d3348`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Transcript: `"IBM Plex Sans", Inter, -apple-system, sans-serif`
- Timestamp: `"IBM Plex Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1120px`
- Transcript Max Width: `780px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Width: `260px`
- Sidebar Collapsed: `64px`
- Timeline Rail Width: `240px`
- Meeting Detail Split: `1fr 300px` (transcript | action items panel)

## Components

### Meeting Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` speaker-1 color (color-coded by organizer)
- Title font size: `lg` (18px), weight: `600`
- Date/time font: timestamp font family, `sm` (14px), muted
- Participant avatars: `28px` circles, overlapping with `-8px` margin, max 5 shown + overflow count
- Duration badge: pill, surface-secondary background, `xs` font

### Transcript Block

- Background: transcript background
- Border radius: `8px` (md)
- Padding: `24px 28px`
- Line height: `1.75` (relaxed) for readability
- Speaker label: `600` weight, speaker color, `sm` font, `4px` bottom margin
- Timestamp: timestamp font family, `xs` font, right-aligned, muted
- Paragraph spacing: `16px`
- Active segment highlight: `2px` left border in primary color, `#eef2ff` background
- Hover: subtle `#f8fafc` background on individual segments

### AI Summary Card

- Background: AI summary background
- Border radius: `12px` (lg)
- Border: `1px solid #c7d2fe`
- Padding: `20px 24px`
- Header: accent color icon (sparkle/brain) + "AI Summary" label, `600` weight
- Body font size: `base` (16px), line height: `1.625`
- Key points: bulleted list, `14px`, `500` weight for emphasis phrases
- Dark mode border: `#312e81`

### Action Item

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `3px solid` action-item color (amber)
- Checkbox: `18px` square, `4px` radius, primary color when checked
- Completed state: strikethrough text, `0.5` opacity, completed color left border
- Assignee: `24px` avatar circle + name in `sm` muted text
- Due date: pill badge, `xs` font, warning color if overdue
- Hover: `#fffbeb` background

### Speaker Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px), weight: `500`
- Background: speaker color at `0.12` opacity
- Text: speaker color at full saturation
- Dot indicator: `8px` circle, speaker color, inline before name

### Timeline Marker

- Rail: `2px` solid border-primary, vertical
- Node: `12px` circle, surface background, `2px` primary border
- Active node: `12px` circle, primary fill
- Connector line: `1px` dashed border-secondary between timestamps
- Timestamp label: timestamp font family, `xs`, muted
- Topic label: `sm`, `500` weight, truncated with ellipsis at `200px`

### Recording Indicator

- Dot: `10px` circle, recording color, CSS pulse animation (`1.5s` ease infinite)
- Label: `sm` font, `500` weight, recording color
- Background container: recording-light background, `9999px` radius, `4px 12px` padding
- Pulse keyframes: `0%` scale(1) opacity 1 → `50%` scale(1.4) opacity 0.5 → `100%` scale(1) opacity 1

### Search & Filter Bar

- Height: `44px`
- Border radius: `8px` (md)
- Icon: `18px` search icon, muted text color, `12px` left padding
- Input left padding: `40px` (after icon)
- Filter chips: pill badges, `sm` font, surface-secondary background, `1px` border
- Active filter: primary color background at `0.1` opacity, primary text, primary border

### Participant List

- Avatar size: `32px` circle
- Name font: `sm` (14px), `500` weight
- Role subtitle: `xs` (12px), muted
- Speaking indicator: `3px` ring in speaker color around avatar, animated pulse when active
- List item padding: `8px 12px`
- List item hover: surface-secondary background
