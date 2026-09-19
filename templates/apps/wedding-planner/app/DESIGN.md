# DESIGN.md — Wedding Planner

## Brand Identity

- **App Name:** Everly
- **Tagline:** Every detail, beautifully planned
- **Logo:** Interlocked wedding rings with a champagne sparkle in public/logo.svg
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, calm, celebratory — a good wedding planner's assistant: organized, never frantic, always a little romantic

## Target Persona

Couples planning one wedding: keep the guest list, collect RSVPs through one shareable code, watch the budget, book vendors, and seat everyone — without fourteen spreadsheets and a group chat.

## Screens

| Name           | Route            | Auth | Purpose                                                                      |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------------- |
| Landing        | /                | No   | Marketing home + RSVP-code guest entrance                                    |
| Login          | /login           | No   | Sign in                                                                      |
| Signup         | /signup          | No   | Create account                                                               |
| ForgotPassword | /forgot-password | No   | Request reset                                                                |
| ResetPassword  | /reset-password  | No   | Set new password                                                             |
| Rsvp           | /rsvp/:code      | No   | Public RSVP collection — guest finds their name and answers once             |
| Dashboard      | /dashboard       | Yes  | Countdown, RSVP tally, budget gauge, task + vendor progress, RSVP share card |
| Guests         | /guests          | Yes  | Guest table — side, group, contact, RSVP status, meal, plus-ones             |
| Budget         | /budget          | Yes  | Line items with estimated vs actual, category rollups                        |
| Vendors        | /vendors         | Yes  | Vendor pipeline grouped by category                                          |
| Tasks          | /tasks           | Yes  | Dated timeline checklist with overdue styling                                |
| SeatingChart   | /seating         | Yes  | Tables with capacity + unseated pool, assign/unassign                        |
| Settings       | /settings        | Yes  | Profile, notifications, billing, password, danger zone                       |
| PlanUpdated    | /plan-updated    | Yes  | Post-subscription confirmation                                               |
| About          | /about           | No   | Product story                                                                |
| Privacy        | /privacy         | No   | Legal (modal-style shared page)                                              |
| Terms          | /terms           | No   | Legal (modal-style shared page)                                              |

## App Constraints

- The RSVP code is THE collection mechanism — never ask guests for an account or an email; the public page finds one guest by exact name and exposes nothing else
- The dashboard tally must update from public RSVP responses with no refresh ceremony (it refetches on focus/navigation)
- Seating capacity is advisory: over-capacity surfaces as a red border + badge, never a hard block
- Money is always stored and transported in cents; format at the edge with `Intl.NumberFormat`
- Headcount = confirmed "yes" guests + their confirmed plus-ones — shown, never guessed
- The headline serif (`--font-headline`) is reserved for the couple's names and the RSVP card — the working UI stays in Inter

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#9f1239` (rose-800 — white CTA text 6.7:1)
- Primary Hover: `#be123d`
- Primary Dark: `#881337`
- Secondary: `#4a044e` (deep plum)
- Accent: `#b45309` (champagne gold, amber-700 — white CTA text 4.6:1)
- Accent Hover: `#d97706`
- Accent Dark: `#92400e`

### Semantic — RSVP statuses

- Yes: `#166534` on `#dcfce7`
- No: `#b91c1c` on `#fee2e2`
- Maybe: `#6d28d9` on `#ede9fe`
- Pending: `#92400e` on `#fef3c7`

### Semantic — Vendor pipeline

- Researching: `#4b5563` on `#f3f4f6`
- Contacted: `#1e40af` on `#dbeafe`
- Booked: `#0f766e` on `#ccfbf1`
- Paid: `#92400e` on `#fef3c7`

### Backgrounds

- Background: `#fff1f2` (rose-50)
- Surface: `#ffffff`
- Surface Secondary: `#fff1f2`
- Dark background: `#190b13` (deep plum-black) with pink-300 primary `#f9a8d4`

## Typography

- UI: Inter
- Headline (couple names, RSVP/invitation surfaces): Georgia / `--font-headline` serif
- Mono (RSVP codes): JetBrains Mono, uppercase, wide tracking

## Icons

Material Symbols Outlined via the icons bond; the heart glyph (`favorite`) is the brand mark in nav/auth surfaces.
