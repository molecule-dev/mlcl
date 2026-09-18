# DESIGN.md — Cloud File Manager

## Brand Identity

- **App Name:** Nimbus
- **Tagline:** Everything in reach
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Friendly, clear, confident, organized

## Target Persona

Individuals and teams who store, share, and collaborate on files and want frictionless access across devices without the clutter of traditional file systems.

## Screens

| Name           | Route            | Auth | Purpose                                                                                     | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                                              | —          |
| Login          | /login           | No   | Sign in                                                                                     | —          |
| Signup         | /signup          | No   | Create account                                                                              | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                               | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                            | Login      |
| MyFiles        | /files           | Yes  | Grid/list view of files and folders with breadcrumbs                                        | —          |
| FileDetail     | /files/:id       | Yes  | Preview panel with metadata, actions, and activity                                          | —          |
| SharedWithMe   | /shared          | Yes  | Files/folders shared by others                                                              | —          |
| Starred        | /starred         | Yes  | Pinned files and folders                                                                    | —          |
| Trash          | /trash           | Yes  | Deleted items with restore/purge                                                            | —          |
| Upload         | /upload          | Yes  | Upload dropzone with progress and queue                                                     | —          |
| Settings       | /settings        | Yes  | Account, storage, and preferences                                                           | —          |
| Recent         | /recent          | Yes  | Activity feed showing recent edits, shares, uploads, and comments across collaborators      | —          |
| SearchResults  | /search          | Yes  | Global search results with type/owner/date facets and matched-phrase highlighting           | —          |
| Storage        | /storage         | Yes  | Storage usage breakdown by file type, top space consumers, usage trend, and plan management | —          |

## App Constraints

- Shell uses a fixed left sidebar (My Files, Shared, Starred, Trash) plus a top bar with breadcrumbs, search, and view toggle (grid/list)
- Storage meter must be visible in the sidebar on all authed screens; turns warning/critical above 75%/90%
- File thumbnails are 4:3 with rounded top corners flush with the card; hover reveals checkbox and triple-dot menu

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#2563eb`
- Primary Hover: `#3b82f6`
- Primary Dark: `#1d4ed8`
- Accent: `#0d9488`
- Accent Hover: `#14b8a6`
- Accent Dark: `#0f766e`

### Semantic

- Shared: `#7c3aed`
- Shared Light: `#ede9fe`
- Upload Success: `#059669`
- Upload Success Light: `#d1fae5`
- Storage Warning: `#d97706`
- Storage Warning Light: `#fef3c7`
- Storage Critical: `#dc2626`
- Storage Critical Light: `#fee2e2`
- Folder: `#2563eb`
- Folder Light: `#dbeafe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Sidebar: `#f1f5f9`
- Dropzone: `#eff6ff`
- Dropzone Active: `#dbeafe`
- Preview Overlay: `rgba(15, 23, 42, 0.85)`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Filename: `#1e293b`
- Metadata: `#94a3b8`
- Link: `#2563eb`
- Link Hover: `#1d4ed8`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Dropzone: `#93c5fd`
- Dropzone Active: `#2563eb`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#2dd4bf`
- Background: `#0c1222`
- Surface: `#1a2744`
- Surface Secondary: `#1e2d4a`
- Sidebar: `#131d33`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3f5f`
- Dropzone: `#1e3a5f`
- Dropzone Active: `#1e40af`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Filename: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (font-weight: 500)
- Filesize: `"Tabular Nums", Inter, -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Code (paths): `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, monospace`

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `56px`)
- Top Bar Height: `56px`
- File Grid Columns: `5` (desktop), `3` (tablet), `2` (mobile)
- File Grid Gap: `16px`
- File List Row Height: `48px`
- Preview Panel Width: `420px`
- Breadcrumb Height: `40px`
- Upload Drawer Width: `380px`
- Storage Bar Height: `6px`

## Components

### File Card (Grid View)

- Border radius: `10px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.06)`
- Hover shadow: `0 4px 12px rgba(0, 0, 0, 0.1)`
- Thumbnail aspect ratio: `4:3`
- Thumbnail border radius: `8px 8px 0 0` (flush top)
- Content padding: `12px`
- Filename font size: `0.875rem` (14px)
- Filename font weight: `500`
- Filename max lines: `2` (ellipsis overflow)
- Metadata font size: `0.75rem` (12px)
- Metadata color: text-metadata
- Checkbox: top-left corner, `20px`, visible on hover or selection
- Context menu: triple-dot icon, top-right, visible on hover

### File Row (List View)

- Height: `48px`
- Padding: `0 16px`
- Hover background: surface-secondary
- Selected background: `#eff6ff`
- Icon size: `20px`
- Filename font size: `0.875rem` (14px)
- Filename font weight: `500`
- Metadata columns: Name (flex), Modified (160px), Size (100px), Shared (80px)
- Column header font size: `0.75rem` (12px)
- Column header font weight: `600`
- Column header color: text-secondary
- Column header text-transform: `uppercase`
- Column header letter-spacing: `0.05em`
- Divider: `1px solid` border-primary between rows

### Folder Icon

- Size: `40px` (grid), `20px` (list)
- Color: folder (`#2563eb`)
- Style: filled, rounded corners
- Open state: slightly open with accent color inner

### File Type Icons

- Size: `40px` (grid), `20px` (list)
- Document: `#2563eb` (blue)
- Spreadsheet: `#059669` (green)
- Presentation: `#d97706` (amber)
- Image: `#7c3aed` (purple)
- Video: `#dc2626` (red)
- Audio: `#ec4899` (pink)
- Archive: `#64748b` (slate)
- Code: `#0d9488` (teal)
- Generic: `#94a3b8` (light slate)

### Upload Dropzone

- Border: `2px dashed` dropzone-border
- Border radius: `12px`
- Background: dropzone
- Active border: `2px solid` dropzone-active-border
- Active background: dropzone-active
- Padding: `48px`
- Icon size: `48px`
- Icon color: primary
- Text font size: `1rem` (16px)
- Subtext font size: `0.875rem` (14px)
- Subtext color: text-secondary
- Transition: `200ms ease` (border and background)

### Upload Progress Item

- Height: `56px`
- Padding: `12px 16px`
- Border radius: `8px`
- Background: surface
- Progress bar height: `4px`
- Progress bar radius: `2px`
- Progress bar color: primary
- Progress bar background: `#e2e8f0`
- Filename font size: `0.875rem` (14px)
- Status font size: `0.75rem` (12px)
- Status color: text-secondary
- Cancel button: `20px` icon, ghost variant

### Breadcrumb Navigation

- Height: `40px`
- Font size: `0.875rem` (14px)
- Separator: `›` character, text-secondary color
- Current item font weight: `600`
- Hoverable items: underline on hover, link color
- Overflow: horizontal scroll with fade mask on edges

### Storage Meter

- Height: `6px`
- Border radius: `3px`
- Background: `#e2e8f0`
- Fill color: primary (normal), storage-warning (>75%), storage-critical (>90%)
- Transition: `300ms ease` (width and color)
- Label font size: `0.75rem` (12px)
- Label font weight: `500`

### Share Dialog

- Width: `480px`
- Border radius: `12px`
- Shadow: `xl`
- Padding: `24px`
- Recipient input height: `40px`
- Recipient chip: pill shape, `#eff6ff` background, `0.8125rem` font
- Permission select: dropdown, `120px` width
- Permission options: Viewer, Editor, Owner
- Link section: monospace font, `#f1f5f9` background, `8px` border radius
- Copy button: accent color, icon + text

### Preview Panel

- Width: `420px`
- Background: surface
- Border-left: `1px solid` border-primary
- Header padding: `16px 20px`
- Image preview: max-height `300px`, object-fit contain, `#f1f5f9` background
- Detail rows: `label: value` layout, `12px` vertical spacing
- Label font size: `0.75rem` (12px)
- Label color: text-secondary
- Label font weight: `600`
- Value font size: `0.875rem` (14px)
- Value color: text-primary
- Action buttons: full width, `40px` height, stacked with `8px` gap

### Sidebar Navigation

- Width: `260px`
- Background: sidebar
- Padding: `12px`
- Section label font size: `0.6875rem` (11px)
- Section label font weight: `700`
- Section label text-transform: `uppercase`
- Section label letter-spacing: `0.08em`
- Section label color: text-secondary
- Section spacing: `24px`
- Nav item height: `36px`
- Nav item padding: `0 12px`
- Nav item border radius: `8px`
- Nav item font size: `0.875rem` (14px)
- Nav item icon size: `18px`
- Nav item icon-to-text gap: `10px`
- Active item background: `#dbeafe`
- Active item color: primary-dark
- Active item font weight: `600`
- Hover item background: `#e2e8f0`
- Sections: My Files, Shared with Me, Starred, Trash

### Search Bar

- Height: `40px`
- Border radius: `10px`
- Background: `#f1f5f9`
- Focus background: surface
- Focus border: `1px solid` primary
- Icon size: `18px`
- Icon color: text-secondary
- Placeholder color: `#94a3b8`
- Font size: `0.875rem` (14px)
- Width: `400px` (desktop), `100%` (mobile)

### Context Menu

- Border radius: `10px`
- Shadow: `lg`
- Background: surface
- Padding: `6px`
- Item height: `36px`
- Item padding: `0 12px`
- Item border radius: `6px`
- Item font size: `0.875rem` (14px)
- Item icon size: `16px`
- Item icon-to-text gap: `10px`
- Hover background: surface-secondary
- Destructive item color: error
- Separator: `1px solid` border-primary, `4px` vertical margin
- Items: Open, Share, Download, Rename, Move, Star, Details, Delete

### Empty State

- Icon size: `64px`
- Icon color: `#cbd5e1`
- Title font size: `1.125rem` (18px)
- Title font weight: `600`
- Title color: text-primary
- Description font size: `0.875rem` (14px)
- Description color: text-secondary
- CTA button: primary, `md` size
- Max width: `360px`
- Centered vertically and horizontally in content area
