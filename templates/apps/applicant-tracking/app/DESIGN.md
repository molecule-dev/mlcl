# DESIGN.md — Applicant Tracking

## Brand Identity

- **App Name:** Shortlist
- **Tagline:** Hire with clarity
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Fair, organized, clear, decisive

## Target Persona

Recruiters and hiring managers tracking candidates through a hiring pipeline with AI-assisted screening.

## Screens

| Name            | Route            | Auth | Purpose                                                                                                                                                                              | deriveFrom |
| --------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing         | /                | No   | Marketing home with pipeline demo, indigo-teal palette, features, pricing                                                                                                            | —          |
| Login           | /login           | No   | Centered card with indigo primary                                                                                                                                                    | —          |
| Signup          | /signup          | No   | Create account                                                                                                                                                                       | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                                                                                                                                        | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                                                                                                                                                     | Login      |
| Dashboard       | /dashboard       | Yes  | Sidebar, stats cards (open jobs, active candidates, interviews this week, hires MTD), pipeline funnel chart, recent a...                                                             | —          |
| Pipeline        | /pipeline        | Yes  | Sidebar, horizontal kanban board with color-coded stage lanes (Sourced violet / Screening indigo / Interview teal / O...                                                             | —          |
| CandidateDetail | /candidates/:id  | Yes  | Sidebar, candidate profile header with photo/name/role, tabs (Overview, Resume, Interviews, Notes), AI score card, ac...                                                             | —          |
| Jobs            | /jobs            | Yes  | Sidebar, table of open jobs with title, department, applicants count, stage breakdown, status badge, days open                                                                       | —          |
| Interviews      | /interviews      | Yes  | Sidebar, weekly calendar view with interview blocks color-coded by stage, interviewer avatars, candidate name                                                                        | —          |
| Settings        | /settings        | Yes  | Sidebar, team, email templates, integrations (LinkedIn, job boards), pipeline stages                                                                                                 | —          |
| JobDetail       | /jobs/:id        | Yes  | Sidebar, job posting header (title, dept, location, status), stats row, two-col with description + stage funnel and top applicants list, recent activity timeline                    | —          |
| NewJob          | /jobs/new        | Yes  | Sidebar, two-col create-job form (role basics, description, requirements, compensation, application form) + side cards (pipeline stages, hiring team, AI screening), sticky save bar | —          |
| Candidates      | /candidates      | Yes  | Sidebar, full candidate table across jobs with search/filter, stage pills, AI score tier, source, days-in-stage, pagination                                                          | —          |
| Reports         | /reports         | Yes  | Sidebar, hiring analytics dashboard with KPI strip, funnel conversion, time-in-stage chart, source donut, hires-by-department, top jobs table, fairness pulse                        | —          |
| Notifications   | /notifications   | Yes  | Sidebar, top-bar bell active, grouped activity feed (Today/Yesterday/Earlier) with stage-colored cards, mentions, urgent reminders, side preferences panel                           | —          |
| Profile         | /profile         | Yes  | Recruiter profile (avatar, name, role, bio, hiring focus areas, recent hires)                                                                                                        | Settings   |
| Billing         | /billing         | Yes  | Subscription tier, seats, usage, invoices, payment method                                                                                                                            | Settings   |

## App Constraints

- Pipeline uses kanban lanes color-coded by stage (Sourced violet, Screening indigo, Interview teal, Offer amber, Hired green)
- Candidate score displays use tabular-nums Inter with green/amber/red semantic colors
- Candidate detail slides over from right (480px width)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6366f1`
- Primary Hover: `#818cf8`
- Primary Dark: `#4f46e5`
- Accent: `#0d9488`
- Accent Hover: `#14b8a6`
- Accent Dark: `#0f766e`

### Semantic

- Stage Sourced: `#8b5cf6`
- Stage Screening: `#6366f1`
- Stage Interview: `#0d9488`
- Stage Offer: `#f59e0b`
- Stage Hired: `#16a34a`
- Stage Rejected: `#dc2626`
- Score High: `#16a34a`
- Score High Light: `#dcfce7`
- Score Medium: `#f59e0b`
- Score Medium Light: `#fef3c7`
- Score Low: `#dc2626`
- Score Low Light: `#fee2e2`
- New Application: `#6366f1`
- New Application Light: `#eef2ff`
- Urgent: `#e11d48`
- Urgent Light: `#ffe4e6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Pipeline Lane: `#f1f5f9`
- Candidate Highlight: `#eef2ff`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Stage Label: `#475569`
- Score Value: `#1e293b`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Pipeline Divider: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#2dd4bf`
- Background: `#0f172a`
- Surface: `#1e293b`
- Surface Secondary: `#1a2332`
- Pipeline Lane: `#1e293b`
- Candidate Highlight: `#1e1b4b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Score: `Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Pipeline Lane Min Width: `280px`
- Pipeline Lane Gap: `16px`
- Pipeline Card Gap: `12px`
- Candidate Detail Panel Width: `480px`
- Top Bar Height: `56px`
- Stats Row Height: `96px`

## Components

### Pipeline Card (Kanban)

- Border radius: `8px` (md)
- Shadow: `sm`, hover: `md`
- Padding: `12px 16px`
- Border-left: `3px solid` stage color
- Background: surface
- Candidate name: `14px`, weight `600`
- Role applied: `13px`, secondary text
- Score badge: inline pill, right-aligned
- Tags: `12px` pills below name, max 3 visible + overflow count
- Drag handle: `4px` left margin grip dots, secondary text color
- Hover: translate-y `-1px`, shadow `md`

### Pipeline Lane

- Background: pipeline-lane
- Border radius: `12px` (lg)
- Padding: `12px`
- Header: stage name (`14px`, weight `600`), count badge (pill, muted)
- Min height: `200px`
- Drop zone highlight: `2px dashed` primary, primary at `0.08` opacity background

### Candidate Detail Panel

- Border-left: `1px solid` border-primary
- Background: surface
- Header padding: `24px`
- Section padding: `16px 24px`
- Slide-in from right, `300ms ease`
- Sections: Profile, Resume, Scorecard, Activity Timeline, Notes

### Scorecard

- Border radius: `8px` (md)
- Padding: `16px`
- Border: `1px solid` border-primary
- Category row height: `48px`
- Score indicator: circle `32px`, weight `700`, colored by score tier
- Average score: `24px` bold in summary bar, colored by tier
- Star rating: `20px` stars, filled with accent color
- Hover on category: surface-secondary background

### Job Posting Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Title: `18px`, weight `600`
- Department badge: pill, accent background at `0.1` opacity, accent text
- Location: `13px`, secondary text, map-pin icon
- Stats row: applicant count, days open, pipeline conversion — `13px`, weight `500`
- Status indicator: `8px` circle, green (active) / amber (paused) / gray (closed)
- Hover: shadow `md`

### Application Row (Table)

- Row height: `56px`
- Cell padding: `12px 16px`
- Avatar: `32px` circle, initials fallback with primary at `0.1` background
- Name column: name `14px` weight `500`, email `12px` secondary below
- Stage column: colored pill matching stage color at `0.1` opacity
- Score column: numeric with tier color
- Date column: `13px`, secondary text, relative time
- Actions: icon buttons (view, advance, reject) on hover
- Selected row: candidate-highlight background

### Resume Viewer

- Border radius: `8px` (md)
- Background: surface-secondary
- Padding: `24px`
- Max height: `600px`, scrollable
- Upload dropzone: dashed `2px` border-secondary, `120px` height, centered icon + text
- Dropzone active: primary border, primary at `0.05` background
- File display: icon + filename + size, `14px`

### Stats Card (Dashboard)

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Height: `96px`
- Label: `13px`, secondary text, weight `500`
- Value: `28px`, weight `700`, primary text
- Trend indicator: `12px`, green (up) / red (down) arrow + percentage
- Icon: `20px`, right-aligned, primary at `0.1` background circle `40px`

### Activity Timeline

- Left border: `2px solid` border-primary
- Node: `10px` circle on the border line
- Node colors: stage-specific for transitions, primary for notes, accent for scores
- Entry padding: `8px 0 8px 20px`
- Timestamp: `12px`, secondary text
- Action text: `14px`, weight `400`
- Actor name: weight `500`

### Search & Filter Bar

- Border radius: `8px` (md)
- Height: `40px`
- Search input: full width with search icon `16px` left
- Filter pills: `28px` height, `8px` radius, secondary background, removable (x icon)
- Active filter: primary at `0.1` background, primary text
- Dropdown filters: shadow `lg`, `8px` radius, max height `320px` scrollable

### Interview Scheduler (Mini)

- Border radius: `8px` (md)
- Padding: `12px`
- Time slot: `40px` height, `8px` radius, surface-secondary background
- Selected slot: primary at `0.1` background, primary border
- Interviewer avatar: `24px` circle, stacked with `-8px` overlap
- Conflict indicator: urgent color dot `6px`
