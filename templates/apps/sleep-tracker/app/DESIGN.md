# DESIGN.md — Sleep Tracker

## Brand Identity

- **App Name:** Somnia
- **Tagline:** Master your nights
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Restorative, nocturnal, data-calm, supportive

## Target Persona

Sleep-conscious users tracking nightly sleep patterns, stages, and recovery metrics from wearables.

## Screens

| Name           | Route            | Auth | Purpose                                                      | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with sleep insights                           | —          |
| Login          | /login           | No   | Sign in                                                      | —          |
| Signup         | /signup          | No   | Create account                                               | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                             | Login      |
| Dashboard      | /dashboard       | Yes  | Tonight's sleep overview with stages timeline                | —          |
| Night          | /night/:date     | Yes  | Single night detail with hypnogram and metrics               | —          |
| Trends         | /trends          | Yes  | Weekly/monthly trends with charts                            | —          |
| Coaching       | /coaching        | Yes  | Insights and tips personalized to sleep patterns             | —          |
| Devices        | /devices         | Yes  | Connected wearables and sensors                              | —          |
| Settings       | /settings        | Yes  | Sleep goals, bedtime reminders, privacy                      | —          |
| NightHistory   | /history         | Yes  | Browse all past nights, filter by quality/duration           | —          |
| SmartAlarm     | /alarm           | Yes  | Configure smart alarms with wake windows, schedule, sounds   | —          |
| Profile        | /profile         | Yes  | User identity, chronotype, year-in-sleep stats, achievements | —          |
| Notifications  | /notifications   | Yes  | Multi-actor feed: alarms, coaching, devices, achievements    | —          |
| CoachingDetail | /coaching/:id    | Yes  | Single coaching program with daily lessons and progress      | —          |

## App Constraints

- Deep sleep, Light sleep, REM stages shown with distinct purple/indigo gradient tones
- Hypnogram chart is a horizontal stacked timeline with colored blocks matching stages
- Night mode UI (dark by default) respects user's sleep environment

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6c5ce7`
- Primary Hover: `#8577f0`
- Primary Dark: `#5a4bd1`
- Accent: `#f0a030`
- Accent Hover: `#f5b54d`
- Accent Dark: `#d88a18`
- Night: `#1e1b4b`
- Night Light: `#312e81`

### Semantic

- Deep Sleep: `#3730a3`
- Deep Sleep Light: `#e0e7ff`
- Light Sleep: `#818cf8`
- Light Sleep Light: `#eef2ff`
- REM: `#a78bfa`
- REM Light: `#f5f3ff`
- Awake: `#f59e0b`
- Awake Light: `#fef3c7`
- Quality Good: `#10b981`
- Quality Good Light: `#d1fae5`
- Quality Fair: `#f59e0b`
- Quality Fair Light: `#fef3c7`
- Quality Poor: `#ef4444`
- Quality Poor Light: `#fee2e2`
- Alarm Active: `#f0a030`
- Alarm Snoozed: `#94a3b8`

### Backgrounds

- Primary: `#f0f0f8`
- Secondary: `#e8e8f4`
- Surface: `#ffffff`
- Surface Secondary: `#f8f7ff`
- Sleep Chart: `#0f0d2e`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Score: `#6c5ce7`
- Duration: `#1e1b4b`
- Link: `#6c5ce7`
- Link Hover: `#5a4bd1`

### Borders

- Primary: `#e0dff0`
- Secondary: `#d0cee6`
- Focus: `#6c5ce7`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fbbf24`
- Background: `#0c0a1d`
- Surface: `#1a1744`
- Surface Secondary: `#231f52`
- Text Primary: `#f1f0ff`
- Text Secondary: `#a5a3c9`
- Border Primary: `#312e66`
- Sleep Chart: `#08061a`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Score: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Duration: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Nav Width: `240px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Sleep Stage Chart Height: `200px`
- Trend Chart Height: `280px`
- Weekly Overview Columns: `7` (desktop), `4` (tablet), `2` (mobile)

## Components

### Sleep Score Ring

- Outer diameter: `160px` (dashboard hero), `80px` (compact)
- Ring stroke width: `10px` (hero), `6px` (compact)
- Ring track color: border-primary
- Ring fill: gradient from `#6c5ce7` to `#a78bfa`
- Score text: `3rem` (hero), `1.5rem` (compact), font-weight `700`, color score
- Label text: `0.875rem`, font-weight `500`, color text-secondary
- Center alignment: score number + "/100" subscript

### Sleep Log Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` sleep-phase color (Deep Sleep/Light Sleep/REM dominant)
- Date: `0.875rem`, font-weight `600`, text-primary
- Duration: `1.5rem`, font-weight `700`, tabular-nums, text-primary
- Time range: `0.875rem`, text-secondary (e.g., "11:15 PM — 7:02 AM")
- Mini score badge: `32px` circle, primary background, white text, font-weight `700`

### Sleep Stage Bar

- Border radius: `6px`
- Height: `32px` per stage row
- Stage segments: colored blocks proportional to duration
- Deep Sleep segments: `#3730a3`
- Light Sleep segments: `#818cf8`
- REM segments: `#a78bfa`
- Awake segments: `#f59e0b`
- Gap between segments: `1px`, background-primary showing through
- Time axis: `0.75rem`, text-secondary, hourly markers

### Smart Alarm Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Alarm time: `2.25rem`, font-weight `700`, tabular-nums
- Wake window: `0.875rem`, text-secondary (e.g., "Window: 6:30 — 7:00 AM")
- Toggle: `48px` wide, `28px` tall, primary when active, border-secondary when off
- Days row: `7` circle buttons, `32px` diameter, primary-filled when selected, outline when not
- Active state: accent border-left `4px solid`, accent-light background tint

### Trend Chart Panel

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Header: title left-aligned `1rem` semibold, period selector right-aligned as pill tabs
- Period pills: `full` radius, `8px 16px` padding, primary background when active, ghost when not
- Chart area: `280px` height
- Line color: primary for score, accent for duration
- Grid lines: `1px` dashed, border-primary at `0.3` opacity
- Data point dots: `6px` diameter, primary fill, white `2px` stroke
- Tooltip: `8px` radius, night background, white text, `0.875rem`

### Sleep Hygiene Tip Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px 20px`
- Left icon area: `40px` circle, primary-light background, primary icon color
- Title: `1rem`, font-weight `600`, text-primary
- Body: `0.875rem`, line-height `1.5`, text-secondary
- Dismiss: ghost icon button, top-right, `0.75rem`
- Category badge: pill, `0.75rem`, font-weight `500`, category-specific color

### Weekly Overview Bar

- Bar width: `40px` (desktop), `32px` (mobile)
- Max bar height: `120px`
- Border radius: `6px` top
- Stacked segments (Deep/Light/REM/Awake) with `1px` gap
- Day label: `0.75rem`, text-secondary, centered below bar
- Selected day: `2px solid` primary outline around bar, primary day label
- Today indicator: `6px` dot below day label, accent color

### Notification Badge

- Position: top-right of bell icon, offset `-4px, -4px`
- Size: `18px` diameter (with count), `10px` (dot-only)
- Background: accent
- Text: `0.625rem`, font-weight `700`, white
- Border: `2px solid` surface (creates cutout effect)

### Sleep Duration Display

- Hours: `2rem`, font-weight `700`, tabular-nums, text-primary
- Minutes: `1.25rem`, font-weight `500`, tabular-nums, text-secondary
- Unit labels: `0.75rem`, font-weight `400`, text-secondary (e.g., "hr", "min")
- Layout: inline, `4px` gap between hours and minutes blocks

### Report Summary Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Stat grid: `2x2` on desktop, `1x4` on mobile
- Stat value: `1.5rem`, font-weight `700`, text-primary
- Stat label: `0.75rem`, font-weight `500`, text-secondary
- Stat trend arrow: `0.875rem`, quality-good (up) or quality-poor (down)
- Dividers: `1px solid` border-primary between grid cells
