# DESIGN.md — HR Management

## Brand Identity

- **App Name:** Arbor
- **Tagline:** Where talent takes root
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Calm, human, authoritative, considerate

## Target Persona

HR managers and people operations leads at growing companies (50–500 employees) who need a single source of truth for employees, PTO, org structure, and documents without enterprise bloat.

## Screens

| Name            | Route            | Auth | Purpose                                                                           | deriveFrom      |
| --------------- | ---------------- | ---- | --------------------------------------------------------------------------------- | --------------- |
| Login           | /login           | No   | Sign in                                                                           | —               |
| Signup          | /signup          | No   | Create account                                                                    | Login           |
| ForgotPassword  | /forgot-password | No   | Request reset                                                                     | Login           |
| ResetPassword   | /reset-password  | No   | Set new password                                                                  | Login           |
| Dashboard       | /dashboard       | Yes  | Headcount stats, recent activity, PTO overview, announcements                     | —               |
| Employees       | /employees       | Yes  | Searchable table of employees with profile slide-out                              | —               |
| EmployeeProfile | /employees/:id   | Yes  | Individual employee full profile with banner and tabs                             | —               |
| OrgChart        | /org-chart       | Yes  | Interactive tree of reporting structure                                           | —               |
| PTO             | /pto             | Yes  | Calendar + request list with approval actions                                     | —               |
| Documents       | /documents       | Yes  | Policy, contract, and employee document library                                   | —               |
| Settings        | /settings        | Yes  | Company info, permissions, integrations, audit log                                | —               |
| Notifications   | /notifications   | Yes  | Centralized activity feed for PTO, documents, onboarding, anniversaries, mentions | —               |
| Onboarding      | /onboarding      | Yes  | New hire journeys with checklists, progress, and templates                        | —               |
| Reports         | /reports         | Yes  | Deep analytics on headcount, turnover, PTO, diversity, tenure                     | —               |
| Performance     | /performance     | Yes  | Review cycles, goals, 1:1s, and team performance overview                         | —               |
| AddEmployee     | /employees/new   | Yes  | Create a new employee record                                                      | EmployeeProfile |

## App Constraints

- Employee IDs and any identifier columns use monospace (JetBrains Mono) with tabular-nums for scannable alignment
- Status is always communicated with a colored dot + label pair, never color alone (accessibility)
- PTO request colors follow the strict token map: Approved green, Pending amber, Denied red — never substitute

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#7c3aed`
- Accent Hover: `#8b5cf6`
- Accent Dark: `#6d28d9`

### Semantic

- Approved: `#16a34a`
- Approved Light: `#dcfce7`
- Pending: `#d97706`
- Pending Light: `#fef3c7`
- Denied: `#dc2626`
- Denied Light: `#fee2e2`
- Active Employee: `#0d9488`
- On Leave: `#7c3aed`
- On Leave Light: `#ede9fe`
- Probation: `#ea580c`
- Probation Light: `#fff7ed`
- Terminated: `#6b7280`
- Terminated Light: `#f3f4f6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafb`
- Sidebar: `#f0fdfa`
- Org Chart: `#faf5ff`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Department: `#0d9488`
- Role Title: `#334155`
- Link: `#0d9488`
- Link Hover: `#0f766e`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0d9488`
- Org Chart Connector: `#a5b4fc`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#a78bfa`
- Background: `#0c1322`
- Surface: `#162032`
- Surface Secondary: `#1c2a40`
- Sidebar: `#0e1a2e`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a52`
- Org Chart Connector: `#6366f1`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600–700)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Employee ID: `"JetBrains Mono", SFMono-Regular, monospace` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `68px`)
- Top Bar Height: `60px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `20px`
- Employee List Columns: `1` (table layout, full width)
- Org Chart Node Width: `220px`
- Org Chart Level Spacing: `80px` (vertical gap between hierarchy levels)
- Org Chart Sibling Spacing: `32px` (horizontal gap between peers)
- Profile Panel Width: `380px` (slide-out employee detail)
- Calendar Grid Cell Height: `120px`

## Components

### Employee Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Avatar: `48px` circle (border-radius: full), left-aligned
- Name font size: `base` (16px), weight `600`
- Role font size: `sm` (14px), color: text-secondary
- Department badge: inline pill, teal-tinted background (`#f0fdfa`), teal text
- Status dot: `8px` circle, positioned top-right of avatar (active: teal, on-leave: accent, terminated: gray)
- Bottom row: employee ID (mono font, `xs`), hire date (`xs`, muted)

### Org Chart Node

- Border radius: `12px` (lg)
- Shadow: `md`
- Border: `2px solid` transparent, active: primary
- Padding: `16px`
- Avatar: `56px` circle, centered above name
- Name font size: `sm` (14px), weight `600`, centered
- Title font size: `xs` (12px), color: text-secondary, centered
- Department: `xs` pill badge, centered below title
- Connector lines: `2px solid` org-chart-connector color, rounded corners `8px`
- Hover: shadow `lg`, slight scale `1.02` with fast transition

### PTO Calendar

- Border radius: `12px` (lg) on container
- Day cell border: `1px solid` border-primary
- Today highlight: primary background at `10%` opacity, primary border
- PTO block border radius: `6px`
- PTO block height: `24px`
- PTO colors by type:
  - Vacation: `#0d9488` (primary)
  - Sick: `#ea580c` (probation)
  - Personal: `#7c3aed` (accent)
  - Bereavement: `#6b7280` (terminated)
  - Holiday (company): `#2563eb`
- Overlap: stacked with `2px` gap, max 3 visible + "+N more" pill
- Weekend columns: surface-secondary background

### PTO Request Card

- Border radius: `8px` (md)
- Border-left: `4px solid` status color (approved: green, pending: amber, denied: red)
- Padding: `12px 16px`
- Date range: weight `600`, `sm` size
- Type badge: pill, colored by PTO type (see calendar colors above)
- Status badge: pill, colored by status
- Days count: `2xl` (24px) weight `700`, right-aligned
- Requester avatar: `32px` circle (visible in manager view)

### Employee Profile Header

- Full-width banner area: `160px` height, subtle gradient (primary at 5% → transparent)
- Avatar: `96px` circle, border `4px solid` surface, positioned overlapping banner bottom
- Name: `2xl` (24px), weight `700`
- Title + Department: `lg` (18px), weight `400`, text-secondary
- Status badge: large pill, right of name
- Quick actions row: icon buttons (email, message, edit), `36px` square, ghost variant

### Document Card

- Border radius: `8px` (md)
- Shadow: `sm`
- Padding: `12px 16px`
- File icon: `32px`, color by type (PDF: `#dc2626`, DOC: `#2563eb`, XLS: `#16a34a`, IMG: `#7c3aed`)
- File name: `sm` (14px), weight `500`, truncate with ellipsis at 1 line
- Metadata row: `xs` (12px), muted — upload date, file size, uploader name
- Hover: shadow `md`, border-color primary

### Audit Log Entry

- Padding: `12px 0`
- Border-bottom: `1px solid` border-primary
- Timestamp: `xs` (12px), mono font, muted, fixed width `140px`
- Actor avatar: `24px` circle
- Actor name: `sm` (14px), weight `500`
- Action verb: `sm`, weight `400`, text-secondary
- Target: `sm`, weight `500`, link color
- Details toggle: ghost button, `xs`, expands to show diff or raw payload

### Data Table (Employee List)

- Header background: `#f0fdfa` (sidebar tint)
- Header font weight: `600`, `xs` (12px), uppercase, letter-spacing `0.05em`
- Row height: `56px`
- Row hover: surface-secondary
- Avatar column: `40px` circle
- Inline status dot: `8px`, left of employee name
- Sortable columns: header with up/down chevron icon, active sort: primary color
- Row click: opens profile panel slide-out
- Sticky first column on horizontal scroll
- Bulk select: checkbox column, `20px` square, rounded `4px`

### Stat Card (Dashboard)

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Metric value: `3xl` (30px), weight `700`
- Metric label: `sm` (14px), weight `400`, text-secondary
- Trend indicator: `sm`, weight `600` — up arrow + green for positive, down arrow + red for negative
- Accent bar: `4px` top border, color varies per card (primary, accent, approved, pending)
- Icon: `40px` square, rounded `8px`, tinted background matching accent bar

### Search Bar

- Border radius: `9999px` (pill)
- Height: `44px`
- Padding: `8px 20px`
- Background: surface-secondary, focus: surface (white)
- Border: `1px solid` transparent, focus: primary
- Search icon: `18px`, text-secondary, left-positioned
- Placeholder: "Search employees, departments, documents…"
- Keyboard shortcut hint: `⌘K` badge, right-positioned, `xs` mono font, muted

### Sidebar Navigation

- Width: `260px` (expanded), `68px` (collapsed)
- Background: sidebar (`#f0fdfa`)
- Logo area: `60px` height, app name in heading font, weight `700`, primary color
- Nav item height: `40px`
- Nav item padding: `8px 16px`
- Nav item border radius: `8px`
- Active item: primary at `15%` opacity background, primary text, weight `600`
- Hover: primary at `8%` opacity background
- Icon size: `20px`, `24px` gap to label
- Section divider: `1px solid` border-primary, `16px` vertical margin
- Collapse toggle: bottom-positioned, ghost button
