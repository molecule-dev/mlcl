# DESIGN.md — OKR / Goal Tracking

## Brand Identity

- **App Name:** Ascent
- **Tagline:** Climb toward what matters
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Aspirational
- Accountable
- Measurable
- Coaching

## Target Persona

Teams and individuals tracking quarterly OKRs, KRs, and weekly check-ins.

## Screens

| Name            | Route                | Auth | Purpose                                                             | deriveFrom   |
| --------------- | -------------------- | ---- | ------------------------------------------------------------------- | ------------ |
| Landing         | /                    | No   | Marketing home                                                      | —            |
| Login           | /login               | No   | Sign in                                                             | —            |
| Signup          | /signup              | No   | Create account                                                      | Login        |
| ForgotPassword  | /forgot-password     | No   | Request reset                                                       | Login        |
| ResetPassword   | /reset-password      | No   | Set new password                                                    | Login        |
| Dashboard       | /dashboard           | Yes  | My OKRs with progress, team OKRs, alignment map                     | —            |
| Objectives      | /objectives          | Yes  | All objectives with progress and owner                              | Dashboard    |
| ObjectiveDetail | /objectives/:id      | Yes  | Objective with KRs, updates, linked initiatives                     | Dashboard    |
| CheckIn         | /check-in            | Yes  | Weekly check-in: progress on each KR, confidence                    | Dashboard    |
| Team            | /team                | Yes  | Team OKRs and members                                               | Dashboard    |
| Reviews         | /reviews             | Yes  | Quarterly review summaries                                          | Dashboard    |
| Settings        | /settings            | Yes  | Cadence, notifications, team setup                                  | Dashboard    |
| NewObjective    | /objectives/new      | Yes  | Create a new objective with KRs, alignment, and cadence             | —            |
| EditObjective   | /objectives/:id/edit | Yes  | Edit an existing objective and its KRs                              | NewObjective |
| ReviewDetail    | /reviews/:id         | Yes  | Detailed quarterly review: scorecard, outcomes, reflections, grade  | —            |
| Notifications   | /notifications       | Yes  | Activity center: mentions, check-in reminders, KR updates, reviews  | —            |
| Profile         | /profile             | Yes  | User profile: bio, active objectives, check-in streak, achievements | —            |
| Billing         | /settings/billing    | Yes  | Subscription, seats, payment method, invoices                       | —            |

## App Constraints

- Progress rings and bars prominently displayed
- OKR hierarchy: Objective → Key Results with % progress
- Weekly check-in prompts

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#3730a3`
- Accent: `#0ea5e9`
- Accent Hover: `#38bdf8`
- Accent Dark: `#0284c7`

### Semantic

- On Track: `#16a34a`
- On Track Light: `#dcfce7`
- At Risk: `#f59e0b`
- At Risk Light: `#fef3c7`
- Behind: `#dc2626`
- Behind Light: `#fee2e2`
- Not Started: `#94a3b8`
- Not Started Light: `#f1f5f9`
- Completed: `#7c3aed`
- Completed Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Sidebar: `#1e1b4b`
- Sidebar Text: `#e0e7ff`
- Sidebar Active: `rgba(99, 102, 241, 0.2)`
- Progress Track: `#e2e8f0`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Percentage: `#1e293b`
- Link: `#4f46e5`
- Link Hover: `#3730a3`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#4f46e5`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#38bdf8`
- Background: `#0f0d2e`
- Surface: `#1e1b4b`
- Surface Secondary: `#272362`
- Sidebar: `#0c0a26`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`
- Progress Track: `#334155`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Metric: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `1360px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `56px`
- Objective Card Min Width: `320px`
- Check-in Panel Width: `480px`
- Timeline Gutter: `48px`

## Components

### Objective Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` status color (on-track/at-risk/behind/not-started/completed)
- Title font size: `lg` (18px)
- Title font weight: `600`
- Owner avatar: `28px` circle, bottom-right of card
- Progress bar height: `6px`, border-radius: `full`
- Key result count badge: muted text, right-aligned

### Key Result Row

- Border radius: `8px` (md)
- Padding: `16px`
- Background: surface-secondary on hover
- Progress indicator: inline bar, `4px` height, `120px` width
- Metric value font: metric font, `600` weight, `lg` size
- Target value font: secondary text, `sm` size
- Status dot: `8px` circle, left of title, colored by status

### Progress Bar

- Track height: `6px` (inline), `8px` (card), `12px` (detail page)
- Track background: progress-track
- Track border-radius: `full`
- Fill border-radius: `full`
- Fill colors: on-track (`#16a34a`), at-risk (`#f59e0b`), behind (`#dc2626`), not-started (`#94a3b8`), completed (`#7c3aed`)
- Animation: `500ms ease` width transition on value change
- Percentage label: metric font, `600` weight, positioned right of bar

### Check-in Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border: `1px solid` border-primary
- Timeline connector: `2px` vertical line, border-secondary, left gutter
- Timeline dot: `10px` circle, primary color, centered on connector
- Timestamp: `xs` (12px), secondary text, top-right
- Confidence indicator: colored pill (on-track/at-risk/behind), `sm` text, `500` weight
- Note text: `sm` (14px), normal weight, `1.6` line-height

### Objective Detail Header

- Padding: `24px 0`
- Title font size: `2xl` (24px), weight `700`
- Status badge: pill shape, colored background-light + colored text per status
- Owner row: `32px` avatar + name + role, `md` spacing below title
- Time period: secondary text, `sm`, with calendar icon
- Overall progress: large progress bar (`12px` height), percentage in metric font `2xl`

### Dashboard Summary Cards

- Border radius: `12px` (lg)
- Padding: `20px`
- Shadow: `sm`
- Metric value: `3xl` (30px), `700` weight, primary text
- Metric label: `sm` (14px), secondary text
- Trend indicator: `sm` text, colored (on-track for positive, behind for negative), with arrow icon
- Grid: 4 columns desktop, 2 tablet, 1 mobile

### Alignment Tree

- Indent per level: `32px`
- Connector lines: `1px solid` border-secondary, L-shaped
- Node padding: `12px 16px`
- Node border-radius: `8px`
- Node background: surface, hover: surface-secondary
- Expand/collapse toggle: `20px` chevron icon, `150ms` rotation transition

### Confidence Selector

- Three options: On Track / At Risk / Behind
- Pill-shaped buttons, `32px` height
- Unselected: ghost variant, border-primary
- Selected: filled with status color, white text
- Spacing between pills: `8px`
- Transition: `150ms ease` background and border color

### Period Selector

- Dropdown style, `40px` height
- Format: "Q1 2026" or "H1 2026" or "2026"
- Border radius: `8px`
- Chevron icon right-aligned
- Active period: primary color text, `500` weight

### Sidebar Navigation

- Background: sidebar color (`#1e1b4b`)
- Text color: sidebar-text (`#e0e7ff`)
- Active item: sidebar-active background, white text, `500` weight
- Icon size: `20px`, `12px` gap to label
- Section headers: `xs` (12px), uppercase, `600` weight, `#818cf8` color, `24px` top margin
- Item padding: `10px 16px`
- Item border-radius: `8px`
- Hover: `rgba(255, 255, 255, 0.08)` background

### Empty State

- Centered layout, `max-width: 400px`
- Illustration area: `120px` height
- Heading: `xl` (20px), `600` weight
- Description: `sm`, secondary text, `1.6` line-height
- CTA button: primary, `md` size
