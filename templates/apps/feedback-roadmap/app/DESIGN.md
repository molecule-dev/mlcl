# DESIGN.md — Feedback & Roadmap

## Brand Identity

- **App Name:** SignalLoop
- **Tagline:** Build what users ask for
- **Logo:** rounded-square iris mark with an upvote chevron inside a loop stroke (`app/public/logo.svg`)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

Direct, accountable, product-team credible. Short sentences. Commitments over promises.

## Target Persona

Product teams and their customers: users who post feature requests and vote for what
they need, and the product managers who triage that demand into a public roadmap and
changelog.

## Screens

| Name           | Route            | Auth | Purpose                                                                         | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with live top requests + signup CTA                              | —          |
| Login          | /login           | No   | Sign in                                                                         | —          |
| Signup         | /signup          | No   | Create account                                                                  | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                   | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                | Login      |
| Boards         | /boards          | No   | Public board directory grid                                                     | —          |
| BoardDetail    | /b/:slug         | No   | One board's posts, vote-sorted, with status filter chips                        | —          |
| PostDetail     | /post/:id        | No   | Request detail: vote rail, official response card, merged-into banner, comments | —          |
| Roadmap        | /roadmap         | No   | Public commitment view — Planned / In progress columns with quarter labels      | —          |
| Changelog      | /changelog       | No   | Shipped requests as dated release notes (timeline)                              | —          |
| Search         | /search          | No   | Public full-text search across posts                                            | —          |
| Pricing        | /pricing         | No   | Plan comparison                                                                 | —          |
| SubmitPost     | /submit          | Yes  | New request: title, details, board picker                                       | —          |
| MyActivity     | /my-activity     | Yes  | My votes (with shipped state) / My posts tabs                                   | —          |
| AdminDashboard | /admin           | Yes  | KPIs by status, votes-over-time bars, top open requests, recent ships           | —          |
| PostsAdmin     | /admin/posts     | Yes  | Status workflow, official response, roadmap label, merge duplicates             | —          |
| Settings       | /settings        | Yes  | Account, notifications, appearance, danger zone                                 | —          |

## App Constraints

- Every post surface carries the vote pill (chevron + count, iris when active) on the left
- Status badges are the single source of workflow truth — one token pair per status, both color schemes
- The official admin response renders in an accent-bordered card, never styled like a user comment
- Public pages never require auth; signed-out vote pills link to /login instead of dead-clicking

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides
are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary (iris): `#5046e5`
- Primary Hover: `#6a5ff0`
- Primary Dark: `#4338ca`
- Secondary (amber): `#b45309`
- Tertiary (teal): `#0f766e`
- Background: `#f7f7fc` (violet-tinted cool white)

### Status workflow

- Open: `#475569` on `#eef2f6` (slate)
- Planned: `#5046e5` on `#eeecfb` (iris)
- In progress: `#b45309` on `#fdf0e3` (amber)
- Shipped: `#15803d` on `#dcfce7` (green)
- Declined: `#be123c` on `#ffe4e9` (rose)
- Moved/merged: `#6d28d9` on `#ede9fe` (violet)

### Dark mode

Brand iris stays at the brand stop for primary CTAs; surfaces flip to a
violet-tinted near-black (`#100f1a` family) and status tokens brighten one
step (see `app/src/theme.css`).

## Typography

- Sans (UI): Inter
- Headline (shared pricing/legal pages): Georgia serif stack via `--font-headline`
- Mono: JetBrains Mono
