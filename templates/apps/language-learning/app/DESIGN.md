# DESIGN.md — Language Learning

## Brand Identity

- **App Name:** Parlance
- **Tagline:** Speak the world fluently
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Playful
- Encouraging
- Confident
- Rhythmic

## Target Persona

Adult learners studying a new language through daily lessons, vocab drills, and speaking practice.

## Screens

| Name           | Route            | Auth | Purpose                                                               | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                        | —          |
| Login          | /login           | No   | Sign in                                                               | —          |
| Signup         | /signup          | No   | Create account                                                        | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                         | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                      | Login      |
| Dashboard      | /dashboard       | Yes  | Daily streak, XP, lesson recommendations, friend leaderboard          | —          |
| Lessons        | /lessons         | Yes  | Browse lessons by level and topic                                     | Dashboard  |
| LessonDetail   | /lessons/:id     | Yes  | Interactive lesson with fill-in-the-blank, audio, pronunciation check | Dashboard  |
| Vocabulary     | /vocabulary      | Yes  | Personal vocab list with SRS review                                   | Dashboard  |
| Practice       | /practice        | Yes  | Speaking and listening practice sessions                              | Dashboard  |
| Leaderboard    | /leaderboard     | Yes  | Friends leaderboard by XP this week                                   | Dashboard  |
| Profile        | /profile         | Yes  | Learner profile with language progress                                | Dashboard  |
| Settings       | /settings        | Yes  | Target language, daily goal, notifications                            | Dashboard  |

## App Constraints

- Streak counters and XP visible on dashboard
- Lesson cards with progress dots
- Speaking practice UI with waveform

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6c3ce0`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#5b21b6`
- Accent: `#f59e0b`
- Accent Hover: `#fbbf24`
- Accent Dark: `#d97706`

### Semantic

- Correct: `#16a34a`
- Correct Light: `#dcfce7`
- Incorrect: `#dc2626`
- Incorrect Light: `#fee2e2`
- Streak: `#f97316`
- Streak Light: `#fff7ed`
- XP: `#eab308`
- XP Light: `#fef9c3`
- Mastery: `#6c3ce0`
- Mastery Light: `#ede9fe`
- Locked: `#9ca3af`
- Locked Light: `#f3f4f6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f5f3ff`
- Lesson: `#faf5ff`
- Exercise: `#ffffff`

### Text

- Price: `#111827`
- Streak Count: `#ea580c`
- XP Count: `#ca8a04`
- Level Label: `#6c3ce0`
- Hint: `#7c3aed`
- Link: `#6c3ce0`
- Link Hover: `#5b21b6`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fbbf24`
- Streak: `#fb923c`
- Background: `#0c0a1a`
- Surface: `#1a1630`
- Surface Secondary: `#231e42`
- Text Primary: `#f0eeff`
- Text Secondary: `#a8a0c8`
- Border Primary: `#2e2854`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Exercise: `"Inter", -apple-system, sans-serif` (font-weight: 600 for prompts)
- Script: `"Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Sans Arabic", sans-serif` (multilingual fallback for lesson content)

## Layout

- Content Max Width: `960px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Width: `260px`
- Lesson Content Width: `640px` (centered, focused reading)
- Exercise Max Width: `560px` (centered)
- Progress Bar Height: `8px`
- Skill Tree Node Size: `72px`

## Components

### Lesson Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Left accent bar: `4px solid` (color matches skill category)
- Progress indicator: bottom bar, `4px` height, primary fill
- Locked state: `0.5` opacity, locked color border, lock icon overlay
- Font size: `lg` for title, `sm` for meta (lesson count, duration)

### Skill Node

- Size: `72px` circle
- Border: `4px solid` (color by mastery level)
- Shadow: `md`
- Mastery levels: Locked (`#9ca3af`), Started (`#6c3ce0`), Practiced (`#8b5cf6`), Mastered (`#eab308` with glow)
- Mastered glow: `0 0 0 4px rgba(234, 179, 8, 0.2)`
- Active pulse animation: `2s ease infinite` scale 1.0-1.05
- Connected by `2px` dashed lines in skill tree

### Exercise Panel

- Border radius: `16px` (xl)
- Shadow: `lg`
- Padding: `32px`
- Max width: `560px`, centered
- Prompt font size: `xl`, weight `600`
- Option buttons: `12px` radius, `48px` min height, `16px` padding
- Correct state: correct border, correct-light background, checkmark icon
- Incorrect state: incorrect border, incorrect-light background, shake animation `300ms`

### Word Tile (drag-and-drop sentence building)

- Border radius: `8px` (md)
- Border: `2px solid #d0d0d0`
- Padding: `8px 14px`
- Font size: `base`, weight `500`
- Background: `#ffffff`
- Active drag: `md` shadow, slight rotation `2deg`, primary border
- Placed state: primary-light background, primary border
- Drop zone: `2px dashed` border-secondary, `48px` min height

### Streak Badge

- Border radius: `9999px` (pill)
- Background: streak-light
- Border: `2px solid` streak
- Padding: `6px 14px`
- Font weight: `700`
- Fire icon: `20px`, inline before count
- Milestone animation: `500ms` scale bounce at 7, 30, 100, 365 days

### XP Counter

- Font family: body
- Font variant: `tabular-nums`
- Font weight: `700`
- Color: xp-count
- Star icon: `16px`, accent fill, inline before value
- Gain animation: `+N` floats up and fades over `800ms ease-out`

### Progress Ring

- Size: `48px` (sm), `80px` (md), `120px` (lg)
- Stroke width: `6px`
- Track color: `#e5e7eb`
- Fill color: primary (gradient to accent at 100%)
- Center text: percentage, font weight `700`
- Completion: accent fill, checkmark replaces percentage

### Leaderboard Row

- Border radius: `12px` (lg)
- Padding: `12px 16px`
- Top 3 highlight: accent-light background
- Rank badge: `28px` circle, `700` weight
- Rank 1: `#eab308` background, Rank 2: `#9ca3af`, Rank 3: `#cd7f32`
- Current user: primary-light background, `2px solid` primary border
- XP aligned right, tabular-nums

### Speech Button

- Size: `56px` circle
- Background: primary
- Icon: microphone, `24px`, white
- Active/recording: `accent` background, pulse ring animation `1.5s infinite`
- Pulse ring: `0 0 0 8px rgba(245, 158, 11, 0.3)`
- Disabled: locked color, `0.5` opacity

### Hearts / Lives Display

- Heart size: `24px`
- Filled: `#ef4444`
- Empty: `#d1d5db`
- Lose animation: heart shrinks to `0` over `400ms ease-in`, color fades
- Refill animation: scale `0` to `1.2` to `1` over `500ms ease-out`

### Daily Goal Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Border: `1px solid` border-primary
- Progress bar: `8px` height, `9999px` radius, primary fill
- Completed state: correct-light background, correct border, checkmark
- Goal text: `sm`, secondary text color
- XP earned: `lg`, `700` weight, xp-count color
