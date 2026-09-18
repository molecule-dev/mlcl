# DESIGN.md — Job Board

## Brand Identity

- **App Name:** Placement
- **Tagline:** Where talent meets momentum
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Modern
- Confident
- Opportunity-forward
- Clear

## Target Persona

Job seekers searching for their next role and employers sourcing talent.

## Screens

| Name           | Route                | Auth | Purpose                                                                                             | deriveFrom |
| -------------- | -------------------- | ---- | --------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                    | No   | Marketing home                                                                                      | —          |
| Login          | /login               | No   | Sign in                                                                                             | —          |
| Signup         | /signup              | No   | Create account                                                                                      | Login      |
| ForgotPassword | /forgot-password     | No   | Request reset                                                                                       | Login      |
| ResetPassword  | /reset-password      | No   | Set new password                                                                                    | Login      |
| Dashboard      | /dashboard           | Yes  | Seeker: recommended jobs, application status. Employer: posting stats.                              | —          |
| Jobs           | /jobs                | Yes  | Search/filter job listings with skills, salary, location                                            | Dashboard  |
| JobDetail      | /jobs/:id            | Yes  | Full job description, company, apply button                                                         | Dashboard  |
| Applications   | /applications        | Yes  | My applications status pipeline (applied → interview → offer)                                       | Dashboard  |
| Companies      | /companies           | Yes  | Browse company profiles with open roles                                                             | Dashboard  |
| CompanyDetail  | /companies/:id       | Yes  | Company profile with culture, benefits, jobs                                                        | Dashboard  |
| PostJob        | /post-job            | Yes  | Employer posts a new job listing                                                                    | Dashboard  |
| Profile        | /profile             | Yes  | Seeker profile with resume, skills, preferences                                                     | Dashboard  |
| Settings       | /settings            | Yes  | Account, notifications, privacy                                                                     | Dashboard  |
| JobApplicants  | /jobs/:id/applicants | Yes  | Employer view of candidates who applied to a posted job — review resumes, change stage, take action | Dashboard  |
| Notifications  | /notifications       | Yes  | Activity feed for both modes — application updates, interview invites, new applicants, job matches  | Dashboard  |

## App Constraints

- Cyan primary for trust signals
- Dual-mode navigation (Seeker / Employer)
- Job cards emphasize title, company, salary

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2` (strong cyan — trust, connectivity)
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Navy: `#0c1a2e` (deep navy for headers, sidebar, hero sections)
- Navy Light: `#1e2d45`
- Accent: `#10b981` (emerald green — action, progress)
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Active Listing: `#10b981`
- Active Listing Light: `#d1fae5`
- Urgent Hire: `#f59e0b`
- Urgent Hire Light: `#fef3c7`
- Closed: `#6b7280`
- Closed Light: `#f3f4f6`
- New Badge: `#0891b2`
- New Badge Light: `#cffafe`
- Applied: `#6366f1`
- Applied Light: `#e0e7ff`
- Interviewing: `#f59e0b`
- Interviewing Light: `#fef3c7`
- Offered: `#10b981`
- Offered Light: `#d1fae5`
- Rejected: `#ef4444`
- Rejected Light: `#fee2e2`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Sidebar: `#0c1a2e`
- Sidebar Hover: `#1e2d45`
- Search Hero: `linear-gradient(135deg, #0c1a2e 0%, #164e63 100%)`

### Text

- Salary: `#059669` (bold green — draws the eye)
- Company: `#0e7490`
- Location: `#64748b`
- Tag: `#334155`
- Sidebar Text: `#cbd5e1`
- Sidebar Active: `#ffffff`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Navy: `#020617`
- Salary: `#34d399`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace` (salary figures, stats)

### Font Overrides

- Salary: font-variant-numeric: `tabular-nums`, weight: `700`
- Company name: weight: `600`, size: `base`
- Job title: weight: `700`, size: `lg`
- Stats/counters: font-family: Mono, weight: `600`

## Layout

- Content Max Width: `1360px`
- Dashboard Grid Columns: `12`
- Sidebar Width: `260px` (collapsed: `64px`)
- Search Results Grid: `1` column (list view, default), `2` columns desktop (card view)
- Filter Panel Width: `280px`
- Job Detail Panel: `640px` (split-view right pane)
- Top Bar Height: `64px`
- Search Hero Height: `200px` (landing), `80px` (results — collapsed)
- Employer Dashboard Sidebar: `240px`

## Components

### Job Card (List View)

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px 24px`
- Border-left: `4px solid transparent`, active: `4px solid primary`
- Company logo: `48px` square, border-radius `8px`, right margin `16px`
- Job title: `lg` (18px), weight `700`, color text-primary
- Company name: `base` (16px), weight `600`, color company
- Meta row (location, type, posted): `sm` (14px), color secondary, icon `16px` inline
- Salary range: `base` (16px), weight `700`, color salary, font-variant-numeric tabular-nums
- Tags row: flex wrap, gap `8px`, margin-top `12px`
- Urgent badge: `Urgent Hire` background, white text, pulse animation (subtle)
- New badge: `New Badge` background, white text
- Hover: lift shadow to `md`, border-left color primary

### Job Card (Grid View)

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `0` (image/header flush) + `20px` (content)
- Company logo: `40px`, top-left of content area
- Header band: `48px` height, company brand color or navy as fallback
- Max height: `320px`, overflow hidden with fade

### Application Status Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `600`
- Variants:
  - Applied: applied/applied-light
  - Reviewing: primary/new-badge-light
  - Interviewing: interviewing/interviewing-light
  - Offered: offered/offered-light
  - Rejected: rejected/rejected-light
  - Closed: closed/closed-light

### Search Bar (Hero)

- Border radius: `12px` (lg)
- Height: `56px`
- Background: `#ffffff`
- Shadow: `lg`
- Inner layout: icon `20px` + input + divider + location input + search button
- Search button: primary background, white text, `48px` height, radius `8px`, right-inset `4px`
- Placeholder: `sm` (14px), color secondary

### Filter Sidebar

- Section title: `sm` (14px), weight `600`, uppercase, letter-spacing `0.05em`, color secondary
- Section spacing: `24px`
- Checkbox: rounded `4px`, primary color when checked
- Salary range slider: primary color track, `20px` thumb
- Tag filters: pill-shaped, `outline` variant, primary when active
- Collapsible sections: chevron icon `16px`, `150ms` rotate transition
- Clear all: ghost button, `sm` text, right-aligned in filter header

### Employer Dashboard Stat Card

- Border radius: `12px` (lg)
- Padding: `24px`
- Shadow: `sm`
- Stat number: `3xl` (30px), weight `700`, primary color
- Stat label: `sm` (14px), weight `500`, color secondary
- Trend indicator: `xs` (12px), weight `600`, green up / red down with arrow icon
- Icon: `40px` circle, primary-light background, primary icon color

### Application Row (Employer View)

- Padding: `16px 20px`
- Border-bottom: `1px solid` border-primary
- Hover: surface-secondary background
- Avatar: `40px` circle
- Candidate name: `base`, weight `600`
- Applied date: `sm`, color secondary
- Resume link: primary color, underline on hover
- Action buttons: icon-only, `32px`, ghost variant, grouped right

### Job Posting Form

- Section spacing: `32px`
- Input labels: `sm` (14px), weight `600`, margin-bottom `6px`
- Rich text editor: min-height `200px`, border-radius `8px`, toolbar radius `8px 8px 0 0`
- Salary range inputs: side-by-side, `120px` each, mono font
- Tag input: pill tokens with `×` remove, primary outline
- Preview toggle: tab-style, top-right of form, primary underline active

### Company Profile Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Logo: `80px` square, border-radius `12px`, border `1px solid` border-primary
- Company name: `2xl` (24px), weight `700`
- Industry badge: pill, navy background, white text
- Stats row: jobs count, avg response time, company size — `sm`, mono font, separated by `·`
- Description: `base`, max 3 lines with clamp, color secondary

### Notification Item

- Padding: `16px 20px`
- Unread: surface-secondary background, left border `3px solid primary`
- Read: transparent background
- Icon: `32px` circle, semantic color background matching notification type
- Title: `sm`, weight `600`
- Body: `sm`, color secondary, max 2 lines
- Timestamp: `xs`, color tertiary, right-aligned
