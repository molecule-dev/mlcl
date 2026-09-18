# DESIGN.md — Employee Onboarding

## Brand Identity

- **App Name:** Embark
- **Tagline:** Your journey starts here
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Welcoming, confident, encouraging, warm

## Target Persona

New hires at mid-to-large companies in their first 30-90 days who need a guided, human-feeling path through HR paperwork, team introductions, and role-specific training milestones.

## Screens

| Name              | Route            | Auth | Purpose                                                                         | deriveFrom |
| ----------------- | ---------------- | ---- | ------------------------------------------------------------------------------- | ---------- |
| Login             | /login           | No   | Sign in                                                                         | —          |
| Signup            | /signup          | No   | Create account                                                                  | Login      |
| ForgotPassword    | /forgot-password | No   | Request reset                                                                   | Login      |
| ResetPassword     | /reset-password  | No   | Set new password                                                                | Login      |
| Dashboard         | /dashboard       | Yes  | Welcome banner, progress ring, next tasks, team                                 | —          |
| Checklist         | /checklist       | Yes  | Full onboarding task list with status per item                                  | —          |
| Documents         | /documents       | Yes  | Document grid — handbook, forms, signed agreements                              | —          |
| TeamDirectory     | /team            | Yes  | Meet the team — avatars, roles, departments                                     | —          |
| Timeline          | /timeline        | Yes  | 30/60/90-day milestone view                                                     | —          |
| Settings          | /settings        | Yes  | Profile, notifications, preferences                                             | —          |
| Landing           | /                | No   | Public marketing page introducing Embark to new hires                           | —          |
| TaskDetail        | /checklist/:id   | Yes  | Single onboarding task with full instructions, sub-steps, attachments, comments | —          |
| DocumentViewer    | /documents/:id   | Yes  | View/sign a single document — PDF preview + signature flow                      | —          |
| TeamMemberProfile | /team/:id        | Yes  | Single teammate profile — bio, role, contact, mutual onboarding context         | —          |
| Notifications     | /notifications   | Yes  | Activity feed — assignments, mentions, milestone unlocks, document requests     | —          |
| Profile           | /profile         | Yes  | Own employee profile — bio, role, manager, start date, photo                    | —          |
| Training          | /training        | Yes  | Role-specific training modules and learning milestones                          | —          |
| TrainingModule    | /training/:id    | Yes  | Single training module — lessons, video, progress, quiz                         | —          |

## App Constraints

- Dashboard MUST feature a prominent welcome banner with gradient and progress ring showing overall onboarding completion percentage
- Checklist items use category-colored left borders (general = primary teal, milestone = accent purple)
- Team directory and timeline are content-heavy but visually airy — never pack rows tighter than 56px

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#8b5cf6`
- Accent Hover: `#a78bfa`
- Accent Dark: `#7c3aed`

### Semantic

- Complete: `#16a34a`
- Complete Light: `#dcfce7`
- In Progress: `#e89316`
- In Progress Light: `#fef3c7`
- Not Started: `#94a3b8`
- Not Started Light: `#f1f5f9`
- Overdue: `#dc2626`
- Overdue Light: `#fee2e2`
- Milestone: `#8b5cf6`
- Milestone Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafa`
- Welcome Banner: `linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #8b5cf6 100%)`
- Progress Track: `#e2e8f0`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Heading: `#0f172a`
- Link: `#0d9488`
- Link Hover: `#0f766e`
- On Brand: `#ffffff`
- Percentage: `#0d9488`
- Percentage Complete: `#16a34a`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0d9488`
- Checklist Divider: `#f1f5f9`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#a78bfa`
- Background: `#0c1220`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2d3d50`
- Progress Track: `#334155`
- Welcome Banner: `linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #7c3aed 100%)`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Weights

- Heading: `700`
- Subheading: `600`
- Body: `400`
- Label: `500`
- Stat: `700`

## Layout

- Content Max Width: `1200px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `64px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Checklist Max Width: `720px`
- Document Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Welcome Banner Height: `200px`

## Components

### Welcome Banner

- Border radius: `16px` (xl)
- Background: Welcome Banner gradient
- Padding: `32px 40px`
- Text color: on-brand (white)
- Heading size: `2xl` (24px), weight `700`
- Subtext size: `base` (16px), weight `400`, opacity `0.9`
- Shadow: `lg`
- Illustration/avatar: right-aligned, `120px` max height

### Progress Ring

- Diameter: `80px` (large), `48px` (compact)
- Stroke width: `6px` (large), `4px` (compact)
- Track color: progress-track
- Fill color: primary (in progress), complete (done), overdue (past due)
- Center text: percentage, font weight `700`, font size `lg` (large) / `sm` (compact)
- Animation: `600ms ease-out` on mount

### Progress Bar

- Height: `8px` (default), `12px` (prominent)
- Border radius: `full` (9999px)
- Track color: progress-track
- Fill color: primary (in progress), complete (done), overdue (past due)
- Animation: `500ms ease-out` width transition

### Checklist Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px 24px`
- Border-left: `4px solid` category color (primary for general, accent for milestone)
- Category label: `xs` font, `500` weight, uppercase, letter-spacing `0.05em`
- Title: `lg` font, `600` weight
- Description: `sm` font, secondary text color
- Due date: `sm` font, secondary text; overdue color when past due

### Checklist Item

- Padding: `12px 16px`
- Border bottom: `1px solid` checklist-divider
- Checkbox: `20px` square, border radius `6px`, primary fill when checked
- Checkmark: white `2px` stroke icon, `14px`
- Label: `base` font, `400` weight; strikethrough + secondary color when complete
- Hover: surface-secondary background
- Transition: `150ms ease` (fast)

### Document Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- File icon: `40px`, color-coded by type (PDF: `#dc2626`, DOC: `#2563eb`, IMG: `#e89316`, default: `#64748b`)
- Title: `sm` font, `600` weight, truncate with ellipsis at 2 lines
- Meta row: `xs` font, secondary text (file size, upload date)
- Status badge: `xs` pill — "Signed" (complete), "Pending" (in-progress), "Required" (overdue)
- Download/view action: ghost button, primary color, right-aligned

### Milestone Timeline

- Vertical line: `2px` solid, border-primary, left offset `16px`
- Node: `12px` circle, filled primary (complete), outline primary (current), border-secondary (upcoming)
- Current node: `12px` circle + `20px` pulse ring, primary at `20%` opacity
- Content offset: `40px` from left edge
- Title: `base` font, `600` weight
- Date: `xs` font, secondary text
- Spacing between nodes: `32px`

### Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px 24px`
- Value: `3xl` font (30px), `700` weight, primary color
- Label: `sm` font, `400` weight, secondary text color
- Icon: `24px`, primary tint at `15%` opacity background, `40px` circle
- Trend indicator: `xs` font, complete color (up arrow) or overdue color (down arrow)

### Team Member Row

- Padding: `12px 16px`
- Avatar: `36px` circle, border `2px solid` surface
- Name: `sm` font, `500` weight
- Role/department: `xs` font, secondary text
- Contact action: ghost icon button, primary color
- Hover: surface-secondary background

### Sidebar Navigation

- Width: `260px`, collapsed: `72px`
- Background: surface
- Active item: primary at `10%` opacity background, primary text, left border `3px solid` primary
- Item padding: `10px 16px`
- Item icon: `20px`
- Section divider: `1px solid` border-primary, `16px` vertical margin
- Progress indicator per section: mini progress bar below label, `3px` height

### Top Bar

- Height: `64px`
- Background: surface
- Border bottom: `1px solid` border-primary
- Logo: heading font, `xl` size, `700` weight, primary color
- User avatar: `32px` circle, right-aligned
- Notification bell: `20px` icon, dot indicator `8px` circle, accent color
