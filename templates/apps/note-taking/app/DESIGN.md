# DESIGN.md — Note-taking

## Brand Identity

- **App Name:** Verso
- **Tagline:** Where thoughts take shape
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Thoughtful
- Structured
- Quiet
- Flexible

## Target Persona

Knowledge workers and students writing structured notes with hierarchy, search, and cross-links.

## Screens

| Name           | Route            | Auth | Purpose                                       | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                | —          |
| Login          | /login           | No   | Sign in                                       | —          |
| Signup         | /signup          | No   | Create account                                | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                 | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                              | Login      |
| Home           | /home            | Yes  | Recent notes, favorites, today's daily note   | —          |
| Notes          | /notes           | Yes  | Notebook tree and note list                   | Home       |
| NoteEditor     | /notes/:id       | Yes  | Rich text editor with sidebar tree, backlinks | Home       |
| Search         | /search          | Yes  | Full text search with filters                 | Home       |
| Graph          | /graph           | Yes  | Visual knowledge graph of linked notes        | Home       |
| Tags           | /tags            | Yes  | All tags with note counts                     | Home       |
| Settings       | /settings        | Yes  | Editor preferences, sync, export              | Home       |

## App Constraints

- Three-pane: sidebar tree / note list / editor
- Rich editor with headings, lists, code, callouts
- Backlinks panel

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#3b5fc0`
- Primary Hover: `#5478d4`
- Primary Dark: `#2d4a9e`
- Accent: `#2da563`
- Accent Hover: `#3cba74`
- Accent Dark: `#248f54`

### Semantic

- Page: `#3b5fc0`
- Page Light: `#e8edf8`
- Database: `#8b5cf6`
- Database Light: `#ede9fe`
- Template: `#0891b2`
- Template Light: `#cffafe`
- Synced: `#2da563`
- Synced Light: `#dcfce7`
- Unsaved: `#d97706`
- Unsaved Light: `#fef3c7`
- Mention: `#6366f1`
- Mention Light: `#e0e7ff`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f9fb`
- Page Canvas: `#ffffff`
- Sidebar: `#f1f3f8`
- Sidebar Hover: `#e4e8f2`
- Block Hover: `#f5f7fa`
- Selection: `rgba(59, 95, 192, 0.08)`
- Drag Overlay: `rgba(59, 95, 192, 0.04)`
- Code Block: `#f6f7f9`
- Callout: `#f0f4ff`

### Text

- Primary: `#1a1d26`
- Secondary: `#6b7280`
- Tertiary: `#9ca3af`
- Placeholder: `#c0c5ce`
- Heading: `#111318`
- Link: `#3b5fc0`
- Link Hover: `#2d4a9e`
- Code: `#d946a8`
- Code Block: `#374151`

### Borders

- Primary: `#e5e7eb`
- Secondary: `#d1d5db`
- Block Divider: `#f0f0f0`
- Focus: `#3b5fc0`
- Drag: `#3b5fc0`

### Dark Theme Overrides

- Primary: `#7ba0f4`
- Accent: `#4ade80`
- Background: `#0d1017`
- Surface: `#161b26`
- Surface Secondary: `#1c2233`
- Sidebar: `#131720`
- Sidebar Hover: `#1e2538`
- Page Canvas: `#161b26`
- Block Hover: `#1c2233`
- Code Block: `#1c2233`
- Callout: `#1a2240`
- Text Primary: `#e8eaed`
- Text Secondary: `#8b92a0`
- Text Heading: `#f1f3f6`
- Text Code: `#f472b6`
- Border Primary: `#2a3040`
- Border Block Divider: `#1e2538`
- Selection: `rgba(123, 160, 244, 0.12)`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Content: `"Georgia", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Content-Specific Sizes

- Page Title: `2.5rem` (40px), weight `700`, line-height `1.2`
- H1: `1.875rem` (30px), weight `700`, line-height `1.3`
- H2: `1.5rem` (24px), weight `600`, line-height `1.35`
- H3: `1.25rem` (20px), weight `600`, line-height `1.4`
- Body Block: `1rem` (16px), weight `400`, line-height `1.7`
- Caption / Small: `0.8125rem` (13px), weight `400`, line-height `1.5`
- Sidebar Item: `0.875rem` (14px), weight `500`, line-height `1.4`
- Breadcrumb: `0.8125rem` (13px), weight `400`
- Database Cell: `0.875rem` (14px), weight `400`

## Layout

- Content Max Width: `720px` (page canvas — optimal reading width)
- Wide Content Max Width: `960px` (databases, tables, gallery views)
- Full Width Content: `100%` (available via toggle per page)
- Sidebar Width: `260px` (collapsed: `0px`, resizable up to `480px`)
- Sidebar Transition: `200ms ease`
- Page Tree Indent: `20px` per nesting level
- Top Bar Height: `44px`
- Breadcrumb Bar Height: `36px`
- Block Gutter Width: `28px` (left margin for drag handle + block menu)
- Cover Image Height: `280px` (with parallax scroll, min `200px`)
- Icon Picker Width: `320px`

## Components

### Page Tree (Sidebar)

- Item height: `30px`
- Item padding: `4px 8px 4px [indent]`
- Border radius: `6px`
- Active item: selection background, primary text, font-weight `600`
- Hover: sidebar-hover background
- Toggle arrow: `16px`, secondary text color, rotates `90deg` on expand
- Page icon: `18px`, left of label
- Add page button: ghost, appears on section hover

### Block Editor

- Block vertical spacing: `4px`
- Block padding: `3px 0`
- Drag handle: `6px` wide, secondary text color, appears on block hover at `-28px` left offset
- Block menu trigger: `+` icon, appears on empty block focus or drag handle hover
- Slash command menu: `320px` wide, max `360px` tall, shadow `lg`, radius `10px`
- Inline toolbar: floating, shadow `md`, radius `8px`, `36px` tall, appears on text selection

### Block Types

- **Paragraph:** body font, body block size, `1.7` line-height
- **Heading 1:** heading font, h1 size, `32px` top margin
- **Heading 2:** heading font, h2 size, `24px` top margin
- **Heading 3:** heading font, h3 size, `16px` top margin
- **Bulleted List:** `6px` circle marker, `24px` indent per level
- **Numbered List:** `24px` indent, sequential numbering resets per parent
- **To-do:** `16px` checkbox, radius `4px`, checked: primary bg + white check + strikethrough text (secondary color)
- **Toggle:** `20px` arrow icon, content indented `24px`, collapsed by default
- **Quote:** `3px` left border (primary color), `16px` left padding, italic content font
- **Callout:** `40px` left icon area, callout background, radius `8px`, `12px 16px` padding
- **Code Block:** code font, code-block background, radius `8px`, `16px` padding, language label top-right
- **Divider:** `1px` solid block-divider, `8px` vertical margin
- **Image:** max-width `100%`, radius `8px`, optional caption below (caption size, centered, secondary color)
- **Embed:** `100%` width iframe, `16:9` aspect ratio default, radius `8px`, `1px` border

### Database View

- Table header: surface-secondary background, `600` weight, `13px` font
- Table row height: `36px`
- Table cell padding: `8px 12px`
- Row hover: block-hover background
- Column resize handle: `3px` wide, primary color on drag
- Filter bar: `36px` height, inline filter pills with `6px` radius
- Sort indicator: `12px` arrow icon in header
- Views tabs: `32px` height, bottom `2px` primary border on active
- View types: Table, Board (Kanban), Gallery, List, Calendar
- Board column: `280px` wide, `12px` gap, surface-secondary background header
- Gallery card: `200px` min width, `12px` radius, cover image + property rows
- New row button: ghost, full width, `+` icon, dashed top border

### Breadcrumb

- Font: sidebar item size
- Separator: `/` in tertiary text color, `4px` horizontal margin
- Current page: primary text, `500` weight
- Ancestor pages: secondary text, hover: primary text
- Max display: 3 segments + `...` overflow

### Cover & Icon

- Cover: full width, cover-image height, gradient overlay bottom `40px` for readability
- Page icon: `78px` emoji or uploaded image, radius `8px`, positioned at bottom of cover overlapping by `40px`
- Icon without cover: `78px`, `20px` above page title

### Search (Command Palette)

- Width: `560px`
- Max height: `480px`
- Border radius: `12px`
- Shadow: `xl`
- Input height: `48px`, `16px` font, no border (seamless)
- Result item: `40px` height, `8px 16px` padding, `6px` radius on hover
- Result icon: `20px`, left of title
- Keyboard shortcut hint: right-aligned, `12px`, tertiary color, mono font
- Trigger: `Cmd+K` / `Ctrl+K`

### Template Gallery

- Card: `240px` wide, `12px` radius, surface-secondary background
- Preview area: `160px` tall, clipped overflow, `0.6` scale transform
- Label: `14px`, `500` weight, centered below preview
- Category tabs: horizontal scroll, `32px` height, primary bottom border on active
- Use Template button: primary solid, `md` size

### Realtime Presence

- Avatar stack: `28px` circles, `-8px` overlap, `2px` white border ring
- Max visible: 4 + `+N` overflow pill
- Active cursor: `2px` wide colored caret, name label above (`11px`, `500` weight, matching color, `4px` radius)
- Collaborator colors: `#e53e3e`, `#dd6b20`, `#38a169`, `#3182ce`, `#805ad5`, `#d53f8c` (cycled per user)
