# DESIGN.md — CI/CD Dashboard

## Brand Identity

- **App Name:** Conduit
- **Tagline:** Ship with certainty
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Technical, reliable, focused, terminal-forward

## Target Persona

Platform engineers and DevOps teams monitoring builds, deployments, and environments across many repositories.

## Screens

| Name             | Route               | Auth | Purpose                                                                                                                                     | deriveFrom |
| ---------------- | ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing          | /                   | No   | Marketing home with pipeline visualization, dark terminal aesthetic, features, pricing                                                      | —          |
| Login            | /login              | No   | Centered card with emerald primary on dark background                                                                                       | —          |
| Signup           | /signup             | No   | Create account                                                                                                                              | Login      |
| ForgotPassword   | /forgot-password    | No   | Request reset                                                                                                                               | Login      |
| ResetPassword    | /reset-password     | No   | Set new password                                                                                                                            | Login      |
| Pipelines        | /pipelines          | Yes  | Dashboard with sidebar, list of running/recent pipelines, status badges, branch chips, durations, realtime indicator                        | —          |
| PipelineDetail   | /pipelines/:id      | Yes  | Pipeline header, stage graph, expandable build steps with logs, right panel with artifacts/commit/coverage                                  | —          |
| Environments     | /environments       | Yes  | Cards for each environment (Production, Staging, Preview) with current deployment, status, traffic, deploy history                          | —          |
| Artifacts        | /artifacts          | Yes  | List/grid of build artifacts with file type icons, sizes, download links, retention badges                                                  | —          |
| Settings         | /settings           | Yes  | Account, repositories, webhooks, secrets, team members                                                                                      | —          |
| Repositories     | /repositories       | Yes  | Index of all monitored source repos with build status, default branch, language, recent build sparkline                                     | —          |
| RepositoryDetail | /repositories/:slug | Yes  | Single repo with Overview/Branches/Pipelines/Settings tabs, recent pipelines, branches list, .conduit.yml preview, webhooks, stats          | —          |
| Insights         | /insights           | Yes  | DORA-style analytics dashboard: deploy frequency, lead time, change failure rate, MTTR, success-rate chart, slowest steps, activity heatmap | —          |
| Notifications    | /notifications      | Yes  | Activity feed of pipeline events, deploys, mentions, and review requests across all watched repositories                                    | —          |

## App Constraints

- Dark mode IS the default UI — all product pages use the deep navy `#0c0e14` / `#161926` surface palette
- Emerald primary `#10b981` used for pass states, primary CTAs, and the live realtime indicator
- Build logs and all code identifiers (SHAs, branches, durations, file paths) use JetBrains Mono; labels use Inter

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#10b981`
- Primary Hover: `#34d399`
- Primary Dark: `#059669`
- Accent: `#6366f1`
- Accent Hover: `#818cf8`
- Accent Dark: `#4f46e5`

### Semantic

- Pipeline Running: `#3b82f6`
- Pipeline Running Light: `#dbeafe`
- Pipeline Queued: `#8b5cf6`
- Pipeline Queued Light: `#ede9fe`
- Pipeline Passed: `#10b981`
- Pipeline Passed Light: `#d1fae5`
- Pipeline Failed: `#ef4444`
- Pipeline Failed Light: `#fee2e2`
- Pipeline Cancelled: `#6b7280`
- Pipeline Cancelled Light: `#f3f4f6`
- Pipeline Skipped: `#a1a1aa`
- Coverage High: `#10b981`
- Coverage Medium: `#f59e0b`
- Coverage Low: `#ef4444`

### Backgrounds

- Primary: `#0c0e14`
- Secondary: `#12151e`
- Tertiary: `#1a1e2e`
- Surface: `#161926`
- Surface Secondary: `#1e2235`
- Input: `#1a1e2e`
- Log Viewer: `#0a0c10`
- Overlay: `rgba(0, 0, 0, 0.7)`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#10b981`
- Link Hover: `#34d399`
- Log Default: `#cbd5e1`
- Log Error: `#fca5a5`
- Log Warning: `#fcd34d`
- Log Info: `#93c5fd`
- Log Success: `#6ee7b7`
- Log Timestamp: `#475569`

### Borders

- Primary: `#1e293b`
- Secondary: `#334155`
- Focus: `#10b981`

### Dark Theme Overrides

Dark theme IS the default. Light theme overrides:

- Primary: `#059669`
- Background: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f1f5f9`
- Text Primary: `#0f172a`
- Text Secondary: `#475569`
- Border Primary: `#e2e8f0`
- Log Viewer: `#f8fafc`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Log: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Font Usage

- All UI labels, navigation, headings: Body font
- Build logs, terminal output, commit SHAs, branch names, file paths, durations, YAML configs: Mono font
- Log viewer: Log font at `13px` with `1.6` line height

## Layout

- Content Max Width: `1440px`
- Pipeline List Columns: `1` (full-width rows)
- Dashboard Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `16px`
- Sidebar Width: `260px` (collapsed: `56px`)
- Top Bar Height: `48px`
- Log Viewer Line Height: `20px`
- Log Viewer Gutter Width: `60px` (line numbers)
- Build Step Panel Width: `320px` (right panel in log view)

## Components

### Pipeline Row

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Hover: surface-secondary background
- Status indicator: `10px` circle, left-aligned, color matches pipeline state
- Running indicator: pulsing animation on the status circle, `1.5s` ease-in-out infinite
- Layout: status icon | branch + commit | duration | timestamp | trigger avatar
- Commit SHA: mono font, `12px`, truncated to 7 chars, secondary text color
- Branch name: mono font, `13px`, `4px` radius background chip in surface-secondary

### Pipeline Detail Header

- Background: surface
- Border-bottom: `1px solid` border-primary
- Padding: `16px 24px`
- Pipeline title: `18px` semibold
- Commit message: `14px` secondary text, mono font for SHA
- Metadata row: branch, trigger, duration, started-at — `13px`, spaced `24px` apart

### Build Step

- Border radius: `6px`
- Background: transparent, hover: `rgba(255, 255, 255, 0.03)`
- Padding: `8px 12px`
- Border-left: `3px solid` — color matches step status
- Collapsed height: `40px`
- Expanded: reveals log output below
- Step name: `14px` medium weight
- Duration: mono font, `12px`, right-aligned, secondary text
- Chevron: `16px`, rotates 90deg on expand, `150ms` transition

### Log Viewer

- Background: log-viewer background
- Font: log font, `13px`
- Line numbers: gutter-width, right-aligned, log-timestamp color, `1px solid` border-primary right border
- Line padding: `0 12px`
- Error lines: log-error text, `rgba(239, 68, 68, 0.08)` background
- Warning lines: log-warning text
- Ansi color support: map standard 16 ANSI colors to theme-appropriate values
- Search highlight: `#f59e0b` background at `0.3` opacity, active match at `0.6` opacity
- Auto-scroll: pinned to bottom when following, unpins on manual scroll-up
- Wrap toggle: off by default, horizontal scroll with `overflow-x: auto`

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`
- Font weight: `500`
- Variants:
  - Running: pipeline-running background at `0.15` opacity, pipeline-running text
  - Passed: pipeline-passed background at `0.15` opacity, pipeline-passed text
  - Failed: pipeline-failed background at `0.15` opacity, pipeline-failed text
  - Queued: pipeline-queued background at `0.15` opacity, pipeline-queued text
  - Cancelled: pipeline-cancelled background at `0.15` opacity, pipeline-cancelled text

### Duration Display

- Font: mono, `13px`
- Color: secondary text
- Format: `1m 23s` (under 1h), `1h 5m` (over 1h), `< 1s` (sub-second)
- Running: increment in realtime, pipeline-running text color

### Artifact Card

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- File icon: `20px`, color by file type (`.zip` = accent, `.log` = secondary, `.xml` = pipeline-running)
- File size: mono font, `12px`, secondary text
- Download button: ghost variant, primary color, `32px` height

### Coverage Bar

- Height: `6px`
- Border radius: `9999px`
- Background: tertiary
- Fill: coverage-high / coverage-medium / coverage-low based on percentage
- Thresholds: >= 80% high, >= 50% medium, < 50% low
- Label: mono font, `13px`, right-aligned

### Branch Chip

- Border radius: `4px`
- Background: surface-secondary
- Padding: `2px 8px`
- Font: mono, `12px`
- Color: secondary text
- Icon: git branch icon, `12px`, left of text

### Trigger Avatar

- Size: `24px` (inline), `32px` (detail view)
- Border radius: `9999px`
- Border: `2px solid` surface (creates separation from background)
- Fallback: first initial, accent background, inverse text

### YAML Config Viewer

- Font: mono, `13px`
- Background: log-viewer background
- Border radius: `8px`
- Padding: `16px`
- Syntax highlighting:
  - Keys: `#7dd3fc` (sky-300)
  - Strings: `#6ee7b7` (emerald-300)
  - Numbers: `#fcd34d` (amber-300)
  - Comments: `#475569` (slate-600)
  - Booleans: `#c4b5fd` (violet-300)

### Notification Toast

- Border radius: `8px`
- Background: surface
- Border: `1px solid` border-primary
- Border-left: `4px solid` — color matches notification type
- Shadow: `lg`
- Padding: `12px 16px`
- Auto-dismiss: `5s` for success, `8s` for error, persistent for action-required
- Pipeline status change: includes pipeline name, branch, and new status badge

### Sidebar Navigation

- Width: `260px`, collapsed: `56px`
- Background: secondary background
- Active item: `rgba(16, 185, 129, 0.1)` background, primary text, `3px` left border primary
- Section headers: `11px` uppercase, `600` weight, tertiary text, `24px` top margin
- Badge counts: pill, `18px` height, mono font, `11px`
- Sections: Pipelines, Environments, Artifacts, Settings

### Search / Command Palette

- Trigger: `/` key or `Cmd+K`
- Border radius: `12px`
- Background: surface
- Border: `1px solid` border-secondary
- Shadow: `xl`
- Width: `560px`, centered
- Input height: `48px`, mono font for filter queries
- Result groups: Pipelines, Branches, Commits — separated by `1px` border, group label `11px` uppercase
- Result item: `40px` height, status dot + name + branch chip + age
- Keyboard navigation: arrow keys, enter to select, esc to close

### Realtime Indicator

- Dot: `8px` circle, pipeline-running color
- Animation: pulse `2s` ease-in-out infinite (scale 1 to 1.5, opacity 1 to 0)
- Label: `12px`, "Live" text next to dot, pipeline-running color
- Position: top-right of pipeline list header when any pipeline is running
