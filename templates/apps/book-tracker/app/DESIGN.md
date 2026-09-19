# DESIGN.md — Book Tracker

## Brand Identity

- **App Name:** Pagebound
- **Tagline:** Track every page you turn.
- **Logo:** Two stacked book spines mark (teal + deep teal) + text wordmark in the heading font
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, well-read, a little wry; encouraging without quotas or guilt

## Target Persona

Readers who want a permanent record of their reading life — shelves that reflect reality, a challenge that flexes around a slow month, and reviews worth rereading a year later.

## Screens

| Name           | Route            | Auth | Purpose                                              | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with shelf story + signup CTA         | —          |
| Login          | /login           | No   | Sign in                                              | —          |
| Signup         | /signup          | No   | Create account                                       | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                        | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                     | Login      |
| Dashboard      | /dashboard       | Yes  | Currently reading + challenge ring + recent activity | —          |
| Books          | /books           | Yes  | All shelves with search + shelf filter               | —          |
| BookDetail     | /books/:id       | Yes  | My status/progress/rating/review + reading log       | —          |
| AddBook        | /books/new       | Yes  | Manual entry — title/author/cover/pages/genres/shelf | —          |
| Challenge      | /challenge       | Yes  | Yearly goal, progress ring, pace indicator           | —          |
| Reviews        | /reviews         | Yes  | Feed of written reviews with star ratings            | —          |
| Stats          | /stats           | Yes  | Books/month, genres, ratings distribution, heatmap   | —          |
| Settings       | /settings        | Yes  | Profile, reading rules, reminders, devices, account  | —          |
| Notifications  | /notifications   | Yes  | Challenge milestones, finished books, stalled nudges | —          |
| Profile        | /profile         | Yes  | Public identity card + recent reviews                | —          |

## Colors

- Primary: `#0f766e` (deep teal)
- Secondary: `#b45309` (library amber)
- Hero gradient: `#115e59 → #92400e` (teal-800 → amber-800, white-text safe)
- Achievement/rating gold: `#d97706`
- Background: `#faf9f7` warm paper; dark mode warm `#171512`

## Cover styles

Generated covers (no image assets) — gradient stops in `theme.css` as `--color-cover-*`:
teal, amber, wine, indigo, forest, slate, plum, clay. `BookCover` renders spine + serif title.

## Typography

- Headlines: Georgia / Iowan Old Style serif (`--font-headline`) — the bookish signature
- Body/UI: Inter

## Component notes

- `ChallengeHeroCard` — gradient hero with progress ring + weekly-pages sparkline (Dashboard, Challenge, Landing-adjacent)
- `ReadingProgressRow` — cover + progress bar + inline page-log quick action (Dashboard)
- `BookCover` — spine-and-title generated cover, 3 sizes, used everywhere a book renders
- `ReviewCard` / `Stars` — rating display + review quote block (Reviews, Profile, BookDetail)
- `ReadingStatsTriad` — finished/pages/rating stat cards (Dashboard, Stats)
