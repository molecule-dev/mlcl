# DESIGN.md — Voting & Polling

## Brand Identity

- **App Name:** Quorum
- **Tagline:** Every voice counted
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Authoritative, transparent, civic, data-driven

## Target Persona

Moderators, organizers, and institutions running live polls, board votes, or audience Q&A who need real-time results with clear quorum, participation, and analytics.

## Screens

| Name           | Route              | Auth | Purpose                                                                    | deriveFrom |
| -------------- | ------------------ | ---- | -------------------------------------------------------------------------- | ---------- |
| Landing        | /                  | No   | Marketing home for organizations and event hosts                           | —          |
| Login          | /login             | No   | Sign in                                                                    | —          |
| Signup         | /signup            | No   | Create account                                                             | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                              | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                           | Login      |
| Dashboard      | /dashboard         | Yes  | Poll library with stats, live/scheduled/closed tabs                        | —          |
| CreatePoll     | /polls/new         | Yes  | Build a new poll with questions, options, and settings                     | —          |
| LiveResults    | /polls/:id/live    | Yes  | Real-time results view with bars, quorum, and participants                 | —          |
| Ballot         | /vote/:id          | Yes  | Participant-facing ballot with vote submission                             | —          |
| Analytics      | /analytics         | Yes  | Cross-poll analytics and trend charts                                      | —          |
| Settings       | /settings          | Yes  | Account, organization, branding, and integrations                          | —          |
| PollDetail     | /polls/:id         | Yes  | Closed/scheduled poll review — final results, settings snapshot, audit log | —          |
| Voters         | /voters            | Yes  | Voter roll management — eligibility, groups, participation history         | —          |
| AudienceQA     | /polls/:id/qa      | Yes  | Live audience Q&A moderation queue with upvotes and on-stage hero          | —          |
| PresenterMode  | /polls/:id/present | Yes  | Full-screen projection view for in-room audiences (no chrome)              | —          |
| Notifications  | /notifications     | Yes  | Persistent event center for quorum/vote/mention/integration alerts         | —          |
| Team           | /team              | Yes  | Manage moderators and organizers — roles, permissions, audit               | —          |
| Billing        | /billing           | Yes  | Subscription tier, seats, payment method, and invoice history              | —          |

## App Constraints

- Cyan primary (`#0891b2`) with emerald accent (`#10b981`); navy (`#0f172a`) reserved for data emphasis and presenter toolbar
- Poll cards use `4px solid` left status border (green live, grey closed, amber scheduled) and pill status badge in top-right
- Results bars are `40px` tall with `8px` radius, `500ms` ease fill animation, and percentage labels in `tabular-nums`

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2` (strong cyan — authority, clarity, technology)
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Accent: `#10b981` (emerald green — consensus, affirmation, go)
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f172a` (deep navy — trust, gravitas)
- Navy Light: `#1e293b`

### Semantic

- Poll Live: `#10b981`
- Poll Live Light: `#d1fae5`
- Poll Closed: `#6b7280`
- Poll Closed Light: `#f3f4f6`
- Poll Scheduled: `#f59e0b`
- Poll Scheduled Light: `#fef3c7`
- Quorum Met: `#10b981`
- Quorum Not Met: `#ef4444`
- Vote Leading: `#0891b2`
- Vote Leading Light: `#cffafe`
- Vote Tied: `#8b5cf6`
- Vote Tied Light: `#ede9fe`

### Backgrounds

- Primary: `#f0f9ff` (faint cyan wash)
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Results Bar: `#ecfeff` (light cyan for bar chart backgrounds)
- Ballot: `#ffffff`

### Text

- Percentage: `#0f172a` (navy — bold data emphasis)
- Vote Count: `#64748b`
- Timer: `#ef4444` (urgency red for countdown)
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Borders

- Primary: `#e2e8f0`
- Active Poll: `#0891b2`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#020617` (near-black navy)
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Text Primary: `#f0f9ff`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`
- Results Bar: `#164e63`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Sidebar Width: `280px` (collapsed: `64px`)
- Results Panel Min Width: `360px`
- Poll Card Grid: `3` columns (desktop), `2` (tablet), `1` (mobile)
- Live Results Max Width: `960px` (centered, focused view for presenters)
- Presenter View Padding: `48px` (generous whitespace for projection)

## Components

### Poll Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` status color (live: poll-live, closed: poll-closed, scheduled: poll-scheduled)
- Status badge: top-right, pill shape, status color bg + white text, `12px` font, `600` weight
- Title font size: `lg` (18px), weight `600`
- Subtitle (question count / response count): `sm` (14px), text-secondary
- Footer: creator avatar (24px circle) + timestamp, separated by `·`

### Results Bar

- Border radius: `8px` (md)
- Height: `40px`
- Background: results-bar
- Fill: primary (leading option), accent (others), gradient left-to-right
- Percentage label: inside bar if > 15% width, outside otherwise, `14px` `700` weight
- Option label: left-aligned, `14px` `500` weight
- Vote count: right-aligned, `14px` `400` weight, text-secondary
- Animation: `500ms ease` fill transition on vote updates
- Spacing between bars: `12px`

### Live Indicator

- Dot: `8px` circle, poll-live color, pulsing animation (`1.5s` infinite)
- Label: `"LIVE"`, `12px`, `700` weight, uppercase, poll-live color
- Wrapper: inline-flex, `8px` gap between dot and label

### Vote Button

- Border radius: `8px` (md)
- Min height: `56px` (comfortable touch target)
- Padding: `16px 20px`
- Border: `2px solid` border-primary
- Selected state: primary border, `#ecfeff` background, primary text, `600` weight
- Hover: `md` shadow, border-secondary
- Font size: `base` (16px), weight `500`
- Full width in single-column ballot layout
- Checkmark icon (16px) left-aligned when selected

### Ballot Panel

- Border radius: `16px` (xl)
- Shadow: `lg`
- Padding: `32px`
- Background: ballot
- Max width: `640px`, centered
- Question title: `2xl` (24px), `700` weight, `#0f172a`
- Question subtitle / instructions: `sm` (14px), text-secondary, `8px` below title
- Submit button: full width, `48px` height, primary solid, `16px` top margin

### Countdown Timer

- Font family: data (tabular nums)
- Font size: `3xl` (30px) in presenter view, `lg` (18px) inline
- Font weight: `700`
- Color: timer (red) when < 60s remaining, text-primary otherwise
- Format: `MM:SS` or `HH:MM:SS` for long polls

### Analytics Chart Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Header: title `lg` `600` weight + optional dropdown filter, `16px` bottom margin
- Chart area min height: `240px`
- Color sequence for chart series: primary, accent, `#8b5cf6`, `#f59e0b`, `#ef4444`, `#ec4899`
- Axis labels: `xs` (12px), text-secondary
- Grid lines: `1px` dashed, `#e2e8f0`
- Tooltip: navy background, inverse text, `8px` radius, `sm` shadow

### Participant Counter

- Background: navy
- Text: inverse (white), data font, tabular-nums
- Font size: `xl` (20px), weight `700`
- Padding: `8px 16px`
- Border radius: `full` (pill)
- Icon: people/users icon, `20px`, left of count
- Pulse animation on increment

### Question Type Badge

- Border radius: `full` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px), weight `600`
- Variants:
  - Multiple Choice: primary bg light, primary text
  - Open Text: accent bg light, accent text
  - Rating: `#fef3c7` bg, `#d97706` text
  - Ranking: `#ede9fe` bg, `#7c3aed` text
  - Word Cloud: `#fce7f3` bg, `#be185d` text

### Dashboard Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Metric font: data, `3xl` (30px), `700` weight, navy
- Label font: `sm` (14px), `400` weight, text-secondary
- Trend indicator: `sm` (14px), `600` weight, accent (positive) or error (negative), with arrow icon
- Icon: `32px`, primary color, top-right of card

### Presenter Toolbar

- Position: fixed bottom
- Height: `64px`
- Background: navy, `0.95` opacity, backdrop-blur `12px`
- Border radius: `16px` (xl) top corners
- Shadow: `xl`
- Button style: ghost on dark, `40px` height, `14px` text, `500` weight, inverse text
- Active button: primary solid pill
- Max width: `720px`, centered

### Real-time Toast

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Left icon: `20px`
- Variants:
  - New vote: primary left border, primary icon
  - Quorum reached: accent left border, accent icon
  - Poll ended: navy left border, navy icon
- Auto-dismiss: `4000ms`
- Stack: bottom-right, `8px` gap, max `3` visible
