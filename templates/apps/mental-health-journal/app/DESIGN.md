# DESIGN.md — Mental Health Journal

## Brand Identity

- **App Name:** Lucid
- **Tagline:** See yourself clearly
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Gentle
- Honest
- Safe
- Reflective

## Target Persona

People practicing daily reflection, mood tracking, and gratitude journaling for mental wellness.

## Screens

| Name           | Route            | Auth | Purpose                                                                | deriveFrom |
| -------------- | ---------------- | ---- | ---------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                         | —          |
| Login          | /login           | No   | Sign in                                                                | —          |
| Signup         | /signup          | No   | Create account                                                         | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                          | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                       | Login      |
| Home           | /home            | Yes  | Today's prompt, mood check-in, recent entries                          | —          |
| Journal        | /journal         | Yes  | Entry list by date with mood and tags                                  | Home       |
| EntryComposer  | /journal/new     | Yes  | Guided entry composer with prompts and mood slider                     | Home       |
| EntryDetail    | /journal/:id     | Yes  | Read entry with mood, tags, reflections                                | Home       |
| Insights       | /insights        | Yes  | Mood trend chart, word clouds, triggers                                | Home       |
| Prompts        | /prompts         | Yes  | Prompt library and favorites                                           | Home       |
| Settings       | /settings        | Yes  | Privacy, passcode lock, reminder schedule                              | Home       |
| Calendar       | /calendar        | Yes  | Monthly mood heatmap with day previews; year-at-a-glance               | Home       |
| Profile        | /profile         | Yes  | Personal account profile, journaling stats, milestones, wellness rings | Home       |

## App Constraints

- Emotion color palette with care
- Prompt-driven entry composer
- Mood and patterns visualizations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6366f1`
- Primary Hover: `#818cf8`
- Primary Dark: `#4f46e5`
- Accent: `#a78bfa`
- Accent Hover: `#c4b5fd`
- Accent Dark: `#7c3aed`

### Semantic — Mood Spectrum

- Radiant: `#10b981`
- Radiant Light: `#d1fae5`
- Good: `#34d399`
- Good Light: `#ecfdf5`
- Neutral: `#f59e0b`
- Neutral Light: `#fef3c7`
- Low: `#f97316`
- Low Light: `#fff7ed`
- Struggling: `#ef4444`
- Struggling Light: `#fee2e2`

### Semantic — Wellness Dimensions

- Sleep: `#6366f1`
- Exercise: `#10b981`
- Social: `#f59e0b`
- Mindfulness: `#a78bfa`
- Nutrition: `#14b8a6`

### Backgrounds

- Primary: `#f8f7ff`
- Secondary: `#f0eeff`
- Tertiary: `#e8e5ff`
- Surface: `#ffffff`
- Surface Secondary: `#faf9fe`
- Journal: `#fffefb`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Tertiary: `#4b5563`
- Inverse: `#ffffff`
- Link: `#6366f1`
- Link Hover: `#4f46e5`
- Mood Label: `#374151`
- Insight: `#4f46e5`

### Borders

- Primary: `#e5e2f6`
- Secondary: `#d4d0ed`
- Focus: `#6366f1`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#c4b5fd`
- Background: `#0c0a1d`
- Surface: `#1a1735`
- Surface Secondary: `#231f4a`
- Text Primary: `#f1f0ff`
- Text Secondary: `#a5b4fc`
- Border Primary: `#312e63`
- Journal: `#1a1735`
- Mood Radiant: `#34d399`
- Mood Struggling: `#fca5a5`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Journal: `"Lora", Georgia, "Times New Roman", serif`
- Data: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes — Journal-Specific

- Journal Title: `1.5rem` (24px), weight `600`
- Journal Body: `1.0625rem` (17px), weight `400`, line-height `1.75`
- Mood Label: `0.8125rem` (13px), weight `600`, letter-spacing `0.03em`, text-transform `uppercase`
- Insight Callout: `0.9375rem` (15px), weight `500`, style `italic`
- Stat Value: `2.25rem` (36px), weight `700`
- Stat Label: `0.75rem` (12px), weight `500`, text-transform `uppercase`, letter-spacing `0.05em`

## Layout

- Content Max Width: `960px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Journal Entry Max Width: `680px` (centered, comfortable reading width)
- Timeline Item Height: `72px`
- Mood Picker Row: `5` items, evenly spaced, `56px` touch targets

## Components

### Mood Selector

- Layout: horizontal row of 5 circular buttons
- Button size: `56px` diameter
- Border radius: `full` (9999px)
- Unselected: `surface-secondary` background, `border-primary` border
- Selected: mood-color background, white icon, `md` shadow
- Transition: `normal` (300ms) scale + background
- Scale on select: `1.15`
- Icons: line-drawn face expressions (not emoji)
- Labels below each: `mood-label` typography

### Journal Entry Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Background: `journal`
- Border-left: `4px solid` mood-color
- Mood indicator: colored dot `10px` top-right
- Date: `sm` font, `secondary` text, top
- Preview: 2-line clamp, `journal` font, `tertiary` text
- Tags: pill badges below preview, `xs` font, `accent-light` background

### Mood Timeline (Dashboard)

- Chart type: area chart with gradient fill
- Line color: `primary`
- Fill: `primary` at 20% opacity, fading to transparent
- Data points: `8px` circles, `primary` fill, `white` stroke `2px`
- Hover point: scale to `12px`, show tooltip
- Y-axis: 5 mood levels with face icons
- X-axis: date labels, `xs` font, `secondary` text
- Grid lines: `border-primary` at 0.5 opacity, dashed

### Insight Card

- Border radius: `12px` (lg)
- Background: linear gradient `primary` 5% opacity to `accent` 5% opacity
- Border: `1px solid` `primary` at 15% opacity
- Padding: `16px 20px`
- Icon: `20px` sparkle/lightbulb, `accent`
- Title: `sm` font, `600` weight, `primary`
- Body: `sm` font, `400` weight, `text-tertiary`
- AI badge: `xs` pill, `accent-light` bg, `accent-dark` text, reads "AI Insight"

### Streak Counter

- Layout: horizontal bar with flame icon
- Background: `surface`
- Border radius: `full` (pill)
- Padding: `6px 16px`
- Number: `stat-value` style at `1.25rem`, `primary` color
- Label: `xs` font, `secondary` text
- Icon: `16px`, `accent` color (animated pulse on active streak)

### Wellness Dimension Ring

- Layout: concentric progress rings
- Ring thickness: `6px`
- Ring gap: `4px`
- Size: `120px` (dashboard), `200px` (detail)
- Colors: each ring uses its wellness-dimension color
- Background ring: respective color at 15% opacity
- Center: overall score, `stat-value` typography
- Labels: positioned outside ring on hover/tap

### Tag Pill

- Border radius: `full` (9999px)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `accent` at 10% opacity
- Text color: `accent-dark`
- Border: `1px solid` `accent` at 20% opacity
- Remove button: `16px` circle, visible on hover

### Prompt Card (Writing Prompt)

- Border radius: `12px` (lg)
- Background: `surface-secondary`
- Border: `1px dashed` `border-secondary`
- Padding: `16px 20px`
- Icon: `16px` pen/feather, `accent`
- Text: `base` font, `500` weight, `text-primary`
- Action: ghost button, `sm`, `primary` color, reads "Write about this"

### Encryption Badge

- Layout: inline badge in entry card header
- Icon: `12px` lock, `secondary` text color
- Font: `xs`, `secondary` color
- Tooltip: "End-to-end encrypted"

### Calendar Heatmap (Monthly Overview)

- Cell size: `32px` square (desktop), `28px` (mobile)
- Border radius: `sm` (4px)
- Gap: `4px`
- Color scale: 5 steps mapping to mood spectrum (struggling → radiant)
- Empty day: `surface-secondary`
- Today: `2px solid` `primary` border
- Hover: show mood + short note preview tooltip

### Stat Summary Row

- Layout: 3-4 cards in a row
- Card border radius: `12px` (lg)
- Card padding: `16px`
- Card background: `surface`
- Value: `stat-value` typography
- Label: `stat-label` typography
- Trend arrow: `16px`, green (up = good) or red (down)
- Sparkline: `40px` tall mini chart, `primary` color, no axes

## Navigation

- Sidebar items: Dashboard, Journal, Insights, Calendar, Settings
- Active item: `primary` at 8% opacity background, `primary` text, `3px` left border
- Icons: outlined style, `20px`, `secondary` color (active: `primary`, filled)
- Bottom item (mobile): 5-tab bar — Dashboard, Journal, + (New Entry), Insights, Calendar
- New Entry button (mobile): `48px` circle, `primary` background, white `+` icon, elevated `lg` shadow

## Animations

- Mood select: `200ms ease-out` scale bounce (1.0 → 1.15 → 1.1)
- Card appear (timeline): `300ms ease` fade-in + slide-up `8px`
- Streak flame: subtle `2s infinite` pulse animation on active streaks
- Ring progress: `800ms ease-out` draw-in on mount
- Page transition: `250ms ease` cross-fade
