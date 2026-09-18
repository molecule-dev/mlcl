# DESIGN.md — Workout Tracker

## Brand Identity

- **App Name:** Forja
- **Tagline:** Forge your strongest self
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Energetic, focused, motivating, confident

## Target Persona

Dedicated lifters and strength athletes who log every set, care about progressive overload, and want a purpose-built app instead of a generic fitness tracker.

## Screens

| Name             | Route               | Auth | Purpose                                                      | deriveFrom |
| ---------------- | ------------------- | ---- | ------------------------------------------------------------ | ---------- |
| Landing          | /                   | No   | Marketing home with value props and signup CTA               | —          |
| Login            | /login              | No   | Sign in                                                      | —          |
| Signup           | /signup             | No   | Create account                                               | Login      |
| ForgotPassword   | /forgot-password    | No   | Request reset                                                | Login      |
| ResetPassword    | /reset-password     | No   | Set new password                                             | Login      |
| Dashboard        | /dashboard          | Yes  | Weekly overview, streak, next workout, stats summary         | —          |
| ActiveWorkout    | /workout/active     | Yes  | Live set-logging screen with rest timer                      | —          |
| Exercises        | /exercises          | Yes  | Browseable exercise library by muscle group                  | —          |
| ExerciseDetail   | /exercises/:id      | Yes  | Exercise detail with progression chart and history           | —          |
| History          | /history            | Yes  | Calendar heat map plus workout history list                  | —          |
| Templates        | /templates          | Yes  | Saved workout templates                                      | —          |
| TemplateEditor   | /templates/:id/edit | Yes  | Drag-drop template builder with per-exercise set/rep schemas | —          |
| WorkoutDetail    | /history/:id        | Yes  | Past workout breakdown — sets, PRs, total volume, duration   | —          |
| BodyMeasurements | /measurements       | Yes  | Bodyweight log, body measurements, progress photo timeline   | —          |
| PersonalRecords  | /records            | Yes  | All-time PR leaderboard across every tracked lift            | —          |
| Settings         | /settings           | Yes  | Units, notifications, account, integrations                  | —          |

## App Constraints

- Numeric values (weights, reps, timers) always render in tabular-num variant so columns align
- Primary orange (#e05030) is reserved for progress, CTAs, timers and PR callouts; it is never used as a large background fill
- Every authenticated screen uses the shared shell (left sidebar + top bar + main content) — ActiveWorkout additionally shows the sticky bottom active-workout banner

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#e05030`
- Primary Hover: `#f06848`
- Primary Dark: `#b83820`
- Accent: `#1a1a2e`
- Accent Hover: `#2d2d44`
- Accent Dark: `#10101e`

### Semantic

- PR (Personal Record): `#f5a623`
- PR Light: `#fef3cd`
- Volume Up: `#22c55e`
- Volume Down: `#ef4444`
- Rest Timer: `#6366f1`
- Rest Timer Light: `#e0e7ff`
- Missed Set: `#9ca3af`
- Streak Active: `#f5a623`
- Streak Inactive: `#d1d5db`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#fafafa`
- Workout Active: `#fef7f5`
- Set Row Completed: `#f0fdf4`
- Set Row Current: `#fff7ed`

### Text

- Weight Value: `#111827`
- Rep Count: `#111827`
- Unit Label: `#9ca3af`
- Timer: `#e05030`
- Link: `#e05030`
- Link Hover: `#b83820`

### Borders

- Set Divider: `#f0f0f0`

### Dark Theme Overrides

- Primary: `#f07050`
- Accent: `#2d2d54`
- Background: `#0a0a14`
- Surface: `#16162a`
- Surface Secondary: `#1e1e36`
- Workout Active: `#1a1018`
- Set Row Completed: `#0a1a10`
- Set Row Current: `#1a1408`
- Text Primary: `#f0f0f4`
- Text Secondary: `#a0a0b4`
- Border Primary: `#2a2a40`
- Timer: `#f07050`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Numeric: `"Inter", "Tabular Nums", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Timer: `"SF Mono", SFMono-Regular, Menlo, Consolas, monospace`

## Layout

- Content Max Width: `960px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Sidebar Width: `260px`
- Sidebar Collapsed: `64px`
- Active Workout Panel Max Width: `640px`
- Calendar Cell Size: `40px`
- Chart Height: `280px` (desktop), `200px` (mobile)

## Components

### Exercise Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px`
- Header: exercise name `lg` bold left, muscle group badge right
- Collapsed state shows last-performed summary (weight x reps)
- Expand/collapse with `150ms ease` transition
- Drag handle: `6px` wide, left edge, `#d1d5db` dots

### Set Row

- Height: `48px`
- Border radius: `8px` (md)
- Layout: set number (fixed `32px`), previous (muted, `80px`), weight input (`96px`), reps input (`72px`), check button (`40px`)
- Completed row: `set-row-completed` background, primary checkmark
- Current row: `set-row-current` background, subtle left border `3px solid` primary
- Swipe-to-delete on mobile: red background reveal

### Weight/Rep Input

- Border radius: `8px` (md)
- Height: `40px`
- Font size: `lg` (18px)
- Font weight: `600`
- Text align: center
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Numeric keypad on mobile (inputmode="decimal")
- Unit label (`kg`/`lbs`) inside input, right-aligned, muted

### Rest Timer

- Border radius: `full` (pill)
- Size: `64px` diameter (inline), full-width banner when expanded
- Font family: timer (monospace)
- Font size: `2xl` (24px)
- Color: rest-timer when active, muted when idle
- Circular progress ring: `4px` stroke, rest-timer color
- Tap to start/pause, long-press to reset

### PR Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Background: pr-light
- Text color: `#92600a`
- Font size: `xs` (12px)
- Font weight: `600`
- Icon: flame or trophy, `14px`
- Appears inline next to the set that broke the record

### Progress Chart

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Line stroke: `2.5px`, primary color
- Data point dot: `6px` diameter, white fill, primary stroke
- Grid lines: `#f0f0f0` (dark: `#2a2a40`), `1px` dashed
- Axis labels: `xs` (12px), text-secondary
- Tooltip: accent background, inverse text, `8px` radius, `sm` shadow
- Time range pills: `full` radius, `sm` padding, primary when active

### Workout History Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Header: workout name `base` semibold, date `sm` muted right-aligned
- Body: condensed exercise list (name + top set), `4px` vertical gap
- Footer: total volume `sm` semibold, duration `sm` muted
- Duration badge: `full` radius, surface-secondary background

### Calendar Heat Map

- Cell size: `40px` (desktop), `32px` (mobile)
- Cell radius: `8px` (md)
- Gap: `4px`
- Intensity levels (0-4): `#f0f0f0`, `#fddccc`, `#f5a078`, `#e05030`, `#8b2010`
- Dark intensity levels: `#1e1e36`, `#3a1a14`, `#6a2818`, `#e05030`, `#f07050`
- Today indicator: `2px solid` primary, no fill
- Selected day: primary background, inverse text

### Exercise Search

- Border radius: `full` (pill)
- Height: `48px`
- Padding: `8px 20px`
- Icon: search, `20px`, text-secondary
- Dropdown: `12px` radius, `lg` shadow, max-height `320px` with scroll
- Result row: `48px` height, exercise name left, muscle group badge right
- Recent searches section: muted header, `xs` font

### Muscle Group Badge

- Border radius: `full` (pill)
- Padding: `2px 8px`
- Font size: `xs` (12px)
- Font weight: `500`
- Color-coded by group:
  - Chest: `#ef4444` bg `#fee2e2`
  - Back: `#3b82f6` bg `#dbeafe`
  - Legs: `#22c55e` bg `#dcfce7`
  - Shoulders: `#f59e0b` bg `#fef3c7`
  - Arms: `#8b5cf6` bg `#ede9fe`
  - Core: `#ec4899` bg `#fce7f3`
  - Cardio: `#06b6d4` bg `#cffafe`

### Notification Toast

- Border radius: `12px` (lg)
- Shadow: `lg`
- Padding: `12px 16px`
- PR notification: pr-light background, flame icon, bold exercise name
- Streak notification: streak-active icon, day count emphasized
- Slide-in from top, `300ms ease` transition

### Stats Summary Row

- Layout: horizontal scroll on mobile, grid on desktop
- Card padding: `16px`
- Stat value: `2xl` (24px), bold, text-primary
- Stat label: `xs` (12px), text-secondary, uppercase, `0.05em` letter-spacing
- Trend arrow: volume-up (green, up) or volume-down (red, down), `16px`
- Divider between cards: `1px solid` border-primary (desktop only)

### Workout Template Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px`
- Header: template name `base` semibold, exercise count badge
- Exercise preview list: max `4` items, muted overflow indicator ("+3 more")
- Start button: primary, full width, `48px` height
- Long-press to edit/duplicate/delete (context menu)

### Active Workout Banner

- Position: sticky bottom
- Height: `56px`
- Background: accent
- Text: inverse, `sm` semibold
- Shows: workout name, elapsed time (timer font), exercise count
- Tap to expand active workout
- Slide-up from bottom, `300ms ease`
