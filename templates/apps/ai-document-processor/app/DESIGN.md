# DESIGN.md — AI Document Processor

## Brand Identity

- **App Name:** Parcela
- **Tagline:** Every page, understood
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Trustworthy, meticulous, calm, accurate

## Target Persona

Operations teams processing invoices, receipts, contracts, and forms with OCR+AI extraction.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                  | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with document-split animation, teal palette, features, pricing                                            | —          |
| Login          | /login           | No   | Centered card with teal primary                                                                                          | —          |
| Signup         | /signup          | No   | Create account                                                                                                           | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                            | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                         | Login      |
| Dashboard      | /dashboard       | Yes  | Sidebar, metric tiles (processed today, pending review, accuracy), document type breakdown chart, recent documents gr... | —          |
| Documents      | /documents       | Yes  | Sidebar, filter chips, grid of document cards with thumbnails, type badges (invoice/receipt/contract color-coded), co... | —          |
| DocumentDetail | /documents/:id   | Yes  | Split-pane: document viewer left (55%) with zoom controls and field overlays, extraction panel right (45%) with edita... | —          |
| Upload         | /upload          | Yes  | Sidebar, large drop zone for PDF/PNG/JPG/TIFF, batch queue table below with thumbnails, filename, type, progress, status | —          |
| Rules          | /rules           | Yes  | Sidebar, filing rule cards with condition+action rows, extraction template list                                          | —          |
| Settings       | /settings        | Yes  | Sidebar, account, API keys, filing integrations (Google Drive, Dropbox)                                                  | —          |

## App Constraints

- Split-pane layout: document viewer (55%) + extraction panel (45%) with draggable divider
- Confidence indicators use green/amber/red with circular rings
- Document type badges use distinct brand colors per type

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d6e6e`
- Primary Hover: `#0f8585`
- Primary Dark: `#0a5555`
- Accent: `#c26e28`
- Accent Hover: `#d4863e`
- Accent Dark: `#a85a1c`

### Semantic

- Classified: `#0d6e6e`
- Classified Light: `#ccfbf1`
- Extracted: `#7c3aed`
- Extracted Light: `#ede9fe`
- Pending Review: `#d97706`
- Pending Review Light: `#fef3c7`
- Filed: `#059669`
- Filed Light: `#d1fae5`
- Rejected: `#dc2626`
- Rejected Light: `#fee2e2`
- OCR Confidence High: `#059669`
- OCR Confidence Medium: `#d97706`
- OCR Confidence Low: `#dc2626`

### Document Type Colors

Consistent colors for document type badges across all views:

- Invoice: `#0d6e6e`
- Receipt: `#0891b2`
- Contract: `#7c3aed`
- Report: `#2563eb`
- Form: `#c26e28`
- Letter: `#64748b`
- ID Document: `#be123c`
- Other: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f7fafa`
- Document Viewer: `#e8ecec`
- Drop Zone: `#f0fdfa`
- Drop Zone Active: `#ccfbf1`
- Extraction Highlight: `rgba(124, 58, 237, 0.10)`
- Extraction Highlight Active: `rgba(124, 58, 237, 0.20)`

### Text

- Primary: `#1a2e2e`
- Secondary: `#5a7272`
- Field Label: `#475569`
- Field Value: `#0f172a`
- Confidence Score: `#64748b`
- Link: `#0d6e6e`
- Link Hover: `#0a5555`

### Borders

- Primary: `#d4e4e4`
- Secondary: `#b8cece`
- Focus: `#0d6e6e`
- Extraction: `#7c3aed`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#f59e0b`
- Background: `#0a1414`
- Surface: `#142424`
- Surface Secondary: `#1a3030`
- Document Viewer: `#0f1e1e`
- Drop Zone: `#0f2626`
- Drop Zone Active: `#143333`
- Extraction Highlight: `rgba(167, 139, 250, 0.15)`
- Text Primary: `#e8f4f4`
- Text Secondary: `#8fb0b0`
- Field Label: `#94a3b8`
- Field Value: `#f1f5f9`
- Border Primary: `#264040`
- Extraction: `#a78bfa`
- Document Type Invoice: `#2dd4bf`
- Document Type Contract: `#a78bfa`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Document: `"Source Serif 4", Georgia, "Times New Roman", serif`

### Overrides

- Extracted field values use `Data` font family with `font-variant-numeric: tabular-nums`
- Confidence percentages use `Data` at `xs` (12px), weight `600`
- Document preview text (OCR result) uses `Document` at `sm` (14px), line height `Relaxed` (1.75)
- AI summary text uses `Body` at `base` (16px), line height `Relaxed` (1.75)
- Table cell data uses `Data` at `sm` (14px)
- Field labels use `Body` at `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Dashboard Grid Columns: `12` (desktop), `6` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Document Viewer Width: `55%` of main content (split-pane layout)
- Extraction Panel Width: `45%` of main content (split-pane layout)
- Extraction Panel Min Width: `380px`
- Document Viewer Min Width: `480px`
- Split-Pane Divider: `4px`, draggable, border-secondary color
- Batch Table Max Height: `calc(100vh - 240px)` (scroll within)

## Components

### Document Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `0` (thumbnail flush) + `16px` (content)
- Thumbnail: `100%` width, `160px` height, `object-fit: cover`, subtle inner shadow overlay at bottom
- Document type badge: pill, top-left absolute over thumbnail, `8px 12px` padding, white text, background from Document Type Colors
- Status indicator: small dot (`8px`) + label, bottom-right of content area
- Title: `sm` (14px), weight `600`, single line, ellipsis overflow
- Subtitle: `xs` (12px), secondary text — page count, file size, upload date
- Confidence bar: `4px` tall, full width, color mapped to OCR confidence level
- Hover: lift with `md` shadow, thumbnail slight scale (`1.02`) with `Fast` transition

### Upload Drop Zone

- Border radius: `16px` (xl)
- Border: `2px dashed` border-secondary
- Background: drop-zone
- Active (drag over): border primary, background drop-zone-active, `md` shadow
- Padding: `48px`
- Center: document stack icon (`48px`, secondary text), heading + supported formats
- Accepted formats badge row: pills showing PDF, PNG, JPG, TIFF, HEIC
- Max file size note: muted `xs` text below badges
- Batch indicator: "or drop multiple files for batch processing" in secondary text
- Transition: `Normal` (300ms) on all state changes

### Document Viewer Panel

- Border radius: `12px` (lg) on wrapper
- Background: document-viewer
- Toolbar: `48px` height, surface background, bottom border
  - Zoom controls: `-` / `+` buttons with percentage display (`Data` font)
  - Page navigation: `< 3 / 12 >` with `Data` font
  - Fit toggle: fit-width / fit-page icons
  - Rotate button: `90deg` clockwise
  - Download button: right-aligned
- Page display: centered, white surface, `lg` shadow, actual document proportions
- Extraction overlay: semi-transparent colored rectangles over detected fields, border `2px solid` extraction color
- Active field highlight: extraction-highlight-active background, `2px solid` extracted color border, subtle pulse animation (`Normal` 300ms)
- Selection: click a field overlay to select it, popover shows field name + confidence

### Extraction Panel

- Border radius: `12px` (lg) on wrapper
- Background: surface
- Header: "Extracted Fields" title + document type badge + overall confidence pill
- Scrollable field list below header
- Field groups: collapsible sections by category (e.g., "Header Info", "Line Items", "Totals")
- Section header: `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`, secondary text
- Section divider: `1px solid` border-primary with `12px` vertical margin

### Extraction Field Row

- Padding: `10px 16px`
- Border radius: `8px` (md) on hover/active
- Layout: label top, value bottom, confidence right-aligned
- Label: `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`, field-label color
- Value: `sm` (14px), weight `500`, `Data` font, field-value color
- Editable: subtle pencil icon on hover, inline editing with `Input` style
- Confidence badge: pill, `xs` font, background + text color mapped to confidence level:
  - High (>90%): filed / filed-light
  - Medium (70-90%): pending-review / pending-review-light
  - Low (<70%): rejected / rejected-light
- Hover: surface-secondary background
- Active (linked to viewer overlay): extraction-highlight background, left `3px solid` extracted border
- Validation error: error border, error-light background, error text below value

### Batch Processing Table

- Border radius: `12px` (lg) on wrapper
- Header background: surface-secondary
- Header font: `Body`, `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`, field-label color
- Columns: checkbox, thumbnail (40x40, `4px` radius), filename, type badge, pages, status, confidence, actions
- Cell font: `Data` family, `sm` (14px), tabular-nums
- Cell padding: `10px 16px`
- Row hover: surface secondary
- Row border: `1px solid` border-primary
- Selected row: primary with `0.06` opacity background, left `3px solid` primary border
- Sticky header on scroll
- Status column: colored dot + label (pending/processing/complete/error)
- Progress: inline `4px` tall bar, primary fill, animated stripe pattern during processing
- Bulk action bar: slides up from bottom when rows selected, surface background, `lg` shadow, `12px` radius top corners

### Classification Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px), weight `600`
- Background: mapped from Document Type Colors at `0.12` opacity
- Text: mapped from Document Type Colors at full opacity
- Icon: small (`14px`) document-type icon left of label

### AI Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Header: sparkle icon in accent color + "AI Summary" label, weight `600`
- Body: `Body` font, `sm` (14px), line height `Relaxed` (1.75)
- Key-value pairs: label/value layout, label in field-label style, value in field-value style
- Entities: inline pills for detected entities (names, dates, amounts), accent-light background
- Footer: "Generated by AI" muted text + timestamp, `xs` (12px), secondary text
- Left border: `4px solid` accent

### Metric Tile

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Value: `2xl` (24px), weight `700`, field-value color, `Data` font
- Label: `xs` (12px), weight `500`, secondary text, uppercase, letter-spacing `0.05em`
- Icon: `24px`, primary color, top-right
- Trend indicator: small arrow + percentage, filed or rejected color

### Export Menu

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `8px 0`
- Item padding: `8px 16px`
- Item hover: surface secondary
- Icons: `16px`, secondary text, left of label
- Formats: CSV, JSON, XLSX (extracted data); PDF (original + annotations); ZIP (batch export)
- Divider between format groups: `1px solid` border-primary with `4px` vertical margin

### Sidebar Navigation

- Width: `260px` (collapsed: `64px`)
- Background: surface
- Border-right: `1px solid` border-primary
- Nav item height: `40px`
- Nav item padding: `8px 16px`
- Nav item border-radius: `8px` (md)
- Active item: primary with `0.08` opacity background, primary text, weight `600`
- Hover item: surface-secondary background
- Icon size: `20px`
- Section dividers: `1px solid` border-primary with `12px` vertical margin
- Sections: Dashboard (overview, recent), Documents (all, by type, pending review), Processing (batch queue, history), Settings (filing rules, API keys)

### Confidence Indicator

Reusable across all views where OCR/AI confidence is displayed:

- Circular variant: `32px` diameter ring, `3px` stroke, color mapped to confidence level, percentage centered in `Data` font `xs`
- Bar variant: `4px` tall, full width of parent, rounded `2px`, background border-primary, fill color mapped to confidence level
- Thresholds: High `>90%` (OCR Confidence High), Medium `70-90%` (OCR Confidence Medium), Low `<70%` (OCR Confidence Low)

## Design Principles (Addendum)

1. **Document fidelity first** — the viewer must render documents at readable quality; never compress thumbnails so aggressively that text becomes illegible
2. **AI provenance** — always mark AI-generated content (summaries, classifications, extracted fields) with the accent-colored sparkle icon or pill so users distinguish OCR output from AI inference
3. **Confidence transparency** — never hide confidence scores; users must be able to judge extraction reliability at a glance via consistent color-coded indicators
4. **Split-pane workflow** — the document viewer and extraction panel work as a connected pair; selecting a field in one highlights it in the other, always
5. **Batch-first density** — the batch table is the power-user's primary view; optimize for scanning 50+ documents with minimal vertical space per row
6. **Calm precision** — teal and earth tones convey trustworthiness and accuracy; the palette avoids high-saturation primaries that fight with document content for attention
