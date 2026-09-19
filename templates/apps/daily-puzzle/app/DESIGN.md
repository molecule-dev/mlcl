# DESIGN.md — Daily Puzzle (Lexlet)

## Brand Identity

- **App Name:** Lexlet
- **Tagline:** One word. Every day. Six tries.
- **Logo:** A 2×2 letter-tile grid (one green, one amber, two gray) tilted −6°, beside the wordmark "Lex**let**" with the final two letters in brand green
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, playful, spoiler-free. Short sentences. Streaks are 🔥, never "fire points"

## Target Persona

Word-game players who want a two-minute daily ritual: commuters, Wordle veterans, families comparing grids at breakfast.

## Screens

| Name           | Route            | Auth | Purpose                                                        | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with a static demo board                        | —          |
| Login          | /login           | No   | Sign in                                                        | —          |
| Signup         | /signup          | No   | Create account → straight into today's word                    | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                  | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                               | Login      |
| HowToPlay      | /how-to-play     | No   | Rules + tile-state explainer with a live-looking example board | —          |
| Pricing        | /pricing         | No   | Free/Pro/Family tiers                                          | —          |
| Play           | /play            | Yes  | Today's ranked puzzle — board, keyboard, share (signature)     | —          |
| ArchivePlay    | /archive/:date   | Yes  | Past day replay, marked practice                               | Play       |
| Stats          | /stats           | Yes  | Played/win-rate/streaks + guess distribution                   | —          |
| Archive        | /archive         | Yes  | Past 30 days with per-day completion status                    | —          |
| Leaderboard    | /leaderboard     | Yes  | Today's solve distribution + streak leaders                    | —          |
| Settings       | /settings        | Yes  | Profile, preferences                                           | —          |

## App Constraints

- One puzzle per UTC calendar day, identical word for every player (deterministic date-hash pick, created lazily — NO cron anywhere)
- 5-letter guesses only, 6 tries max, every guess must be in the dictionary
- Answer is never sent to an in-progress player
- Archive/past-day play is ALWAYS practice: no streak or stats effect
- Emoji share cards are built client-side from stored feedback — colors only, never the word

## Colors

### Brand

- Primary (correct tile, CTAs): `#2e7d32` light / `#43a047` dark — white text passes on both
- Secondary (present tile): `#b45309` light / `#f59e0b` dark (dark text in dark mode)
- Absent tile: `#787c7e` light / `#3a3a3c` dark, white text — the classic neutral

### Semantic

- Success `#15803d`, Warning `#92400e` (light), Danger `#dc2626`, Info `#0e7490`

### Backgrounds

- Light: `#f6f9f4` page / `#ffffff` surface / `#eef4ec` secondary
- Dark: `#0b120c` page / `#111a12` surface / `#182419` secondary — green-tinted near-blacks

### Text

- Light: `#1b2a1f` body / `#4b5b4e` muted / `#7c8a7e` faint
- Dark: `#eef5ee` body / `#a5c2a8` muted / `#7a957e` faint

### Borders

- `#d8e4d4` light / `#243526` dark

All values live in `app/src/theme.css` (`--puzzle-*`, `--mol-color-*`, `--color-*` triads). Recolor there, never in components.

## Typography

- UI: Inter (body, board letters, keyboard)
- Headlines: Georgia serif via `var(--font-headline)` — landing/about headers only
- Board tiles: bold uppercase Inter, tabular rhythm — never lowercase

## Layout

- Game screens (Play, ArchivePlay) are chromeless: logo strip + centered board (max-w-2xl) + keyboard; nothing else competes
- Everything else lives in the shared AppShellLayout (Header + Footer) with an md container

## Components

### Puzzle Board

6×5 grid of 3rem tiles; submitted rows flip in letter-by-letter (staggered 120ms rotateX transition); the active row shows typed letters; an invalid word shakes the active row (Web Animations API)

### Puzzle Keyboard

QWERTY rows, Enter + Backspace on the bottom row; letter keys show the best feedback the letter has earned (green > amber > gray); physical keyboards route through the same handler

### Game Result Panel

Post-game card: outcome line, the revealed word, streak + win rate, the guess distribution with the winning bin highlighted, Share (clipboard) + Stats/Archive/Leaderboard links

### Guess Distribution

Six horizontal bars (attempts 1–6), widths proportional to the tallest bin, counts at the bar ends; the viewer's winning attempt renders in brand green

### Share Card (text)

`Daily Puzzle #N ✅|❌ g/6` header, one emoji row per guess (🟩🟨⬛), optional `🔥 streak` footer

### Stat Card

Number over uppercase micro-label, card surface — used ×4 on Stats (Played, Win rate, Current streak, Max streak)

### Archive Row

Date + puzzle number left; status chip right (Solved in N / Missed / Not played); whole row links to the practice game

### Streak Leader Row

Medal (🥇🥈🥉 or rank), name, "N max · N now" streak summary

## Navigation

- Landing nav: How it works · Streaks & stats · Leaderboard · Pricing · Sign in · Get started
- Game screens: logo → /, Stats link, practice badge when practice
- App pages: Stats · Archive · Leaderboard · Settings via Header/UserMenu
