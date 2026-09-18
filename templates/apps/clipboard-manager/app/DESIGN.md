# DESIGN.md — Clipboard Manager

## Brand Identity

- **App Name:** Yank
- **Tagline:** Copy once, find forever
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Fast, keyboard-forward, utilitarian, friendly

## Target Persona

Developers, writers, and power users who copy-paste dozens of snippets daily and want them searchable across devices with shortcuts.

## Screens

| Name           | Route            | Auth | Purpose                                                                                   | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home showcasing keyboard workflow, command palette, dense snippet list          | —          |
| Login          | /login           | No   | Centered card with periwinkle primary                                                     | —          |
| Signup         | /signup          | No   | Create account                                                                            | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                             | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                          | Login      |
| Clips          | /clips           | Yes  | Three-pane: sidebar categories, dense snippet list with search, detail preview            | —          |
| CommandPalette | /command-palette | Yes  | Full-screen command palette demo with fuzzy search across all clips and actions           | —          |
| Categories     | /categories      | Yes  | Manage categories/tags with snippet counts, colors, icons                                 | —          |
| Devices        | /devices         | Yes  | Connected devices with sync status, last activity, remove action                          | —          |
| Settings       | /settings        | Yes  | Shortcuts, sync, encryption, theme, privacy                                               | —          |
| Profile        | /profile         | Yes  | Account profile: avatar, display name, email, password, 2FA, active sessions, danger zone | —          |
| Billing        | /billing         | Yes  | Subscription tier, plan comparison, payment method, invoice history                       | —          |

## App Constraints

- Snippet list is dense single-column with 2px gap — optimized for scannability, never a card grid
- Keyboard shortcuts are first-class UI: rendered as key-cap badges on hover for every action
- Encrypted clips show violet lock icon and never display content in the list view until unlocked

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b6abf`
- Primary Hover: `#7480cf`
- Primary Dark: `#4a57a8`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Pinned: `#f59e0b`
- Pinned Light: `#fef3c7`
- Encrypted: `#8b5cf6`
- Encrypted Light: `#ede9fe`
- Copied (flash feedback): `#10b981`
- Copied Light: `#d1fae5`
- Stale: `#94a3b8`
- Stale Light: `#f1f5f9`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Sidebar: `#f1f5f9`
- Search Bar: `#f8fafc`
- Snippet Hover: `#f0f4ff`
- Command Palette: `#ffffff`

### Text

- Snippet Body: `#1e293b`
- Snippet Meta: `#94a3b8`
- Search Match: `#5b6abf`
- Keyboard Shortcut: `#64748b`
- Link: `#5b6abf`
- Link Hover: `#4a57a8`

### Borders

- Snippet: `#e2e8f0`
- Snippet Active: `#5b6abf`
- Category: `#cbd5e1`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#34d399`
- Encrypted: `#a78bfa`
- Background: `#0c1222`
- Surface: `#162032`
- Surface Secondary: `#1c2a42`
- Sidebar: `#131d30`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Snippet Body: `#e2e8f0`
- Snippet Hover: `#1c2a42`
- Border Primary: `#2a3a52`
- Search Bar: `#162032`
- Command Palette: `#1c2a42`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Snippet: `"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- Keyboard Shortcut: `"SF Mono", SFMono-Regular, Menlo, monospace` (font-size: xs, letter-spacing: 0.05em)

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `220px` (collapsed: `56px`)
- Snippet List Width: fluid, fills remaining space
- Preview Panel Width: `380px` (togglable, hidden by default on < `1280px`)
- Search Bar Height: `48px` (sticky top, always visible)
- Command Palette Width: `560px` (centered overlay)
- Grid Columns: `1` (snippet list is single-column by design)
- Snippet List Gap: `2px` (tight, dense list)

## Components

### Snippet Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border: `1px solid` snippet border, left: `3px solid transparent` (active: primary)
- Background: surface, hover: snippet-hover
- Transition: fast (150ms)
- Content preview: single line, truncated with ellipsis, snippet font
- Meta row: timestamp (relative) + source app icon + category pill, right-aligned
- Selected state: primary-light background, primary left border accent
- Font size: `sm` (14px) for preview, `xs` (12px) for meta

### Snippet Detail Panel

- Border-left: `1px solid` border-primary
- Padding: `24px`
- Header: full content rendered (word-wrap), snippet font, `sm` (14px)
- Action bar: copy, pin, encrypt, delete — icon buttons in a row, `32px` height
- Metadata block: created at, source app, character count, category — `xs` font, muted text
- Max height: viewport minus search bar, scrollable

### Search Bar

- Border radius: `8px` (md)
- Height: `48px`
- Background: search-bar
- Border: `1px solid` border-primary, focus: `2px solid` primary
- Padding: `8px 16px`
- Icon: magnifying glass, `20px`, secondary text color
- Placeholder: `"Search clips... (⌘K)"`, secondary text color
- Font size: `base` (16px)
- Sticky position at top of snippet list

### Command Palette

- Border radius: `12px` (lg)
- Shadow: `xl`
- Width: `560px`, centered horizontally, `20%` from top
- Input: full width, no border, `lg` font, `56px` height
- Results list: max `8` visible items, `44px` row height
- Active result: snippet-hover background, primary left border
- Keyboard hint: right-aligned in each row, keyboard-shortcut font
- Overlay: `rgba(0, 0, 0, 0.4)`

### Category Pill

- Border radius: `9999px` (full)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: varies by category (pastel tint of category color)
- Default categories and colors:
  - Code: `#dbeafe` text `#2563eb`
  - Text: `#e0e7ff` text `#4f46e5`
  - URL: `#ccfbf1` text `#0d9488`
  - Image: `#fce7f3` text `#db2777`
  - Credential: `#ede9fe` text `#7c3aed`

### Keyboard Shortcut Badge

- Border radius: `4px` (sm)
- Padding: `2px 6px`
- Font: keyboard-shortcut family, `xs` (12px)
- Background: `#f1f5f9` (dark: `#2a3a52`)
- Border: `1px solid` `#e2e8f0` (dark: `#3a4a62`)
- Box shadow: `0 1px 0 0 rgba(0, 0, 0, 0.08)` (subtle key-cap depth)
- Text color: keyboard-shortcut text color

### Encryption Indicator

- Icon: lock, `14px`
- Color: encrypted (`#8b5cf6`)
- Tooltip: `"Encrypted — unlock to view"`
- Encrypted snippet preview: `"••••••••"` in snippet font, encrypted color
- Unlock animation: fast (150ms) fade-in of decrypted content

### Pin Indicator

- Icon: pin, `14px`
- Color: pinned (`#f59e0b`) when active, `#cbd5e1` when inactive
- Pinned snippets sort to top of list with a subtle `1px` divider below the pinned group

### Sidebar Category List

- Item height: `36px`
- Padding: `6px 16px`
- Font size: `sm` (14px)
- Font weight: `400` (normal), `600` (active)
- Active item: primary background at 10% opacity, primary text
- Count badge: right-aligned, `xs` font, secondary text, tabular-nums
- Section headers: `xs` font, uppercase, `600` weight, `#94a3b8`, `24px` top margin
- Collapse/expand: chevron icon, `16px`, secondary text

### Toast / Copy Confirmation

- Border radius: `8px` (md)
- Padding: `8px 16px`
- Background: `#1e293b` (always dark, regardless of theme)
- Text: `#f8fafc`, `sm` font, `500` weight
- Icon: checkmark, accent green
- Position: bottom-center, `32px` from bottom
- Duration: `1500ms`, fade-out `300ms`
- Content: `"Copied to clipboard"` (or `"Yanked!"` for brand voice)
