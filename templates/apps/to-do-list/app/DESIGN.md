# DESIGN.md — To-Do List

> This file extends the molecule base design system. AI tools should reference both this file and the molecule DESIGN.md when generating UI. Values here override the base system.

## Brand Identity

- **App Name:** Cadence
- **Tagline:** Master your momentum — one task at a time
- **Logo:** Text-based logo using the app name in Inter (extra-bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Motivating, focused, pragmatic, calm

## Target Persona

Knowledge workers and busy professionals who want a fast, calm to-do app that makes daily progress visible across personal and team projects.

## Screens

| Name           | Route            | Auth | Purpose                                                         | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with momentum positioning and signup CTA         | —          |
| Login          | /login           | No   | Sign in                                                         | —          |
| Signup         | /signup          | No   | Create account                                                  | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                   | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                | Login      |
| Today          | /today           | Yes  | Tasks due today, overdue surfaced first                         | —          |
| Inbox          | /inbox           | Yes  | Unsorted/triage queue                                           | —          |
| Upcoming       | /upcoming        | Yes  | Calendar/timeline view of future tasks                          | —          |
| ProjectDetail  | /projects/:id    | Yes  | Single-project task list with sections                          | —          |
| Labels         | /labels          | Yes  | Manage labels and saved filters                                 | —          |
| TaskDetail     | /tasks/:id       | Yes  | Focused single-task view with subtasks, comments, activity      | —          |
| Completed      | /completed       | Yes  | Archive of finished tasks grouped by date with stats            | —          |
| Notifications  | /notifications   | Yes  | Reminders, mentions, due-date alerts, project invites           | —          |
| Search         | /search          | Yes  | Global search results across tasks, projects, labels, comments  | —          |
| Analytics      | /analytics       | Yes  | Productivity dashboard — completions, streaks, project velocity | —          |
| Settings       | /settings        | Yes  | Account, preferences, integrations, notifications               | —          |

## App Constraints

- Desktop shell uses a 280px fixed dark slate-800 sidebar with white "Cadence" wordmark, search input, primary nav, and a "MY PROJECTS" section with colored project dots
- Task checkboxes are 18px circles with a 2px border; completed checkboxes fill emerald-500 with a white check; completed task text uses strikethrough + opacity-60
- Priority is conveyed by a colored ring on the checkbox or a colored dot/chip: red-500 high, amber-500 medium, indigo-600 low, slate-300 none
- Project chips are inline 4px-radius pills with a colored dot prefix; labels are 4px-radius slate-100 chips with xs font
- Quick-add bar is always visible above task lists on Today / Inbox / ProjectDetail
- Date groupings (Today, Tomorrow, This week, Later) use uppercase tracking-wider headings with count chips

## Brand Colors

- Primary: `#4f46e5` (indigo-600)
- Primary Hover: `#6366f1` (indigo-500)
- Primary Dark: `#4338ca` (indigo-700)
- Accent: `#10b981` (emerald-500 — completion / success)
- Sidebar: `#1e293b` (slate-800)
- Surface: `#ffffff`
- App Background: `#f8fafc` (slate-50)
- Border: `#e2e8f0` (slate-200)
- Text Primary: `#0f172a` (slate-900)
- Text Muted: `#64748b` (slate-500)
- Priority High: `#ef4444` (red-500)
- Priority Medium: `#f59e0b` (amber-500)
- Priority Low: `#4f46e5` (indigo-600)

## Typography

- Body / Headlines / Labels: `Inter, sans-serif` (Google Fonts; weights 400, 500, 600, 700, 800)
- Numerals: `tabular-nums` for counts, dates, durations

## Layout

- Sidebar: `280px` (fixed, dark slate-800)
- Top bar: `64px`
- Content max-width: `1200px` for marketing/auth screens; full-width minus sidebar for app shell pages
- Default border-radius: `0.5rem` (8px)

## Reference

- Base design system: See `@molecule/DESIGN.md` for the complete token reference
- UIClassMap: Use `getClassMap()` from `@molecule/app-ui` — never hardcode class names
- Automation: Include `data-mol-id` on all interactive elements
