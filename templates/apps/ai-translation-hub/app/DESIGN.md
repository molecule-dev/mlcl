# DESIGN.md — AI Translation Hub

## Brand Identity

- **App Name:** Rendition
- **Tagline:** Meaning without borders
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, bridging, thoughtful, nuanced

## Target Persona

Translators, localization managers, and content teams translating documents between languages with AI assistance.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                                                              | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with language pair demo, indigo-pink palette, features, pricing                                                                                       | —          |
| Login          | /login           | No   | Centered card with indigo primary                                                                                                                                    | —          |
| Signup         | /signup          | No   | Create account                                                                                                                                                       | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                                                                        | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                                                                     | Login      |
| Dashboard      | /dashboard       | Yes  | Sidebar, project list with progress bars, language pair badges, word counts, deadline chips                                                                          | —          |
| Translate      | /translate/:id   | Yes  | Sidebar, 50/50 split pane: source pane left (gray bg, Source Serif 4), target pane right (purple bg, Source Serif 4),...                                             | —          |
| Projects       | /projects        | Yes  | Sidebar, project cards grid with status badges, team member avatars, language pairs, progress bars                                                                   | —          |
| Glossary       | /glossary        | Yes  | Sidebar, terminology table with source/target/domain/notes columns, add term button, category filters                                                                | —          |
| Memory         | /memory          | Yes  | Sidebar, translation memory list with fuzzy match scores, source+target pairs, context snippets                                                                      | —          |
| Settings       | /settings        | Yes  | Sidebar, language preferences, team, API integrations                                                                                                                | —          |
| ProjectDetail  | /projects/:id    | Yes  | Sidebar, project overview with files table, recent activity timeline, team card, progress donut, target language progress bars                                       | —          |
| NewProject     | /projects/new    | Yes  | Sidebar, three-step stepper, document upload zone, source/target language pickers, deadline, AI assistance mode                                                      | —          |
| Review         | /review          | Yes  | Sidebar, segment review queue (left list + diff pane + comments panel) with side-by-side diff, TM matches, approve/reject actions                                    | —          |
| Profile        | /profile         | Yes  | Sidebar, profile hero with avatar + language pairs, stat grid (segments / accept rate / projects / words), specializations, recent projects, certifications, reviews | —          |
| Notifications  | /notifications   | Yes  | Sidebar, activity feed grouped by day, filter tabs (All / Mentions / Reviews / Comments / Deadlines / Projects), notification preferences sidebar                    | —          |
| Team           | /team            | Yes  | Sidebar, team member table with role pills + language pair chips, invite member, pending invites, roles & permissions reference                                      | —          |
| Billing        | /billing         | Yes  | Sidebar, current plan banner, usage meters (words / projects / seats), plan comparison cards, invoices table, payment method                                         | —          |

## App Constraints

- Source/Target split panes are 50/50 with draggable divider
- Source pane uses #f8fafc bg, target pane uses #faf5ff bg
- Source Serif 4 used for document panes at 17px with 1.75 line-height

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6366f1`
- Primary Hover: `#818cf8`
- Primary Dark: `#4f46e5`
- Accent: `#f472b6`
- Accent Hover: `#f9a8d4`
- Accent Dark: `#db2777`

### Semantic

- Source Text: `#64748b`
- Source Light: `#f1f5f9`
- Target Text: `#6366f1`
- Target Light: `#eef2ff`
- Confidence High: `#10b981`
- Confidence High Light: `#d1fae5`
- Confidence Medium: `#f59e0b`
- Confidence Medium Light: `#fef3c7`
- Confidence Low: `#ef4444`
- Confidence Low Light: `#fee2e2`
- Approved: `#10b981`
- Pending Review: `#f59e0b`
- Needs Revision: `#f472b6`
- Machine Translated: `#8b5cf6`
- Human Reviewed: `#06b6d4`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Editor: `#fefefe`
- Source Pane: `#f8fafc`
- Target Pane: `#faf5ff`

### Text

- Primary: `#1e1b4b`
- Secondary: `#64748b`
- Source: `#334155`
- Target: `#312e81`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Borders

- Primary: `#e2e8f0`
- Pane Divider: `#cbd5e1`
- Focus: `#6366f1`

### Dark Theme Overrides

- Primary: `#a5b4fc`
- Accent: `#f9a8d4`
- Background: `#0c0a1d`
- Surface: `#1e1b4b`
- Surface Secondary: `#262350`
- Source Pane: `#1a1840`
- Target Pane: `#201d4a`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`
- Pane Divider: `#475569`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Document: `"Source Serif 4", Georgia, "Times New Roman", serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Font Usage

- All UI chrome (nav, buttons, labels, badges): Body font
- Source and target document panes: Document font at `1.0625rem` (17px), line-height `1.75`
- Translation memory matches and glossary terms: Mono font at `0.875rem` (14px)

## Layout

- Content Max Width: `1600px`
- Dashboard Grid Columns: `12`
- Sidebar Width: `280px` (collapsed: `64px`)
- Source/Target Split: `50% / 50%` (adjustable via drag handle)
- Pane Divider Width: `4px` (draggable, primary color on hover)
- Translation Editor Min Height: `calc(100vh - 128px)`
- Project List Grid: `3` columns (desktop), `2` (tablet), `1` (mobile)
- Review Panel Width: `360px` (slide-in from right)

## Components

### Translation Editor

- Split pane layout: source (left) + target (right)
- Source pane background: source-pane
- Target pane background: target-pane
- Segment rows: alternating `transparent` / `surface-secondary`, `16px` vertical padding
- Active segment: `2px` left border in primary, surface background
- Segment number: mono font, `12px`, secondary text, `32px` width column
- Font: document font, `17px`, line-height `1.75`
- Segment hover: subtle `surface-secondary` background

### Confidence Indicator

- Inline bar: `4px` height, `48px` width, rounded `full`
- Colors: high (`#10b981`), medium (`#f59e0b`), low (`#ef4444`)
- Tooltip on hover showing percentage and explanation
- Segment-level: `3px` left border on the target segment

### Project Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Header: project name in `600` weight, `1.125rem`
- Language pair badge: pill shape, `source → target` with arrow icon
- Progress bar: `6px` height, rounded `full`, primary fill
- Stats row: segments translated, words, last activity — `0.75rem`, secondary text
- Status badge: top-right corner, colored per status

### Language Pair Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `0.75rem` (12px)
- Font weight: `500`
- Background: target-light
- Text: target-text
- Arrow separator: `→` in secondary text
- Source flag + Target flag (emoji or small SVG, `16px`)

### Document Upload Card

- Border: `2px dashed` border-primary, `12px` radius
- Hover border: primary color, `2px dashed`
- Padding: `48px` vertical, `24px` horizontal, center-aligned
- Icon: `48px` upload cloud icon in secondary text
- Accepted formats badge row: `.docx`, `.pdf`, `.xliff`, `.json`, `.html` — pill badges in surface-secondary
- Drag-active state: primary-light background, primary border solid

### Review Comment

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `3px solid` (accent for suggestions, error for corrections, success for approvals)
- Author avatar: `28px` circle
- Timestamp: `0.75rem`, secondary text
- Suggestion diff: inline, red strikethrough for removed, green underline for added
- Accept/Reject buttons: `28px` height, ghost variant

### Translation Memory Match

- Border radius: `8px` (md)
- Padding: `12px`
- Background: surface-secondary
- Match percentage badge: `pill`, font-weight `700`
  - 100%: success background, success-dark text
  - 85–99%: confidence-high-light background, `#065f46` text
  - 70–84%: confidence-medium-light background, `#92400e` text
  - Below 70%: confidence-low-light background, `#991b1b` text
- Source/target text: document font, `0.875rem`
- Diff highlighting: `#fef08a` background for changed words

### Glossary Term Popover

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `16px`
- Max width: `320px`
- Term: mono font, `600` weight, primary color
- Definition: body font, `0.875rem`, normal weight
- Usage examples: italic, secondary text, `0.8125rem`
- Approved indicator: small green dot + "Approved" in `0.75rem`

### Status Badges

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `0.75rem` (12px)
- Font weight: `600`
- Draft: `#f1f5f9` background, `#475569` text
- In Progress: `#eef2ff` background, `#4f46e5` text
- In Review: `#fdf4ff` background, `#a21caf` text
- Approved: `#d1fae5` background, `#065f46` text
- Published: `#cffafe` background, `#0e7490` text

### Export Menu

- Border radius: `12px` (lg)
- Shadow: `lg`
- Padding: `8px`
- Items: `40px` height, `8px` radius on hover
- Format icons: `20px`, left-aligned
- Formats: XLIFF 2.0, XLIFF 1.2, JSON (i18next), PO/POT, CSV, DOCX
- Keyboard shortcut hints: mono font, `0.75rem`, right-aligned, secondary text

### Progress Dashboard Widget

- Border radius: `12px` (lg)
- Padding: `20px`
- Donut chart: `120px` diameter, `12px` stroke width
- Center text: percentage in `1.5rem` bold
- Legend: colored dots (`8px`), label + count, `0.875rem`
- Segments: translated (success), in-review (accent), untranslated (border-primary)

### Side-by-Side Diff View

- Font: document font, `0.9375rem` (15px), line-height `1.65`
- Added text: `#d1fae5` background, `#065f46` text
- Removed text: `#fee2e2` background, `#991b1b` text, strikethrough
- Changed text: `#fef08a` background, `#713f12` text
- Line numbers: mono font, `0.75rem`, `40px` gutter, secondary text
- Version labels: `0.75rem` badge, `500` weight, secondary background
