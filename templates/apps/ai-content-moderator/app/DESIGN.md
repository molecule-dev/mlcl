# DESIGN.md — AI Content Moderator

## Brand Identity

- **App Name:** Sift
- **Tagline:** Signal through the noise
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Decisive, scanning, professional, efficient

## Target Persona

Trust & safety teams reviewing flagged content across community platforms with AI-assisted verdicts.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                  | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home for enterprise content moderation with compliance messaging                                               | —          |
| Login          | /login           | No   | Centered SSO-first card, email fallback, indigo Sign In button                                                           | —          |
| Signup         | /signup          | No   | Create account                                                                                                           | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                            | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                         | Login      |
| Dashboard      | /dashboard       | Yes  | Dark slate sidebar, top bar, stats grid (queue volume, verdicts today, AI accuracy, escalations), verdict breakdown d... | —          |
| Queue          | /queue           | Yes  | Dark sidebar with queue counts, filter bar, dense data table with verdict left-borders, priority dots, bulk select ch... | —          |
| ReviewDetail   | /queue/:id       | Yes  | Dark sidebar, content preview center with flagged segment highlights, AI confidence meter, rule matches, action bar b... | —          |
| Rules          | /rules           | Yes  | Dark sidebar, rule builder with AND/OR condition rows, expression inputs, test preview panel                             | —          |
| Analytics      | /analytics       | Yes  | Dark sidebar, date range, charts grid (moderator performance, verdict trends, AI accuracy over time, category breakdown) | —          |
| Settings       | /settings        | Yes  | Dark sidebar, team management, integration keys, API settings                                                            | —          |
| Profile        | /profile         | Yes  | Personal profile: avatar, name, role, timezone, notification prefs                                                       | Settings   |
| Notifications  | /notifications   | Yes  | Activity feed: assignments, escalations, mentions, rule-trigger alerts                                                   | Queue      |

## App Constraints

- Queue table uses 56px row height with verdict left-border color coding
- Confidence meters show AI reasoning — never hide uncertainty
- Dark #0f172a sidebar, light content area

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#4338ca`
- Accent: `#0ea5e9`
- Accent Hover: `#38bdf8`
- Accent Dark: `#0284c7`

### Semantic

- Approved: `#16a34a`
- Approved Light: `#dcfce7`
- Rejected: `#dc2626`
- Rejected Light: `#fee2e2`
- Pending: `#d97706`
- Pending Light: `#fef3c7`
- Escalated: `#c026d3`
- Escalated Light: `#fae8ff`
- Auto-Moderated: `#0891b2`
- Auto-Moderated Light: `#cffafe`
- Confidence High: `#16a34a`
- Confidence Medium: `#d97706`
- Confidence Low: `#dc2626`

### Backgrounds

- Primary: `#f8fafc`
- Secondary: `#f1f5f9`
- Tertiary: `#e2e8f0`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Queue: `#fefce8`
- Input: `#ffffff`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#475569`
- Inverse: `#ffffff`
- Link: `#4f46e5`
- Link Hover: `#4338ca`
- Rule: `#6366f1`
- Confidence: `#0f172a`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#4f46e5`
- Flagged: `#fbbf24`
- Rejected: `#fca5a5`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#38bdf8`
- Background: `#020617`
- Surface: `#0f172a`
- Surface Secondary: `#1e293b`
- Text Primary: `#f8fafc`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e293b`
- Approved: `#4ade80`
- Rejected: `#f87171`
- Pending: `#fbbf24`
- Escalated: `#e879f9`
- Auto-Moderated: `#22d3ee`
- Queue: `#1c1917`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Confidence: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Sizes (overrides)

- Confidence Score: `1.5rem` (24px), weight `700`
- Rule Expression: `0.8125rem` (13px), mono font
- Queue Counter: `0.75rem` (12px), weight `600`

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Queue Panel Width: `380px`
- Content Preview Max Width: `640px`
- Grid Columns: `12`
- Grid Gap: `24px`
- Table Row Height: `56px`
- Stats Card Grid: `4` columns (desktop), `2` (tablet), `1` (mobile)
- Top Bar Height: `56px`

## Components

### Content Review Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` verdict color (approved/rejected/pending/escalated)
- Content preview: max `3` lines truncated, `14px` body text
- Flagged reason badge: top-right, `pending` background
- AI confidence bar below content: `4px` height, rounded-full, gradient from confidence-low to confidence-high
- Timestamp: `12px`, secondary text, top-right below badge

### Moderation Queue Table

- Header: `#f1f5f9` background, `600` weight, `13px` uppercase tracking `0.05em`
- Row height: `56px`
- Row hover: `#f8fafc`
- Alternating rows: off (clean look for scanning)
- Cell padding: `12px 16px`
- Priority column: colored dot indicator (`8px` circle) — red (urgent), amber (high), blue (normal), gray (low)
- Verdict column: verdict badge inline
- Bulk select: checkbox column, `20px` checkbox, primary color when checked
- Sticky header on scroll

### Verdict Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`
- Font weight: `600`
- Variants:
  - Approved: `approved` text on `approved-light` background
  - Rejected: `rejected` text on `rejected-light` background
  - Pending: `pending` text on `pending-light` background
  - Escalated: `escalated` text on `escalated-light` background
  - Auto-Moderated: `auto-moderated` text on `auto-moderated-light` background

### Confidence Meter

- Height: `6px`
- Border radius: `9999px`
- Background track: `#e2e8f0`
- Fill: gradient — `confidence-low` (0%) through `confidence-medium` (50%) to `confidence-high` (100%)
- Score label: right-aligned, `24px`, `700` weight, tabular-nums
- Percentage suffix: `16px`, `400` weight, secondary text
- Tooltip on hover showing AI reasoning summary

### Rule Builder Panel

- Background: surface
- Border radius: `12px`
- Border: `1px solid` border-primary
- Padding: `24px`
- Condition row height: `44px`
- Condition connector (AND/OR): `12px` mono text, `primary` color badge, `4px` radius
- Expression input: mono font, `13px`, `#f1f5f9` background, `8px` radius
- Drag handle: `16px` grip dots, secondary text color
- Add condition button: ghost variant, primary color, `+` icon prefix

### Stats Card

- Border radius: `12px`
- Shadow: `sm`
- Padding: `20px`
- Metric value: `30px`, `700` weight, primary text
- Metric label: `13px`, `500` weight, secondary text
- Trend indicator: `12px`, inline arrow icon — green up / red down / gray neutral
- Spark line: `40px` height, `2px` stroke, primary color, bottom of card

### Action Bar

- Background: surface
- Border-top: `1px solid` border-primary
- Padding: `12px 24px`
- Sticky to bottom of review panel
- Button group: `8px` gap
- Approve button: `approved` background, white text, `600` weight
- Reject button: `rejected` background, white text, `600` weight
- Escalate button: outline variant, `escalated` border and text
- Skip button: ghost variant, secondary text

### Content Preview

- Max width: `640px`
- Text content: `15px`, `1.6` line-height, primary text
- Image content: `12px` radius, max-height `400px`, object-fit contain
- Flagged segments: highlighted with `pending-light` background, `2px` underline in `pending` color
- Metadata bar: `12px`, secondary text, border-top `1px solid` border-primary, `12px` top padding
- Source label: mono font, `12px`, `#f1f5f9` background, `4px` radius, `4px 8px` padding

### Sidebar Navigation

- Width: `260px` (collapsed: `64px`)
- Background: `#0f172a`
- Text: `#cbd5e1`
- Active item: `#1e293b` background, `#f8fafc` text, `3px` left border in primary
- Hover: `#1e293b` background
- Section divider: `1px solid #1e293b`
- Queue count badges: `9999px` radius, `18px` min-width, primary background, white text, `11px` font
- Icon size: `20px`
- Item padding: `10px 16px`
- Collapsed: icons only, centered, tooltip on hover

### Filter Bar

- Background: surface
- Border-bottom: `1px solid` border-primary
- Padding: `12px 24px`
- Filter chip: `9999px` radius, `#f1f5f9` background, `13px` text, `6px 12px` padding
- Active filter chip: primary background, white text
- Chip gap: `8px`
- Search input: `240px` min-width, `36px` height, left search icon
- Date range picker: `160px` per field

## Design Principles

1. **Scanability over beauty** — moderators review hundreds of items; every pixel must serve rapid decision-making
2. **Verdict-first hierarchy** — color-coded left borders and badges make status visible before reading content
3. **Confidence transparency** — always show AI confidence scores and reasoning; never hide the machine's uncertainty
4. **Keyboard-driven flow** — all core actions (approve, reject, escalate, skip) must be reachable via keyboard shortcuts
5. **Dark sidebar, light content** — the dark nav recedes; the content area stays bright for reading flagged material
6. **Reduce decision fatigue** — group similar items, surface AI recommendations prominently, minimize clicks per verdict
