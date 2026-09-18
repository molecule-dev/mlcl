# DESIGN.md — Flashcard App

## Brand Identity

- **App Name:** Engram
- **Tagline:** Knowledge that sticks
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Studious, encouraging, calm, focused

## Target Persona

Students and lifelong learners memorizing vocabulary, formulas, and concepts using spaced repetition.

## Screens

| Name           | Route                             | Auth | Purpose                                          | deriveFrom |
| -------------- | --------------------------------- | ---- | ------------------------------------------------ | ---------- |
| Landing        | /                                 | No   | Marketing home                                   | —          |
| Login          | /login                            | No   | Sign in                                          | —          |
| Signup         | /signup                           | No   | Create account                                   | Login      |
| ForgotPassword | /forgot-password                  | No   | Request reset                                    | Login      |
| ResetPassword  | /reset-password                   | No   | Set new password                                 | Login      |
| Dashboard      | /dashboard                        | Yes  | Due cards, streaks, deck cards                   | —          |
| Decks          | /decks                            | Yes  | Browse and manage decks                          | —          |
| Study          | /study/:deckId                    | Yes  | Flashcard flip + spaced repetition answer        | —          |
| Stats          | /stats                            | Yes  | Review heatmap, streak, progress                 | —          |
| Settings       | /settings                         | Yes  | Profile, study prefs                             | —          |
| DeckDetail     | /decks/:deckId                    | Yes  | View and manage all cards inside a single deck   | —          |
| CardNew        | /decks/:deckId/cards/new          | Yes  | Create a new flashcard with live preview         | —          |
| CardEdit       | /decks/:deckId/cards/:cardId/edit | Yes  | Edit an existing flashcard                       | CardNew    |
| SessionSummary | /study/:deckId/summary            | Yes  | Post-session recap, accuracy, streak, next steps | —          |

## App Constraints

- Flashcards MUST render content in serif font (Source Serif 4) — not Inter
- Study session shows 4 answer buttons (Again, Hard, Good, Easy) with interval hints
- Streak counter is prominent on dashboard — uses amber reward color

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6d28d9`
- Primary Hover: `#7c3aed`
- Primary Dark: `#5b21b6`
- Accent: `#d97706`
- Accent Hover: `#f59e0b`
- Accent Dark: `#b45309`

### Semantic

- Mastered: `#059669`
- Mastered Light: `#d1fae5`
- Learning: `#2563eb`
- Learning Light: `#dbeafe`
- New: `#7c3aed`
- New Light: `#ede9fe`
- Due: `#dc2626`
- Due Light: `#fee2e2`
- Again: `#dc2626`
- Hard: `#ea580c`
- Good: `#059669`
- Easy: `#0891b2`
- Streak: `#d97706`
- Streak Light: `#fef3c7`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Study Area: `#f5f3ff`
- Sidebar: `#faf5ff`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Card Front: `#1e1b4b`
- Card Back: `#374151`
- Stat Value: `#6d28d9`
- Link: `#6d28d9`
- Link Hover: `#5b21b6`

### Borders

- Primary: `#e5e7eb`
- Card: `#e9d5ff`
- Focus: `#7c3aed`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fbbf24`
- Background: `#0c0a1d`
- Surface: `#1a1636`
- Surface Secondary: `#231e42`
- Study Area: `#1a1636`
- Text Primary: `#f5f3ff`
- Text Secondary: `#a5b4fc`
- Border Primary: `#312e81`
- Card Border: `#4c1d95`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Card Content: `"Source Serif 4", Georgia, "Times New Roman", serif`
- Stat: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Shortcut Key: `"SF Mono", "Fira Code", "Cascadia Code", monospace`

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Study Card Max Width: `640px`
- Study Card Min Height: `320px`
- Stats Panel Width: `300px`
- Top Bar Height: `56px`

## Components

### Flashcard

- Border radius: `16px` (xl)
- Shadow: `md`, flipped: `lg`
- Min height: `320px`
- Max width: `640px`
- Padding: `32px`
- Border: `1px solid` card-border
- Front font: card-content family, `1.5rem`, weight `500`
- Back font: card-content family, `1.25rem`, weight `400`
- Flip transition: `500ms` cubic-bezier(0.4, 0, 0.2, 1), 3D transform
- Background: surface (light), surface (dark)
- Text alignment: center, vertically centered via flexbox

### Answer Buttons

- Layout: horizontal row, evenly spaced below the card
- Border radius: `8px` (md)
- Height: `44px`
- Font weight: `600`
- Font size: `sm` (14px)
- Again: solid error background
- Hard: solid `#ea580c` background
- Good: solid `#059669` background
- Easy: solid `#0891b2` background
- Each button shows next interval as secondary text below the label
- Interval text: `xs` (12px), weight `400`, 60% opacity

### Deck Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` (color matches deck's assigned color)
- Title font: `1.125rem`, weight `600`
- Counts row: three inline badges (new / learning / due)
- Progress bar: `4px` height, border-radius full, below counts
- Progress segments: mastered (green), learning (blue), new (purple)

### Study Progress Bar

- Height: `6px`
- Border radius: `9999px` (full)
- Background: background-tertiary
- Fill: primary gradient from `#6d28d9` to `#a78bfa`
- Transition: `300ms ease` width change

### Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Value font: stat family, `2.25rem` (4xl), weight `700`, stat-value color
- Label font: `0.875rem` (sm), weight `500`, text-secondary
- Icon: `24px`, primary color, top-right or inline-left
- Variants: `default`, `accent` (amber value color for streaks)

### Keyboard Shortcut Hint

- Border radius: `6px`
- Background: `#f3f4f6` (light), `#374151` (dark)
- Border: `1px solid` border-secondary
- Padding: `2px 6px`
- Font: shortcut-key family, `xs` (12px), weight `500`
- Shadow: `0 1px 0 0 rgba(0, 0, 0, 0.08)` (subtle key-cap effect)
- Display: inline next to action labels (e.g., "Flip `Space`", "Good `3`")

### Search Bar

- Border radius: `9999px` (pill)
- Height: `40px`
- Border: `1px solid` border-primary, focus: `2px solid` focus
- Padding: `8px 16px 8px 40px` (left-padded for search icon)
- Icon: `18px`, text-secondary color
- Placeholder text: `"Search decks and cards..."`, text-secondary
- Background: surface (light), surface-secondary (dark)

### Sidebar Deck List

- Active item: `#ede9fe` background (light), `#312e81` background (dark)
- Active text: primary color
- Hover: surface-secondary background
- Item padding: `10px 16px`
- Item font: `0.875rem` (sm), weight `500`
- Deck color dot: `8px` circle, inline before title
- Nested indent: `16px` per level (for sub-decks)

### Stats Chart

- Bar/line color: primary
- Secondary series: accent
- Grid lines: `1px solid` border-primary, dashed
- Axis labels: `xs` (12px), text-secondary
- Tooltip: border-radius `8px`, shadow `lg`, padding `8px 12px`
- Heatmap: 5-tier scale from `#ede9fe` to `#6d28d9`

### Review Session Summary

- Border radius: `16px` (xl)
- Shadow: `md`
- Padding: `32px`
- Stat grid: `2x2` on desktop, `1` column on mobile
- Celebration icon: `48px`, accent color (shown on streak milestones)
- "Study Again" button: full-width, primary, `48px` height

### Tags / Labels

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: new-light (purple), learning-light (blue), mastered-light (green)
- Text: matching semantic color at full saturation
