# DESIGN.md — Sports League

## Brand Identity

- **App Name:** Pennant
- **Tagline:** Chase the standing
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Competitive, tribal, statistic-rich, broadcast-flavored

## Target Persona

League organizers, coaches, players, and fans tracking standings, schedules, and stats across seasons.

## Screens

| Name           | Route            | Auth | Purpose                                                           | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with league hero                                   | —          |
| Login          | /login           | No   | Sign in                                                           | —          |
| Signup         | /signup          | No   | Create account                                                    | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                     | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                  | Login      |
| Standings      | /standings       | Yes  | League standings table with W/L records                           | —          |
| Teams          | /teams           | Yes  | Team directory with logos                                         | —          |
| TeamDetail     | /teams/:id       | Yes  | Team page with roster, stats, schedule                            | —          |
| Matches        | /matches         | Yes  | Upcoming and recent match schedule                                | —          |
| MatchDetail    | /matches/:id     | Yes  | Single match with box score and play-by-play                      | —          |
| PlayerDetail   | /players/:id     | Yes  | Player profile with season stats                                  | —          |
| Settings       | /settings        | Yes  | Account, favorite teams, notifications                            | —          |
| Dashboard      | /dashboard       | Yes  | League hub: scoreboard ticker, today's games, my teams, top stats | —          |
| Players        | /players         | Yes  | Roster directory across all teams with stats and filters          | —          |
| Stats          | /stats           | Yes  | League leaderboards, top scorers, statistical leaders by category | —          |
| Schedule       | /schedule        | Yes  | Calendar view of fixtures across the season                       | —          |
| Profile        | /profile         | Yes  | Public fan profile with favorite teams, predictions, activity     | —          |
| Notifications  | /notifications   | Yes  | Score updates, trade alerts, injury reports, league announcements | —          |

## App Constraints

- Win/Loss/Draw pills use emerald/red/muted semantic colors consistently
- Stats tables use tabular-nums with perfect right-alignment for W-L-D records
- Team colors appear as accent left border on rows and team cards

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0e7490`
- Primary Hover: `#22d3ee`
- Primary Dark: `#0c4a6e`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f172a`
- Navy Light: `#1e293b`

### Semantic

- Win: `#10b981`
- Win Light: `#d1fae5`
- Loss: `#ef4444`
- Loss Light: `#fee2e2`
- Draw: `#6b7280`
- Draw Light: `#f3f4f6`
- Live: `#f59e0b`
- Live Light: `#fef3c7`
- Upcoming: `#0e7490`
- Upcoming Light: `#cffafe`
- Final: `#64748b`

### Backgrounds

- Primary: `#f0f9ff`
- Secondary: `#e0f2fe`
- Tertiary: `#dbeafe`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Scoreboard: `#0f172a`
- Standings: `#f8fafc`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Score: `#0f172a`
- Score Highlight: `#0e7490`
- Team Name: `#1e293b`
- Stat Label: `#94a3b8`
- Stat Value: `#0f172a`
- Link: `#0e7490`
- Link Hover: `#0c4a6e`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Divider: `#f1f5f9`
- Focus: `#0e7490`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Scoreboard: `#020617`
- Text Primary: `#f8fafc`
- Text Secondary: `#94a3b8`
- Score Highlight: `#22d3ee`
- Border Primary: `#1e293b`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Score: `"JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, monospace` (font-variant-numeric: tabular-nums)
- Stat: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Weights

- Score: `800`
- Team Name: `600`
- Stat Value: `700`
- Stat Label: `400`
- Standing Rank: `700`

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `16px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Scoreboard Bar Height: `64px`
- Schedule Column Width: `320px`
- Standings Table Max Width: `800px`
- Stat Card Min Width: `200px`

## Components

### Scoreboard Ticker

- Background: navy (`#0f172a`)
- Text: inverse white
- Height: `64px`
- Game card width: `220px`
- Game card gap: `12px`
- Score font: score family, `1.5rem`, weight `800`
- Team abbreviation font: body, `0.875rem`, weight `600`
- Live indicator: pulsing dot, live color (`#f59e0b`), `8px` diameter
- Status badge: uppercase, `0.625rem`, weight `700`, letter-spacing `0.05em`
- Border radius: `8px` per game card
- Horizontal scroll with fade edges

### Match Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Team row height: `40px`
- Team logo size: `28px`
- Score font: score family, `1.25rem`, weight `800`
- Winning team score: score-highlight color
- Losing team score: secondary text
- Status strip: `3px` left border — live (live color), final (final color), upcoming (upcoming color)
- Date/time: `0.75rem`, secondary text, uppercase

### Standings Table

- Header background: navy (`#0f172a`), text inverse white
- Header font: `0.75rem`, weight `600`, uppercase, letter-spacing `0.05em`
- Row height: `52px`
- Rank column width: `48px`
- Rank font: stat family, weight `700`
- Team column: logo `24px` + name, weight `600`
- Stat columns: stat family, tabular-nums, `0.875rem`
- Win column: win color text
- Loss column: loss color text
- Playoff line: `2px dashed` accent color between qualifying/non-qualifying positions
- Alternating rows: surface / surface-secondary
- Current user's team: `2px left border` primary, surface-secondary background
- Hover: subtle primary tint background

### Schedule Calendar

- Day cell min height: `100px`
- Game entry height: `32px`
- Game entry border radius: `6px`
- Game entry padding: `4px 8px`
- Today highlight: primary light background, `2px` primary border
- Past games: reduced opacity `0.7`
- Font size: `0.75rem`
- Month nav: `1.25rem` heading, weight `600`

### Team Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `20px`
- Logo size: `56px`
- Team name: `1.125rem`, weight `700`
- Record display: stat family, `0.875rem`, weight `600`
- Win-loss bar: `4px` height, rounded full, gradient from win to loss color proportional to record
- Roster preview: stacked avatar circles, `32px`, max 5 visible + overflow count

### Stat Widget

- Border radius: `12px` (lg)
- Padding: `20px`
- Value font: stat family, `2rem`, weight `800`
- Label font: `0.75rem`, weight `500`, uppercase, letter-spacing `0.05em`, stat-label color
- Trend indicator: small arrow icon + percentage, win (up) or loss (down) color
- Sparkline: `40px` height, primary color stroke, `2px` width

### Live Game Panel

- Border: `2px solid` live color
- Border radius: `12px` (lg)
- Padding: `24px`
- Header: pulsing live badge + game clock in score font
- Score: score family, `3rem`, weight `800`
- Play-by-play feed: scrollable, `0.8125rem`, alternating subtle backgrounds
- Quarter/period tabs: pill style, `8px` radius

### Notification Toast

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `12px 16px`
- Left accent border: `4px solid` — score update (primary), trade alert (accent), injury (loss color)
- Icon: `20px`, matching accent color
- Title: `0.875rem`, weight `600`
- Body: `0.8125rem`, secondary text
- Auto-dismiss: `5000ms` with progress bar

### Player Row

- Height: `48px`
- Avatar: `32px`, rounded full
- Name: `0.875rem`, weight `600`
- Position badge: `0.625rem`, uppercase, pill shape, navy background, inverse text
- Stats: stat family, tabular-nums, `0.875rem`, right-aligned columns
- Hover: surface-secondary background

### League Leaderboard

- Rank change indicator: up arrow (win color) / down arrow (loss color) / dash (draw color)
- Top 3 ranks: accent-tinted background, `2px left border` accent
- Points column: weight `800`, primary color
- Trend sparkline: `60px` wide, `24px` height

### Search Overlay

- Overlay: `rgba(15, 23, 42, 0.6)` (navy-tinted)
- Container: `600px` max width, `12px` radius, `xl` shadow
- Input height: `56px`, `1.125rem` font
- Result categories: teams / players / games — grouped with `0.625rem` uppercase labels
- Keyboard hints: `0.75rem`, muted badges for arrow keys / enter / esc
