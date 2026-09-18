# DESIGN.md — Quiz Platform

## Brand Identity

- **App Name:** Sparq
- **Tagline:** Ignite every answer
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight). The "q" is the signature letter — rendered in the accent color to evoke a lightning-bolt spark
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Playful, energetic, rewarding, witty

## Target Persona

Educators, trivia hosts, and learners creating and playing quizzes for classrooms, study groups, or game nights.

## Screens

| Name           | Route             | Auth | Purpose                                                                               | deriveFrom |
| -------------- | ----------------- | ---- | ------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home with sample quizzes                                                    | —          |
| Login          | /login            | No   | Sign in                                                                               | —          |
| Signup         | /signup           | No   | Create account                                                                        | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                                         | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                                      | Login      |
| Discover       | /discover         | Yes  | Browse quizzes by category                                                            | —          |
| QuizPlay       | /quiz/:id/play    | Yes  | Active quiz-taking view with timer                                                    | —          |
| QuizBuilder    | /quiz/:id/edit    | Yes  | Quiz editor with question bank                                                        | —          |
| MyQuizzes      | /my-quizzes       | Yes  | User's created and played quizzes                                                     | —          |
| Results        | /quiz/:id/results | Yes  | Quiz score breakdown with correct/incorrect                                           | —          |
| Leaderboard    | /leaderboard      | Yes  | Top players / scores                                                                  | —          |
| Settings       | /settings         | Yes  | Profile, preferences                                                                  | —          |
| QuizDetail     | /quiz/:id         | Yes  | Preview a quiz before playing — title, stats, creator, top players, sample questions  | —          |
| HostLobby      | /quiz/:id/lobby   | Yes  | Multiplayer pre-game lobby with join code, QR, waiting players                        | —          |
| Profile        | /u/:username      | Yes  | Public creator/player profile — banner, stats, created quizzes, achievements, streak  | —          |
| Notifications  | /notifications    | Yes  | Activity feed — quiz invites, leaderboard changes, achievements, mentions, challenges | —          |

## App Constraints

- Quiz play mode highlights correct answers emerald, incorrect red, timeout gray
- Accent gold "q" letter in Sparq wordmark — never swap
- Streak badges animate with spark pattern at accent color

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#f59e0b`
- Accent Hover: `#fbbf24`
- Accent Dark: `#d97706`

### Semantic

- Correct: `#16a34a`
- Correct Light: `#dcfce7`
- Incorrect: `#dc2626`
- Incorrect Light: `#fee2e2`
- Timeout: `#6b7280`
- Timeout Light: `#f3f4f6`
- Streak: `#f59e0b`
- Streak Light: `#fef3c7`
- First Place: `#f59e0b`
- Second Place: `#94a3b8`
- Third Place: `#d97706`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Game Board: `#7c3aed`
- Game Board Gradient End: `#4c1d95`
- Lobby: `#f5f3ff`
- Results: `#fffbeb`

### Text

- Score: `#111827`
- Score Highlight: `#f59e0b`
- Timer: `#dc2626`
- Timer Safe: `#16a34a`
- Rank: `#7c3aed`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Focus: `#7c3aed`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fbbf24`
- Background: `#0c0a1d`
- Surface: `#1a1533`
- Surface Secondary: `#241e3e`
- Game Board: `#4c1d95`
- Game Board Gradient End: `#2e1065`
- Text Primary: `#f5f3ff`
- Text Secondary: `#c4b5fd`
- Border Primary: `#3b2d6b`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Display: `"Plus Jakarta Sans", "Inter", -apple-system, sans-serif`
- Score: `"Tabular Nums", "Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Timer: `"SF Mono", SFMono-Regular, Menlo, Monaco, monospace`

## Layout

- Content Max Width: `1200px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `280px`
- Game View: full viewport, no sidebar, centered content
- Question Card Max Width: `720px`
- Answer Grid: `2x2` (desktop), `1` column (mobile)
- Answer Grid Gap: `16px`
- Leaderboard Max Width: `640px`

## Components

### Quiz Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Thumbnail aspect ratio: `16:9`
- Thumbnail border radius: `8px` (md)
- Badge (question count): primary background, white text, `9999px` radius, top-right
- Category tag: `6px` radius, muted background, secondary text, `12px` font
- Title font weight: `600`
- Meta row (author, plays): secondary text, `14px`

### Question Display

- Background: game-board gradient (Primary to Game Board Gradient End, 135deg)
- Text color: white
- Font size: `2xl` (24px) desktop, `xl` (20px) mobile
- Font weight: `600`
- Font family: Display
- Text align: center
- Padding: `48px 32px`
- Border radius: `16px` (xl)

### Answer Option Button

- Border radius: `12px` (lg)
- Height: `72px` minimum
- Padding: `16px 24px`
- Font size: `lg` (18px)
- Font weight: `500`
- Background: surface, border `2px solid` border-primary
- Hover: primary-light background, primary border
- Selected: primary background, white text
- Correct state: correct background, white text, checkmark icon
- Incorrect state: incorrect background, white text, x-mark icon
- Answer colors (fixed per position): A: `#7c3aed`, B: `#2563eb`, C: `#d97706`, D: `#16a34a`
- Answer color intensity: `15%` opacity background, full opacity left border `4px`

### Timer Bar

- Height: `6px`
- Border radius: `9999px` (full)
- Background track: `rgba(255, 255, 255, 0.2)` (on game board) / border-secondary (on surface)
- Fill: timer-safe color (>50%), accent (25-50%), timer color (<25%)
- Transition: `100ms linear` (smooth countdown)
- Pulse animation below 5 seconds: `scale(1.02)` at 500ms interval

### Timer Display

- Font family: Timer (monospace)
- Font size: `3xl` (30px)
- Font weight: `700`
- Color: timer-safe (>50%), accent (25-50%), timer (<25%)
- Format: seconds with one decimal (`12.4`)

### Score Display

- Font family: Score (tabular nums)
- Font size: `4xl` (36px) for total, `lg` (18px) for per-question
- Font weight: `700`
- Color: score-highlight (accent)
- Points earned animation: slide up + fade in, `300ms ease`
- Streak multiplier badge: streak background, bold white text, `9999px` radius

### Leaderboard Row

- Border radius: `8px` (md)
- Padding: `12px 20px`
- Rank column width: `48px`
- Top 3 ranks: colored badges (first/second/third-place colors), `9999px` radius, `32px` diameter
- Current user row: primary at `8%` opacity background, primary left border `3px`
- Score font: Score family, `600` weight, tabular nums
- Delta indicator: `+N` in correct color (green) or `-N` in incorrect (red), `14px`, `500` weight
- Hover: surface-secondary background
- Transition: background `150ms ease`

### Lobby/Join Screen

- Background: lobby color
- Join code font size: `5xl` (48px)
- Join code font weight: `700`
- Join code letter spacing: `0.15em`
- Join code font family: Timer (monospace)
- Participant avatars: `40px` circles, stacked `-8px` overlap
- Participant count badge: primary background, white text, `9999px` radius

### Streak Badge

- Background: linear gradient 135deg from streak (`#f59e0b`) to `#ef4444`
- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `sm` (14px)
- Font weight: `700`
- Text color: white
- Icon: flame, `16px`
- Animation on earn: `scale(0) -> scale(1.2) -> scale(1)`, `400ms ease-out`

### Results Summary Card

- Background: results color
- Border radius: `16px` (xl)
- Padding: `32px`
- Shadow: `lg`
- Stats grid: `3` columns (correct, accuracy, rank)
- Stat value font size: `3xl` (30px), font weight `700`
- Stat label font size: `sm` (14px), secondary text
- Dividers: `1px solid` border-primary between stats

### Category Chip

- Border radius: `9999px` (pill)
- Padding: `4px 14px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: primary at `10%` opacity
- Text color: primary
- Active/selected: primary background, white text

### Progress Indicator

- Style: segmented bar (one segment per question)
- Segment gap: `3px`
- Segment height: `4px`
- Segment border radius: `9999px`
- Unanswered: border-secondary
- Correct: correct color
- Incorrect: incorrect color
- Current: primary, pulsing opacity animation

### Search Bar

- Border radius: `12px` (lg)
- Height: `48px`
- Padding: `12px 16px 12px 44px` (icon space)
- Search icon: `20px`, secondary text color
- Placeholder: "Search quizzes, topics, creators..."
- Focus: primary border `2px`, primary shadow at `15%` opacity `0 0 0 3px`

### Navigation

- Sidebar width: `280px` (collapsed: `64px`)
- Top bar height: `64px`
- Active item: primary at `10%` opacity background, primary text, left border `3px solid` primary
- Nav icons: `20px`, secondary color, active: primary color
- Logo section padding: `20px 24px`
