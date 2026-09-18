# DESIGN.md — Wiki / Knowledge Base

## Brand Identity

- **App Name:** Cairn
- **Tagline:** Stack knowledge, mark the path
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Calm, editorial, precise, trustworthy

## Target Persona

Knowledge workers, engineering teams and research collectives who maintain long-lived documentation and want a clean editorial reading experience paired with a powerful page tree and search.

## Screens

| Name           | Route             | Auth | Purpose                                                                                                         | deriveFrom |
| -------------- | ----------------- | ---- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home with value props and signup CTA                                                                  | —          |
| Login          | /login            | No   | Sign in                                                                                                         | —          |
| Signup         | /signup           | No   | Create account                                                                                                  | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                                                                   | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                                                                | Login      |
| Home           | /home             | Yes  | Signed-in overview with recent pages, starred and activity feed                                                 | —          |
| PageView       | /page/:id         | Yes  | Rendered wiki page with breadcrumbs, table of contents and AI summary                                           | —          |
| PageEditor     | /page/:id/edit    | Yes  | Markdown editor with toolbar, live preview split pane                                                           | —          |
| Search         | /search           | Yes  | Full-text results with snippet highlights and filters                                                           | —          |
| VersionHistory | /page/:id/history | Yes  | Version timeline with inline diff viewer                                                                        | —          |
| Settings       | /settings         | Yes  | Workspace, profile, permissions, integrations                                                                   | —          |
| Spaces         | /spaces           | Yes  | Index of all knowledge spaces (Engineering, Product, Research) with cover, contributor avatars, recent activity | —          |
| Templates      | /templates        | Yes  | Gallery of page templates (RFC, meeting notes, decision log) grouped by category with preview cards             | —          |
| Notifications  | /notifications    | Yes  | Personal inbox of mentions, replies, page edits, and assignment events grouped by date                          | —          |
| Comments       | /comments         | Yes  | Workspace-wide list of unresolved comment threads across pages with assignee and resolve actions                | —          |
| TeamMembers    | /team             | Yes  | Admin view: member roster, role assignment (Owner/Editor/Viewer), invite flow, audit log                        | —          |
| Trash          | /trash            | Yes  | Archived and deleted pages with restore and permanent-delete actions                                            | —          |
| Profile        | /profile/:id      | Yes  | Public contributor profile with bio, recent contributions, owned pages, and badges                              | —          |

## App Constraints

- Page content area has a fixed reading-optimized max width (720px) and uses the serif content font for body copy
- Page tree sidebar is persistent on desktop; collapsible but always precedes main content on authenticated screens
- Every authenticated screen renders inside the shared shell (sidebar + breadcrumb header + main) — never full-bleed

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#4338ca`
- Accent: `#d97706`
- Accent Hover: `#f59e0b`
- Accent Dark: `#b45309`

### Semantic

- Draft: `#d97706`
- Draft Light: `#fef3c7`
- Published: `#059669`
- Published Light: `#d1fae5`
- Archived: `#6b7280`
- Archived Light: `#f3f4f6`
- Locked: `#dc2626`
- Locked Light: `#fee2e2`
- Diff Added: `#16a34a`
- Diff Added Light: `#dcfce7`
- Diff Removed: `#dc2626`
- Diff Removed Light: `#fee2e2`
- Internal Link: `#4f46e5`
- External Link: `#0891b2`
- Mention: `#7c3aed`
- Mention Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Page Canvas: `#ffffff`
- Sidebar: `#f1f5f9`
- Page Tree Hover: `#e2e8f0`
- Page Tree Active: `#e0e7ff`
- Code Block: `#1e293b`
- Callout Info: `#eff6ff`
- Callout Warning: `#fffbeb`
- Callout Tip: `#f0fdf4`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Heading: `#0f172a`
- Code Inline: `#4f46e5`
- Link: `#4f46e5`
- Link Hover: `#4338ca`
- Breadcrumb: `#64748b`
- Breadcrumb Active: `#1e293b`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#4f46e5`
- Divider: `#f1f5f9`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#fbbf24`
- Background: `#0f172a`
- Surface: `#1e293b`
- Surface Secondary: `#1e293b`
- Sidebar: `#0f172a`
- Page Canvas: `#1e293b`
- Page Tree Hover: `#334155`
- Page Tree Active: `#312e81`
- Code Block: `#0f172a`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Text Heading: `#f8fafc`
- Border Primary: `#334155`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Content: `"Source Serif 4", Georgia, "Times New Roman", serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Content Typography

- Page title: `2.25rem` (36px), weight `700`, line-height `1.2`
- H1: `1.875rem` (30px), weight `700`, line-height `1.3`
- H2: `1.5rem` (24px), weight `600`, line-height `1.35`
- H3: `1.25rem` (20px), weight `600`, line-height `1.4`
- Body: `1rem` (16px), weight `400`, line-height `1.75`
- Small / metadata: `0.875rem` (14px), weight `400`, line-height `1.5`
- Code inline: `0.875rem` (14px), weight `400`
- Code block: `0.8125rem` (13px), weight `400`, line-height `1.6`

## Layout

- Content Max Width: `720px` (reading-optimized)
- Content Wide Max Width: `960px` (tables, embeds)
- Page Tree Sidebar Width: `280px` (collapsed: `0px`, overlay on mobile)
- Table of Contents Width: `220px` (right rail, desktop only, hidden below `1280px`)
- Top Bar Height: `48px`
- Breadcrumb Height: `36px`
- Grid Columns (search results): `1` (all breakpoints, list layout)
- Page Padding Horizontal: `48px` (desktop), `24px` (tablet), `16px` (mobile)

## Components

### Page Tree Item

- Height: `32px`
- Padding: `4px 8px 4px` + `16px` per nesting level
- Border radius: `6px`
- Font size: `0.875rem` (14px)
- Font weight: `400` (normal), `500` (active)
- Icon size: `16px` (page type icon), `12px` (expand/collapse chevron)
- Hover background: page-tree-hover
- Active background: page-tree-active, primary text
- Drag indicator: `2px` solid primary, left edge

### Page Header

- Title font: heading family, `2.25rem`, weight `700`
- Title placeholder: tertiary text, italic
- Breadcrumb font: `0.8125rem` (13px), secondary text
- Breadcrumb separator: `/` in tertiary text, `4px` horizontal margin
- Metadata row: `0.8125rem` (13px), secondary text, `8px` gap between items
- Metadata items: author avatar (`20px` circle), last edited date, version badge, status badge
- Bottom border: `1px solid` divider, `16px` below metadata

### Content Block

- Paragraph spacing: `16px` (margin-bottom)
- List indent: `24px` per level
- Blockquote: `3px` left border in primary, `16px` left padding, secondary text
- Horizontal rule: `1px solid` divider, `32px` vertical margin
- Image: `8px` border-radius, centered, max-width `100%`, optional caption in `0.875rem` secondary text

### Code Block

- Background: code-block background
- Border radius: `8px`
- Padding: `16px`
- Font: mono family, `0.8125rem`
- Line numbers: tertiary text, `48px` gutter width, right-aligned
- Language badge: top-right, `0.75rem`, muted text, `4px 8px` padding
- Copy button: top-right (after language badge), ghost style, appears on hover

### Callout Box

- Border radius: `8px`
- Padding: `12px 16px`
- Border-left: `3px solid`
- Icon: `18px`, left-aligned
- Variants:
  - Info: info border, callout-info background, info icon
  - Warning: warning border, callout-warning background, warning icon
  - Tip: success border, callout-tip background, lightbulb icon
  - Danger: error border, error-light background, alert icon

### Version History Panel

- Panel width: `360px` (slides in from right)
- Version item height: `64px`
- Version item padding: `12px 16px`
- Version number: `0.875rem`, weight `600`, primary text
- Version date: `0.8125rem`, secondary text
- Version author: `0.8125rem`, secondary text, avatar `20px`
- Diff indicator: colored dot (`8px` circle) — green for additions, red for deletions
- Active version: primary-light background, primary left border `3px`
- Restore button: outline variant, small size

### Inline Diff View

- Added line: diff-added-light background, `2px` left border diff-added
- Removed line: diff-removed-light background, `2px` left border diff-removed
- Added text (inline): diff-added-light background, underline
- Removed text (inline): diff-removed-light background, strikethrough
- Line numbers: two columns (old/new), `40px` each, mono font, tertiary text

### Search Results

- Result item padding: `12px 16px`
- Result title: `1rem`, weight `600`, primary text
- Result breadcrumb: `0.8125rem`, secondary text, truncated
- Result snippet: `0.875rem`, secondary text, `2` line clamp
- Highlight match: accent background `rgba(217, 119, 6, 0.2)`, weight `600`
- Keyboard navigation: focus ring on active result

### Permission Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `0.75rem` (12px)
- Font weight: `500`
- Variants:
  - Owner: primary background, inverse text
  - Editor: accent background, inverse text
  - Viewer: secondary-light background, secondary text
  - Public: success-light background, success text

### Page Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `0.75rem` (12px)
- Font weight: `500`
- Variants:
  - Draft: draft-light background, draft text, circle icon
  - Published: published-light background, published text, check icon
  - Archived: archived-light background, archived text, archive icon
  - Locked: locked-light background, locked text, lock icon

### AI Summary Card

- Border radius: `8px`
- Border: `1px solid` primary at `30%` opacity
- Background: `linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(217, 119, 6, 0.04))`
- Padding: `16px`
- Header: sparkle icon in primary, "AI Summary" label in `0.875rem` weight `600`
- Content: `0.875rem`, line-height `1.6`, secondary text
- Regenerate button: ghost style, small, primary text

### Wikilink / Internal Link

- Color: internal-link
- Font weight: `500`
- Underline: `1px` dashed, on hover solid
- Missing page link: error color, `1px` dashed underline
- Hover preview: card with `280px` width, `md` shadow, `12px` border-radius, shows page title + first `120` chars

### Table of Contents (Right Rail)

- Font size: `0.8125rem` (13px)
- Line height: `1.4`
- Item padding: `4px 0 4px 12px`
- Active item: primary text, `2px` left border primary
- Inactive item: secondary text, no border
- Nesting indent: `12px` per heading level
- Scroll spy: smooth highlight transition `150ms`
- Title: `0.75rem`, weight `600`, uppercase, letter-spacing `0.05em`, tertiary text

### Markdown Editor Toolbar

- Height: `40px`
- Background: surface
- Border-bottom: `1px solid` border-primary
- Button size: `32px` square
- Button border-radius: `6px`
- Button hover: surface-secondary background
- Button active: page-tree-active background, primary text
- Separator: `1px solid` border-primary, `16px` height, `8px` horizontal margin
- Sticky: yes, below top bar, z-index `1100`
