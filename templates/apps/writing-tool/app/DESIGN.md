# DESIGN.md — Writing Tool

## Brand Identity

- **App Name:** Versal
- **Tagline:** Write without walls
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Quiet, focused, literary, generous

## Target Persona

Long-form writers — novelists, essayists, and working journalists — who need a calm distraction-free editor with typewriter scroll, word goals, and a sparing but well-thought-out document library.

## Screens

| Name           | Route               | Auth | Purpose                                                                   | deriveFrom |
| -------------- | ------------------- | ---- | ------------------------------------------------------------------------- | ---------- |
| Landing        | /                   | No   | Marketing home with value props and signup CTA                            | —          |
| Login          | /login              | No   | Sign in                                                                   | —          |
| Signup         | /signup             | No   | Create account                                                            | Login      |
| ForgotPassword | /forgot-password    | No   | Request reset                                                             | Login      |
| ResetPassword  | /reset-password     | No   | Set new password                                                          | Login      |
| Library        | /library            | Yes  | Document library with search, filters and collections                     | —          |
| Editor         | /editor/:id         | Yes  | Distraction-free document editor with sidebar and markdown toolbar        | —          |
| FocusMode      | /editor/:id/focus   | Yes  | Focus mode — chromeless editor with typewriter scroll and gentle vignette | —          |
| Stats          | /stats              | Yes  | Word-count history, streaks and per-document progress                     | —          |
| Settings       | /settings           | Yes  | Profile, editor preferences, export, integrations                         | —          |
| VersionHistory | /editor/:id/history | Yes  | Timeline of saved revisions with side-by-side diff against current draft  | —          |
| Billing        | /billing            | Yes  | Subscription plan, payment method, invoices and tier upgrade              | —          |

## App Constraints

- Editor body uses the serif editor font (Charter / Georgia) at 18px / line-height 1.8 — this is the defining typographic cue and must not be overridden anywhere a document is rendered
- Primary purple (#7c3aed) is used sparingly — cursor, active sidebar indicator, CTAs, tag accent — never as a large background fill
- Focus mode hides the top bar and sidebar entirely and applies a gentle edge vignette; the editor column stays centered at 680px max width

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#e879a0`
- Accent Hover: `#f0a0b8`
- Accent Dark: `#d05080`

### Semantic

- Draft: `#7c3aed`
- Draft Light: `#ede9fe`
- Published: `#16a34a`
- Published Light: `#dcfce7`
- Archived: `#6b7280`
- Archived Light: `#f3f4f6`
- Focus Active: `#7c3aed`
- Word Goal Met: `#16a34a`
- Word Goal Unmet: `#9ca3af`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf9fc`
- Editor: `#ffffff`
- Editor Focus: `#fdfcff`
- Sidebar: `#f8f7fb`

### Text

- Primary: `#1a1625`
- Secondary: `#6e6a7a`
- Editor Body: `#2d2a33`
- Editor Heading: `#1a1625`
- Placeholder: `#b0adb8`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`
- Markdown Syntax: `#c4c0d0`

### Borders

- Primary: `#e8e5f0`
- Secondary: `#d8d4e2`
- Focus: `#7c3aed`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f0a0b8`
- Background: `#0e0b18`
- Surface: `#1a1528`
- Surface Secondary: `#221d32`
- Editor: `#16122a`
- Editor Focus: `#1a1530`
- Sidebar: `#12101e`
- Text Primary: `#ece8f4`
- Text Secondary: `#9890a8`
- Editor Body: `#d8d4e2`
- Markdown Syntax: `#4a4460`
- Border Primary: `#2e2844`

## Typography

### Font Families

- UI: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Editor: `"Charter", "Georgia", "Iowan Old Style", "Palatino Linotype", Palatino, serif`
- Editor Headings: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"SF Mono", "Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, monospace`

### Editor Font Sizes

- Body: `1.125rem` (18px) — optimized for sustained reading/writing
- H1: `2.25rem` (36px), weight `700`
- H2: `1.75rem` (28px), weight `700`
- H3: `1.375rem` (22px), weight `600`
- H4: `1.125rem` (18px), weight `600`
- Code Inline: `0.9375rem` (15px)
- Code Block: `0.875rem` (14px)

### Editor Line Heights

- Body: `1.8`
- Heading: `1.3`
- Code: `1.6`

## Layout

- Editor Max Width: `680px` — centered, comfortable ~65 character line length
- Editor Padding: `48px 32px` (desktop), `24px 16px` (mobile)
- Sidebar Width: `260px` (collapsed: `0px` — fully hidden in focus mode)
- Sidebar Document List Item Height: `56px`
- Top Bar Height: `48px` — minimal chrome, disappears in focus mode
- Focus Mode: top bar + sidebar hidden, editor fills viewport, gentle vignette overlay on edges
- Content Grid: single column, always — writing is linear
- Paragraph Spacing: `1.25em`

## Components

### Editor Surface

- Background: editor background color
- No visible border — the writing surface IS the page
- Cursor color: primary
- Selection background: `#7c3aed20` (primary at 12% opacity)
- Focus mode selection: `#7c3aed30` (primary at 19% opacity)
- Max width centered with `auto` margins
- Smooth transitions on all focus-mode changes: `500ms ease`

### Document Card (Sidebar)

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Background: transparent, hover: surface
- Active: `#7c3aed10` background, `3px` left border in primary
- Title font weight: `600`, size: `sm` (14px), single line truncate
- Preview text: secondary color, size: `xs` (12px), 2-line clamp
- Timestamp: tertiary color, size: `xs` (12px)
- Tag dots: `6px` circles inline after timestamp

### Focus Mode Toggle

- Border radius: `9999px` (pill)
- Size: `36px` square
- Background: transparent, hover: surface-secondary
- Icon: concentric circles (target/focus icon), `18px`
- Active state: primary background, inverse icon color
- Position: top-right of top bar
- Tooltip: "Focus Mode (Ctrl+Shift+F)"

### Tag Pill

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `#7c3aed12` (primary at 7%)
- Text color: primary
- Border: `1px solid #7c3aed25`
- Hover: `#7c3aed20` background
- Remove button: `14px` x icon, visible on hover

### Word Count Bar

- Position: bottom of editor, fixed
- Height: `32px`
- Background: transparent (light text floating over editor)
- Font: UI font, `xs` (12px), secondary color
- Items: word count, character count, reading time, optional word goal progress
- Goal progress: thin `2px` horizontal bar, primary color fill, `4px` border-radius
- Fades out after 3s of typing in focus mode, reappears on mouse move

### Markdown Toolbar

- Position: top of editor area, below top bar
- Height: `40px`
- Background: surface, border-bottom: `1px solid` border-primary
- Button size: `32px` square, `4px` border-radius
- Button hover: surface-secondary background
- Button active (format applied): primary color icon
- Separator: `1px` vertical line, `16px` height, border-secondary
- Hides in focus mode
- Icons: bold, italic, heading, link, list, quote, code, image

### Search Overlay

- Position: top-center, drops down from top bar
- Width: `480px`, max `90vw`
- Border radius: `12px` (lg)
- Shadow: `lg`
- Background: surface
- Input height: `48px`, no border, large font `lg` (18px)
- Results: document title + matched excerpt, `12px` vertical padding per result
- Matched text: primary color, `600` weight
- Keyboard navigation: highlighted result gets `#7c3aed08` background
- Trigger: `Cmd+K` / `Ctrl+K`

### Export Menu

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `8px`
- Item height: `40px`, `8px` horizontal padding
- Item hover: surface-secondary
- Format icon: `20px`, secondary color
- Formats: Markdown (.md), Plain Text (.txt), HTML, PDF
- Divider between format groups: `1px` border-primary, `4px` vertical margin

### Document Status Badge

- Draft: primary background, inverse text
- Published: success background, inverse text
- Archived: `#6b7280` background, inverse text
- Border radius: `9999px` (pill)
- Padding: `2px 8px`
- Font size: `11px`
- Font weight: `600`
- Text transform: uppercase, `0.5px` letter spacing

### Typewriter Scroll

- In focus mode, optionally keep the active line vertically centered
- Lines above and below the cursor: reduced opacity `0.5`, transitioning to `1.0` within 3 lines
- Active line opacity: `1.0`
- Transition: `150ms ease` opacity
