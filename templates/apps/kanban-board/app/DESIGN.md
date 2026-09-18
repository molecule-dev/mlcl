# DESIGN.md — Kanban Board

## Brand Identity

- **App Name:** Driftboard
- **Tagline:** Move work forward, effortlessly
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Focused
- Fluid
- Collaborative
- Visual

## Target Persona

Product and engineering teams tracking work across swim lanes with rich card metadata.

## Screens

| Name           | Route            | Auth | Purpose                                                       | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home                                                | —          |
| Login          | /login           | No   | Sign in                                                       | —          |
| Signup         | /signup          | No   | Create account                                                | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                 | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                              | Login      |
| Dashboard      | /dashboard       | Yes  | Boards overview with recent activity and member summaries     | —          |
| Boards         | /boards          | Yes  | Browse all boards by workspace/team                           | Dashboard  |
| BoardDetail    | /boards/:id      | Yes  | Kanban columns with draggable cards, filters, swimlanes       | Dashboard  |
| CardDetail     | /cards/:id       | Yes  | Card modal: description, comments, checklist, attachments     | Dashboard  |
| Backlog        | /backlog         | Yes  | Backlog view with prioritization                              | Dashboard  |
| Team           | /team            | Yes  | Team members and activity                                     | Dashboard  |
| Settings       | /settings        | Yes  | Workspace, board templates, integrations                      | Dashboard  |
| Notifications  | /notifications   | Yes  | Activity inbox: mentions, assignments, comments, board events | Dashboard  |

## App Constraints

- Drag-and-drop columns with smooth motion affordances
- Cards show assignee avatars, labels, due dates
- WIP limits visible on column headers

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#3b82f6`
- Primary Dark: `#1d4ed8`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Column Header: `#475569`
- Card Active: `#eff6ff`
- Card Dragging: `#dbeafe`
- Drag Placeholder: `#e2e8f0`
- Priority Critical: `#dc2626`
- Priority High: `#f59e0b`
- Priority Medium: `#3b82f6`
- Priority Low: `#6b7280`
- Online Presence: `#22c55e`
- Offline Presence: `#9ca3af`

### Label Colors

- Label Red: `#ef4444`
- Label Orange: `#f97316`
- Label Amber: `#f59e0b`
- Label Green: `#22c55e`
- Label Teal: `#14b8a6`
- Label Blue: `#3b82f6`
- Label Indigo: `#6366f1`
- Label Purple: `#a855f7`
- Label Pink: `#ec4899`
- Label Slate: `#64748b`

### Backgrounds

- Board: `#f1f5f9`
- Column: `#f8fafc`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Quick Add: `#f1f5f9`

### Text

- Column Title: `#1e293b`
- Card Title: `#1e293b`
- Card Description: `#64748b`
- Comment: `#334155`
- Timestamp: `#94a3b8`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Borders

- Column: `#e2e8f0`
- Card: `#e2e8f0`
- Card Hover: `#cbd5e1`
- Focus: `#2563eb`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#34d399`
- Background: `#0c1222`
- Board: `#131c2e`
- Column: `#1a2538`
- Surface: `#1e293b`
- Card: `#1e293b`
- Card Hover Border: `#475569`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Column Title: `#e2e8f0`
- Border Primary: `#334155`
- Drag Placeholder: `#334155`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Overrides

- Column title: `sm` (14px), weight `600`, uppercase, letter-spacing `0.04em`
- Card title: `sm` (14px), weight `500`
- Card description: `xs` (12px), weight `400`
- Comment body: `sm` (14px), weight `400`, line-height `1.6`
- Badge/label text: `xs` (12px), weight `600`
- Board title: `xl` (20px), weight `700`
- Card count in column header: `xs` (12px), weight `500`, secondary text color

## Layout

- Board Max Width: `100%` (full viewport, horizontal scroll)
- Board Padding: `24px`
- Column Width: `300px`
- Column Gap: `16px`
- Column Max Height: `calc(100vh - 120px)` (scrollable card area)
- Card Gap: `8px`
- Sidebar Width: `320px` (card detail panel)
- Sidebar Collapsed: `0px`
- Top Bar Height: `56px`
- Board Toolbar Height: `48px`

## Components

### Board Column (List)

- Border radius: `12px` (lg)
- Background: column background
- Border: `1px solid` column border
- Padding: `12px`
- Header padding: `8px 4px 12px`
- Min height: `80px`
- Drop target highlight: `2px dashed` primary, primary/10% background
- Card count badge: inline after title, secondary text, `(n)` format

### Card

- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` card border
- Padding: `12px`
- Shadow: `0 1px 2px rgba(0, 0, 0, 0.04)`
- Hover shadow: `0 2px 8px rgba(0, 0, 0, 0.08)`
- Hover border: card-hover border
- Dragging: `0 8px 24px rgba(0, 0, 0, 0.12)`, slight rotation `2deg`, scale `1.02`, opacity `0.95`
- Cover image aspect ratio: `16:9`, flush top with card radius
- Label strip: colored `3px` bar at top of card (optional, replaces full label chips for compact view)
- Cursor: `grab`, dragging: `grabbing`

### Card Labels

- Border radius: `9999px` (pill)
- Height: `20px`
- Padding: `0 8px`
- Font size: `xs` (12px)
- Font weight: `600`
- Background: label color at `15%` opacity
- Text color: label color at `90%` saturation darkened
- Max display: `3` inline, `+n` overflow badge
- Spacing: `4px` gap

### Card Badges (metadata icons)

- Icon size: `14px`
- Font size: `xs` (12px)
- Color: secondary text
- Items: comments count, attachments count, checklist progress, due date
- Layout: horizontal row, `8px` gap
- Due date overdue: error color, bold
- Due date soon (48h): warning color

### Quick Add Card

- Border radius: `8px` (md)
- Background: quick-add background
- Border: `1px dashed` column border
- Padding: `8px 12px`
- Placeholder text: secondary color, `sm` size
- Icon: `+` leading, secondary color
- Hover: solid border, slight background darken
- Active: expands to textarea, `80px` min height, primary focus ring

### Drag Placeholder

- Border radius: `8px` (md)
- Background: drag-placeholder color
- Border: `2px dashed` primary at `40%` opacity
- Height: matches dragged card height
- Transition: `150ms ease` (fast)

### Column Header Menu

- Trigger: `...` icon, `24px` hit target
- Dropdown: `180px` wide
- Items: Rename, Sort cards, Copy list, Move list, Archive list
- Divider before destructive actions

### Card Detail Sidebar

- Width: `320px`
- Background: surface
- Border-left: `1px solid` border-primary
- Shadow: `lg` (left-casting)
- Padding: `24px`
- Close button: top-right, `32px` hit target
- Sections: Title (editable), Labels, Assignees, Due Date, Description (markdown), Checklist, Comments, Activity
- Section spacing: `20px`

### Comment Thread

- Avatar size: `28px`, border-radius `full`
- Author font weight: `600`, `sm` size
- Timestamp: `xs` size, tertiary text
- Body: `sm` size, `1.6` line height
- Spacing between comments: `16px`
- Reply input: bottom-pinned, `40px` min height, expands on focus
- Edit/delete: visible on hover, icon buttons

### Board Toolbar

- Height: `48px`
- Background: surface
- Border-bottom: `1px solid` border-primary
- Items: board title, star/favorite toggle, member avatars (stacked), filter button, search
- Filter dropdown: multi-select for labels, members, due date ranges
- Member avatar stack: `28px` each, `-8px` overlap, max `5` + `+n`

### Checklist

- Checkbox: `16px`, border-radius `4px`, primary color when checked
- Strikethrough on completed items
- Progress bar: `4px` height, primary color fill, border-radius `full`
- Progress text: `xs`, `"3/5"` format

### Due Date Badge

- Border radius: `4px`
- Padding: `2px 6px`
- Font size: `xs` (12px)
- States:
  - Default: secondary background, secondary text
  - Due soon (48h): warning-light background, warning-dark text
  - Overdue: error-light background, error text
  - Complete: success-light background, success text

### Collaborator Cursors (Real-time)

- Cursor ring: `2px solid`, unique color per user
- Name tooltip: `xs` size, background matches cursor color, white text, border-radius `4px`
- Card highlight when another user is editing: `2px solid` user-color border, subtle pulse animation `2s`
- Presence indicator: `8px` dot, bottom-right of avatar, online/offline colors

## Transitions

- Card drag start: `150ms ease` (scale + shadow)
- Card drop: `200ms ease` (snap to position)
- Column reorder: `300ms ease`
- Sidebar open/close: `250ms ease`
- Card hover: `150ms ease` (shadow + border)
- Placeholder appear: `150ms ease` (height expand)
- Label chip hover: `100ms ease`

## Z-Index Overrides

- Board columns: `1`
- Dragging card: `1000`
- Card detail sidebar: `1100`
- Board toolbar (sticky): `1100`
- Column header menu: `1200`
- Modal (card full view): `1300`
