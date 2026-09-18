# DESIGN.md — Project Management

## Brand Identity

- **App Name:** Forge
- **Tagline:** Build what matters
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#22d3ee`
- Primary Dark: `#0e7490`

### Semantic

- To Do: `#6b7280`
- In Progress: `#0891b2`
- In Review: `#f59e0b`
- Done: `#16a34a`
- Blocked: `#dc2626`
- Priority High: `#dc2626`
- Priority Medium: `#f59e0b`
- Priority Low: `#6b7280`

### Backgrounds

- Primary: `#f0fdfa`
- Surface: `#ffffff`
- Surface Secondary: `#f5fafa`
- Kanban Column: `#f1f5f9`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Background: `#0c1222`
- Surface: `#1a2332`
- Kanban Column: `#1e293b`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Font Sizes

- Task Title: `sm` (14px)
- Section Header: `xs` (12px), weight `700`, uppercase

## Layout

- Content Max Width: `100%` (full bleed for boards)
- Sidebar Width: `240px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Kanban Column Width: `300px`
- Kanban Column Gap: `16px`
- Kanban Card Gap: `8px`
- Gantt Row Height: `40px`

## Components

### Kanban Card

- Border radius: `8px` (md)
- Padding: `12px`
- Shadow: `sm`, dragging: `lg`
- Left border: `3px solid` status color
- Assignee avatar: `24px`, stacked with `-8px` overlap
- Label chips: `4px` radius, `2px 6px` padding, `xs` font

### Kanban Column

- Border radius: `8px` (md)
- Background: kanban-column
- Header padding: `12px 16px`
- Card count badge: secondary text, `xs` font
- Drop placeholder: `2px dashed` primary, `8px` radius

### Task Row (List View)

- Height: `44px`
- Checkbox: `18px`, `4px` radius
- Priority icon: `14px`
- Due date: `xs` font, overdue in error color

### Progress Bar

- Height: `6px`
- Border radius: `full`
- Background: border-primary
- Fill: primary (or status color)
- Label: `xs` font, right-aligned

### Sprint Header

- Background: surface-secondary
- Padding: `12px 16px`
- Dates: `xs` font, secondary text
- Velocity badge: primary background, inverse text
