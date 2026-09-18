# DESIGN.md — AI Code Review Tool

## Brand Identity

- **App Name:** Refract
- **Tagline:** Code in a new light
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Sharp, thoughtful, developer-focused, supportive

## Target Persona

Software engineers and tech leads reviewing pull requests with AI assistance to catch bugs and improve quality.

## Screens

| Name              | Route            | Auth | Purpose                                                                                                                          | deriveFrom |
| ----------------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing           | /                | No   | Marketing home with GitHub-connect hero, diff animation, features, pricing                                                       | —          |
| Login             | /login           | No   | Centered card with dark GitHub Sign In button and email option                                                                   | —          |
| Signup            | /signup          | No   | Create account                                                                                                                   | Login      |
| ForgotPassword    | /forgot-password | No   | Request reset                                                                                                                    | Login      |
| ResetPassword     | /reset-password  | No   | Set new password                                                                                                                 | Login      |
| Dashboard         | /dashboard       | Yes  | Sidebar with repos, top bar, PR summary cards grid with score circles and status badges, recent reviews list                     | —          |
| PullRequestDetail | /prs/:id         | Yes  | File tree left, diff viewer center with green/red line backgrounds, review panel right with AI comments and severity ...         | —          |
| Repositories      | /repos           | Yes  | Sidebar, list of connected repositories with integration status, sync buttons, last-reviewed timestamps                          | —          |
| ReviewHistory     | /history         | Yes  | Sidebar, table of past reviews with PR titles, scores, reviewer, status, date                                                    | —          |
| RulesEditor       | /rules           | Yes  | Sidebar, rule builder with category sections (security, performance, style), toggle switches, severity sliders                   | —          |
| Settings          | /settings        | Yes  | Sidebar, settings panels (integrations, API keys, team, notifications), save button                                              | —          |
| RepositoryDetail  | /repos/:id       | Yes  | Single repo overview — health metrics, recent PRs, contributors, hotspots, tabs for PRs/Reviews/Rules/Settings                   | —          |
| Reports           | /reports         | Yes  | Analytics dashboard — code quality trends, issue distribution, top repos, reviewer performance, issue heatmap, scheduled reports | —          |
| Notifications     | /notifications   | Yes  | Activity feed — mentions, replies, AI critical alerts, PR events with filter rail                                                | —          |
| Search            | /search          | Yes  | Global search results across PRs, files, comments, rules with grouped sections and dark code-snippet previews                    | —          |
| Profile           | /profile         | Yes  | User profile — identity, badges, review stats, activity timeline, linked accounts, streak grid, API key card                     | —          |
| NotFound          | *                | No   | 404 — sharp developer-tool error screen with Refract wordmark, terminal-style 404 message, home/search CTAs                      | Login      |

## App Constraints

- Diff viewer uses dark #1e1e2e code block with green/red line backgrounds
- Score cards use circular progress rings with color-mapped values (green/yellow/red)
- All code snippets use JetBrains Mono

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Approved: `#16a34a`
- Approved Light: `#dcfce7`
- Changes Requested: `#ea580c`
- Changes Requested Light: `#fff7ed`
- Critical: `#dc2626`
- Critical Light: `#fee2e2`
- Suggestion: `#7c3aed`
- Suggestion Light: `#f5f3ff`
- Score High: `#16a34a`
- Score Medium: `#eab308`
- Score Low: `#dc2626`
- Diff Added: `#dcfce7`
- Diff Added Border: `#86efac`
- Diff Removed: `#fee2e2`
- Diff Removed Border: `#fca5a5`
- Diff Highlight: `#fef9c3`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Code Block: `#1e1e2e`
- Code Gutter: `#181825`
- Sidebar: `#f8f7fc`
- Review Panel: `#fefefe`

### Text

- Code: `#c6d0f5`
- Code Comment: `#626880`
- Code Keyword: `#ca9ee6`
- Code String: `#a6d189`
- Code Function: `#8caaee`
- Code Number: `#ef9f76`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`
- Score: `#111827`

### Borders

- Code Block: `#313244`
- Review Thread: `#e9e5f5`
- File Tree: `#e5e7eb`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#22d3ee`
- Background: `#11111b`
- Surface: `#1e1e2e`
- Surface Secondary: `#181825`
- Code Block: `#11111b`
- Code Gutter: `#0d0d14`
- Sidebar: `#181825`
- Text Primary: `#cdd6f4`
- Text Secondary: `#a6adc8`
- Border Primary: `#313244`
- Review Thread: `#313244`

## Typography

### Font Families

- UI: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Score: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes

- Code: `0.8125rem` (13px)
- Code Line Number: `0.75rem` (12px)
- Review Comment: `0.875rem` (14px)
- Score Large: `2.25rem` (36px)
- Score Label: `0.75rem` (12px)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12`
- Dashboard Gap: `24px`
- Sidebar Width: `280px` (collapsed: `56px`)
- File Tree Width: `260px`
- Review Panel Width: `420px`
- Code Editor Min Height: `400px`
- Diff View Split: `50% / 50%` (side-by-side), `100%` (unified)
- Top Bar Height: `48px`

## Components

### Score Card

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Score circle diameter: `80px`
- Score circle stroke width: `6px`
- Score circle colors: high → score-high, medium → score-medium, low → score-low
- Score font: score family, `2.25rem`, weight `700`
- Label font: `0.75rem`, weight `500`, text-secondary, uppercase, letter-spacing `0.05em`
- Breakdown bars: `4px` height, `8px` border-radius, stacked horizontal

### Diff Viewer

- Font family: code
- Font size: `0.8125rem` (13px)
- Line height: `1.6`
- Line number width: `56px`
- Line number color: text-secondary
- Line number font size: `0.75rem`
- Added line background: diff-added
- Added line border-left: `3px solid` diff-added-border
- Removed line background: diff-removed
- Removed line border-left: `3px solid` diff-removed-border
- Highlight background: diff-highlight
- Gutter background: code-gutter
- Code background: code-block
- Border radius: `8px` (md) on container
- Scrollbar: `8px` width, surface-secondary track, border-primary thumb

### Review Comment

- Border radius: `8px` (md)
- Border: `1px solid` review-thread
- Padding: `16px`
- Nested indent: `24px` left margin
- Author avatar: `28px` circle
- Author name font weight: `600`
- Timestamp font size: `0.75rem`, text-secondary
- Severity badge: pill shape, font size `0.6875rem` (11px), weight `600`
- Severity colors: critical (critical bg, white text), suggestion (suggestion bg, white text), info (accent bg, white text)
- AI indicator: `16px` icon, accent color, next to author name
- Code snippet inside comment: code font, `0.8125rem`, code-block background, `8px` padding, `4px` border-radius

### File Tree

- Width: file-tree-width
- Item height: `32px`
- Item padding: `4px 8px 4px` + indent-level * `16px`
- Font size: `0.8125rem` (13px)
- Font family: code
- Icon size: `16px`
- Hover background: surface-secondary
- Selected background: suggestion-light
- Selected border-left: `2px solid` primary
- Status indicators: `8px` circle, right-aligned
- Status colors: approved (approved), changes-requested (changes-requested), pending (text-secondary)
- Collapse chevron: `12px`, text-secondary

### Score Breakdown Table

- Header background: surface-secondary
- Header font weight: `600`
- Header font size: `0.75rem`, uppercase, letter-spacing `0.05em`
- Cell padding: `12px 16px`
- Category font weight: `500`
- Score cell: tabular-nums, weight `600`
- Inline bar: `100px` max width, `6px` height, `3px` border-radius
- Bar colors: mapped to score-high / score-medium / score-low based on value
- Row border: `1px solid` border-primary
- Border radius: `8px` (md) on container

### Webhook Event Card

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` (color by event type: push → primary, pr → accent, review → approved)
- Event type badge: pill, `0.6875rem`, weight `600`
- Timestamp: `0.75rem`, text-secondary, right-aligned
- Payload preview: code font, `0.8125rem`, truncated single line, code-block background, `4px 8px` padding, `4px` border-radius
- Hover: shadow `sm`

### PR Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Title font: `1rem`, weight `600`
- Repository label: `0.75rem`, text-secondary, code font
- Status badge: pill shape
- Status colors: open (approved), merged (primary), closed (critical), draft (text-secondary)
- Stats row: font-variant-numeric tabular-nums, `0.8125rem`, spaced `16px` apart
- Stats icons: `14px`, text-secondary
- AI score mini-circle: `32px` diameter, `3px` stroke, inline with stats

### AI Explanation Panel

- Border radius: `12px` (lg)
- Background: surface-secondary
- Padding: `20px`
- Header: accent icon `20px` + "AI Analysis" label, weight `600`
- Body font: `0.875rem`, line-height `1.65`
- Code references: code font, primary color, underline on hover, clickable
- Confidence indicator: `4px` tall bar, full width, gradient from score-low through score-medium to score-high
- Section dividers: `1px solid` border-primary, `16px` vertical margin

### GitHub Auth Button

- Border radius: `8px` (md)
- Height: `44px`
- Background: `#24292f`
- Text: `#ffffff`, weight `500`
- GitHub icon: `20px`, left of text, `8px` gap
- Hover background: `#32383f`
- Focus ring: `2px solid` primary, `2px` offset
