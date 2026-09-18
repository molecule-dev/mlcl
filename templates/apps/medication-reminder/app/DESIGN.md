# DESIGN.md — Medication Reminder

## Brand Identity

- **App Name:** Capsiva
- **Tagline:** Every dose, on time
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Caring
- Reliable
- Clear
- Reassuring

## Target Persona

Patients and caregivers managing multiple medications with strict dosing schedules.

## Screens

| Name             | Route            | Auth | Purpose                                                                                                   | deriveFrom |
| ---------------- | ---------------- | ---- | --------------------------------------------------------------------------------------------------------- | ---------- |
| Landing          | /                | No   | Marketing home                                                                                            | —          |
| Login            | /login           | No   | Sign in                                                                                                   | —          |
| Signup           | /signup          | No   | Create account                                                                                            | Login      |
| ForgotPassword   | /forgot-password | No   | Request reset                                                                                             | Login      |
| ResetPassword    | /reset-password  | No   | Set new password                                                                                          | Login      |
| Dashboard        | /dashboard       | Yes  | Today's doses timeline, adherence streak, refill warnings                                                 | —          |
| Medications      | /medications     | Yes  | Medication list with schedule, dose, refills                                                              | —          |
| AddMedication    | /medications/new | Yes  | Add a medication with dose, schedule, reminders                                                           | —          |
| MedicationDetail | /medications/:id | Yes  | Medication details with adherence history                                                                 | —          |
| Schedule         | /schedule        | Yes  | Weekly schedule grid with all dose times                                                                  | —          |
| Caregivers       | /caregivers      | Yes  | Share schedule with caregivers/family                                                                     | —          |
| Settings         | /settings        | Yes  | Notifications, pharmacy, emergency contacts                                                               | —          |
| Profile          | /profile         | Yes  | Personal & medical identity (name, DOB, allergies, conditions, emergency contact, security)               | —          |
| Notifications    | /notifications   | Yes  | Activity feed: dose reminders, missed doses, refill alerts, caregiver requests, streak achievements       | —          |
| AdherenceReport  | /reports         | Yes  | Detailed adherence analytics — weekly/monthly charts, streaks, per-medication breakdown, missed doses log | —          |
| Refills          | /refills         | Yes  | Refill management — pill counts, refill-by dates, pharmacy info, request refill action, refill history    | —          |

## App Constraints

- Large type for readability
- Status-first dose cards (taken/missed/upcoming)
- Visual pill icons with color coding

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#06b6d4`
- Primary Dark: `#0e7490`
- Accent: `#f97316`
- Accent Hover: `#fb923c`
- Accent Dark: `#ea580c`

### Semantic

- Dose Taken: `#16a34a`
- Dose Taken Light: `#dcfce7`
- Dose Missed: `#dc2626`
- Dose Missed Light: `#fee2e2`
- Dose Upcoming: `#eab308`
- Dose Upcoming Light: `#fef9c3`
- Dose Skipped: `#6b7280`
- Dose Skipped Light: `#f3f4f6`
- Refill Alert: `#ea580c`
- Refill Alert Light: `#fff7ed`
- Adherence High: `#16a34a`
- Adherence Medium: `#eab308`
- Adherence Low: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa`
- Schedule Strip: `#ecfeff`

### Text

- Price: n/a
- Adherence Value: `#111827`
- Time Label: `#6b7280`
- Medication Name: `#0f172a`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#fb923c`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#162032`
- Schedule Strip: `#164e63`
- Adherence Value: `#f1f5f9`
- Time Label: `#94a3b8`

## Typography

### Font Families

- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Stats: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-variant-numeric: tabular-nums)
- Medication Label: `"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (weight: 600)

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `12`
- Stats Row Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Medication List Sidebar Width: `300px` (collapsed: `0px` on mobile)
- Schedule Timeline Width: `100%` of content area
- Top Bar Height: `56px`
- Bottom Nav Height (mobile): `64px`

## Components

### Medication Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Left border: `4px solid` — color-coded per medication category (e.g., cardiovascular `#ef4444`, vitamins `#f59e0b`, antibiotics `#3b82f6`, hormones `#a855f7`, pain relief `#ec4899`)
- Content: medication name (semibold, base), dose + unit (secondary text, sm), frequency badge (pill, xs), next dose time (accent color, medium weight), mini adherence bar (4px tall, 100px wide)
- Swipe actions (mobile): swipe right = mark taken (primary bg), swipe left = skip (secondary bg)

### Schedule Timeline

- Orientation: vertical, top = earliest time
- Time markers: left-aligned, `sm` font, `time-label` color, every 1-hour increment
- Dose nodes: `40px` circles, centered on timeline axis
  - Taken: `dose-taken` fill, white checkmark icon
  - Missed: `dose-missed` fill, white X icon
  - Upcoming: `dose-upcoming` fill, white clock icon
  - Skipped: `dose-skipped` fill, white dash icon
- Connecting line: `2px solid` border-secondary, dashed between time gaps > 4 hours
- Active/current time indicator: `accent` colored horizontal rule, full width, `1px solid`

### Adherence Ring

- Shape: SVG circular progress arc
- Sizes: `120px` (dashboard hero), `64px` (card inline), `32px` (compact/list)
- Stroke width: `8px` (hero), `6px` (inline), `4px` (compact)
- Track color: `#e5e7eb`
- Fill color: adherence-high / adherence-medium / adherence-low based on percentage
- Center text: percentage in `stats` font, bold
  - Hero: `2xl` font
  - Inline: `lg` font
  - Compact: hidden (tooltip instead)
- Animation: `500ms ease` fill on mount

### Dose Action Button

- Border radius: `9999px` (pill)
- Height: `48px`
- Min touch target: `48px × 48px`
- **Take:** primary solid background, white text, weight `600`
- **Skip:** ghost variant, secondary border, secondary text
- **Snooze:** accent outline, accent text
- **Undo:** ghost variant, `sm` size, appears for 8 seconds after take/skip
- Icon: `20px`, left of label, `8px` gap

### Refill Alert Banner

- Border radius: `8px` (md)
- Background: `refill-alert-light`
- Border-left: `4px solid refill-alert`
- Padding: `12px 16px`
- Icon: capsule/pill outline, `20px`, refill-alert color
- Title: `sm`, semibold, `#0f172a`
- Subtitle: `xs`, secondary text ("X doses remaining — refill by [date]")
- Action: text button, `sm`, primary color, right-aligned

### Adherence Report Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Chart types:
  - **Weekly:** horizontal bar chart, one bar per day, colored by adherence level
  - **Monthly:** area chart with gradient fill (primary → transparent), dots on data points
  - **Streak counter:** large number (`4xl`, bold), label below (`sm`, secondary text)
- Grid lines: `1px dashed` border-secondary
- Axis labels: `xs` font, secondary text, tabular-nums
- Legend: inline pills, `xs` font, dot indicators (`8px` circles)

### Notification Preference Row

- Height: `56px`
- Padding: `0 16px`
- Layout: icon (`24px`, secondary) + label (base, medium) + toggle switch (right-aligned)
- Toggle track: `40px × 24px`, border-radius full, off = `#d1d5db`, on = primary
- Toggle thumb: `20px` circle, white, shadow `sm`
- Divider: `1px solid` border-primary between rows

### Medication Form

- Section spacing: `24px`
- Input groups: label (`sm`, semibold) above input, `4px` gap
- Time picker: custom styled, `48px` height, primary border on focus
- Frequency selector: segmented control (pill-shaped), primary active state
- Color picker (category): row of `32px` circles, `3px solid white` ring on selected, shadow `sm`
- Save button: full width, `48px`, primary solid, bottom-fixed on mobile with `16px` padding + safe area inset
