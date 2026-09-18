# DESIGN.md — Document Collaboration

## Brand Identity

- **App Name:** Quillon
- **Tagline:** Think together, write forever
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Thoughtful, literary, collaborative, precise

## Target Persona

Writers, editors, and teams who co-author long-form documents and value a distraction-free editor with ambient presence indicators.

## Screens

| Name           | Route             | Auth | Purpose                                                                | deriveFrom |
| -------------- | ----------------- | ---- | ---------------------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home with value props and signup CTA                         | —          |
| Login          | /login            | No   | Sign in                                                                | —          |
| Signup         | /signup           | No   | Create account                                                         | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                          | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                       | Login      |
| Dashboard      | /dashboard        | Yes  | Document grid with recent, shared, starred                             | —          |
| Editor         | /doc/:id          | Yes  | Full editor canvas with toolbar, presence, comments                    | —          |
| VersionHistory | /doc/:id/history  | Yes  | Timeline of document revisions                                         | —          |
| Comments       | /doc/:id/comments | Yes  | Comment panel and thread resolution                                    | —          |
| Shared         | /shared           | Yes  | Documents shared with me                                               | —          |
| Settings       | /settings         | Yes  | Profile, notifications, editor preferences                             | —          |
| Notifications  | /notifications    | Yes  | Activity feed: comments, mentions, share invites, suggestion requests  | —          |
| Templates      | /templates        | Yes  | Gallery of starter document templates by category                      | Dashboard  |
| Trash          | /trash            | Yes  | Recently deleted documents with restore + delete-forever actions       | Dashboard  |
| Profile        | /profile          | Yes  | Public collaborator identity (display name, avatar, bio, cursor color) | Settings   |

## App Constraints

- Editor canvas uses serif (Charter) for body text, sans for chrome
- Collaborator presence (cursors, avatars) uses assigned colors consistently across screens
- Comments and version history slide in from the right; never permanent chrome

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#3730a3`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0e7490`

### Semantic

- Cursor Self: `#4f46e5`
- Cursor Collaborator 1: `#e11d48`
- Cursor Collaborator 2: `#16a34a`
- Cursor Collaborator 3: `#d97706`
- Cursor Collaborator 4: `#7c3aed`
- Comment Open: `#f59e0b`
- Comment Open Light: `#fef3c7`
- Comment Resolved: `#16a34a`
- Comment Resolved Light: `#dcfce7`
- Suggestion Added: `#16a34a`
- Suggestion Added Light: `#dcfce7`
- Suggestion Removed: `#dc2626`
- Suggestion Removed Light: `#fee2e2`
- Version Current: `#4f46e5`
- Version Current Light: `#eef2ff`
- Version Previous: `#9ca3af`
- Shared Public: `#06b6d4`
- Shared Restricted: `#f59e0b`
- Shared Private: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Editor: `#ffffff`
- Toolbar: `#f8fafc`
- Comment Panel: `#f8fafc`
- Selection Highlight: `rgba(79, 70, 229, 0.12)`
- Comment Highlight: `rgba(245, 158, 11, 0.15)`

### Text

- Heading: `#0f172a`
- Body: `#334155`
- Comment Author: `#0f172a`
- Comment Body: `#475569`
- Timestamp: `#94a3b8`
- Placeholder: `#cbd5e1`
- Link: `#4f46e5`
- Link Hover: `#3730a3`

### Borders

- Toolbar: `#e2e8f0`
- Comment: `#e2e8f0`
- Focus: `#4f46e5`
- Divider: `#f1f5f9`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Background: `#0c1222`
- Surface: `#1a2332`
- Editor: `#1a2332`
- Toolbar: `#141e2e`
- Comment Panel: `#141e2e`
- Text Heading: `#f1f5f9`
- Text Body: `#cbd5e1`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a4e`
- Selection Highlight: `rgba(129, 140, 248, 0.18)`
- Comment Highlight: `rgba(245, 158, 11, 0.12)`

## Typography

### Font Families

- Editor Body: `"Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif`
- Editor Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- UI / Chrome: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code Block: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Editor Font Sizes

- Body: `1.0625rem` (17px) — optimized for long-form reading
- H1: `2rem` (32px), weight `700`
- H2: `1.5rem` (24px), weight `700`
- H3: `1.25rem` (20px), weight `600`
- H4: `1.125rem` (18px), weight `600`
- Blockquote: `1.0625rem` (17px), italic, left-border accent
- Code Inline: `0.9375rem` (15px), mono font, `rgba(79, 70, 229, 0.08)` background
- Code Block: `0.875rem` (14px), mono font

### Editor Line Heights

- Body: `1.7` — generous for readability
- Heading: `1.3`
- Code: `1.6`

## Layout

- Content Max Width: `900px` (editor canvas — comfortable reading measure)
- Editor Canvas Padding: `48px 64px` (desktop), `24px 16px` (mobile)
- Sidebar Width: `280px` (document tree), collapsible
- Comment Panel Width: `320px`, slide-in from right
- Version History Panel Width: `340px`, slide-in from right
- Toolbar Height: `48px`, sticky top
- Top Bar Height: `52px`
- Document List Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Document List Gap: `16px`

## Components

### Document Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Thumbnail: `100%` width, `140px` height, `8px` radius, light gray placeholder with first-line preview text
- Title font: UI sans, `16px`, weight `600`
- Subtitle: last edited timestamp + editor avatars, `13px`, muted
- Badge: sharing status pill (public/restricted/private) using semantic colors

### Editor Toolbar

- Background: toolbar background
- Border bottom: `1px solid` toolbar border
- Button size: `32px` square
- Button radius: `6px`
- Button hover: `rgba(79, 70, 229, 0.08)` background
- Button active (formatting on): `rgba(79, 70, 229, 0.12)` background, primary text
- Divider: `1px solid` divider, `16px` vertical margin
- Group spacing: `4px` between buttons, `12px` between groups

### Collaborator Cursor

- Label: `12px`, weight `600`, white text on collaborator color background
- Label radius: `4px` top corners, attached to cursor line
- Cursor line: `2px` wide, collaborator color
- Selection: collaborator color at `15%` opacity
- Label auto-hide: fades after `3s` idle, reappears on movement

### Comment Thread

- Container radius: `8px`
- Container border: `1px solid` comment border
- Container shadow: `sm`
- Author avatar: `28px` circle
- Author name: `13px`, weight `600`
- Timestamp: `12px`, muted
- Body: `14px`, normal weight, `1.5` line height
- Reply indent: `16px` left padding
- Resolve button: ghost style, success color
- Active/focused thread: `2px` left border in primary color
- Highlight in editor: comment-highlight background, `2px` bottom border dashed in comment-open color

### Version History Entry

- Container padding: `12px 16px`
- Active: version-current-light background, `3px` left border in version-current
- Author avatar: `24px` circle
- Title: `14px`, weight `500`
- Timestamp: `12px`, muted
- Diff summary: `12px`, mono font — `+N` in suggestion-added, `-N` in suggestion-removed
- Connector line: `2px` solid, border-primary, vertical between entries

### Suggestion Diff

- Added text: suggestion-added-light background, suggestion-added underline
- Removed text: suggestion-removed-light background, suggestion-removed strikethrough
- Accept button: `28px` height, success solid, `6px` radius
- Reject button: `28px` height, error outline, `6px` radius
- Suggestion card: `8px` radius, `1px` border, `12px` padding

### Share Dialog

- Modal size: `md` (500px)
- Permission levels: Owner, Editor, Commenter, Viewer — each with icon + description
- User row: `48px` height, avatar `32px`, name `14px` weight `500`, email `13px` muted, permission dropdown right-aligned
- Link sharing toggle: switch component, public/restricted status pill
- Copy link button: outline style, accent color, full width bottom

### Search Overlay

- Trigger: `Cmd+K` / `Ctrl+K`
- Width: `560px`, centered
- Radius: `12px`
- Shadow: `xl`
- Input: `48px` height, no border, `18px` font, placeholder "Search documents..."
- Result item: `48px` height, `12px` padding, `8px` radius hover
- Result icon: document type icon, `20px`, muted
- Result title: `14px`, weight `500`, matching text highlighted in primary at `15%` opacity
- Result subtitle: path or last edited, `12px`, muted
- Keyboard hints: `kbd` style badges for navigation (arrows, enter, esc)

### Presence Avatars

- Size: `28px` circle
- Border: `2px solid` white (stacking overlap)
- Overlap: `-8px` margin-left for stacked display
- Max visible: `4`, then `+N` counter badge
- Online indicator: `8px` circle, success color, bottom-right, `2px` white border
- Tooltip: name + "Editing" / "Viewing" status

### Table of Contents

- Position: left margin of editor, fixed on scroll (desktop only)
- Width: `200px`
- Heading font: `13px`, UI sans
- H1 indent: `0`
- H2 indent: `12px`
- H3 indent: `24px`
- Active heading: primary color, weight `600`
- Inactive heading: muted text, weight `400`
- Hover: primary at `8%` background
- Connector: `1px` solid divider, left side

## Design Principles

1. **Content is king** — the editor canvas is the hero; chrome should fade into the background until needed
2. **Presence is ambient** — collaborator indicators should be visible but never distracting; cursors, avatars, and activity hints use soft colors and graceful transitions
3. **Serif for writing, sans for UI** — the editor body uses a reading-optimized serif; all interface chrome uses the system sans stack
4. **Progressive disclosure** — comments panel, version history, and sharing controls slide in on demand rather than consuming permanent screen space
5. **Color means identity** — each collaborator gets a unique, consistent color across cursors, selections, avatars, and comment attributions
